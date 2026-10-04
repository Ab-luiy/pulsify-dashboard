import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { sha256Hex } from '../functions/_shared/common.js';
import { queueSalesFollowup,sanitizeFollowup } from '../functions/_shared/sales-followup.js';
import { recordingBooking } from '../functions/_shared/call-detail.js';
import { onRequestGet as draftsGet,onRequestPost as draftsPost } from '../functions/api/sales-followup.js';
import { onRequestPost as decide } from '../functions/api/content-reviews.js';

const sql=new DatabaseSync(':memory:');
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,portal_token_hash TEXT);
CREATE TABLE lead_outcomes(id INTEGER PRIMARY KEY,client_id TEXT,email TEXT,booking_ref TEXT,call_at TEXT,attended TEXT,result TEXT,objection TEXT,notes TEXT,closer_id TEXT,closer TEXT,deal_cents INTEGER,payment_type TEXT,pre_sold TEXT,created_at TEXT,updated_at TEXT);
CREATE TABLE pipeline_touches(id INTEGER PRIMARY KEY,client_id TEXT,kind TEXT,external_id TEXT,contact_email TEXT,contact_name TEXT,ts TEXT,payload_json TEXT);
CREATE TABLE call_notes(id INTEGER PRIMARY KEY,client TEXT,call_date TEXT,title TEXT,summary TEXT,decisions TEXT,actions TEXT,recording_url TEXT,created_at TEXT);
CREATE TABLE team_members(id TEXT,client_id TEXT,name TEXT);`);
for(const name of ['0014_client_brain.sql','0044_content_reviews.sql','0056_call_note_links.sql']) sql.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
const DB={prepare(q){let args=[];const s={bind(...v){args=v;return s;},async first(){return sql.prepare(q).get(...args)||null;},async all(){return {results:sql.prepare(q).all(...args)};},async run(){const r=sql.prepare(q).run(...args);return {meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}};}};return s;},async batch(items){return Promise.all(items.map(s=>s.run()));}};
const env={DB,ADMIN_KEY:'admin-test'};
for(const client of ['acme','other']) sql.prepare('INSERT INTO client_config VALUES(?,?,?,?)').run(client,client,'client',await sha256Hex('token-'+client));
sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('acme','voice','style','\"Direct, short messages\"','operator','2026-10-04')").run();
sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('other','offer','secret','\"OTHER TENANT SECRET\"','operator','2026-10-04')").run();
const at='2026-10-04T12:00:00.000Z';
sql.prepare("INSERT INTO lead_outcomes(id,client_id,email,booking_ref,call_at,attended,result,objection,notes,created_at,updated_at) VALUES(1,'acme','lead@acme.test','b1',?,'showed','not_closed','Needs to discuss timing','Wants a repeatable setup',?,?)").run(at,at,at);
const post=(handler,body,headers={'x-portal-token':'token-acme'})=>handler({env,request:new Request('https://pulsify-ai.com/api/test',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)})});
const answer={touches:[1,3,7,14,30].map(day=>({day,message:`Useful follow-up for day ${day}`}))};
let id;
test('no key stores a scoped prompt once and never sends anything',async()=>{
  const row=await queueSalesFollowup(env,'acme',1);id=row.id;
  assert.equal(row.status,'draft');
  const snap=JSON.parse(row.snapshot_json);
  assert.match(snap.prompt,/Direct, short messages/);
  assert.match(snap.prompt,/repeatable setup/);
  assert.doesNotMatch(snap.prompt,/OTHER TENANT SECRET/);
  assert.deepEqual(snap.touches,[]);
  assert.equal((await queueSalesFollowup(env,'acme',1)).id,id);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM content_reviews').get().n,1);
});
test('paste-back validates five touches, tenant access and review status',async()=>{
  assert.equal((await post(draftsPost,{id,answer:'{}'})).status,422);
  assert.equal((await post(draftsPost,{id,answer:JSON.stringify(answer)},{'x-portal-token':'token-other'})).status,404);
  assert.equal((await post(draftsPost,{id,answer:JSON.stringify(answer)})).status,200);
  assert.equal(sql.prepare('SELECT status FROM content_reviews WHERE id=?').get(id).status,'review');
  assert.equal((await post(draftsPost,{id,answer:JSON.stringify(answer)})).status,409);
  assert.throws(()=>sanitizeFollowup({touches:[{message:'one'}]}));
});
test('approval uses existing gate without creating a YouTube content item',async()=>{
  assert.equal((await post(decide,{action:'approve',id},{'x-admin-key':'admin-test'})).status,200);
  assert.equal(sql.prepare('SELECT status FROM content_reviews WHERE id=?').get(id).status,'approved');
});
test('changed calls retire old drafts; old snapshots cannot be approved or pasted',async()=>{
  sql.prepare("UPDATE lead_outcomes SET notes='Different next step',updated_at='2026-10-04T13:00:00Z' WHERE id=1").run();
  const row=await queueSalesFollowup(env,'acme',1);
  assert.notEqual(row.id,id);
  assert.equal(sql.prepare('SELECT status FROM content_reviews WHERE id=?').get(id).status,'superseded');
  assert.equal((await post(draftsPost,{id,answer:JSON.stringify(answer)})).status,409);
  id=row.id;
  await post(draftsPost,{id,answer:JSON.stringify(answer)});
  sql.prepare("UPDATE lead_outcomes SET result='closed' WHERE id=1").run();
  assert.equal((await post(decide,{action:'approve',id},{'x-admin-key':'admin-test'})).status,409);
  await queueSalesFollowup(env,'acme',1);
  assert.equal(sql.prepare('SELECT status FROM content_reviews WHERE id=?').get(id).status,'superseded');
});
test('Anthropic helper generates into review; provider failure leaves manual prompt',async()=>{
  const oldFetch=globalThis.fetch;
  sql.prepare("UPDATE lead_outcomes SET result='follow_up',notes='new context' WHERE id=1").run();
  let count=0;
  globalThis.fetch=async(url)=>{count++;assert.equal(url,'https://api.anthropic.com/v1/messages');return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(answer)}]}));};
  try {
    const row=await queueSalesFollowup({...env,ANTHROPIC_API_KEY:'test-key'},'acme',1);
    assert.equal(row.status,'review');assert.equal(JSON.parse(row.snapshot_json).touches.length,5);assert.equal(count,1);
    sql.prepare("UPDATE lead_outcomes SET notes='another context' WHERE id=1").run();
    globalThis.fetch=async()=>new Response('unavailable',{status:503});
    const failed=await queueSalesFollowup({...env,ANTHROPIC_API_KEY:'test-key'},'acme',1);
    assert.equal(failed.status,'draft');assert.ok(JSON.parse(failed.snapshot_json).prompt);
  } finally {globalThis.fetch=oldFetch;}
});
test('read endpoint cannot reveal a different workspace call',async()=>{
  const res=await draftsGet({env,request:new Request('https://pulsify-ai.com/api/sales-followup?booking_ref=b1',{headers:{'x-portal-token':'token-other'}})});
  assert.equal(res.status,404);
});
test('recording links require one matching attendee and time; ambiguous remains unlinked',async()=>{
  const add=(ref,email)=>sql.prepare("INSERT INTO pipeline_touches(client_id,kind,external_id,contact_email,ts,payload_json) VALUES('acme','booking',?,?,?,'{}')").run(ref,email,at);
  add('b1','lead@acme.test');
  assert.equal((await recordingBooking(env,'acme',['lead@acme.test'],at)).booking_ref,'b1');
  assert.equal(await recordingBooking(env,'acme',['stranger@test.com'],at),null);
  add('b2','lead@acme.test');
  assert.equal(await recordingBooking(env,'acme',['lead@acme.test'],at),null);
});

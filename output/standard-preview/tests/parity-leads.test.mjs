// Parity pass: Leads view APIs. Conversations with in_crm and search, thread
// detail, and the operator-wide pipeline contacts list. Real SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestGet as conversationsGet} from '../functions/api/spine/conversations.js';
import {onRequestGet as pipelineGet} from '../functions/api/pipeline.js';
import {recordTouch} from '../functions/_shared/pipeline-touches.js';
import {rememberOperator} from '../functions/_shared/access.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client_id TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT)");
for(const t of ['crm_overrides','crm_added','crm_removed'])sql.exec(`CREATE TABLE ${t}(name TEXT PRIMARY KEY,data TEXT NOT NULL,ts INTEGER NOT NULL,sts INTEGER NOT NULL,updated_at TEXT NOT NULL)`);
for(const n of ['0025_data_spine.sql','0028_onboarding.sql'])sql.exec(mig(n).replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/,''));
sql.prepare('INSERT INTO client_config(client_id,client_name,status) VALUES(?,?,?)').run('acme','Acme Trading','client');
sql.prepare('INSERT INTO client_config(client_id,client_name,status) VALUES(?,?,?)').run('beta','Beta Ecom','client');
const env={DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const op=(url)=>{const r=new Request(url);rememberOperator(r,{email:'op@test',via:'access'});return r};
const call=(fn,r)=>fn({request:r,env,data:{}});

const now='2026-09-19T12:46:47.000Z';
const conv=(id,handle,dir,text,at)=>{
  sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(id,'op','1784',handle?'id-'+handle:'',handle,handle||'Instagram lead',at,at,dir,'{}',at,at);
  sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)").run('m-'+id,id,'op',dir,at,text,'{}',at);
};
conv('t1','other.acc','inbound','test',now);
conv('t2','frank.w','outbound','sent you the doc','2026-09-18T10:00:00.000Z');
conv('t3','','inbound','','2026-09-17T10:00:00.000Z');
sql.prepare("INSERT INTO crm_added(name,data,ts,sts,updated_at) VALUES('frank.w','{}',1,1,'x')").run();

test('conversations list carries in_crm, counts and search', async()=>{
  const r=await call(conversationsGet,op('https://x/api/spine/conversations'));
  assert.equal(r.status,200);
  const d=await r.json();
  assert.equal(d.conversations.length,3);
  const t1=d.conversations.find(c=>c.id==='t1'),t2=d.conversations.find(c=>c.id==='t2');
  assert.equal(t1.in_crm,false);assert.equal(t2.in_crm,true);
  assert.equal(t1.message_count,1);assert.equal(t1.inbound_count,1);
  assert.equal(d.conversations[0].id,'t1','newest first');
  const s=await (await call(conversationsGet,op('https://x/api/spine/conversations?q=frank'))).json();
  assert.deepEqual(s.conversations.map(c=>c.id),['t2']);
  const u=await (await call(conversationsGet,op('https://x/api/spine/conversations?unmatched=1'))).json();
  assert.deepEqual(u.conversations.map(c=>c.id).sort(),['t1','t3']);
});

test('thread detail returns ordered messages and 404s unknown ids', async()=>{
  const d=await (await call(conversationsGet,op('https://x/api/spine/conversations?id=t1'))).json();
  assert.equal(d.conversation.participant_username,'other.acc');
  assert.equal(d.messages.length,1);assert.equal(d.messages[0].text,'test');
  assert.equal((await call(conversationsGet,op('https://x/api/spine/conversations?id=nope'))).status,404);
});

test('operator pipeline without client lists contacts across clients with client names', async()=>{
  await recordTouch(env,{client:'acme',kind:'application',email:'lead@x.com',name:'Lead One',source:'typeform',externalId:'a1',ts:now});
  await recordTouch(env,{client:'beta',kind:'payment',email:'buyer@x.com',name:'Buyer',source:'stripe',externalId:'p1',amountCents:250000,ts:now});
  const d=await (await call(pipelineGet,op('https://x/api/pipeline'))).json();
  assert.equal(d.ok,true);assert.equal(d.client,null);
  assert.equal(d.contacts.length,2);
  const buyer=d.contacts.find(c=>c.contact_email==='buyer@x.com');
  assert.equal(buyer.client_name,'Beta Ecom');assert.equal(buyer.stage,'Paid');assert.equal(buyer.paid_cents,250000);
  const q=await (await call(pipelineGet,op('https://x/api/pipeline?q=lead'))).json();
  assert.deepEqual(q.contacts.map(c=>c.contact_email),['lead@x.com']);
});

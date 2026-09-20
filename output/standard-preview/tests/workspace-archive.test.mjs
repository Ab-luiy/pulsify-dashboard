// Archive: exports every row, hides the workspace from lists and login,
// deletes nothing, and restore brings it back. Real SQLite, fake R2.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {archiveWorkspace, exportWorkspace, listArchives, restoreWorkspace} from '../functions/_shared/archive.js';
import {onRequestGet as clientsGet} from '../functions/api/clients.js';
import {onRequestPost as archivePost} from '../functions/api/workspace-archive.js';
import {rememberOperator} from '../functions/_shared/access.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT DEFAULT 'prospect',updated_at TEXT,page_active INTEGER DEFAULT 1,wistia_media_id TEXT,typeform_url TEXT,kit_tag_id TEXT,prospect_email TEXT,acquisition_token TEXT,portal_token_hash TEXT)");
sql.exec("CREATE TABLE client_auth(client_id TEXT PRIMARY KEY,email TEXT UNIQUE,pass_hash TEXT,pass_salt TEXT,iterations INTEGER,created_at TEXT,updated_at TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT PRIMARY KEY,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE client_setup_tokens(token_hash TEXT,client_id TEXT,email TEXT,expires_at TEXT,created_at TEXT)");
for(const n of ['0014_client_brain.sql','0015_operator_events.sql','0021_workspace_records.sql'])for(const st of mig(n).replace(/--[^\n]*/g,'').split(';')){if(st.trim())try{sql.exec(st);}catch(e){}}
sql.prepare("INSERT INTO client_config(client,client_name,status,updated_at) VALUES('frank','Frank Wieler','prospect','x'),('keep','Keeper','client','x')").run();
sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('frank','offer','business_explainer','\"dropshipping\"','client-form','x')").run();
sql.prepare("INSERT INTO client_sessions VALUES('h1','frank','2099-01-01','x')").run();
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,client_id TEXT)");
const r2=new Map();
const env={ADMIN_KEY:'k',MEDIA:{async put(k,v){r2.set(k,String(v));},async list({prefix}){return {objects:[...r2.keys()].filter(k=>k.startsWith(prefix)).map(k=>({key:k,size:r2.get(k).length,uploaded:'x'}))};}},
  DB:{async batch(items){sql.exec("BEGIN");try{const results=[];for(const item of items)results.push(await item.run());sql.exec("COMMIT");return results;}catch(e){sql.exec("ROLLBACK");throw e;}},prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p}}};
const op=(url,init)=>{const r=new Request(url,init);rememberOperator(r,{email:'op@test',via:'access'});return r};

test('export collects every table that holds the client', async()=>{
  const b=await exportWorkspace(env,'frank');
  assert.equal(b.client,'frank');
  assert.ok(b.tables.client_config?.length===1);assert.ok(b.tables.client_brain?.length===1);assert.ok(b.tables.client_sessions?.length===1);
  assert.ok(b.row_count>=3);
});

test('archive exports to R2, hides from lists, kills sessions, deletes nothing; restore reverses', async()=>{
  const before=await (await clientsGet({request:op('https://x/api/clients'),env,data:{}})).json();
  assert.deepEqual(before.clients.map(c=>c.client).sort(),['frank','keep']);
  const r=await archiveWorkspace(env,'frank','op@test');
  assert.equal(r.ok,true);assert.match(r.export_key,/^archive\/workspaces\/frank\//);
  assert.ok(r2.has(r.export_key));assert.ok(JSON.parse(r2.get(r.export_key)).tables.client_brain);
  const cfg=sql.prepare("SELECT status,page_active FROM client_config WHERE client='frank'").get();
  assert.equal(cfg.status,'archived');assert.equal(cfg.page_active,0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_brain WHERE client_id='frank'").get().n,1,'data kept');
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_sessions WHERE client_id='frank'").get().n,0,'sessions gone');
  const after=await (await clientsGet({request:op('https://x/api/clients'),env,data:{}})).json();
  assert.deepEqual(after.clients.map(c=>c.client),['keep']);
  const again=await archiveWorkspace(env,'frank');assert.equal(again.already,true);
  const listed=await listArchives(env);assert.equal(listed[0].client,'frank');assert.equal(listed[0].exports.length,1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM operator_events WHERE action='workspace-archived'").get().n,1);
  const back=await restoreWorkspace(env,'frank');assert.equal(back.ok,true);
  assert.equal(sql.prepare("SELECT status FROM client_config WHERE client='frank'").get().status,'prospect');
});

test('API: archive and restore through the operator route; unknown client 404', async()=>{
  const post=(body)=>archivePost({request:op('https://x/api/workspace-archive',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),env,data:{}});
  let r=await (await post({client:'frank',action:'archive'})).json();assert.equal(r.ok,true);assert.ok(r.export_key);assert.equal(r.bundle,undefined,'bundle not echoed');
  r=await (await post({client:'frank',action:'restore'})).json();assert.equal(r.ok,true);
  assert.equal((await post({client:'ghost',action:'archive'})).status,404);
  assert.equal((await post({client:'frank',action:'nuke'})).status,422);
});


test('archive fails closed without storage and restores unpublished client status exactly', async()=>{
  await assert.rejects(archiveWorkspace({...env,MEDIA:null},'keep'),/storage/);
  sql.prepare("UPDATE client_config SET page_active=0,portal_token_hash='private' WHERE client='keep'").run();
  await archiveWorkspace(env,'keep');
  assert.equal(sql.prepare("SELECT portal_token_hash FROM client_config WHERE client='keep'").get().portal_token_hash,null);
  await restoreWorkspace(env,'keep');
  const row=sql.prepare("SELECT status,page_active FROM client_config WHERE client='keep'").get();
  assert.equal(row.status,'client');assert.equal(row.page_active,0);
});


import {resolveTokenAccess} from '../functions/_shared/client-auth.js';
import {sha256Hex} from '../functions/_shared/common.js';
test('archived status rejects a private link even if a stale hash survived',async()=>{
  sql.prepare("UPDATE client_config SET status='archived',portal_token_hash=? WHERE client='keep'").run(await sha256Hex('stale-private-link'));
  assert.equal(await resolveTokenAccess(new Request('https://test/api/account',{headers:{'x-portal-token':'stale-private-link'}}),env),null);
});
test('failed archive export leaves state and access untouched',async()=>{
  sql.prepare("UPDATE client_config SET status='client',portal_token_hash='still-valid' WHERE client='keep'").run();
  await assert.rejects(archiveWorkspace({...env,MEDIA:{async put(){throw Error('unavailable')}}},'keep'),/unavailable/);
  assert.equal(sql.prepare("SELECT portal_token_hash FROM client_config WHERE client='keep'").get().portal_token_hash,'still-valid');
  assert.equal(sql.prepare("SELECT status FROM client_config WHERE client='keep'").get().status,'client');
});

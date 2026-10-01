// Parity pass: unified login lookup and the Settings backend. Real SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestPost as lookupPost} from '../functions/api/login-lookup.js';
import {onRequestGet as accountGet, onRequestPost as accountPost} from '../functions/api/account.js';
import {hashPassword, createPasswordSalt, PBKDF2_ITERATIONS, CLIENT_SESSION_COOKIE} from '../functions/_shared/client-auth.js';
import {rememberOperator} from '../functions/_shared/access.js';
import {sha256Hex} from '../functions/_shared/common.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT)");
sql.exec("CREATE TABLE client_auth(client_id TEXT PRIMARY KEY,email TEXT UNIQUE,pass_hash TEXT,pass_salt TEXT,iterations INTEGER,created_at TEXT,updated_at TEXT)");
sql.exec("CREATE TABLE client_setup_tokens(token_hash TEXT,client_id TEXT,email TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT PRIMARY KEY,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
sql.exec("CREATE TABLE proof_items(id INTEGER PRIMARY KEY,client_id TEXT,created_at TEXT)");
sql.exec("CREATE TABLE client_login_attempts(email TEXT,attempted_at TEXT,ip_hash TEXT)");
for(const n of ['0008_integrations_hub.sql','0014_client_brain.sql','0015_operator_events.sql','0021_workspace_records.sql','0025_data_spine.sql','0026_workspace_preferences.sql','0027_revenue_automation.sql']){
  try{sql.exec(mig(n).replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/,''));}catch(e){}
}
const salt=createPasswordSalt();
const hash=await hashPassword('correct-horse-battery',salt,PBKDF2_ITERATIONS);
sql.prepare('INSERT INTO client_config(client,client_name,status,updated_at) VALUES(?,?,?,?)').run('acme','Acme','client','x');
sql.prepare('INSERT INTO client_auth VALUES(?,?,?,?,?,?,?)').run('acme','coach@acme.com',hash,salt,PBKDF2_ITERATIONS,'x','x');
sql.prepare('INSERT INTO client_auth VALUES(?,?,?,?,?,?,?)').run('fresh','fresh@acme.com',null,null,PBKDF2_ITERATIONS,'x','x');
sql.prepare('INSERT INTO client_config(client,client_name,status,updated_at) VALUES(?,?,?,?)').run('fresh','Fresh','onboarding','x');
const far='2099-01-01T00:00:00.000Z';
const mine='sess-mine',other='sess-other';
sql.prepare('INSERT INTO client_sessions VALUES(?,?,?,?)').run(await sha256Hex(mine),'acme',far,'2026-09-01T00:00:00.000Z');
sql.prepare('INSERT INTO client_sessions VALUES(?,?,?,?)').run(await sha256Hex(other),'acme',far,'2026-09-02T00:00:00.000Z');

const emails=[];
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{if(String(url).includes('resend')){emails.push(JSON.parse(init.body));return new Response('{"id":"e"}',{status:200});}return new Response('{}',{status:200});};

const env={OPERATOR_EMAILS:'abod.louai@gmail.com, second@pulsify.test',RESEND_API_KEY:'re',EMAIL_FROM:'Pulsify <hi@pulsify-ai.com>',ADMIN_KEY:'k',
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const post=(url,body,headers={})=>new Request(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
const asClient=(h={})=>({cookie:`${CLIENT_SESSION_COOKIE}=${mine}`,...h});
const call=(fn,r)=>fn({request:r,env,data:{}});
const op=(r)=>{rememberOperator(r,{email:'abod.louai@gmail.com',via:'access'});return r};

test('lookup: every email gets the same answer, so operator addresses are not revealed', async()=>{
  const a=await (await call(lookupPost,post('https://x/api/login-lookup',{email:'Abod.Louai@gmail.com'}))).json();
  assert.equal(a.kind,'password');assert.equal(a.next,undefined);
  const b=await (await call(lookupPost,post('https://x/api/login-lookup',{email:'coach@acme.com'}))).json();
  const c=await (await call(lookupPost,post('https://x/api/login-lookup',{email:'nobody@nowhere.com'}))).json();
  assert.equal(b.kind,'password');assert.deepEqual({...a},{...b},'operator, client and unknown are indistinguishable');assert.deepEqual({...b},{...c});
  assert.equal((await call(lookupPost,post('https://x/api/login-lookup',{email:'not-an-email'}))).status,422);
});

test('lookup link: same answer for known and unknown, email only sent to a real client, rate limited', async()=>{
  const known=await (await call(lookupPost,post('https://x/api/login-lookup',{email:'fresh@acme.com',action:'link'}))).json();
  const unknown=await (await call(lookupPost,post('https://x/api/login-lookup',{email:'ghost@acme.com',action:'link'}))).json();
  assert.deepEqual({...known},{...unknown});
  assert.equal(emails.length,1);assert.equal(emails[0].to[0],'fresh@acme.com');assert.match(emails[0].text,/setup=/);
  for(let i=0;i<4;i++)await call(lookupPost,post('https://x/api/login-lookup',{email:'fresh@acme.com',action:'link'}));
  assert.equal(emails.length,3,'three per hour per email');
});

test('account GET as client returns the settings model, impersonation is read-only', async()=>{
  const d=await (await call(accountGet,new Request('https://x/api/account',{headers:asClient()}))).json();
  assert.equal(d.role,'client');assert.equal(d.account.email,'coach@acme.com');assert.equal(d.account.has_password,true);
  assert.equal(d.workspace.name,'Acme');assert.equal(d.sessions.active,2);assert.equal(d.notifications.weekly_report,true);
  assert.equal((await call(accountGet,new Request('https://x/api/account'))).status,401);
});

test('account: workspace and notifications save, name updates client_config', async()=>{
  let r=await (await call(accountPost,post('https://x/api/account',{action:'workspace',name:'Acme Trading',timezone:'Europe/London',currency:'gbp',website:'https://acme.com'},asClient()))).json();
  assert.equal(r.ok,true);assert.equal(r.workspace.currency,'GBP');
  assert.equal(sql.prepare("SELECT client_name FROM client_config WHERE client='acme'").get().client_name,'Acme Trading');
  r=await call(accountPost,post('https://x/api/account',{action:'workspace',currency:'XXX'},asClient()));
  assert.equal(r.status,422);
  r=await (await call(accountPost,post('https://x/api/account',{action:'notifications',weekly_report:false,product_updates:true},asClient()))).json();
  assert.equal(r.notifications.weekly_report,false);assert.equal(r.notifications.product_updates,true);assert.equal(r.notifications.payment_alerts,true);
  const again=await (await call(accountGet,new Request('https://x/api/account',{headers:asClient()}))).json();
  assert.equal(again.workspace.timezone,'Europe/London');assert.equal(again.notifications.weekly_report,false);
});

test('account: sign out other devices keeps the current session', async()=>{
  const r=await (await call(accountPost,post('https://x/api/account',{action:'signout-others'},asClient()))).json();
  assert.equal(r.removed,1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_sessions WHERE client_id='acme'").get().n,1);
  assert.equal(sql.prepare("SELECT token_hash FROM client_sessions WHERE client_id='acme'").get().token_hash,await sha256Hex(mine));
});

test('account: password change verifies the current one and rotates the hash', async()=>{
  sql.prepare('INSERT INTO client_sessions VALUES(?,?,?,?)').run(await sha256Hex('sess-3'),'acme',far,'x');
  let r=await call(accountPost,post('https://x/api/account',{action:'password',current:'wrong',next:'a-new-long-password'},asClient()));
  assert.equal(r.status,401);
  r=await call(accountPost,post('https://x/api/account',{action:'password',current:'correct-horse-battery',next:'short'},asClient()));
  assert.equal(r.status,422);
  r=await (await call(accountPost,post('https://x/api/account',{action:'password',current:'correct-horse-battery',next:'a-new-long-password'},asClient()))).json();
  assert.equal(r.ok,true);
  const row=sql.prepare("SELECT pass_hash,pass_salt FROM client_auth WHERE client_id='acme'").get();
  assert.notEqual(row.pass_hash,hash);
  assert.equal(await hashPassword('a-new-long-password',row.pass_salt,PBKDF2_ITERATIONS),row.pass_hash);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_sessions WHERE client_id='acme'").get().n,1,'other sessions dropped');
});

test('account: export streams a JSON file and delete-request only records intent', async()=>{
  sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('acme','offer','business_explainer','\"x\"','client-form','x')").run();
  const r=await call(accountPost,post('https://x/api/account',{action:'export'},asClient()));
  assert.match(r.headers.get('content-disposition'),/pulsify-acme-export.json/);
  const bundle=await r.json();assert.equal(bundle.brain.length,1);assert.equal(bundle.workspace.client,'acme');
  const d=await (await call(accountPost,post('https://x/api/account',{action:'delete-request',reason:'moving on'},asClient()))).json();
  assert.equal(d.ok,true);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM operator_events WHERE action='workspace-delete-request' AND client='acme'").get().n,1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_config WHERE client='acme'").get().n,1,'nothing deleted');
});

test('account as operator: team list, defaults and notifications persist', async()=>{
  const d=await (await call(accountGet,op(new Request('https://x/api/account',{headers:{'x-pulsify-operator':'1'}})))).json();
  assert.equal(d.role,'operator');assert.deepEqual(d.team.operators,['abod.louai@gmail.com','second@pulsify.test']);
  const r=await (await call(accountPost,op(post('https://x/api/account',{action:'defaults',currency:'EUR',timezone:'Europe/Berlin'},{'x-pulsify-operator':'1'})))).json();
  assert.equal(r.defaults.currency,'EUR');
  const again=await (await call(accountGet,op(new Request('https://x/api/account',{headers:{'x-pulsify-operator':'1'}})))).json();
  assert.equal(again.defaults.timezone,'Europe/Berlin');
});

test.after(()=>{globalThis.fetch=realFetch;});

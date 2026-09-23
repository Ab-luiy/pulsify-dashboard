// Delivery automations: pre-call briefs, Fathom call import, Monday report
// drafts. Model and Fathom are mocked; every automation is idempotent and
// nothing is ever sent to a client without the founder.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {briefBooking, briefPendingBookings, importFathomCalls, draftWeeklyReports} from '../functions/_shared/delivery-automation.js';
import {runAutomation} from '../workers/sync/src/index.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT);
CREATE TABLE leads(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,email TEXT,name TEXT,revenue TEXT,situation TEXT,applied_at TEXT,status TEXT,source TEXT,answers_json TEXT,utm_json TEXT);
CREATE TABLE watch_events(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,email TEXT,event TEXT,percent INTEGER,watch_seconds REAL,at TEXT);
CREATE TABLE page_events(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,email TEXT,event TEXT,visitor_id TEXT,session_id TEXT,at TEXT);
CREATE TABLE call_notes(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,call_date TEXT,title TEXT,summary TEXT,decisions TEXT,actions TEXT,recording_url TEXT,created_at TEXT);
CREATE TABLE email_drafts(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,subject TEXT,body TEXT,tag_id TEXT,status TEXT,created_at TEXT,sent_at TEXT);
CREATE TABLE payments(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,amount_cents INTEGER,refunded_cents INTEGER DEFAULT 0,occurred_at TEXT);
CREATE TABLE content_items(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,title TEXT,stage TEXT,updated_at TEXT);
CREATE TABLE studio_sequences(id INTEGER PRIMARY KEY AUTOINCREMENT,client_id TEXT,status TEXT,updated_at TEXT);
CREATE TABLE client_auth(client_id TEXT PRIMARY KEY,email TEXT);
CREATE TABLE client_brain(client_id TEXT,section TEXT,field TEXT,value_json TEXT);
CREATE TABLE client_provisioning(client_id TEXT PRIMARY KEY,provisioned_at TEXT);`);
for(const n of ['0008_integrations_hub.sql','0027_revenue_automation.sql','0031_notifications.sql','0036_automation_runs.sql'])for(const st of mig(n).replace(/--[^\n]*/g,'').split(';'))if(st.trim())try{sql.exec(st);}catch{}
const now=Date.now(),iso=t=>new Date(t).toISOString();
sql.prepare("INSERT INTO client_config VALUES('acme','Acme Coaching','client','x',NULL)").run();
sql.prepare("INSERT INTO client_auth VALUES('acme','coach@acme.com')").run();
sql.prepare("INSERT INTO client_brain VALUES('acme','offer','price','\"$5,000 mentorship\"')").run();
sql.prepare("INSERT INTO leads(client,email,name,revenue,situation,applied_at,source,answers_json) VALUES('acme','lead@x.com','Lead Person','$4k/mo','Stuck at 4k','2026-09-20','typeform',?)").run(JSON.stringify({goal:'Hit 10k a month'}));
sql.prepare("INSERT INTO watch_events(client,email,event,percent,watch_seconds,at) VALUES('acme','lead@x.com','play',82,600,?)").run(iso(now));
let prompts=[];
const env={AI:{async run(model,input){prompts.push(input.messages.at(-1).content);return {response:'WANT: 10k a month\nNEED: a working funnel\nLEAD WITH: the 82% watch\nAVOID: none visible\nCLOSE ON: proof\nQUALIFICATION: strong\nMONEY: $4k/mo'};}},
  FATHOM_API_KEY:'fk',
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const count=(t,w='1=1')=>sql.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${w}`).get().n;

test('a booking gets one brief, built from the application and watch data, filed and announced', async()=>{
  const start=iso(now+86400000);
  const r=await briefBooking(env,{clientId:'acme',eventId:'bk1',email:'Lead@X.com',name:'',startsAt:start,provider:'calendly'});
  assert.equal(r.ok,true);assert.equal(r.provider,'workers-ai');
  assert.match(prompts[0],/Stated revenue: \$4k\/mo/);assert.match(prompts[0],/Watched up to 82%/);assert.match(prompts[0],/\$5,000 mentorship/);
  const note=sql.prepare("SELECT * FROM call_notes WHERE client='acme'").get();
  assert.equal(note.title,'Pre-call brief: Lead Person');assert.match(note.summary,/^WANT: 10k a month/);assert.match(note.summary,/Lead facts/);
  assert.equal(count('notifications',"kind='brief' AND scope='operator'"),1);assert.equal(count('notifications',"kind='brief' AND scope='client'"),1);
  assert.equal(await briefBooking(env,{clientId:'acme',eventId:'bk1',email:'lead@x.com',startsAt:start,provider:'calendly'}),null,'never twice');
});

test('the sweep briefs missed future bookings and skips cancellations and past calls', async()=>{
  const add=(id,status,start)=>sql.prepare("INSERT INTO integration_events(provider,kind,client,external_id,payload_summary_json,ts) VALUES('calcom','booking','acme',?,?,?)").run(id,JSON.stringify({email:'lead@x.com',name:'Lead Person',status,starts_at:start}),iso(now));
  add('c1','BOOKING_CREATED',iso(now+3600000));add('c2','BOOKING_CANCELLED',iso(now+3600000));add('c3','BOOKING_CREATED',iso(now-3600000));
  assert.equal(await briefPendingBookings(env,{now}),1);
  assert.equal(await briefPendingBookings(env,{now}),0);
});

test('without any model the brief still files the raw lead facts', async()=>{
  const bare={...env,AI:undefined};
  const r=await briefBooking(bare,{clientId:'acme',eventId:'bk-raw',email:'lead@x.com',startsAt:iso(now+7200000),provider:'calendly'});
  assert.equal(r.provider,'none');
  assert.match(sql.prepare("SELECT summary FROM call_notes WHERE title LIKE 'Pre-call brief%' ORDER BY id DESC").get().summary,/^Lead facts/);
});

test('Fathom calls with a client invitee land in call notes once', async()=>{
  const fetcher=async(url,init)=>{assert.match(url,/api\.fathom\.ai\/external\/v1\/meetings/);assert.equal(init.headers['X-Api-Key'],'fk');
    return new Response(JSON.stringify({items:[
      {recording_id:77,meeting_title:'Week 1 game plan',url:'https://fathom.video/calls/77',scheduled_start_time:iso(now),calendar_invitees:[{email:'coach@acme.com'},{email:'founder@pulsify.test'}],default_summary:{markdown_formatted:'## Summary\nAgreed the offer.'},action_items:[{description:'Send credentials',assignee:{name:'Acme'}}]},
      {recording_id:78,meeting_title:'Random call',calendar_invitees:[{email:'stranger@x.com'}]}],next_cursor:null}),{status:200});};
  assert.equal(await importFathomCalls(env,{now,fetcher}),1);
  assert.equal(await importFathomCalls(env,{now,fetcher}),0,'idempotent');
  const note=sql.prepare("SELECT * FROM call_notes WHERE title='Week 1 game plan'").get();
  assert.equal(note.client,'acme');assert.match(note.actions,/Send credentials \(Acme\)/);assert.equal(note.recording_url,'https://fathom.video/calls/77');
});

test('Monday reports are drafts for active clients, never sent, once per week', async()=>{
  sql.prepare("INSERT INTO payments(client,amount_cents,occurred_at) VALUES('acme',500000,?)").run(iso(now-86400000));
  prompts=[];
  assert.equal(await draftWeeklyReports(env,{now}),1);
  assert.equal(await draftWeeklyReports(env,{now}),0);
  const d=sql.prepare("SELECT * FROM email_drafts WHERE client='acme'").get();
  assert.equal(d.status,'draft');assert.match(d.subject,/Acme Coaching/);
  assert.match(prompts[0],/"cash_cents":500000/);assert.match(prompts[0],/Attributable revenue to date: 5000.00/);
});

test('the Worker only calls the automations endpoint with the shared secret', async()=>{
  assert.equal((await runAutomation({},'fathom')).ok,false);
  let seen;const r=await runAutomation({AUTOMATION_SECRET:'s3',PAGES_ORIGIN:'https://pulsify-ai.com/'},'fathom',async(url,init)=>{seen={url,init};return new Response('{"ok":true,"count":0}');});
  assert.equal(r.ok,true);assert.equal(seen.url,'https://pulsify-ai.com/api/automations');assert.equal(seen.init.headers['x-automation-secret'],'s3');
});

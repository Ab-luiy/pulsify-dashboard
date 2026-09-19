// Phase 4: provisioning (three triggers, idempotent), welcome email retries,
// checklist auto-complete rules, pipeline touches, voice note apply. Real SQLite.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {provisionClient} from '../functions/_shared/provisioning.js';
import {STEPS, loadChecklist, setStep, autoComplete} from '../functions/_shared/checklist.js';
import {recordTouch, listContacts, backfillFromIntegrationEvents} from '../functions/_shared/pipeline-touches.js';
import {welcomeEmail} from '../functions/_shared/welcome-email.js';
import {onRequestGet as provisionGet, onRequestPost as provisionPost} from '../functions/api/provision.js';
import {onRequestGet as checklistGet, onRequestPost as checklistPost} from '../functions/api/checklist.js';
import {onRequestGet as pipelineGet, onRequestPost as pipelinePost} from '../functions/api/pipeline.js';
import {MAX_AUDIO_BYTES, onRequestPost as voicePost} from '../functions/api/voice-note.js';
import {loadCandidates} from '../functions/_shared/payment-matching.js';
import {processNormalizedPayment} from '../functions/_shared/payments.js';
import {rememberOperator} from '../functions/_shared/access.js';
import {sha256Hex} from '../functions/_shared/common.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT)");
sql.exec("CREATE TABLE client_auth(client_id TEXT PRIMARY KEY,email TEXT UNIQUE,pass_hash TEXT,pass_salt TEXT,iterations INTEGER,created_at TEXT,updated_at TEXT)");
sql.exec("CREATE TABLE client_setup_tokens(token_hash TEXT,client_id TEXT,email TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
sql.exec("CREATE TABLE proof_items(id INTEGER PRIMARY KEY,client_id TEXT,created_at TEXT)");
sql.exec("CREATE TABLE studio_sequences(id INTEGER PRIMARY KEY,client_id TEXT,status TEXT)");
for(const n of ['0007_delivery_failures.sql','0008_integrations_hub.sql','0014_client_brain.sql','0015_operator_events.sql','0021_workspace_records.sql','0025_data_spine.sql','0027_revenue_automation.sql','0028_onboarding.sql']){
  sql.exec(mig(n).replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/,''));
}
sql.prepare('INSERT INTO client_config VALUES(?,?,?,?,?)').run('acme','Acme','prospect','2026-09-19',await sha256Hex('token-acme'));

const emails=[];let failNext=0;
const fetcher=async(url,init)=>{if(String(url).includes('resend')){if(failNext>0){failNext--;return new Response('nope',{status:500});}emails.push(JSON.parse(init.body));return new Response('{"id":"e1"}',{status:200});}return new Response('{}',{status:200});};
const env={
  RESEND_API_KEY:'re_test',EMAIL_FROM:'Pulsify <hello@pulsify-ai.com>',INTEGRATION_ENCRYPTION_KEY:Buffer.from(new Uint8Array(32)).toString('base64'),ADMIN_KEY:'k',
  MEDIA:{async put(){return {};},async delete(){}},
  AI:{async run(){return {text:'I sell a mentorship for day traders who blow accounts on revenge trades.'};}},
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}
};
const sleep=async()=>{};
const op=(url,init={})=>{const r=new Request(url,init);rememberOperator(r,{email:'op@test',via:'access'});return r};
const call=(fn,r)=>fn({request:r,env,data:{}});

// ---------- provisioning: three triggers, one outcome ----------
let r=await provisionClient(env,{source:'payment',client:'acme',email:'Owner@Acme.com',name:'Ada Owner',contractRef:'stripe:pi_1',origin:'https://pulsify-ai.com',actor:'webhook:stripe',fetcher,sleep});
assert.equal(r.ok,true);assert.equal(r.duplicate,false);assert.equal(r.welcome_state,'sent');assert.match(r.setup_link,/\/portal\/register\?client=acme&setup=/);
assert.equal(sql.prepare("SELECT status FROM client_config WHERE client='acme'").get().status,'onboarding');
assert.equal(sql.prepare("SELECT email FROM client_auth WHERE client_id='acme'").get().email,'owner@acme.com');
assert.equal(sql.prepare("SELECT COUNT(*) c FROM checklist_steps WHERE client_id='acme'").get().c,STEPS.length);
assert.equal(sql.prepare("SELECT COUNT(*) c FROM webhook_outbox WHERE event='client.provisioned'").get().c,1);
assert.equal(emails.length,1);assert.match(emails[0].subject,/workspace is ready/);assert.match(emails[0].text,/portal\/register/);assert.equal(emails[0].to[0],'owner@acme.com');
// second and third triggers are no-ops
r=await provisionClient(env,{source:'docusign',client:'acme',email:'owner@acme.com',contractRef:'env_1',fetcher,sleep});assert.equal(r.duplicate,true);
r=await provisionClient(env,{source:'operator',client:'',email:'owner@acme.com',fetcher,sleep});assert.equal(r.duplicate,true);assert.equal(r.client,'acme');
assert.equal(emails.length,1);assert.equal(sql.prepare("SELECT COUNT(*) c FROM webhook_outbox WHERE event='client.provisioned'").get().c,1);
// a brand new email with no workspace creates one
r=await provisionClient(env,{source:'operator',client:'',email:'new@person.com',name:'New Person',fetcher,sleep,actor:'op@test'});
assert.equal(r.ok,true);assert.match(r.client,/^client-[0-9a-f]{24}$/);assert.equal(sql.prepare("SELECT status FROM client_config WHERE client=?").get(r.client).status,'onboarding');
// welcome retries: two failures then success
failNext=2;r=await provisionClient(env,{source:'operator',client:'',email:'retry@person.com',fetcher,sleep});assert.equal(r.welcome_state,'sent');
assert.equal(sql.prepare("SELECT welcome_attempts FROM client_provisioning WHERE email='retry@person.com'").get().welcome_attempts,3);
// three failures => failed + delivery_failures row
failNext=3;r=await provisionClient(env,{source:'operator',client:'',email:'dead@person.com',fetcher,sleep});assert.equal(r.welcome_state,'failed');
assert.equal(sql.prepare("SELECT COUNT(*) c FROM delivery_failures WHERE kind='welcome_email'").get().c,1);
// operator API
r=await call(provisionPost,op('https://t/api/provision',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client:'acme',email:'owner@acme.com'})}));assert.equal(r.status,200);assert.equal((await r.json()).duplicate,true);
r=await call(provisionGet,op('https://t/api/provision?client=acme'));assert.equal((await r.json()).provisioning[0].source,'payment');
assert.equal((await provisionGet({request:new Request('https://t/api/provision'),env,data:{}})).status,401);
console.log('PASS provisioning: three triggers idempotent, one email, one event, status onboarding, new workspace by email, welcome retries and failure record, operator API');

// ---------- welcome email rendering ----------
const mail=welcomeEmail({firstName:'Ada',setupLink:'https://x/portal/register?client=a&setup=t',bookingLine:''});
assert.match(mail.subject,/ready/);assert.match(mail.text,/^Hey Ada,/);assert.ok(!mail.text.includes('{{'));assert.match(mail.html,/<a href="https:\/\/x\/portal\/register/);
console.log('PASS welcome email: template substitution, no leftover placeholders, link rendered');

// ---------- checklist: auto-complete rules ----------
let c=await loadChecklist(env,'acme');assert.equal(c.done,0);assert.equal(c.total,8);
sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('acme','icp','avatar','\"Traders\"','client-form','x')").run();
sql.prepare("INSERT INTO proof_items(client_id,created_at) VALUES('acme','x')").run();
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,secret_json,created_at,updated_at) VALUES('client','acme','stripe','{}','{\"api_key\":\"rk\"}','x','x')").run();
let done=await autoComplete(env,'acme');assert.deepEqual(done.sort(),['connect-payments','first-proof','who-you-sell-to']);
c=await loadChecklist(env,'acme');assert.equal(c.done,3);assert.equal(c.steps.find(s=>s.id==='first-proof').completed_by,'system');
assert.equal(sql.prepare("SELECT COUNT(*) c FROM webhook_outbox WHERE event='client.checklist_step_completed'").get().c,3);
// skip is allowed and does not emit
r=await setStep(env,'acme','connect-instagram','skipped','client:acme');assert.equal(r.ok,true);
assert.equal(sql.prepare("SELECT COUNT(*) c FROM webhook_outbox WHERE event='client.checklist_step_completed'").get().c,3);
// ship-it completes on live sequence, and finishing all flips status to client
sql.prepare("INSERT INTO studio_sequences(client_id,status) VALUES('acme','live')").run();
sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('acme','offer','business_explainer','\"Mentorship\"','voice-note','x')").run();
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,secret_json,created_at,updated_at) VALUES('client','acme','instagram','{\"handle\":\"acme\"}','{}','x','x'),('client','acme','youtube','{\"handle\":\"acme\"}','{}','x','x')").run();
r=await call(checklistGet,op('https://t/api/checklist?client=acme'));let body=await r.json();assert.equal(body.done,7);assert.equal(body.steps.find(s=>s.id==='connect-instagram').state,'skipped');
sql.prepare("UPDATE integrations SET config_json='{\"confirmed\":\"true\",\"handle\":\"acme\"}' WHERE client_id='acme' AND provider='instagram'").run();
r=await call(checklistGet,op('https://t/api/checklist?client=acme'));body=await r.json();assert.equal(body.done,8);
assert.equal(sql.prepare("SELECT status FROM client_config WHERE client='acme'").get().status,'client');
// client can read and mark its own; cannot touch another client
r=await checklistGet({request:new Request('https://t/api/checklist?client=acme',{headers:{'x-portal-token':'token-acme'}}),env,data:{}});assert.equal(r.status,200);
r=await checklistPost({request:new Request('https://t/api/checklist',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-acme'},body:JSON.stringify({client:'other',step:'ship-it'})}),env,data:{}});assert.equal(r.status,403);
r=await checklistPost({request:new Request('https://t/api/checklist',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-acme'},body:JSON.stringify({client:'acme',step:'nope'})}),env,data:{}});assert.equal(r.status,422);
console.log('PASS checklist: 8 seeded, auto-complete from brain/proof/integrations/sequences, skip silent, all-done flips status, tenant scope, validation');

// ---------- pipeline touches: one person, many events ----------
await recordTouch(env,{client:'acme',email:'Lead@X.com',name:'Lead Person',kind:'optin',ts:'2026-09-01T00:00:00Z',source:'landing',externalId:'optin:lead@x.com'});
await recordTouch(env,{client:'acme',email:'lead@x.com',name:'Lead Person',kind:'application',ts:'2026-09-02T00:00:00Z',source:'typeform',externalId:'tf_1'});
await recordTouch(env,{client:'acme',email:'lead@x.com',kind:'booking',ts:'2026-09-03T00:00:00Z',source:'calcom',externalId:'bk_1'});
const dup=await recordTouch(env,{client:'acme',email:'lead@x.com',kind:'booking',ts:'2026-09-03T00:00:00Z',source:'calcom',externalId:'bk_1'});assert.equal(dup.inserted,false);
await recordTouch(env,{client:'other',email:'lead@x.com',kind:'application',ts:'2026-09-04T00:00:00Z',source:'typeform',externalId:'tf_9'});
let contacts=await listContacts(env,'acme');assert.equal(contacts.length,1);assert.equal(contacts[0].stage,'Booked');assert.equal(contacts[0].applications,1);assert.equal(contacts[0].latest_kind,'booking');
await recordTouch(env,{client:'acme',email:'lead@x.com',kind:'payment',ts:'2026-09-05T00:00:00Z',source:'stripe',externalId:'stripe:pi_9',amountCents:150000});
contacts=await listContacts(env,'acme');assert.equal(contacts[0].stage,'Paid');assert.equal(contacts[0].paid_cents,150000);
// backfill from integration_events is idempotent
sql.prepare("INSERT INTO integration_events(provider,kind,client,external_id,payload_summary_json,ts) VALUES('landing','application','acme','tf_old','{\"email\":\"old@x.com\",\"name\":\"Old\"}','2026-08-01T00:00:00Z')").run();
assert.equal(await backfillFromIntegrationEvents(env,'acme'),1);assert.equal(await backfillFromIntegrationEvents(env,'acme'),0);
// touches feed payment matching candidates
const cands=await loadCandidates(env,'acme');assert.ok(cands.some(x=>x.kind==='contact_email'&&x.email==='lead@x.com'&&x.eventKind==='booking'));
// API
r=await call(pipelineGet,op('https://t/api/pipeline?client=acme&q=lead'));assert.equal((await r.json()).contacts.length,1);
r=await call(pipelineGet,op('https://t/api/pipeline?client=acme&email=lead@x.com'));assert.equal((await r.json()).touches.length,4);
r=await pipelinePost({request:new Request('https://t/api/pipeline',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-acme'},body:JSON.stringify({client:'acme',action:'backfill'})}),env,data:{}});assert.equal(r.status,403);
console.log('PASS pipeline touches: one row per contact, stage ladder, dedupe, tenant isolation, backfill idempotent, candidates for matching, API scope');

// An already-onboarding client payment records the buyer touch but cannot
// rotate setup credentials or send another Pulsify welcome.
const emailCount=emails.length;
r=await processNormalizedPayment(env,{client:'acme',amountCents:250000,currency:'USD',rail:'stripe',reference:'stripe:phase4-gate',recordedBy:'webhook:stripe',customerEmail:'lead@x.com',customerName:'Lead Person',origin:'https://pulsify-ai.com'});
assert.equal(r.ok,true);assert.equal(r.side_effects.skipped,true);assert.equal(emails.length,emailCount);
assert.equal(sql.prepare("SELECT COUNT(*) c FROM pipeline_touches WHERE client_id='acme' AND kind='payment' AND external_id='stripe:phase4-gate'").get().c,1);
console.log('PASS payment provision gate: non-prospect revenue records a touch without reprovisioning or another welcome');

// ---------- voice note: upload, transcribe, apply to brain ----------
const fd=new FormData();fd.set('client','acme');fd.set('file',new File([new Uint8Array(1024)],'note.webm',{type:'audio/webm'}));
r=await voicePost({request:new Request('https://t/api/voice-note',{method:'POST',headers:{'x-portal-token':'token-acme'},body:fd}),env,data:{}});assert.equal(r.status,201);const vn=await r.json();assert.equal(vn.state,'transcribed');assert.match(vn.transcript,/day traders/);
r=await voicePost({request:new Request('https://t/api/voice-note?action=apply',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-acme'},body:JSON.stringify({client:'acme',id:vn.id,transcript:vn.transcript,icp:'Day traders who revenge trade'})}),env,data:{}});assert.equal(r.status,200);
assert.equal(JSON.parse(sql.prepare("SELECT value_json FROM client_brain WHERE client_id='acme' AND section='icp' AND field='avatar'").get().value_json),'Day traders who revenge trade');
assert.equal(sql.prepare("SELECT source FROM client_brain WHERE client_id='acme' AND section='offer' AND field='business_explainer'").get().source,'voice-note');
const bad=new FormData();bad.set('client','acme');bad.set('file',new File([new Uint8Array(10)],'x.txt',{type:'text/plain'}));
r=await voicePost({request:new Request('https://t/api/voice-note',{method:'POST',headers:{'x-portal-token':'token-acme'},body:bad}),env,data:{}});assert.equal(r.status,415);
const huge=new FormData();huge.set('client','acme');huge.set('file',new File([new Uint8Array(MAX_AUDIO_BYTES+1)],'huge.webm',{type:'audio/webm'}));
r=await voicePost({request:new Request('https://t/api/voice-note',{method:'POST',headers:{'x-portal-token':'token-acme'},body:huge}),env,data:{}});assert.equal(r.status,413);
console.log('PASS voice note: upload to R2, Whisper transcript, apply to offer and icp with voice-note source, type and memory-bound size validation');

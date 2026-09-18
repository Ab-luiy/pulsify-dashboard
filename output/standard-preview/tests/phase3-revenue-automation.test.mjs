// Phase 3: Push API, outbound webhooks, payment matching. Real SQLite.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestPost as ingestPost} from '../functions/api/v1/ingest.js';
import {onRequestGet as keysGet, onRequestPost as keysPost, onRequestDelete as keysDelete} from '../functions/api/api-keys.js';
import {onRequestGet as hooksGet, onRequestPost as hooksPost, onRequestPatch as hooksPatch, onRequestDelete as hooksDelete} from '../functions/api/webhooks.js';
import {onRequestGet as matchGet, onRequestPost as matchPost} from '../functions/api/payment-matches.js';
import {onRequestGet as integrationsGet, onRequestPost as integrationsPost} from '../functions/api/integrations.js';
import {onRequestGet as clientDashboardGet} from '../functions/api/client-dashboard.js';
import {onRequestGet as conversationsGet} from '../functions/api/spine/conversations.js';
import {fanOut, deliverDue, signBody, MAX_ATTEMPTS} from '../functions/_shared/outbound-webhooks.js';
import {matchPayment, rankCandidates, revenueKpis, applyRefund} from '../functions/_shared/payment-matching.js';
import {normalizeStripePayment, normalizeStripeRefund, normalizeWhopPayment, normalizeWhopRefund} from '../functions/_shared/hooks.js';
import {syncPayments} from '../workers/sync/src/jobs/payments.js';
import {rememberOperator} from '../functions/_shared/access.js';
import {sha256Hex} from '../functions/_shared/common.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT)");
sql.exec("CREATE TABLE crm_added(name TEXT PRIMARY KEY,data TEXT,ts INTEGER,sts INTEGER,updated_at TEXT)");
sql.exec("CREATE TABLE crm_overrides(name TEXT PRIMARY KEY,data TEXT,ts INTEGER,sts INTEGER,updated_at TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
sql.exec("CREATE TABLE client_dashboard_content(client_id TEXT,section TEXT,json TEXT,updated_at TEXT)");
sql.exec("CREATE TABLE content_items(id INTEGER PRIMARY KEY,client TEXT,title TEXT,stage TEXT,platform TEXT,url TEXT,notes TEXT,scheduled_for TEXT,updated_at TEXT)");
for(const n of ['0008_integrations_hub.sql','0015_operator_events.sql','0021_workspace_records.sql','0025_data_spine.sql','0027_revenue_automation.sql']){
  // 0008 alters client_config status; our stub already has it, so strip that line.
  sql.exec(mig(n).replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/,''));
}
sql.prepare('INSERT INTO client_config VALUES(?,?,?,?,?)').run('acme','Acme','active','2026-09-18',await sha256Hex('token-acme'));
sql.prepare('INSERT INTO client_config VALUES(?,?,?,?,?)').run('other','Other','active','2026-09-18',await sha256Hex('token-other'));
sql.prepare('INSERT INTO client_config VALUES(?,?,?,?,?)').run('pulsify','Pulsify','active','2026-09-18',null);

const env={
  INTEGRATION_ENCRYPTION_KEY:Buffer.from(new Uint8Array(32).map((_,i)=>i*7&255)).toString('base64'),
  ADMIN_KEY:'automation-test',
  DB:{
    prepare(query){let args=[];const p={bind(...v){args=v;return p},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}}}};return p},
    async batch(list){const out=[];for(const s of list)out.push(await s.run());return out}
  }
};
const op=(url,init={})=>{const r=new Request(url,init);rememberOperator(r,{email:'op@test',via:'access'});return r};
const call=(fn,r)=>fn({request:r,env,data:{}});

// ---------- Push API keys ----------
let r=await call(keysPost,op('https://t/api/api-keys',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({scope:'operator',label:'zapier'})}));
assert.equal(r.status,201);const created=await r.json();assert.match(created.secret,/^pk_/);
r=await call(keysGet,op('https://t/api/api-keys?scope=operator'));assert.equal((await r.json()).keys[0].key_prefix,created.secret.slice(0,7));
assert.equal((await keysGet({request:new Request('https://t/api/api-keys?scope=operator'),env,data:{}})).status,401);
r=await integrationsPost({request:new Request('https://t/api/integrations',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-acme'},body:JSON.stringify({scope:'client',client:'acme',provider:'stripe',secrets:{api_key:'rk_client',path_secret:'path_client'}})}),env,data:{}});assert.equal(r.status,200);
r=await integrationsGet({request:new Request('https://t/api/integrations?scope=client&client=acme',{headers:{'x-portal-token':'token-acme'}}),env,data:{}});const clientIntegrations=await r.json();assert.equal(clientIntegrations.integrations[0].config.api_key_set,true);assert.equal(clientIntegrations.integrations[0].secrets,undefined);
r=await integrationsPost({request:new Request('https://t/api/integrations',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-acme'},body:JSON.stringify({scope:'client',client:'other',provider:'stripe',secrets:{api_key:'bad'}})}),env,data:{}});assert.equal(r.status,403);
// client-scoped key via portal token
r=await keysPost({request:new Request('https://t/api/api-keys',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-acme'},body:JSON.stringify({scope:'client',client:'acme'})}),env,data:{}});
assert.equal(r.status,201);const clientKey=(await r.json()).secret;

// ---------- Push API ingest ----------
const push=(key,body,extra={})=>ingestPost({request:new Request('https://t/api/v1/ingest',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,...extra},body:typeof body==='string'?body:JSON.stringify(body)}),env,data:{}});
assert.equal((await push('pk_bogus',{kind:'lead',data:{name:'x'}})).status,401);
assert.equal((await push(created.secret,'{bad')).status,400);
assert.equal((await push(created.secret,{kind:'nope',data:{}})).status,422);
r=await push(created.secret,{kind:'lead',external_id:'ig:frankw',data:{name:'Frank Wieler',handle:'@frankw',email:'Frank@Example.com',source:'zapier',tags:['dropshipping']}});
assert.equal(r.status,201);const lead=await r.json();assert.equal(lead.kind,'lead');
r=await push(created.secret,{kind:'lead',external_id:'ig:frankw',data:{name:'Frank Wieler'}});assert.equal(r.status,200);assert.equal((await r.json()).duplicate,true);
const crmRow=sql.prepare('SELECT data FROM crm_added WHERE name=?').get('Frank Wieler');assert.ok(crmRow);const crm=JSON.parse(crmRow.data);assert.equal(crm.h,'frankw');assert.equal(crm.stage,'New');assert.equal(crm.email,'frank@example.com');
r=await push(created.secret,{kind:'metric',data:{source:'kit',metric:'subscribers',value:120,ts:'2026-09-18T00:00:00.000Z'}});assert.equal(r.status,201);
r=await push(created.secret,{kind:'metric',data:{source:'kit',metric:'subscribers',value:120,ts:'2026-09-18T00:00:00.000Z'}});assert.equal(r.status,200);assert.equal((await r.json()).duplicate,true);
assert.equal(sql.prepare("SELECT COUNT(*) c FROM metric_points WHERE source='kit'").get().c,1);
r=await push(created.secret,{kind:'message',external_id:'igmsg:1',data:{handle:'freshlead',direction:'outbound',text:'Quick question',ts:'2026-09-18T00:01:00.000Z'}});assert.equal(r.status,201);
assert.equal(sql.prepare("SELECT COUNT(*) c FROM ig_messages WHERE text='Quick question'").get().c,1);
assert.ok(sql.prepare("SELECT data FROM crm_added WHERE name='freshlead'").get());
assert.equal(JSON.parse(sql.prepare("SELECT data FROM crm_overrides WHERE name='freshlead'").get().data).status,'sent');
r=await push(created.secret,{kind:'message',external_id:'igmsg:1',data:{handle:'freshlead',direction:'outbound',text:'Quick question',ts:'2026-09-18T00:01:00.000Z'}});assert.equal(r.status,200);
sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run('conv_unmatched','op@test','ig','u2','notyetlead','Not Yet Lead','2026-09-18T00:02:00.000Z','2026-09-18T00:02:00.000Z','inbound','{}','2026-09-18T00:02:00.000Z','2026-09-18T00:02:00.000Z');
sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)").run('msg_unmatched','conv_unmatched','op@test','inbound','2026-09-18T00:02:00.000Z','Interested','{}','2026-09-18T00:02:00.000Z');
r=await call(conversationsGet,op('https://t/api/spine/conversations?unmatched=1'));const unmatched=await r.json();assert.deepEqual(unmatched.conversations.map(row=>row.id),['conv_unmatched']);
r=await push(clientKey,{kind:'payment',data:{amount:1500,currency:'usd',reference:'inv_1',customer_email:'Buyer@Example.com',customer_name:'Buyer One'}});assert.equal(r.status,201);
const pay=sql.prepare("SELECT client,amount_cents,customer_email FROM payments WHERE reference='push:inv_1'").get();assert.equal(pay.client,'acme');assert.equal(pay.amount_cents,150000);assert.equal(pay.customer_email,'buyer@example.com');
assert.equal(sql.prepare("SELECT COUNT(*) c FROM webhook_outbox WHERE event IN ('lead.created','payment.received')").get().c,2);
assert.equal(sql.prepare("SELECT portal_token_hash FROM client_config WHERE client='acme'").get().portal_token_hash,await sha256Hex('token-acme'));
// rate limit
for(let i=0;i<40;i++)await push(created.secret,{kind:'metric',data:{source:'rl',metric:'m',value:i,ts:'2026-09-18T00:00:0'+(i%10)+'.000Z'}});
assert.equal((await push(created.secret,{kind:'lead',data:{name:'x'}},{'content-length':String(2*1024*1024)})).status,413);
console.log('PASS push api: auth, validation, lead/message -> CRM and Instagram spine, idempotency, metric dedupe, client-scoped payment, outbox events, 30/min limit, 1MB cap');

// ---------- Provider event normalization ----------
assert.equal(normalizeStripePayment({type:'charge.succeeded',id:'evt_ch',data:{object:{id:'ch_1',payment_intent:'pi_same',amount:5000,currency:'usd'}}}).reference,'stripe:pi_same');
assert.equal(normalizeStripePayment({type:'payment_intent.succeeded',id:'evt_pi',data:{object:{id:'pi_same',amount_received:5000,currency:'usd'}}}).reference,'stripe:pi_same');
const stripeCumulative=normalizeStripeRefund({type:'charge.refunded',id:'evt_ref',data:{object:{id:'ch_1',payment_intent:'pi_same',amount_refunded:2500}}});
assert.equal(stripeCumulative.mode,'absolute');assert.equal(stripeCumulative.amount_cents,2500);assert.ok(stripeCumulative.references.includes('stripe:pi_same'));
assert.equal(normalizeWhopPayment({type:'payment.succeeded',id:'msg_pay',data:{id:'pay_1',total:50,currency:'usd'}}).amount_cents,5000);
const whopRefund=normalizeWhopRefund({type:'refund.created',id:'msg_ref',data:{id:'rf_1',amount:12.34,payment:{id:'pay_1'}}});
assert.equal(whopRefund.amount_cents,1234);assert.equal(whopRefund.references[0],'whop:pay_1');
console.log('PASS provider normalization: Stripe event-family dedupe, cumulative refunds, Whop major-unit amounts and nested payment references');

// ---------- Outbound webhooks ----------
r=await call(hooksPost,op('https://t/api/webhooks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:'http://insecure.test/x',events:['lead.created']})}));assert.equal(r.status,422);
r=await call(hooksPost,op('https://t/api/webhooks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:'https://hooks.example.test/pulsify',events:['lead.created','payment.matched','bogus.event'],description:'test'})}));
assert.equal(r.status,201);const ep=await r.json();assert.deepEqual(ep.endpoint.events,['lead.created','payment.matched']);assert.match(ep.secret,/^whsec_/);
r=await call(hooksGet,op('https://t/api/webhooks'));const listed=await r.json();assert.equal(listed.endpoints.length,1);assert.equal(listed.endpoints[0].secret_enc,undefined);
// client cannot see operator endpoints
r=await hooksGet({request:new Request('https://t/api/webhooks?scope=client&client=acme',{headers:{'x-portal-token':'token-acme'}}),env,data:{}});assert.equal((await r.json()).endpoints.length,0);
// test send queues an outbox event
r=await call(hooksPost,op('https://t/api/webhooks?id='+ep.endpoint.id+'&action=test',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));assert.equal(r.status,202);
// fan out + deliver with a fake fetcher that fails twice then succeeds
const seen=[];let calls=0;
const fetcher=async(url,init)=>{calls++;seen.push({url,headers:init.headers,body:init.body});if(calls<=2)return new Response('no',{status:500});return new Response('ok',{status:200})};
const createdDeliveries=await fanOut(env);assert.ok(createdDeliveries>=2);
let t=Date.now();const clock=()=>t;
let res=await deliverDue(env,{fetcher,now:clock});assert.ok(res.due>=1);
const pending=sql.prepare("SELECT status,attempt,next_attempt_at FROM webhook_deliveries WHERE endpoint_id=? ORDER BY created_at").all(ep.endpoint.id);
assert.ok(pending.some(p=>p.status==='pending'&&p.attempt===1));
t+=5000;res=await deliverDue(env,{fetcher,now:clock});t+=5000;res=await deliverDue(env,{fetcher,now:clock});t+=5000;await deliverDue(env,{fetcher,now:clock});
const states=sql.prepare("SELECT status,attempt FROM webhook_deliveries WHERE endpoint_id=?").all(ep.endpoint.id);
assert.ok(states.every(s=>s.status==='delivered'||s.status==='failed'));assert.ok(states.every(s=>s.attempt<=MAX_ATTEMPTS));
// signature verifies with the secret handed out once
const sample=seen.find(s=>s.headers['x-pulsify-event']);assert.ok(sample);
assert.equal(sample.headers['x-pulsify-signature'],await signBody(ep.secret,sample.body));assert.ok(sample.headers['x-pulsify-delivery-id']);
const body=JSON.parse(seen.find(s=>s.body.includes('_isTest')).body);assert.equal(body.data._isTest,true);assert.ok(body.id&&body.event&&body.created_at);
// deliveries view, patch, delete
r=await call(hooksGet,op('https://t/api/webhooks?id='+ep.endpoint.id+'&view=deliveries'));assert.ok((await r.json()).deliveries.length>=2);
r=await call(hooksPatch,op('https://t/api/webhooks?id='+ep.endpoint.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({active:false})}));assert.equal(r.status,200);
r=await call(hooksDelete,op('https://t/api/webhooks?id='+ep.endpoint.id,{method:'DELETE'}));assert.equal(r.status,200);
console.log('PASS outbound webhooks: https-only, event filter, secret shown once and sealed, tenant isolation, test send, fan-out, signed delivery, 3-attempt backoff, history, patch, delete');

// ---------- Payment matching ----------
const now=new Date().toISOString();
sql.prepare("INSERT INTO workspace_records VALUES(?,?,?,?,?,?,?)").run('rec1','acme','lead','Buyer One',JSON.stringify({email:'buyer@example.com'}),now,now);
sql.prepare("INSERT INTO workspace_records VALUES(?,?,?,?,?,?,?)").run('rec2','acme','lead','Jane Someone',JSON.stringify({email:'jane@example.com'}),now,now);
sql.prepare("INSERT INTO workspace_records VALUES(?,?,?,?,?,?,?)").run('rec3','other','lead','Buyer One',JSON.stringify({email:'buyer@example.com'}),now,now);
const payment=sql.prepare("SELECT id,client,customer_email,customer_name,occurred_at FROM payments WHERE reference='push:inv_1'").get();
let m=await matchPayment(env,payment);assert.deepEqual(m,{suggested:0,confirmed:1});
const confirmed=sql.prepare("SELECT target_id,target_kind,decided_by FROM payment_matches WHERE payment_id=? AND status='confirmed'").get(payment.id);
assert.equal(confirmed.target_id,'rec1');assert.equal(confirmed.decided_by,'auto');
// cannot cross tenants: other client's record never a candidate
assert.ok(!sql.prepare("SELECT 1 FROM payment_matches WHERE payment_id=? AND target_id='rec3'").get(payment.id));
// a second confirmed row is impossible
assert.throws(()=>sql.prepare("INSERT INTO payment_matches(payment_id,client_id,target_kind,target_id,confidence,status,created_at,updated_at) VALUES(?,?,?,?,1,'confirmed',?,?)").run(payment.id,'acme','workspace_record','rec2',now,now));
// name-only payment gets suggestions, not auto
sql.prepare("INSERT INTO payments(client,amount_cents,currency,rail,reference,occurred_at,recorded_by,created_at,customer_name) VALUES(?,?,?,?,?,?,?,?,?)").run('acme',90000,'USD','stripe','stripe:pi_2',now,'webhook:stripe',now,'Jane Someone');
const p2=sql.prepare("SELECT id,client,customer_email,customer_name,occurred_at FROM payments WHERE reference='stripe:pi_2'").get();
m=await matchPayment(env,p2);assert.equal(m.confirmed,0);assert.ok(m.suggested>=1);
const ranked=rankCandidates(p2,[{kind:'workspace_record',id:'rec2',label:'Jane Someone',email:'jane@example.com',name:'Jane Someone',lastActivity:now}]);assert.equal(ranked[0].reasons[0],'exact name');
const rankedAmount=rankCandidates({...p2,amount_cents:90000},[{kind:'contact_email',id:'event-1',label:'Jane Someone',name:'Jane Someone',lastActivity:now,eventKind:'booking',expectedAmountCents:90000}]);assert.ok(rankedAmount[0].reasons.includes('exact expected amount'));
// API: suggested list, confirm, kpis, refund reverses, client read is confirmed-only
r=await call(matchGet,op('https://t/api/payment-matches?client=acme&status=suggested'));const sug=(await r.json()).matches;assert.ok(sug.length>=1);
r=await call(matchPost,op('https://t/api/payment-matches',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client:'acme',action:'confirm',match_id:sug[0].id})}));assert.equal(r.status,200);
assert.equal(sql.prepare("SELECT COUNT(*) c FROM payment_matches WHERE payment_id=? AND status='confirmed'").get(p2.id).c,1);
assert.equal(sql.prepare("SELECT COUNT(*) c FROM operator_events WHERE action='payment-confirm'").get().c,1);
let k=await revenueKpis(env,'acme');assert.equal(k.won_calls,2);assert.equal(k.cash_collected_cents,240000);assert.equal(k.avg_deal_cents,120000);
await applyRefund(env,'acme','stripe:pi_2',90000);k=await revenueKpis(env,'acme');assert.equal(k.cash_collected_cents,150000);
assert.equal((await revenueKpis(env,'other')).won_calls,0);
r=await matchGet({request:new Request('https://t/api/payment-matches?client=acme',{headers:{'x-portal-token':'token-acme'}}),env,data:{}});assert.equal((await r.json()).matches.length,2);
r=await matchGet({request:new Request('https://t/api/payment-matches?client=acme',{headers:{'x-portal-token':'token-other'}}),env,data:{}});assert.equal(r.status,403);
r=await matchPost({request:new Request('https://t/api/payment-matches',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-acme'},body:JSON.stringify({client:'acme',action:'unlink',match_id:sug[0].id})}),env,data:{}});assert.equal(r.status,403);
r=await call(matchPost,op('https://t/api/payment-matches',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client:'acme',action:'unlink',match_id:sug[0].id})}));assert.equal(r.status,200);
r=await call(matchGet,op('https://t/api/payment-matches?client=acme&status=unlinked'));assert.equal((await r.json()).payments.length,1);
r=await call(matchPost,op('https://t/api/payment-matches',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client:'acme',action:'attach',payment_id:p2.id,target:{kind:'workspace_record',id:'rec2',label:'Jane Someone'}})}));assert.equal(r.status,200);
assert.ok(sql.prepare("SELECT 1 FROM webhook_outbox WHERE event='payment.matched'").get());assert.ok(sql.prepare("SELECT 1 FROM webhook_outbox WHERE event='payment.refunded'").get());
r=await clientDashboardGet({request:new Request('https://t/api/client-dashboard',{headers:{'x-portal-token':'token-acme'}}),env,data:{}});
const dashboard=await r.json();assert.equal(dashboard.revenue.payment_count,2);assert.equal(dashboard.revenue.total_revenue_cents,150000);assert.equal(dashboard.revenue.average_deal_cents,75000);
console.log('PASS payment matching: exact-email auto, name suggestions, one confirmed per payment, tenant isolation, confirm/unlink/attach with audit, confirmed-only KPIs, refund reverses, client read scope');

// ---------- Scheduled provider imports ----------
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,secret_json,created_at,updated_at) VALUES('client','other','stripe','{}',?, ?, ?)").run(JSON.stringify({api_key:'rk_test'}),now,now);
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,secret_json,created_at,updated_at) VALUES('client','other','whop',?, ?, ?, ?)").run(JSON.stringify({company_id:'biz_1'}),JSON.stringify({api_key:'whop_test'}),now,now);
const providerFetch=async (url,init)=>{
  if(init?.headers?.authorization==='Bearer rk_client')return Response.json({data:[],has_more:false});
  if(url.includes('stripe.com/v1/payment_intents'))return Response.json({data:[{id:'pi_import',status:'succeeded',amount_received:42000,currency:'usd',created:Date.now()/1000,latest_charge:{billing_details:{email:'stripe@example.com',name:'Stripe Buyer'}}}],has_more:false});
  if(url.includes('stripe.com/v1/refunds'))return Response.json({data:[],has_more:false});
  if(url.includes('whop.com/api/v1/payments'))return Response.json({data:[{id:'pay_import',status:'succeeded',total:12.34,currency:'usd',created_at:now,paid_at:now,user:{email:'whop@example.com',name:'Whop Buyer'}}],page_info:{has_next_page:false}});
  if(url.includes('whop.com/api/v1/refunds'))return Response.json({data:[{id:'rf_import',status:'succeeded',amount:2.34,created_at:now,payment:{id:'pay_import'}}],page_info:{has_next_page:false}});
  return new Response('missing mock',{status:500});
};
assert.equal(await syncPayments(env,{fetcher:providerFetch}),3);
assert.equal(sql.prepare("SELECT amount_cents FROM payments WHERE reference='stripe:pi_import'").get().amount_cents,42000);
const importedWhop=sql.prepare("SELECT amount_cents,refunded_cents FROM payments WHERE reference='whop:pay_import'").get();assert.equal(importedWhop.amount_cents,1234);assert.equal(importedWhop.refunded_cents,234);
assert.equal(await syncPayments(env,{fetcher:providerFetch}),0);
console.log('PASS scheduled provider import: Stripe and Whop charges/refunds, units, overlap idempotency and rematch');

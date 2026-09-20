// In-house notifications: events become bell rows, dedupe on message id,
// client events copy to the operator, API scopes, mark-read, and the only
// outside channel being Discord for a lead reply. No email anywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {describeEvent, notify, listNotifications, markRead} from '../functions/_shared/notifications.js';
import {emitEvent} from '../functions/_shared/outbound-webhooks.js';
import {onRequestGet as notifGet, onRequestPost as notifPost} from '../functions/api/notifications.js';
import {notifyReply, sweepSeen} from '../workers/sync/src/jobs/outreach-notify.js';
import {rememberOperator} from '../functions/_shared/access.js';
import {sha256Hex} from '../functions/_shared/common.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT)");
for(const n of ['0007_delivery_failures.sql','0008_integrations_hub.sql','0025_data_spine.sql','0027_revenue_automation.sql','0029_outreach_tracker.sql','0031_notifications.sql'])for(const st of mig(n).replace(/--[^\n]*/g,'').split(';')){if(st.trim())try{sql.exec(st);}catch(e){}}
sql.prepare("INSERT INTO client_config VALUES('acme','Acme','client','x',?)").run(await sha256Hex('tok-acme'));
const fetches=[];
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{fetches.push(String(url));if(String(url).includes('discord'))return new Response('',{status:204});return new Response('{}',{status:200});};
const env={OPERATOR_EMAIL:'abod.louai@gmail.com',RESEND_API_KEY:'re',EMAIL_FROM:'x',ADMIN_KEY:'k',INTEGRATION_ENCRYPTION_KEY:Buffer.from(new Uint8Array(32)).toString('base64'),
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const op=(url,init)=>{const r=new Request(url,{...init,headers:{'x-pulsify-operator':'1','content-type':'application/json',...(init?.headers||{})}});rememberOperator(r,{email:'abod.louai@gmail.com',via:'access'});return r};
const cl=(url,init)=>new Request(url,{...init,headers:{'x-portal-token':'tok-acme','content-type':'application/json',...(init?.headers||{})}});
const call=(fn,r)=>fn({request:r,env,data:{}});

test('describeEvent covers every event the platform emits, stays silent on our own outbound messages', ()=>{
  const events=['lead.created','lead.stage_changed','payment.received','payment.matched','payment.unmatched','payment.refunded','client.provisioned','client.checklist_step_completed','content.sequence_published','client.delete_requested'];
  for(const e of events)assert.ok(describeEvent(e,{name:'Joe',handle:'joe',amount_cents:250000,step:'first-proof',provider:'stripe'},'operator'),e);
  assert.equal(describeEvent('conversation.new_message',{direction:'outbound'}),null);
  const reply=describeEvent('conversation.new_message',{direction:'inbound',name:'Joe',handle:'joe',text:'hey'});
  assert.equal(reply.kind,'lead.replied');assert.equal(reply.discord,true);assert.equal(reply.title,'Joe, @joe replied');
});

test('emitEvent writes a bell row; client events also reach the operator; dedupe on message id', async()=>{
  await emitEvent(env,{scope:'client',clientId:'acme',event:'payment.received',data:{amount_cents:250000,currency:'USD',name:'Buyer',email:'b@x.com',provider:'stripe'}});
  const clientFeed=await listNotifications(env,{scope:'client',clientId:'acme'});
  assert.equal(clientFeed.unread,1);assert.match(clientFeed.items[0].title,/\$2,500 from Buyer/);assert.equal(clientFeed.items[0].link,'revenue');
  const opFeed=await listNotifications(env,{scope:'operator'});
  assert.equal(opFeed.unread,1);assert.match(opFeed.items[0].title,/^acme: Payment/);assert.equal(opFeed.items[0].link,'payments');
  await emitEvent(env,{scope:'operator',event:'conversation.new_message',data:{message_id:'m1',direction:'inbound',name:'Joe',handle:'joe',text:'hey'}});
  await emitEvent(env,{scope:'operator',event:'conversation.new_message',data:{message_id:'m1',direction:'inbound',name:'Joe',handle:'joe',text:'hey'}});
  assert.equal((await listNotifications(env,{scope:'operator'})).unread,2,'same message id notifies once');
  await emitEvent(env,{scope:'operator',event:'conversation.new_message',data:{message_id:'m2',direction:'outbound',text:'me'}});
  assert.equal((await listNotifications(env,{scope:'operator'})).unread,2,'our own messages are silent');
});

test('notifyReply from the inbox jobs dedupes against the event row and only Discord goes outside', async()=>{
  sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES('t1','op','1','9','joe','Joe','x','x','inbound','{}','x','x')").run();
  fetches.length=0;
  const ok=await notifyReply(env,{conversationId:'t1',handle:'joe',name:'Joe',text:'hey',messageId:'m1'});
  assert.equal(ok,false,'already notified for m1 by the event');
  await notifyReply(env,{conversationId:'t1',handle:'joe',name:'Joe',text:'second',messageId:'m3'});
  const feed=await listNotifications(env,{scope:'operator'});
  assert.equal(feed.items[0].title,'[Joe, @joe] replied');
  assert.ok(!fetches.some(u=>u.includes('resend')),'no email ever');
  sql.prepare("INSERT INTO ig_outreach(conversation_id,operator_email,seen_at,updated_at) VALUES('t1','op',?,?) ON CONFLICT(conversation_id) DO UPDATE SET seen_at=excluded.seen_at, seen_notified_at=NULL").run(new Date(Date.now()-10*60000).toISOString(),'x');
  assert.equal(await sweepSeen(env),1);
  assert.equal(await sweepSeen(env),0);
  const seen=(await listNotifications(env,{scope:'operator'})).items.find(i=>i.kind==='lead.seen');
  assert.match(seen.title,/seen your message, no reply after 5 minutes/);
  assert.ok(!fetches.some(u=>u.includes('resend')));
});

test('API: operator and client feeds are separate; mark read by id and all; impersonation cannot write', async()=>{
  let r=await (await call(notifGet,op('https://x/api/notifications'))).json();
  assert.equal(r.scope,'operator');assert.ok(r.unread>=3);
  const c=await (await call(notifGet,cl('https://x/api/notifications?client=acme'))).json();
  assert.equal(c.scope,'client');assert.equal(c.items.length,1);
  assert.equal((await call(notifGet,new Request('https://x/api/notifications'))).status,401);
  r=await (await call(notifPost,cl('https://x/api/notifications',{method:'POST',body:JSON.stringify({client:'acme',ids:[c.items[0].id]})}))).json();
  assert.equal(r.marked,1);
  assert.equal((await (await call(notifGet,cl('https://x/api/notifications?client=acme'))).json()).unread,0);
  r=await (await call(notifPost,op('https://x/api/notifications',{method:'POST',body:JSON.stringify({all:true})}))).json();
  assert.ok(r.marked>=3);
  assert.equal((await (await call(notifGet,op('https://x/api/notifications'))).json()).unread,0);
});

test('direct notify with a dedupe key is idempotent', async()=>{
  const a=await notify(env,{scope:'operator',kind:'lead.created',title:'New lead',dedupeKey:'k1'});
  const b=await notify(env,{scope:'operator',kind:'lead.created',title:'New lead',dedupeKey:'k1'});
  assert.ok(a);assert.equal(b,null);
});

test('technical failures stay out of new notifications and historical feed counts', async()=>{
  assert.equal(describeEvent('integration.sync_failed',{error:'database unavailable'}),null);
  const before=await listNotifications(env,{scope:'operator'});
  assert.equal(await notify(env,{kind:'system',title:'Sync failed'}),null);
  sql.prepare("INSERT INTO notifications(id,scope,client_id,kind,severity,title,created_at) VALUES('old-system','operator','','system','error','Sync failed','2026-09-20')").run();
  const after=await listNotifications(env,{scope:'operator'});
  assert.equal(after.unread,before.unread);
  assert.ok(!after.items.some(i=>i.id==='old-system'));
});

test.after(()=>{globalThis.fetch=realFetch;});


import {sendDiscordAlert} from '../functions/_shared/integrations.js';
test('Discord refuses every event except a lead reply before reading any connector',async()=>{
  let reads=0;const e={DB:{prepare(){reads++;throw Error('must not read');}}};
  for(const kind of [undefined,'payment','booking','system'])assert.equal((await sendDiscordAlert(e,{kind,title:'Notice'})).status,'disabled_by_policy');
  assert.equal(reads,0);
});

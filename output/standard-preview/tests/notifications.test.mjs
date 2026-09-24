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
import {setMute} from '../functions/_shared/notify-policy.js';
import {rememberOperator} from '../functions/_shared/access.js';
import {sha256Hex} from '../functions/_shared/common.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT)");
sql.exec("CREATE TABLE crm_overrides(name TEXT PRIMARY KEY,data TEXT,ts INTEGER,sts INTEGER,updated_at TEXT)");
for(const n of ['0007_delivery_failures.sql','0008_integrations_hub.sql','0025_data_spine.sql','0027_revenue_automation.sql','0029_outreach_tracker.sql','0039_outreach_pain_tags.sql','0031_notifications.sql'])for(const st of mig(n).replace(/--[^\n]*/g,'').split(';')){if(st.trim())try{sql.exec(st);}catch(e){}}
sql.prepare("INSERT INTO client_config VALUES('acme','Acme','client','x',?)").run(await sha256Hex('tok-acme'));
const fetches=[];
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{fetches.push(String(url));if(String(url).includes('discord'))return new Response('',{status:204});return new Response('{}',{status:200});};
const env={OPERATOR_EMAIL:'abod.louai@gmail.com',RESEND_API_KEY:'re',EMAIL_FROM:'x',ADMIN_KEY:'k',INTEGRATION_ENCRYPTION_KEY:Buffer.from(new Uint8Array(32)).toString('base64'),
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const op=(url,init)=>{const r=new Request(url,{...init,headers:{'x-pulsify-operator':'1','content-type':'application/json',...(init?.headers||{})}});rememberOperator(r,{email:'abod.louai@gmail.com',via:'access'});return r};
const cl=(url,init)=>new Request(url,{...init,headers:{'x-portal-token':'tok-acme','content-type':'application/json',...(init?.headers||{})}});
const call=(fn,r)=>fn({request:r,env,data:{}});

test('describeEvent: only what someone else did reaches the bell; the founder\'s own moves stay silent', ()=>{
  for(const [e,d] of [['lead.created',{}],['lead.stage_changed',{name:'Joe',to:'booked'}],['payment.matched',{}],['payment.unmatched',{}],['integration.sync_failed',{}]])
    assert.equal(describeEvent(e,d,'operator'),null,e);
  assert.equal(describeEvent('content.sequence_published',{},'operator'),null,'the operator approved it himself');
  assert.ok(describeEvent('content.sequence_published',{},'client'),'the client hears about it');
  assert.equal(describeEvent('client.provisioned',{name:'Acme',source:'operator'},'operator'),null,'Provision now is his own click');
  assert.equal(describeEvent('client.provisioned',{name:'Acme',source:'docusign',email:'a@x.com'},'operator').title,'Acme signed the contract');
  assert.equal(describeEvent('client.provisioned',{name:'Acme',source:'payment'},'operator').title,'Acme paid and their workspace is ready');
  assert.equal(describeEvent('client.checklist_step_completed',{step:'first-proof',by:'abod.louai@gmail.com'},'operator'),null);
  assert.ok(describeEvent('client.checklist_step_completed',{step:'first-proof',by:'client:acme'},'operator'));
  assert.ok(describeEvent('client.checklist_step_completed',{step:'first-proof',by:'system'},'operator'));
  assert.equal(describeEvent('payment.received',{amount_cents:250000,currency:'USD',customer_name:'Buyer',source:'stripe'},'operator').title,'$2,500 received from Buyer');
  assert.equal(describeEvent('payment.received',{amount_cents:100,occurred_at:new Date(Date.now()-10*86400000).toISOString()},'operator'),null,'backfilled history is not news');
  assert.ok(describeEvent('payment.refunded',{refunded_cents:500},'operator'));
  assert.ok(describeEvent('client.delete_requested',{client:'acme'},'operator'));
  assert.equal(describeEvent('conversation.new_message',{direction:'outbound'}),null);
  assert.equal(describeEvent('conversation.new_message',{direction:'inbound',source:'instagram',name:'Joe',handle:'joe',text:'hey'}),null,'Instagram DMs go through dmPolicy');
  const push=describeEvent('conversation.new_message',{direction:'inbound',name:'Joe',handle:'joe',text:'hey'});
  assert.equal(push.kind,'lead.replied');assert.equal(push.title,'Joe, @joe sent a message');
});

test('emitEvent writes a bell row; client events also reach the operator under the client name; dedupe on message id', async()=>{
  await emitEvent(env,{scope:'client',clientId:'acme',event:'payment.received',data:{amount_cents:250000,currency:'USD',customer_name:'Buyer',customer_email:'b@x.com',source:'stripe'}});
  const clientFeed=await listNotifications(env,{scope:'client',clientId:'acme'});
  assert.equal(clientFeed.unread,1);assert.match(clientFeed.items[0].title,/\$2,500 received from Buyer/);assert.equal(clientFeed.items[0].link,'revenue');
  const opFeed=await listNotifications(env,{scope:'operator'});
  assert.equal(opFeed.unread,1);assert.match(opFeed.items[0].title,/^Acme: \$2,500 received/);assert.equal(opFeed.items[0].link,'payments');
  await emitEvent(env,{scope:'operator',event:'lead.stage_changed',data:{name:'Joe',from:'new',to:'booked'}});
  assert.equal((await listNotifications(env,{scope:'operator'})).unread,1,'stage moves are silent');
  await emitEvent(env,{scope:'operator',event:'conversation.new_message',data:{message_id:'m1',direction:'inbound',name:'Joe',handle:'joe',text:'hey'}});
  await emitEvent(env,{scope:'operator',event:'conversation.new_message',data:{message_id:'m1',direction:'inbound',name:'Joe',handle:'joe',text:'hey'}});
  assert.equal((await listNotifications(env,{scope:'operator'})).unread,2,'same message id notifies once');
  await emitEvent(env,{scope:'operator',event:'conversation.new_message',data:{message_id:'m2',direction:'outbound',text:'me'}});
  assert.equal((await listNotifications(env,{scope:'operator'})).unread,2,'our own messages are silent');
});

test('DM policy: outreach replies and approved prospects ping; requests, dropped and muted stay silent', async()=>{
  const conv=(id,handle,name)=>sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES(?,'op','1',?,?,?,'x','x','inbound','{}','x','x')").run(id,id,handle,name);
  const msg=(id,c,dir,at)=>sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES(?,?,'op',?,?,'x','{}','x')").run(id,c,dir,at);
  const crm=(handle,vetting)=>sql.prepare("INSERT INTO crm_overrides(name,data,ts,sts,updated_at) VALUES(?,?,?,?,'x') ON CONFLICT(name) DO UPDATE SET data=excluded.data,ts=excluded.ts").run(handle,JSON.stringify({vetting}),Date.now(),Date.now());
  const opTitles=async()=>(await listNotifications(env,{scope:'operator',limit:100})).items.map(i=>i.title);
  // Inbound stranger (Instagram's Requests pile): silent.
  conv('t1','joe','Joe');msg('in-1','t1','inbound','2026-09-01T10:00:00Z');
  fetches.length=0;
  assert.equal(await notifyReply(env,{conversationId:'t1',handle:'joe',name:'Joe',text:'Hello',messageId:'in-1'}),false);
  assert.ok(!(await opTitles()).some(t=>t.startsWith('Joe sent you a DM')));
  // Same person once approved in the CRM: pings, tagged inbound.
  crm('joe','approved');
  assert.equal(await notifyReply(env,{conversationId:'t1',handle:'joe',name:'Joe',text:'second',messageId:'in-2'}),true);
  let row=(await listNotifications(env,{scope:'operator'})).items.find(i=>i.title==='Joe sent you a DM');
  assert.equal(row.entity.origin,'inbound');assert.equal(row.entity.avatar,true);
  // A reply to outreach we started: pings, tagged outbound.
  conv('t2','byron','Byron');msg('out-1','t2','outbound','2026-08-22T14:30:00Z');msg('in-3','t2','inbound','2026-09-22T11:59:00Z');
  assert.equal(await notifyReply(env,{conversationId:'t2',handle:'byron',name:'Byron',text:'send it over',messageId:'in-3'}),true);
  row=(await listNotifications(env,{scope:'operator'})).items.find(i=>i.title==='Byron replied to your outreach');
  assert.equal(row.entity.origin,'outbound');
  // Muted and dropped senders stay quiet even on outreach threads.
  await setMute(env,'byron',true);
  assert.equal(await notifyReply(env,{conversationId:'t2',handle:'byron',name:'Byron',text:'again',messageId:'in-4'}),false);
  await setMute(env,'byron',false);
  crm('byron','dropped');
  assert.equal(await notifyReply(env,{conversationId:'t2',handle:'byron',name:'Byron',text:'again',messageId:'in-5'}),false);
  crm('byron','approved');
  assert.ok(!fetches.some(u=>u.includes('resend')),'no email ever');
  // Left on read: only for outreach threads, once.
  const seenAt=new Date(Date.now()-10*60000).toISOString();
  msg('out-2','t2','outbound',new Date(Date.now()-60*60000).toISOString());
  for(const c of ['t1','t2'])sql.prepare("INSERT INTO ig_outreach(conversation_id,operator_email,seen_at,updated_at) VALUES(?,'op',?,'x') ON CONFLICT(conversation_id) DO UPDATE SET seen_at=excluded.seen_at, seen_notified_at=NULL").run(c,seenAt);
  await sweepSeen(env);
  assert.equal(await sweepSeen(env),0,'each seen moment notifies once');
  const seen=(await listNotifications(env,{scope:'operator',limit:100})).items.filter(i=>i.kind==='lead.seen');
  assert.equal(seen.length,1);assert.match(seen[0].title,/^Byron saw your message/);
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

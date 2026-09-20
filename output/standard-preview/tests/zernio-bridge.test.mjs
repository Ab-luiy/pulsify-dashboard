// Zernio bridge: HMAC verification, merging Zernio conversations onto existing
// Composio-era threads by participant id, read receipts -> seen, webhook
// dedupe, reply notification, and the sweep. Real SQLite, Zernio mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {verifySignature, resolveConversationId, storeMessage, usernameFromUrl, ensureWebhook, recordConnection} from '../functions/_shared/zernio.js';
import {handleZernioEvent, syncZernioInbox, zernioActive} from '../workers/sync/src/jobs/zernio-inbox.js';
import {syncInstagramInbox} from '../workers/sync/src/jobs/instagram-inbox.js';
import {onRequestGet as outreachGet} from '../functions/api/outreach.js';
import {rememberOperator} from '../functions/_shared/access.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT)");
for(const t of ['crm_overrides','crm_added','crm_removed'])sql.exec(`CREATE TABLE ${t}(name TEXT PRIMARY KEY,data TEXT NOT NULL,ts INTEGER NOT NULL,sts INTEGER NOT NULL,updated_at TEXT NOT NULL)`);
for(const n of ['0007_delivery_failures.sql','0008_integrations_hub.sql','0025_data_spine.sql','0027_revenue_automation.sql','0029_outreach_tracker.sql','0030_zernio.sql','0031_notifications.sql'])for(const st of mig(n).replace(/--[^\n]*/g,'').split(';')){if(st.trim())try{sql.exec(st);}catch(e){}}
const emails=[];const zcalls=[];
const env={OPERATOR_EMAIL:'abod.louai@gmail.com',RESEND_API_KEY:'re',EMAIL_FROM:'Pulsify <hi@pulsify-ai.com>',ADMIN_KEY:'k',ZERNIO_API_KEY:'sk_test',ZERNIO_WEBHOOK_SECRET:'whsec',INTEGRATION_ENCRYPTION_KEY:Buffer.from(new Uint8Array(32)).toString('base64'),
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const realFetch=globalThis.fetch;
let zernioListing={data:[],pagination:{hasMore:false}};let zernioMessages={};
globalThis.fetch=async(url,init)=>{
  const u=String(url);
  if(u.includes('resend')){emails.push(JSON.parse(init.body));return new Response('{"id":"e"}',{status:200});}
  if(u.startsWith('https://zernio.com/api')){zcalls.push((init?.method||'GET')+' '+u.replace('https://zernio.com/api',''));
    if(u.includes('/v1/webhooks/settings')&&(!init||!init.method))return Response.json({webhooks:[]});
    if(u.includes('/v1/webhooks/settings')&&init?.method==='POST')return Response.json({success:true,webhook:{_id:'wh_1'}});
    if(/\/messages\?/.test(u)){const id=decodeURIComponent(u.split('/conversations/')[1].split('/')[0]);return Response.json({messages:zernioMessages[id]||[],pagination:{hasMore:false}});}
    if(u.includes('/v1/inbox/conversations'))return Response.json(zernioListing);
    return Response.json({});}
  return new Response('{}',{status:200});
};
const op=(url)=>{const r=new Request(url);rememberOperator(r,{email:'abod.louai@gmail.com',via:'access'});return r};
const now=Date.now();const iso=ms=>new Date(ms).toISOString();const H=3600000;

// A Composio-era thread already exists for participant 9999 (@other.acc).
sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES('composio-1','op','3608','9999','other.acc','other.acc',?,?,'outbound','{}','x','x')").run(iso(now-30*H),iso(now-30*H));
sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES('mid-old','composio-1','op','outbound',?,'opener','{}','x')").run(iso(now-30*H));

test('HMAC signature: hex of raw body, constant time, rejects bad or missing', async()=>{
  const raw='{"event":"message.read"}';
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('whsec'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hex=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  assert.equal(await verifySignature(raw,'whsec',hex),true);
  assert.equal(await verifySignature(raw,'whsec','sha256='+hex),true);
  assert.equal(await verifySignature(raw,'whsec',hex.replace(/./,'0')),false);
  assert.equal(await verifySignature(raw,'','x'),false);
  assert.equal(usernameFromUrl('https://www.instagram.com/trader.joe/'),'trader.joe');
});

test('a Zernio conversation for a known participant merges onto the existing thread', async()=>{
  const id=await resolveConversationId(env,{id:'zc_1',participantId:'9999',participantName:'Other Acc',participantPicture:'https://cdn/pic.jpg',url:'https://instagram.com/other.acc',accountId:'acc_1',updatedTime:iso(now)},'op');
  assert.equal(id,'composio-1');
  const again=await resolveConversationId(env,{id:'zc_1',participantId:'9999'},'op');
  assert.equal(again,'composio-1','mapped on second call');
  const fresh=await resolveConversationId(env,{id:'zc_2',participantId:'5555',participantName:'New Person',url:'https://instagram.com/new.person',accountId:'acc_1',updatedTime:iso(now)},'op');
  assert.equal(fresh,'z:zc_2');
  assert.equal(sql.prepare("SELECT participant_username FROM ig_conversations WHERE id='z:zc_2'").get().participant_username,'new.person');
});

test('messages store with platform ids, direction maps, readAt on an outgoing message marks seen', async()=>{
  const isNew=await storeMessage(env,'composio-1',{id:'mid-old',direction:'outgoing',text:'opener',sentAt:iso(now-30*H),readAt:iso(now-29*H)},'op');
  assert.equal(isNew,false,'same Graph mid as the Composio row');
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM ig_messages WHERE conversation_id='composio-1'").get().n,1);
  assert.equal(sql.prepare("SELECT seen_at FROM ig_outreach WHERE conversation_id='composio-1'").get().seen_at,iso(now-29*H));
  const reply=await storeMessage(env,'composio-1',{id:'zm_2',platformMessageId:'mid-reply',direction:'incoming',text:'yo',sentAt:iso(now-H)},'op');
  assert.equal(reply,true);
  const c=sql.prepare("SELECT last_direction,last_message_at FROM ig_conversations WHERE id='composio-1'").get();
  assert.equal(c.last_direction,'inbound');assert.equal(c.last_message_at,iso(now-H));
});

test('webhook: dedupes on event id, message.received notifies once, message.read marks seen', async()=>{
  emails.length=0;
  const payload={id:'evt_1',event:'message.received',message:{id:'zm_3',conversationId:'zc_1',platformMessageId:'mid-3',direction:'incoming',text:'tell me more',sentAt:iso(now-10*60000),isRead:false,sender:{id:'9999'}},conversation:{id:'zc_1',platformConversationId:'x',participantId:'9999',participantName:'Other Acc',participantUsername:'other.acc',participantPicture:'https://cdn/pic.jpg',status:'active'},account:{id:'acc_1',accountId:'acc_1',platform:'instagram',username:'ab.luiy'},timestamp:iso(now)};
  const r1=await handleZernioEvent(env,payload,'evt_1');
  assert.equal(r1.stored,true);assert.equal(r1.conversationId,'composio-1');
  assert.equal(emails.length,0,'no email');
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM notifications WHERE kind='lead.replied'").get().n,1);
  assert.match(sql.prepare("SELECT title FROM notifications WHERE kind='lead.replied'").get().title,/\[Other Acc, @other.acc\] replied/);
  const r2=await handleZernioEvent(env,payload,'evt_1');
  assert.equal(r2.duplicate,true);assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM notifications WHERE kind='lead.replied'").get().n,1,'webhook dedupe plus message-id dedupe');
  assert.equal(sql.prepare("SELECT pfp_url FROM ig_outreach WHERE conversation_id='composio-1'").get().pfp_url,'https://cdn/pic.jpg');
  const read={id:'evt_2',event:'message.read',message:{id:'zm_4',conversationId:'zc_2',platformMessageId:'mid-4',direction:'outgoing',text:'hey',sentAt:iso(now-3*H),isRead:true,sender:{id:'me'}},statusAt:iso(now-2*H),conversation:{id:'zc_2',platformConversationId:'y',participantId:'5555',participantName:'New Person',status:'active'},account:{id:'acc_1',platform:'instagram',username:'ab.luiy'},timestamp:iso(now)};
  const r3=await handleZernioEvent(env,read,'evt_2');
  assert.equal(r3.seen,true);
  assert.equal(sql.prepare("SELECT seen_at FROM ig_outreach WHERE conversation_id='z:zc_2'").get().seen_at,iso(now-2*H));
});

test('sweep pulls changed conversations, stores messages, and the Composio job steps aside once connected', async()=>{
  assert.equal(await zernioActive(env),false);
  await recordConnection(env,{accountId:'acc_1',username:'ab.luiy',profileId:'p1',webhookId:'wh_1'});
  assert.equal(await zernioActive(env),true);
  zernioListing={data:[{id:'zc_3',accountId:'acc_1',participantId:'7777',participantName:'Third',url:'https://instagram.com/third.one',participantPicture:'https://cdn/3.jpg',updatedTime:iso(now),lastMessage:'sure'}],pagination:{hasMore:false}};
  zernioMessages={zc_3:[{id:'zm_5',platformMessageId:'mid-5',direction:'incoming',text:'sure',sentAt:iso(now-5*60000)},{id:'zm_6',platformMessageId:'mid-6',direction:'outgoing',text:'opener',sentAt:iso(now-26*H),readAt:iso(now-25*H)}]};
  const written=await syncZernioInbox(env);
  assert.equal(written,2);
  const t=sql.prepare("SELECT participant_username,last_direction FROM ig_conversations WHERE id='z:zc_3'").get();
  assert.equal(t.participant_username,'third.one');assert.equal(t.last_direction,'inbound');
  assert.equal(await syncZernioInbox(env),0,'unchanged updatedTime is skipped');
  assert.equal(await syncInstagramInbox(env),0,'Composio polling is off while Zernio is connected');
  const wh=await ensureWebhook(env,{url:'https://pulsify-sync.abod-louai.workers.dev/hooks/zernio',secret:'whsec'});
  assert.equal(wh,'wh_1');
  assert.ok(zcalls.some(c=>c.startsWith('POST /v1/webhooks/settings')));
});

test('tracker reads the merged data: seen threads, pictures, and left-on-read', async()=>{
  const d=await (await outreachGet({request:op('https://x/api/outreach'),env,data:{}})).json();
  const merged=d.threads.find(t=>t.id==='composio-1');
  assert.equal(merged.pfp_url,'https://cdn/pic.jpg');assert.equal(merged.awaiting_us,true);
  const third=d.threads.find(t=>t.id==='z:zc_3');
  assert.equal(third.origin,'outbound');assert.equal(third.seen_at,iso(now-25*H));
  assert.equal(d.stats.outbound.seen_available,true);
});

test.after(()=>{globalThis.fetch=realFetch;});


test('failed webhook processing leaves event retryable',async()=>{
  // An invalid statusAt is tolerated (event time is used); a real failure mid-processing must leave the event unrecorded.
  const payload={event:'message.read',conversation:{id:'zc_1'},statusAt:iso(now)};
  const broken={...env,DB:{...env.DB,prepare(q){if(q.includes('ig_outreach'))throw new Error('db down');return env.DB.prepare(q);}}};
  await assert.rejects(handleZernioEvent(broken,payload,'retry-event'));
  assert.equal(sql.prepare("SELECT id FROM zernio_events WHERE id='retry-event'").get(),undefined);
  await handleZernioEvent(env,payload,'retry-event');
  assert.ok(sql.prepare("SELECT id FROM zernio_events WHERE id='retry-event'").get());
});

test('failed sweep fetch does not advance even a newly mapped conversation watermark',async()=>{
  const conversation={id:'retry-sweep',accountId:'acc_1',participantId:'retry-person',updatedTime:iso(now)};
  const fetcher=async url=>String(url).includes('/messages?')?Response.json({error:'upstream'},{status:500}):Response.json({data:[conversation],pagination:{hasMore:false}});
  await assert.rejects(syncZernioInbox(env,{fetcher}),/500/);
  assert.equal(sql.prepare("SELECT updated_time FROM zernio_conversation_map WHERE zernio_id='retry-sweep'").get().updated_time,null);
});

// Outreach tracker: stage derivation, follow-up timers, stats, API actions,
// reply and seen notifications (email first). Real SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {deriveThread, countTouches, stats, sortForWork, loadThreads} from '../functions/_shared/outreach.js';
import {onRequestGet as outreachGet, onRequestPost as outreachPost} from '../functions/api/outreach.js';
import {notifyReply, extractSeen, ingestSeen, sweepSeen} from '../workers/sync/src/jobs/outreach-notify.js';
import {rememberOperator} from '../functions/_shared/access.js';

const H=3600000;
const T0=Date.parse('2026-09-19T10:00:00.000Z');
const iso=(ms)=>new Date(ms).toISOString();
const conv={id:'t1',participant_id:'9999',participant_username:'trader.joe',participant_name:'Joe',first_message_at:iso(T0),last_message_at:iso(T0)};
const msg=(dir,at,text='x')=>({direction:dir,sent_at:iso(at),text});

test('touches cluster bubbles within an hour and reset after a reply', ()=>{
  const m=[msg('outbound',T0),msg('outbound',T0+5*60000),msg('outbound',T0+25*H),msg('inbound',T0+26*H),msg('outbound',T0+27*H)];
  assert.equal(countTouches(m),3);
  assert.equal(countTouches(m,iso(T0+26*H)),1,'since their reply only one touch');
});

test('stage ladder: opener, 2nd, 3rd, 4th, hibernating; follow-up due after 24 h', ()=>{
  let t=deriveThread(conv,[msg('outbound',T0)],{},T0+2*H);
  assert.equal(t.stage,'touch-1');assert.equal(t.stage_label,'Opener sent');assert.equal(t.follow_up_due,false);assert.equal(t.origin,'outbound');
  t=deriveThread(conv,[msg('outbound',T0)],{},T0+25*H);
  assert.equal(t.follow_up_due,true);assert.equal(t.hours_since_our_message,25);
  const four=[msg('outbound',T0),msg('outbound',T0+25*H),msg('outbound',T0+50*H),msg('outbound',T0+75*H)];
  t=deriveThread(conv,four,{},T0+80*H);
  assert.equal(t.stage,'touch-4');assert.equal(t.stage_label,'4th message sent');assert.equal(t.follow_up_due,false,'no fifth touch is asked for');
  t=deriveThread(conv,four,{},T0+100*H);
  assert.equal(t.stage,'hibernating');assert.equal(t.ghosted,true);
});

test('their reply flips to awaiting us, manual outcome and hibernate override', ()=>{
  let t=deriveThread(conv,[msg('outbound',T0),msg('inbound',T0+H,'hey')],{},T0+2*H);
  assert.equal(t.stage,'replied');assert.equal(t.awaiting_us,true);assert.equal(t.replied,true);assert.equal(t.follow_up_due,false);
  t=deriveThread(conv,[msg('outbound',T0)],{outcome:'booked'},T0+40*H);
  assert.equal(t.stage,'booked');assert.equal(t.follow_up_due,false);
  t=deriveThread(conv,[msg('outbound',T0)],{hibernated_at:iso(T0+H)},T0+40*H);
  assert.equal(t.stage,'hibernating');
  const inbound=deriveThread(conv,[msg('inbound',T0,'yo')],{},T0+30*H);
  assert.equal(inbound.origin,'inbound');assert.equal(inbound.follow_up_due,false,'inbound threads never get outbound cadence');
});

test('seen with no reply for five minutes is left on read; stats expose it only when seen data exists', ()=>{
  const seen=deriveThread(conv,[msg('outbound',T0)],{seen_at:iso(T0+H)},T0+H+6*60000);
  assert.equal(seen.left_on_read,true);
  const answered=deriveThread(conv,[msg('outbound',T0),msg('inbound',T0+H+60000)],{seen_at:iso(T0+H)},T0+2*H);
  assert.equal(answered.left_on_read,false);
  const s=stats([deriveThread(conv,[msg('outbound',T0)],{},T0+H)]);
  assert.equal(s.outbound.seen_available,false);assert.equal(s.outbound.open_rate,null);assert.equal(s.outbound.left_on_read,null);
});

test('stats: reply, ghost and close rates', ()=>{
  const now=T0+200*H;
  const threads=[
    deriveThread({...conv,id:'a'},[msg('outbound',T0),msg('inbound',T0+H)],{sentiment:'positive',outcome:'closed'},now),
    deriveThread({...conv,id:'b'},[msg('outbound',T0),msg('inbound',T0+H)],{sentiment:'negative'},now),
    deriveThread({...conv,id:'c'},[msg('outbound',T0),msg('outbound',T0+25*H),msg('outbound',T0+50*H),msg('outbound',T0+75*H)],{},now),
    deriveThread({...conv,id:'d'},[msg('outbound',T0)],{outcome:'booked'},now),
    deriveThread({...conv,id:'e'},[msg('inbound',T0),msg('outbound',T0+H)],{},now),
  ];
  const s=stats(threads);
  assert.equal(s.outbound.dms_sent,4);assert.equal(s.outbound.replies,2);assert.equal(s.outbound.reply_rate,50);
  assert.equal(s.outbound.ghosted,1);assert.equal(s.outbound.ghost_rate,25);
  assert.equal(s.outbound.positive,1);assert.equal(s.outbound.negative,1);
  assert.equal(s.pipeline.appointments_booked,2);assert.equal(s.pipeline.closed,1);assert.equal(s.pipeline.close_rate,50);
  assert.equal(s.inbound.conversations,1);assert.equal(s.inbound.answered,1);
  const order=[...threads].sort(sortForWork).map(t=>t.id);
  assert.equal(order[0],'b','waiting on us before the rest; no follow-ups due here since d is booked');
});

// ---- database-backed: API and notifications ----
const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT)");
for(const t of ['crm_overrides','crm_added','crm_removed'])sql.exec(`CREATE TABLE ${t}(name TEXT PRIMARY KEY,data TEXT NOT NULL,ts INTEGER NOT NULL,sts INTEGER NOT NULL,updated_at TEXT NOT NULL)`);
for(const n of ['0007_delivery_failures.sql','0008_integrations_hub.sql','0025_data_spine.sql','0027_revenue_automation.sql','0029_outreach_tracker.sql','0031_notifications.sql'])for(const st of mig(n).replace(/--[^\n]*/g,'').split(';')){if(st.trim())try{sql.exec(st);}catch(e){}}
const emails=[];
const env={OPERATOR_EMAIL:'abod.louai@gmail.com',RESEND_API_KEY:'re',EMAIL_FROM:'Pulsify <hi@pulsify-ai.com>',ADMIN_KEY:'k',INTEGRATION_ENCRYPTION_KEY:Buffer.from(new Uint8Array(32)).toString('base64'),
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{if(String(url).includes('resend')){emails.push(JSON.parse(init.body));return new Response('{"id":"e"}',{status:200});}return new Response('{}',{status:200});};
const op=(url,init)=>{const r=new Request(url,init);rememberOperator(r,{email:'abod.louai@gmail.com',via:'access'});return r};
const call=(fn,r)=>fn({request:r,env,data:{}});
const seed=(id,handle,list)=>{
  sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(id,'op','1784','p-'+id,handle,handle,list[0].sent_at,list.at(-1).sent_at,list.at(-1).direction,'{}','x','x');
  list.forEach((m,i)=>sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)").run(`${id}-m${i}`,id,'op',m.direction,m.sent_at,m.text,'{}','x'));
};
const NOW=Date.now();
seed('due','late.reply',[msg('outbound',NOW-30*H,'opener')]);
seed('fresh','just.sent',[msg('outbound',NOW-10*60000,'hey there')]);
seed('waiting','they.spoke',[msg('outbound',NOW-5*H,'hi'),msg('inbound',NOW-H,'tell me more')]);
seed('inb','came.to.us',[msg('inbound',NOW-2*H,'saw your reel')]);

test('API list: last interaction first, sections and stats present, search works', async()=>{
  const d=await (await call(outreachGet,op('https://x/api/outreach'))).json();
  assert.equal(d.ok,true);assert.equal(d.timezone,'Europe/Istanbul');
  assert.equal(d.threads[0].id,'fresh');const due=d.threads.find(t=>t.id==='due');assert.equal(due.follow_up_due,true);assert.ok(due.hours_since_our_message>=29);assert.deepEqual(d.threads.map(t=>t.last_message_at),d.threads.map(t=>t.last_message_at).sort().reverse());
  assert.equal(d.threads[1].id,'waiting');assert.equal(d.threads[1].stage,'replied');
  assert.equal(d.threads.find(t=>t.id==='inb').origin,'inbound');
  assert.equal(d.stats.outbound.dms_sent,3);assert.equal(d.stats.outbound.follow_ups_due,1);assert.equal(d.stats.inbound.awaiting_us,1);
  const q=await (await call(outreachGet,op('https://x/api/outreach?q=came'))).json();
  assert.deepEqual(q.threads.map(t=>t.id),['inb']);
  const one=await (await call(outreachGet,op('https://x/api/outreach?id=waiting'))).json();
  assert.equal(one.messages.length,2);assert.equal(one.thread.handle,'they.spoke');
});

test('API actions: sentiment, outcome, hibernate, wake, note; unknown thread 404s', async()=>{
  const post=(body)=>call(outreachPost,op('https://x/api/outreach',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
  let r=await (await post({id:'waiting',action:'sentiment:positive'})).json();assert.equal(r.thread.sentiment,'positive');
  r=await (await post({id:'waiting',action:'outcome:booked'})).json();assert.equal(r.thread.stage,'booked');
  r=await (await post({id:'due',action:'hibernate'})).json();assert.equal(r.thread.stage,'hibernating');assert.equal(r.thread.follow_up_due,false);
  r=await (await post({id:'due',action:'wake'})).json();assert.equal(r.thread.follow_up_due,true);
  r=await (await post({id:'due',action:'note',text:'runs a futures course'})).json();assert.equal(r.thread.notes,'runs a futures course');
  assert.equal((await post({id:'nope',action:'wake'})).status,404);
  assert.equal((await post({id:'due',action:'outcome:weird'})).status,422);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM ig_outreach_events WHERE kind IN ('booked','hibernated')").get().n,2);
});

test('reply to outreach lands in the bell with the person and logs the event; no email', async()=>{
  emails.length=0;
  const ok=await notifyReply(env,{conversationId:'waiting',handle:'they.spoke',name:'They Spoke',text:'tell me more',messageId:'waiting-m1'});
  assert.equal(ok,true);
  assert.equal(emails.length,0,'no email');
  const row=sql.prepare("SELECT title, body, kind, link FROM notifications WHERE scope='operator' ORDER BY created_at DESC LIMIT 1").get();
  assert.equal(row.title,'They Spoke replied to your outreach');assert.equal(row.body,'tell me more');assert.equal(row.kind,'lead.replied');assert.equal(row.link,'outreach');
  assert.equal(sql.prepare("SELECT delivered_at IS NOT NULL AS d FROM ig_outreach_events WHERE kind='reply' AND conversation_id='waiting'").get().d,1);
});

test('seen: parsed from a Meta-shaped hook, notified only after 5 silent minutes, once', async()=>{
  const payload={object:'instagram',entry:[{messaging:[{sender:{id:'p-fresh'},recipient:{id:'1784'},timestamp:String(NOW-6*60000),read:{mid:'fresh-m0'}}]}]};
  assert.equal(extractSeen(payload).length,1);
  assert.equal(await ingestSeen(env,payload),1);
  assert.ok(sql.prepare("SELECT seen_at FROM ig_outreach WHERE conversation_id='fresh'").get().seen_at);
  assert.equal(await sweepSeen(env,NOW-4*60000),0,'inside the grace window nothing fires');
  assert.equal(await sweepSeen(env,NOW),1);
  assert.match(sql.prepare("SELECT title FROM notifications WHERE kind='lead.seen' ORDER BY created_at DESC LIMIT 1").get().title,/^(just\.sent|@just\.sent) saw your message and hasn't replied$/);
  assert.equal(await sweepSeen(env,NOW+60000),0,'never twice');
  const listed=await (await call(outreachGet,op('https://x/api/outreach'))).json();
  assert.equal(listed.stats.outbound.seen_available,true);
  assert.equal(listed.threads.find(t=>t.id==='fresh').left_on_read,true);
});

test.after(()=>{globalThis.fetch=realFetch;});

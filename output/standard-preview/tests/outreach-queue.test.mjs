// Outreach queue: DM drafts and grading, candidate discovery from the CRM
// and yt_leads, add and dedupe, the Today list and cap, reconcile against
// the Instagram inbox, API auth and one full operator flow. Real SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {buildDraft, composeDraft, gradeDraft, OPENERS, REACTIONS, DEFAULT_GAP, GIFT, CLOSE, NEEDS_DETAIL_PLACEHOLDER, countWords, scrubFragment} from '../functions/_shared/dm-draft.js';
import {addToQueue, candidates, extractInstagramHandle, listToday, normalizeHandle, reconcile, reorder, setStatus, updateItem} from '../functions/_shared/outreach-queue.js';
import {onRequestGet as queueGet, onRequestPost as queuePost} from '../functions/api/outreach-queue.js';
import {rememberOperator} from '../functions/_shared/access.js';

const DETAIL='the way you run products at break even and let the recurring carry it';
const SHORT='scaling on break even roas';

// ---- drafts ----
test('draft: five beats in order, lowercase, commas and periods only', ()=>{
  const text=buildDraft({handle:'rowan', seed:1, detail:SHORT, link:'pulsify-ai.com/rowan'});
  const opener=OPENERS.find(o=>text.startsWith(o));
  assert.ok(opener,'opens with one of the approved openers');
  const afterOpener=text.slice(opener.length+1);
  assert.ok(afterOpener.startsWith(SHORT+', '),'the reference comes right after the opener, never first');
  assert.ok(REACTIONS.some(r=>afterOpener.includes(', '+r+'.')),'plain reaction after the detail');
  assert.ok(text.includes('also noticed'),'gap beat present');
  assert.ok(text.includes("it's 100% yours"),'ownership close present');
  assert.ok(text.endsWith('lmk what you think pulsify-ai.com/rowan'),'link rides on the close');
  assert.equal(text,text.toLowerCase());
  assert.doesNotMatch(text,/[!\u2013\u2014\u2018\u2019\u201c\u201d]/);
  const words=countWords(text);
  assert.ok(words>=30&&words<=45,`30-45 words, got ${words}`);
});

test('draft: seed rotates the opener and reaction across a batch, and is stable per handle', ()=>{
  const handles=['trader.joe','ecom.sam','fba.kim','nq.nox','_acetrades_','rowan.w','alex.c','maya.fx'];
  const openers=new Set(), reactions=new Set();
  for(const h of handles){const d=composeDraft({handle:h,detail:SHORT});openers.add(d.opener_index);reactions.add(d.reaction_index);}
  assert.ok(openers.size>=2,'openers vary');
  assert.ok(reactions.size>=2,'reactions vary');
  assert.equal(buildDraft({handle:'trader.joe',detail:SHORT}),buildDraft({handle:'trader.joe',detail:SHORT}));
  assert.notEqual(composeDraft({handle:'x',detail:SHORT,seed:0}).opener_index,composeDraft({handle:'x',detail:SHORT,seed:1}).opener_index);
});

test('draft: missing detail ships the canonical beats with a visible placeholder and needs_detail', ()=>{
  const d=composeDraft({handle:'nobody'});
  assert.equal(d.needs_detail,true);
  assert.ok(d.text.includes(NEEDS_DETAIL_PLACEHOLDER));
  assert.ok(d.text.includes(DEFAULT_GAP+', '+GIFT+' '+CLOSE));
  assert.ok(gradeDraft(d.text).issues.includes('missing the specific detail'));
});

test('draft: long detail takes the tightest rung and grade flags the overrun; custom gap replaces the default', ()=>{
  const d=composeDraft({handle:'rowan',detail:DETAIL});
  assert.equal(d.level,2);
  assert.ok(d.words>45);
  assert.ok(gradeDraft(d.text).issues.some(i=>i.startsWith('over 45 words')));
  const custom=buildDraft({handle:'rowan',detail:SHORT,gap:'also noticed your bio link just goes to a linktree'});
  assert.ok(custom.includes('also noticed your bio link just goes to a linktree, so i'));
  assert.ok(!custom.includes(DEFAULT_GAP));
});

test('draft: human fragments are scrubbed into the voice', ()=>{
  assert.equal(scrubFragment('Break-even ROAS \u2014 let MRR carry it!'),'break-even roas, let mrr carry it');
  assert.equal(scrubFragment('  \u201cSmart money\u201d entries.  '),'"smart money" entries');
  const text=buildDraft({handle:'z',detail:'Revenge Trading Reset!',link:'https://pulsify-ai.com/z.'});
  assert.ok(text.includes('revenge trading reset, '));
  assert.ok(text.endsWith('https://pulsify-ai.com/z'));
});

test('grade: flags the banned characters, length and casing', ()=>{
  const bad=gradeDraft('Hey there \u2014 loved your vids!! \ud83d\ude80 check This -> https://Pulsify.ai/X');
  for(const expected of ['starts with a capital letter','2 exclamation marks','em dash','emoji','arrow glyph','capitalised words'])assert.ok(bad.issues.includes(expected),expected);
  assert.ok(bad.issues.some(i=>i.startsWith('under 25 words')));
  const good=gradeDraft(buildDraft({handle:'ok',detail:SHORT,link:'pulsify-ai.com/ok'}));
  assert.deepEqual(good.issues,[]);
  assert.deepEqual(gradeDraft(''),{words:0,issues:['empty']});
  assert.deepEqual(gradeDraft('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour twentyfive twentysix twentyseven twentyeight twentynine thirty thirtyone thirtytwo thirtythree thirtyfour thirtyfive thirtysix thirtyseven thirtyeight thirtynine forty fortyone fortytwo fortythree fortyfour fortyfive fortysix').issues,['over 45 words (46)']);
});

test('handles: normalized from @, URLs and payload keys', ()=>{
  assert.equal(normalizeHandle('@Trader.Joe'),'trader.joe');
  assert.equal(normalizeHandle('https://www.instagram.com/The_Cashflow/?igsh=1'),'the_cashflow');
  assert.equal(normalizeHandle('instagram.com/nq.nox/'),'nq.nox');
  assert.equal(normalizeHandle('not a handle'),'');
  assert.equal(normalizeHandle(''),'');
  assert.equal(extractInstagramHandle({ig:'@burakharmandar'}),'burakharmandar');
  assert.equal(extractInstagramHandle({ig:'',links:['https://thecashflowacademy.com/','https://www.instagram.com/thecashflowacademy/']}),'thecashflowacademy');
  assert.equal(extractInstagramHandle({socials:{instagram:'https://instagram.com/deep.key'}}),'deep.key');
  assert.equal(extractInstagramHandle({ig:'',links:[]}),'');
  assert.equal(extractInstagramHandle(null),'');
});

// ---- database-backed ----
const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
for(const t of ['crm_overrides','crm_added','crm_removed'])sql.exec(`CREATE TABLE ${t}(name TEXT PRIMARY KEY,data TEXT NOT NULL,ts INTEGER NOT NULL,sts INTEGER NOT NULL,updated_at TEXT NOT NULL)`);
for(const n of ['0025_data_spine.sql','0029_outreach_tracker.sql','0039_outreach_pain_tags.sql','0035_outreach_queue.sql'])for(const st of mig(n).replace(/--[^\n]*/g,'').split(';')){if(st.trim())try{sql.exec(st);}catch(e){}}
const env={ADMIN_KEY:'k',OPERATOR_TIMEZONE:'UTC',
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const op=(url,init)=>{const r=new Request(url,init);rememberOperator(r,{email:'abod.louai@gmail.com',via:'access'});return r};
const call=(fn,r)=>fn({request:r,env,data:{}});
const post=(body)=>call(queuePost,op('https://x/api/outreach-queue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
const iso=(ms)=>new Date(ms).toISOString();
const H=3600000;
const crm=(table,name,data)=>sql.prepare(`INSERT INTO ${table}(name,data,ts,sts,updated_at) VALUES(?,?,?,?,?)`).run(name,JSON.stringify(data),1,1,'x');
const lead=(id,payload,tier,score)=>sql.prepare("INSERT INTO yt_leads(id,payload_json,score,tier,niche,updated_at) VALUES(?,?,?,?,?,?)").run(id,JSON.stringify(payload),score,tier,payload.niche||null,'x');
const seedThread=(id,handle,list)=>{
  sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(id,'op','1784','p-'+id,handle,handle,list[0].sent_at,list.at(-1).sent_at,list.at(-1).direction,'{}','x','x');
  list.forEach((m,i)=>sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)").run(`${id}-m${i}`,id,'op',m.direction,m.sent_at,m.text||'x','{}','x'));
};

// CRM: the shapes the dashboard, push-ingest and the inbox job actually write.
crm('crm_added','Joe Trader',{n:'Joe Trader',h:'trader.joe',niche:'trading',dms:0,stage:'new-lead',_source:'youtube',_vt:'why 90% of traders fail',_tier:'B',_ts:1});
crm('crm_added','Sam Ecom',{n:'Sam Ecom',h:'@Ecom.Sam',niche:'\u2014',dms:0,stage:'new-lead',_ts:1});
crm('crm_added','already.dmd',{n:'already.dmd',h:'already.dmd',niche:'',dms:1,stage:'new-lead',src:'instagram',igConversationId:'c-old',_ts:1});
crm('crm_added','Moved On',{n:'Moved On',h:'moved.on',niche:'fba',dms:0,stage:'new-lead',_ts:1});
crm('crm_overrides','Moved On',{status:'sent',_ts:2});
crm('crm_added','Gone Lead',{n:'Gone Lead',h:'gone.lead',niche:'fba',dms:0,stage:'new-lead',_ts:1});
crm('crm_removed','Gone Lead',{_ts:2});
crm('crm_added','In Thread',{n:'In Thread',h:'in.thread',niche:'trading',dms:0,stage:'new-lead',_ts:1});
// yt_leads: dashboard backfill shape (ig bare, tier A/B/C, links) and sync-worker shape (ig with @, tier-N).
lead('y1',{s:12525,n:'The Cashflow Academy',cu:'https://www.youtube.com/@andytannertraining',ig:'thecashflowacademy',vt:'25 years of brutal options trading advice',niche:'trading',tier:'B',links:['https://thecashflowacademy.com/','https://www.instagram.com/thecashflowacademy/']},'B',12525);
lead('y2',{s:12325,n:'Alex Carter',cu:'https://www.youtube.com/@alexcarter_web3',ig:'',vt:'ai trading bot',niche:'trading',tier:'C',links:[]},'C',12325);
lead('y3',{s:12100,n:'Burak Harmandar',cu:'https://www.youtube.com/@burakharmandar',ig:'@burakharmandar',vt:'how i make 10k a day with ai ads',niche:'ecom',subs:4370},'tier-1',12100);
lead('y4',{s:9000,n:'Links Only',cu:'https://www.youtube.com/@linksonly',ig:'',vt:'my fba strategy',niche:'fba',tier:'C',links:['https://instagram.com/links.only']},'C',9000);
lead('y5',{s:11000,n:'Thread Person',cu:'https://www.youtube.com/@threadperson',ig:'in.thread',vt:'x',niche:'trading',tier:'A'},'A',11000);
lead('y6',{s:11500,n:'Dup Of Joe',cu:'https://www.youtube.com/@dupjoe',ig:'trader.joe',vt:'x',niche:'trading',tier:'A'},'A',11500);
const NOW=Date.now();
seedThread('c-old','already.dmd',[{direction:'outbound',sent_at:iso(NOW-72*H),text:'opener'}]);
seedThread('c-thread','In.Thread',[{direction:'outbound',sent_at:iso(NOW-48*H),text:'opener'}]);

test('candidates: CRM new-leads first, then yt_leads by tier and score; threads, instagram-sourced, staged and removed leads are excluded', async()=>{
  assert.deepEqual(await candidates(env,{limit:50}),[],'unreviewed imports never enter Today');
  for(const name of ['Joe Trader','Sam Ecom','The Cashflow Academy','Burak Harmandar','Links Only']) {
    const existing=sql.prepare('SELECT data FROM crm_overrides WHERE name=?').get(name);
    const data={...JSON.parse(existing?.data||'{}'),vetting:'approved'};
    sql.prepare('INSERT OR REPLACE INTO crm_overrides(name,data,ts,sts,updated_at) VALUES(?,?,?,?,?)').run(name,JSON.stringify(data),2,2,new Date().toISOString());
  }
  const list=await candidates(env,{limit:50});
  const handles=list.map(c=>c.handle);
  assert.deepEqual(handles.slice(0,2),['trader.joe','ecom.sam'],'CRM first, handle normalized');
  assert.equal(list[0].source,'crm');assert.equal(list[0].hint,'why 90% of traders fail');assert.equal(list[1].niche,'','dash placeholder niche dropped');
  assert.deepEqual(handles.slice(2),['thecashflowacademy','burakharmandar','links.only'],'B and tier-1 before C, score inside the priority group');
  assert.equal(list[2].source,'yt_leads');assert.equal(list[2].priority,true);assert.equal(list[3].priority,true);assert.equal(list[4].priority,false);
  for(const h of ['already.dmd','in.thread','moved.on','gone.lead'])assert.ok(!handles.includes(h),h+' excluded');
  assert.equal(handles.filter(h=>h==='trader.joe').length,1,'same handle from two sources listed once');
  assert.equal((await candidates(env,{limit:2})).length,2);
});

test('add: builds the draft at insert, normalizes the handle, dedupes by handle, rejects junk', async()=>{
  const a=await addToQueue(env,{handle:'https://www.instagram.com/Trader.Joe/',source:'crm',name:'Joe Trader',niche:'trading',detail:SHORT,link:'pulsify-ai.com/trader-joe'});
  assert.equal(a.existed,false);assert.equal(a.item.handle,'trader.joe');assert.equal(a.item.status,'queued');assert.equal(a.item.position,1);
  assert.equal(a.item.needs_detail,false);assert.ok(a.item.draft.endsWith('pulsify-ai.com/trader-joe'));assert.deepEqual(a.item.grade.issues,[]);
  assert.equal(a.item.instagram_url,'https://www.instagram.com/trader.joe/');
  const again=await addToQueue(env,{handle:'@trader.joe',source:'manual'});
  assert.equal(again.existed,true);assert.equal(again.item.id,a.item.id);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM outreach_queue").get().n,1);
  const bare=await addToQueue(env,{handle:'ecom.sam',source:'weird-source'});
  assert.equal(bare.item.source,'manual','unknown source falls back to manual');assert.equal(bare.item.needs_detail,true);assert.ok(bare.item.draft.includes(NEEDS_DETAIL_PLACEHOLDER));
  assert.equal((await addToQueue(env,{handle:'not a handle'})).error,'invalid handle');
  assert.ok(!(await candidates(env)).some(c=>c.handle==='trader.joe'),'queued handle leaves the candidates');
});

test('today: position order, cap, sent_today; reorder and status changes', async()=>{
  const c=await addToQueue(env,{handle:'burakharmandar',source:'yt_leads',detail:'ai ads at 10k a day'});
  const d=await addToQueue(env,{handle:'thecashflowacademy',source:'yt_leads',detail:'brutal options advice'});
  let today=await listToday(env,{cap:25});
  assert.equal(today.follow_ups_note,null);assert.equal(today.cap,25);assert.equal(today.sent_today,0);assert.equal(today.queued_total,4);
  assert.deepEqual(today.queued.map(q=>q.handle),['trader.joe','ecom.sam','burakharmandar','thecashflowacademy']);
  const r=await reorder(env,[d.item.id,c.item.id,'nope']);
  assert.equal(r.updated,4,'listed items lead, the rest are renumbered behind them');
  today=await listToday(env,{cap:2});
  assert.deepEqual(today.queued.map(q=>q.handle),['thecashflowacademy','burakharmandar'],'capped to two, reordered first');
  assert.equal(today.queued_total,4);
  assert.deepEqual((await listToday(env,{cap:25})).queued.map(q=>q.position),[1,2,3,4]);
  const sent=await setStatus(env,c.item.id,'sent');
  assert.equal(sent.item.status,'sent');assert.ok(sent.item.sent_at);
  const skipped=await setStatus(env,d.item.id,'skipped');
  assert.equal(skipped.item.status,'skipped');assert.ok(skipped.item.skipped_at);assert.equal(skipped.item.sent_at,null);
  today=await listToday(env,{cap:25});
  assert.equal(today.sent_today,1);assert.equal(today.remaining,24);
  assert.deepEqual(today.queued.map(q=>q.handle),['trader.joe','ecom.sam']);
  const back=await setStatus(env,d.item.id,'queued');
  assert.equal(back.item.status,'queued');assert.equal(back.item.skipped_at,null);
  assert.equal((await setStatus(env,d.item.id,'exploded')).error,'bad status');
  assert.equal((await setStatus(env,'missing','sent')).error,'not found');
  assert.equal((await reorder(env,[])).error,'no ids');
});

test('update: brief edits rebuild the draft, a supplied draft is kept verbatim', async()=>{
  const row=sql.prepare("SELECT id FROM outreach_queue WHERE handle='ecom.sam'").get();
  let u=await updateItem(env,row.id,{detail:'testing products with tiktok shop affiliates',link:'pulsify-ai.com/sam'});
  assert.equal(u.item.needs_detail,false);assert.ok(u.item.draft.includes('testing products with tiktok shop affiliates, '));assert.ok(u.item.draft.endsWith('pulsify-ai.com/sam'));
  u=await updateItem(env,row.id,{draft:'yo custom text here'});
  assert.equal(u.item.draft,'yo custom text here');assert.equal(u.item.detail,'testing products with tiktok shop affiliates');
  u=await updateItem(env,row.id,{name:'Sam E'});
  assert.equal(u.item.name,'Sam E');assert.ok(u.item.draft.includes('tiktok shop affiliates'),'a brief edit rebuilds from the brief');
  assert.equal((await updateItem(env,'missing',{detail:'x'})).error,'not found');
});

test('reconcile: a thread with our outbound flips queued to sent with that timestamp; an inbound after it flips sent to replied; idempotent', async()=>{
  const sentAt=iso(NOW-2*H);
  seedThread('c-sam','Ecom.Sam',[{direction:'outbound',sent_at:sentAt,text:'ngl your channel'}]);
  let r=await reconcile(env);
  assert.deepEqual(r,{sent:1,replied:0});
  let row=sql.prepare("SELECT status,sent_at,conversation_id FROM outreach_queue WHERE handle='ecom.sam'").get();
  assert.equal(row.status,'sent');assert.equal(row.sent_at,sentAt);assert.equal(row.conversation_id,'c-sam');
  assert.deepEqual(await reconcile(env),{sent:0,replied:0},'nothing to do twice');
  sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)").run('c-sam-m1','c-sam','op','inbound',iso(NOW-H),'oh nice','{}','x');
  r=await reconcile(env);
  assert.deepEqual(r,{sent:0,replied:1});
  row=sql.prepare("SELECT status,sent_at FROM outreach_queue WHERE handle='ecom.sam'").get();
  assert.equal(row.status,'replied');assert.equal(row.sent_at,sentAt,'sent_at untouched');
  assert.deepEqual(await reconcile(env),{sent:0,replied:0});
  // Hand-marked sent, then a reply lands: matched by handle since no conversation id was known.
  seedThread('c-burak','burakharmandar',[{direction:'outbound',sent_at:iso(NOW-3*H)},{direction:'inbound',sent_at:iso(NOW+60000),text:'yo'}]);
  r=await reconcile(env);
  assert.equal(r.replied,1);
  assert.equal(sql.prepare("SELECT status,conversation_id FROM outreach_queue WHERE handle='burakharmandar'").get().conversation_id,'c-burak');
  // Inbound before our send does not count as a reply.
  await addToQueue(env,{handle:'early.bird',detail:'x'});
  seedThread('c-early','early.bird',[{direction:'inbound',sent_at:iso(NOW-5*H),text:'hi'},{direction:'outbound',sent_at:iso(NOW-4*H)}]);
  r=await reconcile(env);
  assert.deepEqual(r,{sent:1,replied:0});
  assert.equal(sql.prepare("SELECT status FROM outreach_queue WHERE handle='early.bird'").get().status,'sent');
});

test('API: anonymous requests are refused', async()=>{
  assert.equal((await call(queueGet,new Request('https://x/api/outreach-queue?view=today'))).status,401);
  assert.equal((await call(queuePost,new Request('https://x/api/outreach-queue',{method:'POST',body:'{}'}))).status,401);
  const keyed=await call(queueGet,new Request('https://x/api/outreach-queue?view=candidates',{headers:{'x-admin-key':'k'}}));
  assert.equal(keyed.status,200,'admin key still counts as operator');
});

test('API: full flow from candidates to replied', async()=>{
  let d=await (await call(queueGet,op('https://x/api/outreach-queue'))).json();
  assert.equal(d.ok,true);assert.ok(Array.isArray(d.queued));assert.ok(d.candidates.length<=20);assert.equal(d.cap,25);assert.ok(d.reconciled);
  const pick=d.candidates.find(c=>c.handle==='links.only');
  assert.ok(pick,'yt lead with an instagram link is offered');
  d=await (await post({action:'add',handle:pick.handle,source:pick.source,name:pick.name,niche:pick.niche})).json();
  assert.equal(d.ok,true);assert.equal(d.item.source,'yt_leads');assert.equal(d.item.needs_detail,true);
  const id=d.item.id;
  d=await (await post({action:'update',id,detail:'the fba margin math in your last video',link:'pulsify-ai.com/links-only',status:'replied'})).json();
  assert.equal(d.item.status,'queued','status is never writable through update');assert.equal(d.item.needs_detail,false);assert.ok(d.item.draft.includes('fba margin math'));
  const before=d.item.draft;
  d=await (await post({action:'draft',id,seed:7})).json();
  assert.notEqual(d.item.draft,before,'a new seed cycles the opener');assert.ok(d.item.draft.includes('fba margin math'));
  d=await (await post({action:'sent',id})).json();
  assert.equal(d.item.status,'sent');assert.ok(d.item.sent_at);
  d=await (await post({action:'requeue',id})).json();
  assert.equal(d.item.status,'queued');assert.equal(d.item.sent_at,null);
  d=await (await post({action:'skip',id})).json();
  assert.equal(d.item.status,'skipped');
  const batch=await (await post({action:'add',items:[{handle:'batch.one',detail:'x'},{handle:'batch.one'},{handle:'???'}]})).json();
  assert.equal(batch.items.length,2);assert.equal(batch.items[1].existed,true);assert.equal(batch.rejected.length,1);
  const ids=sql.prepare("SELECT id FROM outreach_queue WHERE status='queued' ORDER BY position").all().map(r=>r.id).reverse();
  d=await (await post({action:'reorder',ids})).json();
  assert.equal(d.updated,ids.length);
  const today=await (await call(queueGet,op('https://x/api/outreach-queue?view=today&cap=3'))).json();
  assert.equal(today.cap,3);assert.deepEqual(today.queued.map(q=>q.id),ids.slice(0,3));
  const one=await (await call(queueGet,op('https://x/api/outreach-queue?id='+id))).json();
  assert.equal(one.item.handle,'links.only');
  assert.equal((await call(queueGet,op('https://x/api/outreach-queue?id=nope'))).status,404);
  assert.equal((await call(queueGet,op('https://x/api/outreach-queue?view=weird'))).status,422);
  assert.equal((await post({action:'sent',id:'nope'})).status,404);
  assert.equal((await post({action:'explode',id})).status,422);
  assert.equal((await post({action:'add',handle:'bad handle!'})).status,422);
  assert.equal((await post({action:'sent'})).status,422);
  assert.equal((await call(queuePost,op('https://x/api/outreach-queue',{method:'POST',body:'{'}))).status,400);
});


test('Today removes an already queued prospect immediately after dropping them',async()=>{
 const r=await addToQueue(env,{handle:'review.drop',source:'manual',name:'Review Drop'});
 crm('crm_added','Review Drop',{n:'Review Drop',h:'review.drop',vetting:'dropped'});
 const today=await listToday(env);
 assert.ok(!today.queued.some(x=>x.id===r.item.id));
});

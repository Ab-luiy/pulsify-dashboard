// Semantic search: document selection, idempotent indexing, brain re-index on
// change, scope filtering, and the API. Vectorize and Workers AI are faked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {indexPending, search, pendingBrainDocs, docId} from '../functions/_shared/search.js';
import {onRequestGet as searchGet} from '../functions/api/search.js';
import {rememberOperator} from '../functions/_shared/access.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT)");
for(const n of ['0014_client_brain.sql','0025_data_spine.sql','0032_search_index.sql','0033_search_source_id.sql'])for(const st of mig(n).replace(/--[^\n]*/g,'').split(';')){if(st.trim())try{sql.exec(st);}catch(e){}}
sql.prepare("INSERT INTO client_config VALUES('acme','Acme Trading','client')").run();
sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES('t1','op','1','9','trader.joe','Joe','2026-09-01T00:00:00Z','2026-09-02T00:00:00Z','inbound','{}','x','x')").run();
sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES('m1','t1','op','inbound','2026-09-02T00:00:00Z','i keep blowing my prop firm accounts on revenge trades','{}','x'),('m2','t1','op','outbound','2026-09-01T00:00:00Z','hey','{}','x'),('m3','t1','op','outbound','2026-09-01T01:00:00Z','saw your breakdown on the ES open, one thing stood out','{}','x')").run();
sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('acme','icp','avatar','\"day traders who blow accounts on revenge trades\"','client-form','2026-09-01T00:00:00Z'),('acme','offer','business_explainer','\"\"','client-form','2026-09-01T00:00:00Z')").run();

// Fake Vectorize: cosine on tiny vectors; fake AI: deterministic bag-of-words vectors.
const store=new Map();
const VOCAB=['prop','firm','revenge','trades','account','blow','breakdown','es','open','day','traders','pricing'];
const vec=(t)=>{const w=String(t).toLowerCase();const v=VOCAB.map(k=>w.includes(k)?1:0);const n=Math.sqrt(v.reduce((a,b)=>a+b*b,0))||1;return v.map(x=>x/n);};
const env={
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p}},
  AI:{async run(model,{text}){return {data:text.map(vec)}}},
  VECTORIZE:{async upsert(rows){for(const r of rows)store.set(r.id,r);return {count:rows.length}},async query(v,{topK,filter,returnMetadata}){const ok=(m)=>{for(const [k,cond] of Object.entries(filter||{})){const val=m[k];if(cond&&typeof cond==='object'&&cond.$in){if(!cond.$in.includes(val))return false;}else if(val!==cond)return false;}return true;};const dot=(a,b)=>a.reduce((s,x,i)=>s+x*(b[i]||0),0);return {matches:[...store.values()].filter(r=>ok(r.metadata)).map(r=>({id:r.id,score:dot(v,r.values),metadata:r.metadata})).sort((a,b)=>b.score-a.score).slice(0,topK)}}},
};

test('indexer embeds DMs and brain fields once, skips short texts and empties, re-indexes changed brain', async()=>{
  const r1=await indexPending(env);
  assert.equal(r1.indexed,3,'m1, m3 and the icp field; m2 too short, empty brain skipped');
  const M1=await docId('dm','m1'),B=await docId('brain','acme:icp:avatar');
  assert.ok(store.has(M1));assert.ok(store.has(B));assert.ok(!store.has(await docId('dm','m2')));
  assert.ok(M1.length<=64);
  assert.equal(store.get(M1).metadata.handle,'trader.joe');assert.equal(store.get(M1).metadata.scope,'operator');assert.equal(store.get(M1).metadata.message_id,'m1');
  assert.equal(store.get(B).metadata.scope,'acme');
  const r2=await indexPending(env);
  assert.equal(r2.indexed,0,'nothing pending second time');
  sql.prepare("UPDATE client_brain SET value_json='\"scalpers on prop firm accounts\"' WHERE section='icp'").run();
  assert.equal((await pendingBrainDocs(env)).length,1,'changed value is pending again');
  assert.equal((await indexPending(env)).indexed,1);
});

test('search: meaning match, kind filter, client scope limited to own brain', async()=>{
  const all=await search(env,{q:'prop firm revenge trades',scope:'operator'});
  assert.ok(all.length>=2);assert.equal(all[0].kind==='dm'||all[0].kind==='brain',true);
  assert.ok(all.some(h=>h.message_id==='m1'),'the revenge-trade DM is found');
  const dmOnly=await search(env,{q:'prop firm',scope:'operator',kinds:['dm']});
  assert.ok(dmOnly.every(h=>h.kind==='dm'));
  const client=await search(env,{q:'prop firm',scope:'acme'});
  assert.ok(client.length>=1);assert.ok(client.every(h=>h.kind==='brain'&&h.client_id==='acme'),'clients never see DMs');
  const other=await search(env,{q:'prop firm',scope:'beta'});
  assert.equal(other.length,0);
});

test('API: operator search and status; short query rejected', async()=>{
  const op=(url)=>{const r=new Request(url,{headers:{'x-pulsify-operator':'1'}});rememberOperator(r,{email:'op@test',via:'access'});return r};
  const d=await (await searchGet({request:op('https://x/api/search?q=revenge%20trades'),env,data:{}})).json();
  assert.equal(d.ok,true);assert.ok(d.hits.length>=1);assert.ok(typeof d.took_ms==='number');
  const s=await (await searchGet({request:op('https://x/api/search?status=1'),env,data:{}})).json();
  assert.equal(s.ready,true);assert.equal(s.indexed.dm.count,2);assert.equal(s.totals.dms,2);
  assert.equal((await searchGet({request:op('https://x/api/search?q=a'),env,data:{}})).status,422);
});

test('a missing embedding remains pending for retry', async()=>{
  sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES('retry','t1','op','inbound','2026-09-03','a message requiring indexing','{}','x')").run();
  const partial={...env,AI:{async run(){return {data:[]}}}};
  assert.equal((await indexPending(partial)).indexed,0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM search_index_state WHERE source_id='retry'").get().n,0);
  assert.equal((await indexPending(env)).indexed,1);
});


test('archived workspace brain is hidden even while its vector remains preserved',async()=>{
  sql.prepare("UPDATE client_config SET status='archived' WHERE client='acme'").run();
  assert.equal((await search(env,{q:'prop firm',scope:'operator'})).some(h=>h.client_id==='acme'),false);
  assert.equal((await search(env,{q:'prop firm',scope:'acme'})).length,0);
  sql.prepare("UPDATE client_brain SET value_json='\"new archived private field\"' WHERE client_id='acme'").run();
  assert.equal((await pendingBrainDocs(env)).length,0);
});

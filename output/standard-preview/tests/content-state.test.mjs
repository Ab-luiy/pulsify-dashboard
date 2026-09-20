// Content pipeline persistence: the native Content view keeps its
// {overrides, added, removed} value on the operator state API under the key
// content-pipeline. Round trip through functions/api/spine/state.js on real
// SQLite: empty read, write, read back, overwrite, and the key guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestGet as stateGet, onRequestPut as statePut} from '../functions/api/spine/state.js';
import {rememberOperator} from '../functions/_shared/access.js';

const sql=new DatabaseSync(':memory:');
const mig=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
for(const st of mig('0025_data_spine.sql').replace(/--[^\n]*/g,'').split(';')){if(st.trim())try{sql.exec(st);}catch(e){}}
const env={OPERATOR_EMAIL:'abod.louai@gmail.com',
  DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p}}};
const op=(url,init)=>{const r=new Request(url,init);rememberOperator(r,{email:'abod.louai@gmail.com',via:'access'});return r};
const call=(fn,r)=>fn({request:r,env,data:{}});
const KEY='content-pipeline';
const get=()=>call(stateGet,op('https://x/api/spine/state?key='+KEY));
const put=(value)=>call(statePut,op('https://x/api/spine/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({key:KEY,value})}));
const pipeline={overrides:{'first-youtube-long-form':{stage:'scripted'}},added:[{id:'why-content-stopped-converting-m1',title:'Why coaching content stopped converting',type:'TOF · Concept breakdown',layer:'TOF',pillar:'Concept breakdown',stage:'ideated',owner:'AB',notes:''}],removed:[]};

test('GET before any write returns state null, which is the migration signal', async()=>{
  const r=await get();
  assert.equal(r.status,200);
  const d=await r.json();
  assert.equal(d.ok,true);assert.equal(d.state,null);
});

test('PUT stores the pipeline and GET returns the same value with the key and a timestamp', async()=>{
  const w=await put(pipeline);
  assert.equal(w.status,200);
  const wd=await w.json();assert.equal(wd.ok,true);assert.equal(wd.key,KEY);assert.ok(wd.updated_at);
  const d=await (await get()).json();
  assert.equal(d.state.key,KEY);assert.deepEqual(d.state.value,pipeline);assert.equal(d.state.updated_at,wd.updated_at);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM operator_state WHERE key=?").get(KEY).n,1);
});

test('a second PUT overwrites in place; an emptied pipeline is still a stored value, not null', async()=>{
  const next={overrides:{},added:[],removed:['first-youtube-long-form']};
  assert.equal((await put(next)).status,200);
  const d=await (await get()).json();
  assert.deepEqual(d.state.value,next);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM operator_state WHERE key=?").get(KEY).n,1,'one row per operator and key');
  const emptied={overrides:{},added:[],removed:[]};
  assert.equal((await put(emptied)).status,200);
  const e=await (await get()).json();
  assert.notEqual(e.state,null);assert.deepEqual(e.state.value,emptied);
});

test('key guard: the content-pipeline key passes, a bad key or missing value is 422, and unauthenticated calls are refused', async()=>{
  const bad=await call(statePut,op('https://x/api/spine/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({key:'content pipeline',value:{}})}));
  assert.equal(bad.status,422);
  const missing=await call(statePut,op('https://x/api/spine/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({key:KEY})}));
  assert.equal(missing.status,422);
  const anon=await call(stateGet,new Request('https://x/api/spine/state?key='+KEY));
  assert.equal(anon.status,401);
  const other=new Request('https://x/api/spine/state?key='+KEY);rememberOperator(other,{email:'someone@else.test',via:'access'});
  const od=await (await call(stateGet,other)).json();
  assert.equal(od.state,null,'state is scoped per operator email');
});

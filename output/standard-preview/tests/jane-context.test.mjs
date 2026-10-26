import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { buildJaneBrief, selectJaneExamples, janeRoute } from '../functions/_shared/jane-context.ts';
import { saveJaneDocument, searchJaneDocuments, readJaneDocument } from '../functions/_shared/jane-documents.ts';
import { retrieveJaneKnowledge, janeNamespace } from '../functions/_shared/jane-search.ts';
import { COPY_KNOWLEDGE } from '../functions/_shared/copy-knowledge-data.js';
import { sha256Hex } from '../functions/_shared/common.js';
import * as chat from '../functions/api/copy-chat.js';

function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,portal_token_hash TEXT,status TEXT);
    CREATE TABLE client_brain(id INTEGER,client_id TEXT,section TEXT,field TEXT,value_json TEXT,source TEXT,updated_at TEXT);
    CREATE TABLE proof_items(id INTEGER,client_id TEXT,kind TEXT,url TEXT,claim TEXT,permission TEXT,created_at TEXT);`);
  for (const name of ['0042_studio_feedback.sql','0053_copy_chat.sql','0083_jane_documents.sql']) sql.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
  const DB = { prepare(query) { let args=[]; const s={ bind(...v){args=v;return s;}, async all(){return {results:sql.prepare(query).all(...args)};}, async first(){return sql.prepare(query).get(...args)||null;}, async run(){const r=sql.prepare(query).run(...args);return {meta:{last_row_id:Number(r.lastInsertRowid),changes:r.changes}};} };return s;}, async batch(list){return Promise.all(list.map(s=>s.run()));} };
  return {sql,DB};
}
const doc = (key, content, public_use=false, kind='reference') => ({key,title:key,source:'Client interview, 2026-10-25',kind,public_use,content});

test('client documents update by stable key; search excludes other clients and private references from public drafts',async()=>{
  const {DB,sql}=fixture();
  assert.equal((await saveJaneDocument({DB},'a',doc('launch','Launch keyword CEDAR.'))).ok,true);
  await saveJaneDocument({DB},'b',doc('launch','Launch keyword OTHER_SECRET.',true));
  await saveJaneDocument({DB},'a',doc('public','Launch keyword PINE.',true));
  await saveJaneDocument({DB},'a',doc('sample','Launch example contains FAKE_INCOME.',true,'approved-example'));
  const privateSearch=await searchJaneDocuments({DB},'a','launch');
  assert.match(JSON.stringify(privateSearch),/CEDAR/);assert.doesNotMatch(JSON.stringify(privateSearch),/OTHER_SECRET/);
  assert.doesNotMatch(JSON.stringify(await readJaneDocument({DB},'a','launch','launch',true)),/CEDAR/);
  assert.doesNotMatch(JSON.stringify(await readJaneDocument({DB},'a','launch','launch')),/OTHER_SECRET/);
  const publicSearch=await searchJaneDocuments({DB},'a','launch',true);
  assert.doesNotMatch(JSON.stringify(publicSearch),/CEDAR|OTHER_SECRET/);assert.match(JSON.stringify(publicSearch),/Style reference only/);
  await saveJaneDocument({DB},'a',doc('launch','Launch keyword MAPLE.'));
  assert.equal(sql.prepare("SELECT count(*) n FROM jane_documents WHERE client_id='a' AND document_key='launch'").get().n,1);
  assert.doesNotMatch(JSON.stringify(await searchJaneDocuments({DB},'a','launch')),/CEDAR/);
  assert.equal((await saveJaneDocument({DB},'a',doc('../escape','some document text'))).ok,false);
  assert.equal((await saveJaneDocument({DB},'a',{...doc('bad','some document text'),public_use:undefined})).ok,false);
});

test('working brief preserves dates, current corrections and gaps without treating assistant guesses as facts',()=>{
  const data={rows:[{section:'offer',field:'name',value_json:'"Quiet Edge"',updated_at:'2026-10-25'}, {section:'money',field:'budget',value_json:'"PRIVATE_BUDGET"'}]};
  const brief=buildJaneBrief({data,memory:[{id:8,note:'I prefer detailed replies.',source:'client',created_at:'2026-10-25'}],history:[
    {id:4,role:'user',content:'Actually, use MAPLE instead of CEDAR.',created_at:'2026-10-25'},
    {role:'assistant',content:'We agreed GUARANTEED_INCOME.'}],message:'Use MAPLE in just the opening.',publicDraft:true});
  assert.match(brief,/Quiet Edge|MAPLE/);assert.match(brief,/Memory 8; 2026-10-25/);assert.match(brief,/No saved business details/);
  assert.doesNotMatch(brief,/GUARANTEED_INCOME|PRIVATE_BUDGET/);
});

test('approved examples are selected by task relevance and approval explanation, never promoted to factual evidence',()=>{
  const rows=[{id:1,request:'Write an email',content:'A quiet email opening.',approval_note:'Sounds like me.',created_at:'2026-10-24'},
    {id:2,request:'Write a carousel',content:'Unrelated carousel.'}];
  const result=selectJaneExamples(rows,'email opening');
  assert.equal(result.length,1);assert.match(result[0],/Sounds like me/);assert.match(result[0],/NO facts, promises/);
});

test('hybrid search rehydrates only current approved IDs; stale and cross-namespace vectors cannot inject text',async()=>{
  const passage=COPY_KNOWLEDGE.passages.find(p=>p.source_id==='mechanism');
  let options;
  const env={AI:{async run(){return {data:[Array(768).fill(0.01)]};}},VECTORIZE:{async query(v,o){options=o;return {matches:[
    {id:`${janeNamespace}:${passage.id}`,namespace:janeNamespace,score:.9,metadata:{version:COPY_KNOWLEDGE.version,passage_id:passage.id,text:'INJECTED_TEXT'}},
    {id:'private',namespace:'client-b',score:1,metadata:{version:COPY_KNOWLEDGE.version,passage_id:'private',text:'OTHER_SECRET'}},
    {id:'stale',namespace:janeNamespace,score:1,metadata:{version:'old',passage_id:passage.id}},
  ]};}}};
  const result=await retrieveJaneKnowledge(env,{query:'xylophone astrophysics'});
  assert.equal(options.namespace,janeNamespace);assert.equal(result.retrieval,'hybrid');assert.ok(result.passage_ids.includes(passage.id));
  assert.doesNotMatch(result.prompt_text,/INJECTED_TEXT|OTHER_SECRET/);
  env.AI.run=async()=>{throw Error('quota');};
  const fallback=await retrieveJaneKnowledge(env,{query:'unique mechanism'});
  assert.equal(fallback.semantic_status,'unavailable');assert.ok(fallback.source_ids.includes('mechanism'));
});

test('semantic results cannot bypass the pre-call intent gate',async()=>{
  const p=COPY_KNOWLEDGE.passages.find(p=>p.source_id==='pre-call');
  const env={AI:{async run(){return {data:[Array(768).fill(0)]};}},VECTORIZE:{async query(){return {matches:[{id:`${janeNamespace}:${p.id}`,namespace:janeNamespace,score:.9,metadata:{version:COPY_KNOWLEDGE.version,passage_id:p.id}}]};}}};
  assert.ok(!(await retrieveJaneKnowledge(env,{query:'People watch but nobody books'})).source_ids.includes('pre-call'));
});

test('simple messages skip planning but saved-document requests retain lookup access',()=>{
  for(const text of ['hi','Thanks!','Make it shorter.','Try again','Rewrite this: Hello.']) assert.notEqual(janeRoute(text),'lookup');
  for(const text of ['Find the decision from my earlier chat','Make the saved draft shorter','Read my transcript']) assert.equal(janeRoute(text),'lookup');
});

test('real handler scopes document saves, updates and deletion to authenticated client; approved reasons persist',async()=>{
  const {DB,sql}=fixture();
  for(const id of ['a','b']) sql.prepare('INSERT INTO client_config VALUES(?,?,?,?)').run(id,id,await sha256Hex(`token-${id}`),'active');
  const post=async(body,token='a')=>chat.onRequestPost({env:{DB},request:new Request('https://test/api/copy-chat',{method:'POST',headers:{'content-type':'application/json','x-portal-token':`token-${token}`},body:JSON.stringify(body)})});
  assert.equal((await post({action:'knowledge-save',client_id:'b',...doc('decision','Launch uses CEDAR.')})).status,200);
  assert.equal(sql.prepare("SELECT client_id FROM jane_documents").get().client_id,'a');
  await post({action:'knowledge-delete',key:'decision'},'b');
  assert.equal(sql.prepare('SELECT count(*) n FROM jane_documents').get().n,1);
  const list=await (await post({action:'knowledge-list'})).json();assert.equal(list.documents.length,1);assert.equal(list.documents[0].content,undefined);
  assert.equal((await post({action:'knowledge-save',...doc('bad','x'.repeat(50001))})).status,422);
  sql.exec("INSERT INTO copy_messages(chat_id,client_id,role,content,created_at) VALUES(1,'a','assistant','A calm opening.','2026-10-25')");
  assert.equal((await post({action:'rate',message_id:1,rating:'up',note:'Calm and direct.'})).status,200);
  assert.equal(sql.prepare('SELECT note FROM jane_example_notes').get().note,'Calm and direct.');
  await post({action:'rate',message_id:1,rating:null});assert.equal(sql.prepare('SELECT count(*) n FROM jane_example_notes').get().n,0);
  await post({action:'knowledge-delete',key:'decision'});assert.equal(sql.prepare('SELECT count(*) n FROM jane_documents').get().n,0);
});

test('native greeting performs exactly one writer call, no planner, embedding or memory calls',async()=>{
  const {DB,sql}=fixture();sql.prepare('INSERT INTO client_config VALUES(?,?,?,?)').run('a','Alpha',await sha256Hex('token-a'),'active');
  let calls=0; const pending=[];
  const AI={async run(model,payload){calls++;assert.equal(payload.stream,true);return new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"response":"Hello. What are we working on?"}\n\ndata: [DONE]\n\n'));c.close();}});}};
  const response=await chat.onRequestPost({env:{DB,AI},request:new Request('https://test/api/copy-chat',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-a'},body:JSON.stringify({action:'send',message:'Hi'})}),waitUntil:p=>pending.push(p)});
  const text=await response.text();await Promise.all(pending);assert.equal(calls,1);assert.match(text,/event: done/);assert.match(text,/"route":"social"/);
});

test('a client at the daily cap cannot spend embedding or planner calls',async()=>{
  const {DB,sql}=fixture();
  sql.exec('CREATE TABLE usage_counters(client TEXT,kind TEXT,day TEXT,count INTEGER,PRIMARY KEY(client,kind,day))');
  sql.prepare('INSERT INTO client_config VALUES(?,?,?,?)').run('a','Alpha',await sha256Hex('token-a'),'active');
  sql.prepare('INSERT INTO usage_counters VALUES(?,?,?,?)').run('a','ai',new Date().toISOString().slice(0,10),8);
  let calls=0;const AI={async run(){calls++;throw Error('must not call');}};
  const response=await chat.onRequestPost({env:{DB,AI,VECTORIZE:{query(){throw Error('must not query');}}},request:new Request('https://test/api/copy-chat',{method:'POST',headers:{'content-type':'application/json','x-portal-token':'token-a'},body:JSON.stringify({action:'send',message:'Find the unique mechanism in my saved documents.'})})});
  assert.equal(response.status,429);assert.equal(calls,0);assert.equal(sql.prepare('SELECT count(*) n FROM copy_messages').get().n,0);
});

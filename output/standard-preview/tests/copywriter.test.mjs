import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet,onRequestPost} from '../functions/api/copywriter.js';
import {sha256Hex} from '../functions/_shared/common.js';
const sql=new DatabaseSync(':memory:');
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,portal_token_hash TEXT,status TEXT DEFAULT 'prospect');
CREATE TABLE client_brain(id INTEGER,client_id TEXT,section TEXT,field TEXT,value_json TEXT,source TEXT,updated_at TEXT);
CREATE TABLE proof_items(id INTEGER,client_id TEXT,kind TEXT,url TEXT,claim TEXT,permission TEXT,created_at TEXT);`);
sql.prepare('INSERT INTO client_config(client,client_name,portal_token_hash) VALUES(?,?,?),(?,?,?)').run('a','A',await sha256Hex('token-a'),'b','B',await sha256Hex('token-b'));
sql.prepare('INSERT INTO client_brain VALUES(1,?,?,?,?,?,?)').run('a','voice','tone','"TENANT A VOICE"','test','2026-09-08');
sql.prepare('INSERT INTO client_brain VALUES(2,?,?,?,?,?,?)').run('b','voice','tone','"PRIVATE TENANT B"','test','2026-09-08');
sql.prepare('INSERT INTO proof_items VALUES(1,?,?,?,?,?,?)').run('a','image','','DO NOT USE THIS DENIED CLAIM','denied','2026-09-08');
const DB={prepare(query){let args=[];const p={bind(...v){args=v;return p},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}}}};return p}};
const request=(body,token='token-a',query='')=>new Request('https://test/api/copywriter'+query,{method:'POST',headers:{'content-type':'application/json','x-portal-token':token},body:JSON.stringify(body)});
const post=(env,body={brief:'Teach one lesson',format:'Reel'},token,query)=>onRequestPost({env,request:request(body,token,query)});
const manual={DB};
const keyed={DB,ANTHROPIC_API_KEY:'sk-test'};

// Access and validation are the same with or without a key.
assert.equal((await post(manual,undefined,'invalid')).status,401);
assert.equal((await post(manual,undefined,'token-a','?client=b')).status,403);
assert.equal((await post(manual,null)).status,422);
assert.equal((await post(manual,{brief:' '})).status,422);
assert.equal((await post(manual,{brief:'x',action:'send'})).status,422);
assert.equal((await post(manual,{brief:'x'.repeat(18001)})).status,413);
assert.equal((await onRequestPost({env:{},request:request({brief:'hello'})})).status,500,'no database is a server fault, not a silent success');

// Without a key the client gets a finished prompt to run in their own AI.
let status=await (await onRequestGet({env:manual,request:new Request('https://test/api/copywriter',{headers:{'x-portal-token':'token-a'}})})).json();
assert.equal(status.mode,'manual');assert.equal(status.available,false);
let body=await (await post(manual)).json();
assert.equal(body.ok,true);assert.equal(body.mode,'manual');assert.equal(body.output,'');
assert.match(body.prompt,/TENANT A VOICE/,'the prompt carries the client brain');
assert.match(body.prompt,/Teach one lesson/);
assert.match(body.prompt,/Write a first draft/);
assert.doesNotMatch(body.prompt,/PRIVATE TENANT B|DO NOT USE THIS DENIED CLAIM/,'other tenants and denied proof never reach the prompt');
body=await (await post(manual,{brief:'x',action:'hooks'})).json();
assert.match(body.prompt,/three different opening hooks/);

// There is no daily cap and no burst limit: a manual run costs nothing.
for(let i=0;i<40;i++)assert.equal((await post(manual)).status,200);

// With a key the same request is written by the model, and the prompt is what the model saw.
let sent;
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{sent={url:String(url),body:JSON.parse(init.body)};return new Response(JSON.stringify({content:[{type:'text',text:'A useful draft.'}]}),{status:200,headers:{'content-type':'application/json'}})};
try{
  status=await (await onRequestGet({env:keyed,request:new Request('https://test/api/copywriter',{headers:{'x-portal-token':'token-a'}})})).json();
  assert.equal(status.mode,'generated');assert.equal(status.available,true);
  body=await (await post(keyed)).json();
  assert.equal(body.mode,'generated');assert.equal(body.output,'A useful draft.');
  assert.equal(sent.url,'https://api.anthropic.com/v1/messages');
  assert.equal(sent.body.model,'claude-opus-5-5');
  assert.match(sent.body.messages[0].content,/TENANT A VOICE/);
  assert.doesNotMatch(JSON.stringify(sent.body),/PRIVATE TENANT B|DO NOT USE THIS DENIED CLAIM/);
  globalThis.fetch=async()=>new Response('upstream down',{status:500});
  const failed=await post(keyed);
  assert.equal(failed.status,502);
  assert.match((await failed.json()).prompt,/TENANT A VOICE/,'a failed call still hands back the prompt');
}finally{globalThis.fetch=realFetch}
console.log('PASS copywriter: manual prompt with tenant brain and no denied proof, one switch to Opus, no caps, auth, validation, provider failure keeps the prompt.');

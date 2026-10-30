import {onRequestGet as summary} from '../functions/api/workspace-summary.js';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestDelete,onRequestGet,onRequestPost} from '../functions/api/workspace-records.js';
import {sha256Hex} from '../functions/_shared/common.js';
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,portal_token_hash TEXT)');
sql.exec(readFileSync(new URL('../migrations/0021_workspace_records.sql',import.meta.url),'utf8'));
// 0040 rebuilds the table to allow kind 'idea'; a row written before it must survive with its data.
sql.prepare("INSERT INTO workspace_records VALUES('pre-1','a','copy','Kept draft','{\"x\":1}','2026-09-01T00:00:00Z','2026-09-01T00:00:00Z')").run();
sql.exec(readFileSync(new URL('../migrations/0040_workspace_records_idea.sql',import.meta.url),'utf8'));
{const kept=sql.prepare("SELECT * FROM workspace_records WHERE id='pre-1'").get();if(!kept||kept.title!=='Kept draft'||kept.data_json!=='{\"x\":1}')throw new Error('0040 lost a row');}
// 0085 rebuilds it again to allow kind 'icp'; the same row must survive again.
sql.exec(readFileSync(new URL('../migrations/0085_workspace_records_icp.sql',import.meta.url),'utf8'));
{const kept=sql.prepare("SELECT * FROM workspace_records WHERE id='pre-1'").get();if(!kept||kept.title!=='Kept draft'||kept.data_json!=='{\"x\":1}')throw new Error('0085 lost a row');sql.prepare("DELETE FROM workspace_records WHERE id='pre-1'").run();}
sql.prepare('INSERT INTO client_config VALUES(?,?,?),(?,?,?)').run('a','A',await sha256Hex('token-a'),'b','B',await sha256Hex('token-b'));
sql.exec("ALTER TABLE client_config ADD COLUMN status TEXT DEFAULT 'prospect'");
const env={DB:{prepare(query){let args=[];const p={bind(...v){args=v;return p},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}}}};return p}}};
const req=(body,token='token-a')=>new Request('https://test/api/workspace-records',{method:'POST',headers:{'content-type':'application/json','x-portal-token':token},body:JSON.stringify(body)});
const body={kind:'lead',title:'QA lead',data:{stage:'New',notes:'User-entered text <script>'}};
let r=await onRequestPost({env,request:req(body)});assert.equal(r.status,201);const created=await r.json();
assert.equal((await onRequestPost({env,request:req({...body,id:created.id,updated_at:created.updated_at},'token-b')})).status,404);
assert.equal((await onRequestPost({env,request:req({...body,id:created.id,updated_at:'stale'})})).status,409);
assert.equal((await onRequestPost({env,request:req({...body,id:created.id,updated_at:created.updated_at,data:{stage:'Conversation'}})})).status,200);
r=await onRequestGet({env,request:new Request('https://test/api/workspace-records',{headers:{'x-portal-token':'token-b'}})});assert.equal((await r.json()).rows.length,0);
assert.equal((await onRequestGet({env,request:new Request('https://test/api/workspace-records?client=b',{headers:{'x-portal-token':'token-a'}})})).status,403);
assert.equal((await onRequestPost({env,request:req(body,'invalid')})).status,401);
assert.equal((await onRequestPost({env,request:req({...body,kind:'admin'})})).status,422);
// Reel ideas are saved as kind 'idea' so they outlive the browser tab (pulsify-saas overnight fix 2026-09-25).
{const idea=await onRequestPost({env,request:req({kind:'idea',title:'closed a skeptical client',data:{text:'closed a skeptical client',angle:'A win to credibility',sequenceId:40,formats:['a','b']}})});assert.equal(idea.status,201);const listed=await (await onRequestGet({env,request:new Request('https://test/api/workspace-records',{headers:{'x-portal-token':'token-a'}})})).json();assert.ok(listed.rows.some(row=>row.kind==='idea'&&row.data.sequenceId===40));}
assert.equal((await onRequestPost({env,request:req(null)})).status,422);
// The ICP avatar is kind 'icp' and is checked before it is stored (pulsify-saas #105).
{const marcus=JSON.parse(readFileSync(new URL('../../../wiki/people/marcus-icp.json',import.meta.url),'utf8'));
const saved=await onRequestPost({env,request:req({kind:'icp',title:'Marcus',data:marcus})});assert.equal(saved.status,201);
const broken=await onRequestPost({env,request:req({kind:'icp',title:'Marcus',data:{...marcus,points:marcus.points.slice(1)}})});assert.equal(broken.status,422);assert.match((await broken.json()).error,/28 points/);
const listed=await (await onRequestGet({env,request:new Request('https://test/api/workspace-records',{headers:{'x-portal-token':'token-a'}})})).json();assert.equal(listed.rows.find(row=>row.kind==='icp').data.name,'Marcus');}
assert.equal((await onRequestPost({env,request:req({...body,data:{notes:'x'.repeat(100001)}})})).status,413);
{const gone=await (await onRequestPost({env,request:req({kind:'reference',title:'Old thumbnail',data:{channel:'thumbnail'}})})).json();const del=(id,token='token-a')=>onRequestDelete({env,request:new Request('https://test/api/workspace-records?id='+id,{method:'DELETE',headers:{'x-portal-token':token}})});
assert.equal((await del(gone.id,'token-b')).status,404);assert.equal((await del(gone.id)).status,200);assert.equal((await del(gone.id)).status,404);assert.equal((await del('')).status,422);}
console.log('PASS workspace records: persistence, tenant isolation, stale update conflicts, auth, size and schema validation');

for(const table of ['studio_sequences','studio_carousels','sequence_log','proof_items']){sql.exec('CREATE TABLE '+table+'(client_id TEXT)');sql.prepare('INSERT INTO '+table+' VALUES(?),(?)').run('a','b');}sql.exec('CREATE TABLE payments(client TEXT)');sql.prepare('INSERT INTO payments VALUES(?)').run('a');const result=await summary({env,request:new Request('https://test/api/workspace-summary',{headers:{'x-portal-token':'token-a'}})});const totals=await result.json();assert.equal(totals.counts.stories,1);assert.equal(totals.counts.sequences,1);assert.equal(totals.counts.lead,1);assert.equal((await summary({env,request:new Request('https://test/api/workspace-summary')})).status,401);console.log('PASS all-time summary: direct database counts and tenant isolation');

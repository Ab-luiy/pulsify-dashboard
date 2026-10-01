import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createSetupLink, resolveClientAccess } from '../functions/_shared/client-auth.js';
import { onRequestPost as setPassword } from '../functions/api/client-set-password.js';
import { onRequestPost as login } from '../functions/api/client-login.js';
import { onRequestPost as upload } from '../functions/api/media-upload.js';
import { onRequestPost as setupLink } from '../functions/api/client-setup-link.js';
import { onRequest } from '../functions/portal/[[path]].js';
import { onRequestGet as contextExport } from '../functions/api/client-context.js';
import { onRequestPost as studioWrite } from '../functions/api/studio-sequences.js';
import { sha256Hex } from '../functions/_shared/common.js';

const sql = new DatabaseSync(':memory:');
sql.exec('CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,portal_token_hash TEXT)');
for (const file of ['0011_client_dashboard_auth.sql','0014_client_brain.sql','0049_login_throttle.sql']) {
  sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
}
sql.exec("CREATE TABLE client_email_codes(client_id TEXT,email TEXT,purpose TEXT); INSERT INTO client_config VALUES('qa','QA',NULL),('other','Other',NULL)");
sql.exec("ALTER TABLE client_config ADD COLUMN status TEXT DEFAULT 'prospect'");
const DB = {
  prepare(query) {
    let values=[];
    const wrapper={
      bind(...args){values=args;return wrapper;},
      async first(){return sql.prepare(query).get(...values)||null;},
      async all(){return {results:sql.prepare(query).all(...values)};},
      async run(){const r=sql.prepare(query).run(...values);return {meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}};},
    };
    return wrapper;
  },
  async batch(statements){return Promise.all(statements.map(s=>s.run()));},
};
const env={DB};
const post=(path,body,headers={})=>new Request('https://qa.test'+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
const setup=await createSetupLink(env,'https://qa.test','qa','qa@example.test');
const token=new URL(setup.link).searchParams.get('setup');
let response=await setPassword({env,request:post('/api/client-set-password',{setup_token:token,password:'a-long-test-password'})});
assert.equal(response.status,200);
assert.match((await response.clone().json()).redirect,/^\/app\/portal\/onboarding\?client=qa$/,'initial registration opens the onboarding form');
const oldCookie=response.headers.get('set-cookie').split(';')[0];
assert.match(response.headers.get('set-cookie'),/HttpOnly/);
assert.match(response.headers.get('set-cookie'),/Secure/);
assert.equal((await setPassword({env,request:post('/api/client-set-password',{setup_token:token,password:'another-test-password'})})).status,401,'setup link is single use');
assert.equal((await resolveClientAccess(new Request('https://qa.test/api?client=other',{headers:{cookie:oldCookie}}),env)).error.status,403,'session cannot switch tenants');
response=await login({env,request:post('/api/client-login',{email:'QA@example.test',password:'a-long-test-password'})});
assert.equal(response.status,200,'password login normalizes email');
const reset=await createSetupLink(env,'https://qa.test','qa','qa@example.test');
response=await setPassword({env,request:post('/api/client-set-password',{setup_token:new URL(reset.link).searchParams.get('setup'),password:'replacement-test-password'})});
assert.equal(response.status,200);
assert.equal((await resolveClientAccess(new Request('https://qa.test/api',{headers:{cookie:oldCookie}}),env)).error.status,401,'reset invalidates older sessions');
const cookie=response.headers.get('set-cookie').split(';')[0];
const objects=new Map();
env.MEDIA={async put(key,value){objects.set(key,value);},async delete(key){objects.delete(key);}};
const form=new FormData();
form.set('file',new File([Uint8Array.from([137,80,78,71,13,10,26,10])],'qa.png',{type:'image/png'}));
form.set('claim','QA sample');
response=await upload({env,request:new Request('https://qa.test/api/media-upload',{method:'POST',headers:{cookie},body:form})});
assert.equal(response.status,201,'upload must satisfy the real proof_items CHECK constraint');
assert.equal(sql.prepare('SELECT kind FROM proof_items').get().kind,'image-link');
assert.equal(objects.size,1);
response=await contextExport({env,request:new Request('https://qa.test/api/client-context',{headers:{cookie}})});
assert.equal(response.status,200);
assert.match(response.headers.get('content-disposition'),/qa-pulsify-context.md/);
assert.match(await response.text(),/QA sample/);
response=await contextExport({env,request:new Request('https://qa.test/api/client-context?client=other',{headers:{cookie}})});
assert.equal(response.status,403,'context export cannot cross tenants');
const before=sql.prepare('SELECT COUNT(*) AS n FROM client_setup_tokens').get().n;
response=await setupLink({env:{...env,ADMIN_KEY:'qa-admin'},request:post('/api/client-setup-link',{client:'qa',email:'qa@example.test',send_email:true},{'x-admin-key':'qa-admin'})});
assert.equal(response.status,422);
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM client_setup_tokens').get().n,before,'missing mail config must not rotate links');
const assetEnv={...env,ASSETS:{async fetch(){return new Response('setup form');}}};
response=await onRequest({env:assetEnv,params:{path:'login'},request:new Request('https://qa.test/portal/login?setup=new-link',{headers:{cookie}})});
assert.equal(response.status,200,'signed-in clients can still open setup links');
assert.equal(await response.text(),'setup form');
assert.equal(response.headers.get('cache-control'),'no-store');
assert.equal(response.headers.get('referrer-policy'),'no-referrer');
response=await onRequest({env:assetEnv,params:{path:'register'},request:new Request('https://qa.test/portal/register?setup=new-link')});
assert.equal(response.status,200,'registration route serves the setup form');
response=await onRequest({env:assetEnv,params:{path:'references/story-1.png'},request:new Request('https://qa.test/portal/references/story-1.png')});
assert.equal(response.status,401,'reference images require authentication');
response=await onRequest({env:assetEnv,params:{path:'references/story-1.png'},request:new Request('https://qa.test/portal/references/story-1.png',{headers:{cookie}})});
assert.equal(response.status,200,'authenticated clients can read reference images');
sql.prepare('UPDATE client_config SET portal_token_hash=? WHERE client=?').run(await sha256Hex('qa-private-link'),'qa');
response=await onRequest({env:assetEnv,params:{path:''},request:new Request('https://qa.test/portal?t=qa-private-link&client=qa')});
assert.equal(response.status,302,'private link signs in and forwards to the new portal');
assert.equal(response.headers.get('location'),'https://qa.test/app/portal?client=qa');
const privateCookie=response.headers.get('set-cookie').split(';')[0];
assert.equal((await resolveClientAccess(new Request('https://qa.test/portal?client=qa',{headers:{cookie:privateCookie}}),env)).client,'qa','private-link refresh remains authenticated after URL token removal');
sql.exec("CREATE TABLE studio_sequences(id INTEGER PRIMARY KEY,client_id TEXT,status TEXT,output_json TEXT,review_note TEXT,updated_at TEXT); INSERT INTO studio_sequences(id,client_id,status) VALUES(1,'qa','draft'),(2,'other','draft'),(3,'qa','approved')");
const writeDraft=(id,output)=>studioWrite({env,request:post('/api/studio-sequences',{action:'save-draft',id,raw_text:JSON.stringify(output)},{cookie})});
response=await writeDraft(1,{slides:[{text_pills:['Saved copy']}]});
assert.equal(response.status,200);
assert.equal(sql.prepare('SELECT status FROM studio_sequences WHERE id=1').get().status,'draft','saving does not submit for review');
response=await writeDraft(1,{raw_text:'Plain story copy'});
assert.deepEqual((await response.json()).output,{raw_text:'Plain story copy'},'plain text output round trips without JSON nesting');
assert.equal((await writeDraft(2,{raw_text:'Wrong tenant'})).status,404);
assert.equal((await writeDraft(3,{raw_text:'Approved edit'})).status,422);
response=await studioWrite({env,request:post('/api/studio-sequences',{action:'submit-for-review',id:1},{cookie})});
assert.equal(response.status,200);
assert.equal((await writeDraft(1,{raw_text:'Edit during review'})).status,422);
sql.exec("UPDATE studio_sequences SET status='draft' WHERE id=1");
await writeDraft(1,{template_id:'credibility::paper',slides:[{text_pills:['Show [verified result]']}]});
assert.equal((await studioWrite({env,request:post('/api/studio-sequences',{action:'submit-for-review',id:1},{cookie})})).status,422,'unresolved designed template cannot enter review');
await writeDraft(1,{template_id:'credibility::paper',slides:[{text_pills:['A specific reviewed statement']}]});
assert.equal((await studioWrite({env,request:post('/api/studio-sequences',{action:'submit-for-review',id:1},{cookie})})).status,200);
const {onRequestGet:readOrder,onRequestPost:saveOrder}=await import('../functions/api/media-order.js');
sql.exec(readFileSync(new URL('../migrations/0023_media_order.sql',import.meta.url),'utf8'));
const ownId=Number(sql.prepare("SELECT id FROM proof_items WHERE client_id='qa' LIMIT 1").get().id);
assert.equal((await saveOrder({env,request:post('/api/media-order',{ids:[ownId,ownId]},{cookie})})).status,422);
assert.equal((await saveOrder({env,request:post('/api/media-order',{ids:[999999]},{cookie})})).status,403);
assert.equal((await saveOrder({env,request:post('/api/media-order',{ids:[ownId]},{cookie})})).status,200);
assert.deepEqual((await (await readOrder({env,request:new Request('https://qa.test/api/media-order',{headers:{cookie}})})).json()).ids,[ownId]);
assert.equal((await readOrder({env,request:new Request('https://qa.test/api/media-order')})).status,401);
sql.close();
console.log('PASS real SQLite: first-client setup, password login, tenant isolation, reset/session revocation, proof upload constraint, email failure and setup-page routing');

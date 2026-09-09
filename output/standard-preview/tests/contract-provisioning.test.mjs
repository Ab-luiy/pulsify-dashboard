import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestPost} from '../functions/api/docusign-connect.js';
import {onRequestGet} from '../functions/api/contract-status.js';
import {seal,unseal} from '../functions/_shared/secret-box.js';
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT)');
for(const name of ['0011_client_dashboard_auth.sql','0024_contract_provisioning.sql'])sql.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
const DB={prepare(query){let args=[];const p={bind(...a){args=a;return p;},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}};}};return p;},async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const env={DB,ADMIN_KEY:'test-admin',DOCUSIGN_HMAC_SECRET:'test-hmac',DOCUSIGN_ACCOUNT_ID:'test-account',INTEGRATION_ENCRYPTION_KEY:btoa('x'.repeat(32)),RESEND_API_KEY:'test-mail',EMAIL_FROM:'qa@example.test'};
const payload={event:'envelope-completed',data:{accountId:'test-account',envelopeId:'test-envelope-1',envelopeSummary:{status:'completed',customFields:{textCustomFields:[{name:'pulsify_portal',value:'true'}]},recipients:{signers:[{roleName:'Client',status:'completed',email:'client@example.test',name:'QA Client'}]}}}};
async function call(value=payload,signed=true){const raw=JSON.stringify(value),headers={'content-type':'application/json'};if(signed){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.DOCUSIGN_HMAC_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);headers['x-docusign-signature-1']=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)))));}return onRequestPost({env,request:new Request('https://portal.test/api/docusign-connect',{method:'POST',headers,body:raw})});}
const originalFetch=globalThis.fetch;let sends=0,fail=true,lastLink,lastId;
globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');sends++;const body=JSON.parse(options.body);lastLink=body.text.match(/https:\/\/\S+/)[0];if(lastId)assert.equal(options.headers['idempotency-key'],lastId);lastId=options.headers['idempotency-key'];return new Response('{}',{status:fail?503:200});};
try{
 assert.equal((await call(payload,false)).status,401);assert.equal(sends,0);
 assert.equal((await call({...payload,data:{...payload.data,accountId:'other'}})).status,403);
 assert.equal((await call({...payload,event:'envelope-sent'})).status,200);assert.equal(sends,0);
 assert.equal((await call()).status,503,'failed mail leaves resumable provisioning');
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM client_auth').get().n,1);
 const row=sql.prepare('SELECT * FROM contract_provisioning').get();assert.equal(row.state,'pending');assert.ok(!row.invitation_cipher.includes('https:'));
 const beforeLink=lastLink;fail=false;assert.equal((await call()).status,200);assert.equal(lastLink,beforeLink,'retry preserves identical invitation');
 assert.equal(sql.prepare('SELECT invitation_cipher FROM contract_provisioning').get().invitation_cipher,null,'delivered link is removed');
 assert.equal((await call()).status,200);assert.equal(sends,2,'delivered event is idempotent');
 const another=structuredClone(payload);another.data.envelopeId='test-envelope-2';assert.equal((await (await call(another)).json()).state,'existing');assert.equal(sends,2,'existing account credentials and invitation are untouched');
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM client_auth').get().n,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM client_setup_tokens').get().n,1);
 const encrypted=await seal(env,'secret','tenant-a');assert.equal(await unseal(env,encrypted,'tenant-a'),'secret');await assert.rejects(()=>unseal(env,encrypted,'tenant-b'),'ciphertext is bound to context');
 assert.equal((await onRequestGet({env,request:new Request('https://portal.test/api/contract-status')})).status,401);
 const status=await (await onRequestGet({env,request:new Request('https://portal.test/api/contract-status',{headers:{'x-admin-key':'test-admin'}})})).json();assert.equal(status.configured,true);assert.equal(status.rows.length,2);
 console.log('PASS contract onboarding: signed events, account isolation, atomic provision, encrypted invitation, retry, duplicate events and existing accounts. Email mocked.');
}finally{globalThis.fetch=originalFetch;sql.close();}

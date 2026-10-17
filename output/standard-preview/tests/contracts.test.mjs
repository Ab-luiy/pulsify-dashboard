// Ticket #80: contract popup backend. Real SQLite, DocuSign fully mocked. Nothing leaves the process.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync, verify} from 'node:crypto';
import {onRequestGet,onRequestPost} from '../functions/api/contracts.js';
import {onRequestPost as connect} from '../functions/api/docusign-connect.js';
import {GUARANTEE_TEXT,buildContractHtml} from '../functions/_shared/contract-text.js';
import {clearTokenCache,pemToPkcs8,signJwt} from '../functions/_shared/docusign.js';

const sql=new DatabaseSync(':memory:');
for(const name of ['0015_operator_events.sql','0024_contract_provisioning.sql','0080_contracts.sql'])sql.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
const DB={prepare(query){let args=[];const p={bind(...a){args=a;return p;},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}};}};return p;},async batch(list){const out=[];for(const s of list)out.push(await s.run());return out;}};

const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const pkcs1=privateKey.export({type:'pkcs1',format:'pem'});
const pkcs8=privateKey.export({type:'pkcs8',format:'pem'});
const base={DB,ADMIN_KEY:'k'};
const live={...base,DOCUSIGN_ACCOUNT_ID:'acct-1',DOCUSIGN_INTEGRATION_KEY:'ik-1',DOCUSIGN_USER_ID:'user-1',DOCUSIGN_PRIVATE_KEY:pkcs1,DOCUSIGN_HMAC_SECRET:'hmac'};

const calls=[];let failSend=false,remoteStatus='sent';
const fetcher=async(url,init={})=>{
  calls.push({url:String(url),init});
  assert.ok(/^https:\/\/(account-d\.docusign\.com|demo\.docusign\.net)\//.test(String(url)),'only the DocuSign sandbox is ever called: '+url);
  if(String(url).endsWith('/oauth/token'))return new Response(JSON.stringify({access_token:'tok',expires_in:3600}),{status:200});
  if(init.method==='POST'&&String(url).endsWith('/envelopes')){
    if(failSend)return new Response(JSON.stringify({errorCode:'INVALID',message:'Bad recipient'}),{status:400});
    return new Response(JSON.stringify({envelopeId:'env-test-0001',status:'sent'}),{status:201});
  }
  if(init.method==='PUT')return new Response('{}',{status:200});
  return new Response(JSON.stringify({status:remoteStatus,completedDateTime:'2026-10-17T10:00:00Z'}),{status:200});
};

const req=(body,env=live,admin=true)=>new Request('https://portal.test/api/contracts',{method:'POST',headers:{'content-type':'application/json',...(admin?{'x-admin-key':'k'}:{})},body:JSON.stringify(body)});
const post=async(body,env=live,admin=true)=>{const {handlePostWith}=await import('../functions/api/contracts.js');const res=await handlePostWith({request:req(body,env,admin),env,fetcher});return {status:res.status,json:await res.json()};};
const deal={crm_key:'Jane Doe',first_name:'Jane',last_name:'Doe',email:'Jane@Example.test',start_revenue:12000};

// Key handling: DocuSign gives PKCS#1; WebCrypto needs PKCS#8. The wrapped key must sign like the original.
{
  const wrapped=Buffer.from(pemToPkcs8(pkcs1));
  const original=Buffer.from(pkcs8.replace(/-----[^-]+-----|\s/g,''),'base64');
  assert.deepEqual(wrapped,original,'PKCS#1 is wrapped into the same PKCS#8 bytes');
  const jwt=await signJwt(live,1000);const [h,c,s]=jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(c,'base64url')).aud,'account-d.docusign.com');
  assert.equal(JSON.parse(Buffer.from(c,'base64url')).scope,'signature impersonation');
  assert.ok(verify('RSA-SHA256',Buffer.from(h+'.'+c),publicKey,Buffer.from(s,'base64url')),'JWT signature verifies');
}

// Operator only.
assert.equal((await onRequestGet({env:live,request:new Request('https://portal.test/api/contracts')})).status,401);
assert.equal((await post({action:'save',...deal},live,false)).status,401);

// Save checks every field in plain words.
for(const [patch,words] of [[{first_name:''},'first name'],[{last_name:' '},'last name'],[{email:'nope'},'valid email'],[{start_revenue:''},'starting monthly revenue'],[{fee_percent:140},'1 to 100'],[{upfront:'abc'},'setup fee'],[{crm_key:''},'prospect']]){
  const r=await post({action:'save',...deal,...patch});assert.equal(r.status,422);assert.match(r.json.error,new RegExp(words,'i'));
}
let saved=(await post({action:'save',...deal})).json.contract;
assert.equal(saved.status,'draft');assert.equal(saved.email,'jane@example.test');assert.equal(saved.fee_percent,30);assert.equal(saved.upfront,5000);assert.equal(saved.start_revenue,12000);
assert.equal((await post({action:'save',...deal})).status,409,'one live contract per prospect');
saved=(await post({action:'save',id:saved.id,...deal,start_revenue:15000.5,notes:'Net 5'})).json.contract;assert.equal(saved.start_revenue,15000.5);

// Not connected: saved but not sent, plain message, no call out.
{
  const r=await post({action:'send',id:saved.id},base);
  assert.equal(r.status,503);assert.equal(r.json.not_connected,true);assert.equal(calls.length,0);
  assert.equal(sql.prepare('SELECT status FROM contracts').get().status,'draft');
}

// A failed hand-off returns it to draft with the reason; a retry works.
failSend=true;
{
  const r=await post({action:'send',id:saved.id});
  assert.equal(r.status,502);assert.match(r.json.error,/Bad recipient/);assert.equal(r.json.contract.status,'draft');assert.match(r.json.contract.send_error,/Bad recipient/);
}
failSend=false;clearTokenCache();
const sent=(await post({action:'send',id:saved.id})).json.contract;
assert.equal(sent.status,'sent');assert.ok(sent.sent_at);
{
  const make=calls.filter(c=>c.url.endsWith('/envelopes')&&c.init.method==='POST').pop();
  const env=JSON.parse(make.init.body);
  assert.equal(env.status,'sent');assert.equal(env.recipients.signers.length,1,'client signs; no counter-signer without DOCUSIGN_OPERATOR_EMAIL');
  assert.equal(env.recipients.signers[0].email,'jane@example.test');assert.equal(env.recipients.signers[0].roleName,'Client');
  assert.ok(env.customFields.textCustomFields.some(f=>f.name==='pulsify_portal'&&f.value==='true'));
  const html=Buffer.from(env.documents[0].documentBase64,'base64').toString('utf8');
  assert.ok(html.replace(/&#39;/g,"'").includes(GUARANTEE_TEXT),'approved guarantee wording, word for word');
  assert.ok(html.includes('30%'));assert.ok(html.includes('$15,000.50 per month'));assert.ok(html.includes('$5,000'));assert.ok(html.includes('/pulsify_client_sign/'));
  assert.equal(make.init.headers.authorization,'Bearer tok');
}
assert.equal((await post({action:'send',id:saved.id})).status,409,'cannot send twice');
assert.equal((await post({action:'save',id:saved.id,...deal})).status,409,'a sent contract cannot be edited');
assert.equal(calls.filter(c=>c.url.endsWith('/envelopes')&&c.init.method==='POST').length,2,'one failed + one successful create only');

// Contract text escapes everything typed in.
{
  const html=buildContractHtml({...deal,id:'x',first_name:'<b>Jane</b>',last_name:'"Doe"',email:'a@b.test',upfront_cents:0,fee_percent:30,start_revenue_cents:0,notes:'<script>x</script>'});
  assert.ok(!html.includes('<b>Jane')&&!html.includes('<script>'));assert.ok(html.includes('No upfront fee is payable'));
}

// Status follows DocuSign: refresh, then the Connect webhook.
remoteStatus='sent';assert.equal((await post({action:'refresh',id:saved.id})).json.contract.status,'sent');
async function webhook(event,status){
  const raw=JSON.stringify({event,data:{accountId:'acct-1',envelopeId:'env-test-0001',envelopeSummary:{status}}});
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('hmac'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)))));
  return connect({env:{...live,INTEGRATION_ENCRYPTION_KEY:btoa('x'.repeat(32)),RESEND_API_KEY:'r',EMAIL_FROM:'a@b.test'},request:new Request('https://portal.test/api/docusign-connect',{method:'POST',headers:{'x-docusign-signature-1':sig},body:raw})});
}
assert.equal((await webhook('envelope-delivered','delivered')).status,200);
assert.equal(sql.prepare('SELECT status FROM contracts').get().status,'sent');
// Completed without the onboarding marker: contract is signed, no workspace is opened.
assert.equal((await webhook('envelope-completed','completed')).status,200);
{const row=sql.prepare('SELECT status,signed_at FROM contracts').get();assert.equal(row.status,'signed');assert.ok(row.signed_at);}
assert.equal((await webhook('envelope-voided','voided')).status,200);
assert.equal(sql.prepare('SELECT status FROM contracts').get().status,'signed','a signed contract never goes backwards');
assert.equal((await post({action:'cancel',id:saved.id})).status,409);

// Declined: the card can start a fresh contract.
{
  const second=(await post({action:'save',...deal,crm_key:'Sam Roe',email:'sam@example.test'})).json.contract;
  sql.prepare("UPDATE contracts SET status='sent',envelope_id='env-2' WHERE id=?").run(second.id);
  remoteStatus='declined';assert.equal((await post({action:'refresh',id:second.id})).json.contract.status,'declined');
  const again=(await post({action:'save',...deal,crm_key:'Sam Roe',email:'sam@example.test'}));assert.equal(again.status,200,'declined contracts do not block a new one');
  const third=again.json.contract;sql.prepare("UPDATE contracts SET status='sent',envelope_id='env-3' WHERE id=?").run(third.id);
  const voided=(await post({action:'cancel',id:third.id})).json.contract;assert.equal(voided.status,'voided');
  assert.ok(calls.some(c=>c.init.method==='PUT'&&c.url.endsWith('/envelopes/env-3')),'cancel voids the envelope in DocuSign');
}

// List.
{
  const res=await onRequestGet({env:live,request:new Request('https://portal.test/api/contracts?key=Jane%20Doe',{headers:{'x-admin-key':'k'}})});
  const body=await res.json();assert.equal(body.configured,true);assert.equal(body.contracts.length,1);assert.equal(body.contracts[0].status,'signed');
  const off=await (await onRequestGet({env:base,request:new Request('https://portal.test/api/contracts',{headers:{'x-admin-key':'k'}})})).json();assert.equal(off.configured,false);
}
assert.ok(calls.every(c=>!/resend|zernio/.test(c.url)),'no email or Zernio call');
console.log('PASS contracts: save checks, not-connected state, failed send returns to draft, one envelope per contract, guarantee wording and terms in the document, status by refresh and webhook, cancel, no live calls.');

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startPropelAuth,finishPropelAuth,propelConfig} from '../functions/_shared/propelauth.js';

const callback='https://pulsify-ai.com/api/propelauth/callback';
const env={PROPELAUTH_ENABLED:'1',PROPELAUTH_AUTH_URL:'https://login.pulsify-ai.com',PROPELAUTH_CLIENT_ID:'client-test',PROPELAUTH_CALLBACK_URL:callback};

async function begin(search='') {
  const response=await startPropelAuth({request:new Request('https://pulsify-ai.com/api/propelauth/start'+search),env});
  const authorize=new URL(response.headers.get('location'));
  const cookie=response.headers.get('set-cookie').split(';')[0];
  return {response,authorize,cookie};
}

function fakeDB(rows) {
  const writes=[];
  return {writes,prepare(sql){return {bind(...args){return {
    async all(){assert.match(sql,/client_provider_identities/);assert.equal(args[0],'user_123');return {results:rows};},
    async run(){writes.push({sql,args});return {success:true};},
  };}};}};
}

const user={user_id:'user_123',email:'client@example.test',email_confirmed:true,enabled:true,locked:false,org_id_to_org_info:{org_good:{org_id:'org_good'}}};
function providerFetch(identity=user){return async (url,options)=>{
  assert.equal(new URL(url).origin,'https://login.pulsify-ai.com');
  if (String(url).endsWith('/token')) {
    assert.equal(options.method,'POST');
    assert.equal(options.body.get('grant_type'),'authorization_code');
    assert.ok(options.body.get('code_verifier'));
    return Response.json({access_token:'provider-access'});
  }
  assert.equal(options.headers.authorization,'Bearer provider-access');
  return Response.json(identity);
};}

test('disabled setup cannot start sign-in or expose provider config',async()=>{
  assert.equal(propelConfig({...env,PROPELAUTH_ENABLED:'0'}),null);
  const response=await startPropelAuth({request:new Request('https://pulsify-ai.com/api/propelauth/start'),env:{...env,PROPELAUTH_ENABLED:'0'}});
  assert.equal(response.status,503);
});

test('start issues a bounded PKCE flow and blocks arbitrary return URLs',async()=>{
  const {response,authorize,cookie}=await begin('?next=https%3A%2F%2Fevil.test%2Fsteal&client=client-a');
  assert.equal(response.status,302);
  assert.equal(authorize.origin,'https://login.pulsify-ai.com');
  assert.equal(authorize.pathname,'/propelauth/oauth/authorize');
  assert.equal(authorize.searchParams.get('response_type'),'code');
  assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');
  assert.ok(authorize.searchParams.get('code_challenge'));
  assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  const flow=JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')));
  assert.equal(flow.next,'/app/portal');
  assert.equal(flow.as,'client');
  assert.equal(flow.client,'client-a');
  assert.equal((await startPropelAuth({request:new Request('https://pulsify-ai.com/api/propelauth/start?client=..%2Fadmin'),env})).status,400);
});

test('callback rejects state mismatch before contacting provider',async()=>{
  const {cookie}=await begin();
  const response=await finishPropelAuth({request:new Request(callback+'?state=wrong&code=abc',{headers:{cookie}}),env},{fetcher:()=>{throw Error('must not call provider');}});
  assert.equal(response.status,302);
  assert.match(response.headers.get('location'),/auth_error=expired/);
  assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
});

test('callback requires an explicit user-to-client link and matching organization',async()=>{
  const {authorize,cookie}=await begin();
  const db=fakeDB([{client_id:'client-a',provider_org_id:'org_other',status:'active'}]);
  const url=callback+'?state='+encodeURIComponent(authorize.searchParams.get('state'))+'&code=abc';
  const response=await finishPropelAuth({request:new Request(url,{headers:{cookie}}),env:{...env,DB:db}},{fetcher:providerFetch()});
  assert.match(response.headers.get('location'),/auth_error=unlinked/);
  assert.equal(db.writes.length,0);
});

test('linked confirmed client receives only their own short-lived session',async()=>{
  const {authorize,cookie}=await begin('?client=client-a&next=%2Fonboard%3Fstep%3D1%26client%3Dclient-b');
  const db=fakeDB([{client_id:'client-a',provider_org_id:'org_good',status:'active'},{client_id:'client-b',provider_org_id:'org_other',status:'active'}]);
  const url=callback+'?state='+encodeURIComponent(authorize.searchParams.get('state'))+'&code=abc';
  const response=await finishPropelAuth({request:new Request(url,{headers:{cookie}}),env:{...env,DB:db}},{fetcher:providerFetch()});
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),'https://pulsify-ai.com/onboard?step=1&client=client-a');
  const cookies=response.headers.getSetCookie().join('\n');
  assert.match(cookies,/pulsify_client_session=/);
  assert.match(cookies,/Max-Age=43200/);
  assert.equal(db.writes.length,1);
  assert.equal(db.writes[0].args[1],'client-a');
});

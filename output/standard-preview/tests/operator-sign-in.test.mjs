// Operators sign in with PropelAuth on the branded page; no Cloudflare screen.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startPropelAuth,finishPropelAuth} from '../functions/_shared/propelauth.js';
import {pulsifyMiddleware} from '../functions/_middleware.js';
import {onRequestGet as logout} from '../functions/api/operator-logout.js';
import {OPERATOR_COOKIE} from '../functions/_shared/operator-session.js';

const callback='https://pulsify-ai.com/api/propelauth/callback';
function fakeDB(){
  const db={sessions:new Map(),events:[]};
  db.prepare=sql=>({bind:(...args)=>({
    async run(){
      if(sql.startsWith('INSERT INTO operator_sessions')){const [hash,email,user,created,expires]=args;db.sessions.set(hash,{email,user,created,expires_at:expires,revoked_at:null});return {};}
      if(sql.startsWith('UPDATE operator_sessions')){const [at,hash]=args;const row=db.sessions.get(hash);if(row)row.revoked_at=at;return {};}
      if(sql.startsWith('INSERT INTO operator_events')){db.events.push(args);return {};}
      throw Error('unexpected run '+sql);
    },
    async first(){
      if(sql.includes('FROM operator_sessions')){const row=db.sessions.get(args[0]);return row&&!row.revoked_at?row:null;}
      return null;
    },
    async all(){return {results:[]};},
  })});
  return db;
}
const baseEnv=db=>({PROPELAUTH_ENABLED:'1',PROPELAUTH_AUTH_URL:'https://auth.pulsify-ai.com',PROPELAUTH_CLIENT_ID:'client-test',PROPELAUTH_CALLBACK_URL:callback,OPERATOR_EMAILS:'Founder@Pulsify.test, second@pulsify.test',ACCESS_AUD:'console',DB:db});
const person=(email,extra={})=>({user_id:'u_1',email,email_confirmed:true,enabled:true,locked:false,org_id_to_org_info:{},...extra});
const provider=user=>async url=>String(url).endsWith('/token')?Response.json({access_token:'tok'}):Response.json(user);

async function signIn(env,user,search='?as=operator'){
  const start=await startPropelAuth({request:new Request('https://pulsify-ai.com/api/propelauth/start'+search),env});
  const flowCookie=start.headers.get('set-cookie').split(';')[0];
  const state=new URL(start.headers.get('location')).searchParams.get('state');
  return finishPropelAuth({request:new Request(`${callback}?state=${state}&code=c`,{headers:{cookie:flowCookie}}),env},{fetcher:provider(user)});
}
const sessionCookie=response=>response.headers.getSetCookie().find(c=>c.startsWith(OPERATOR_COOKIE+'='));
const through=(env,url,cookie,init={})=>pulsifyMiddleware({request:new Request(url,{...init,headers:{...(init.headers||{}),cookie}}),env,data:{},next:async()=>new Response('app')});

test('operator start keeps operators inside the console',async()=>{
  const env=baseEnv(fakeDB());
  for(const [next,expected] of [[null,'/app/'],['/app/crm','/app/crm'],['/app/portal','/app/'],['https://evil.test/x','/app/'],['//evil.test','/app/']]){
    const q='?as=operator'+(next?'&next='+encodeURIComponent(next):'');
    const r=await startPropelAuth({request:new Request('https://pulsify-ai.com/api/propelauth/start'+q),env});
    const flow=JSON.parse(decodeURIComponent(r.headers.get('set-cookie').split(';')[0].split('=').slice(1).join('=')));
    assert.equal(flow.as,'operator');assert.equal(flow.next,expected,String(next));
  }
});

test('an approved operator gets a hardened session cookie and lands in /app',async()=>{
  const db=fakeDB(),env=baseEnv(db);
  const r=await signIn(env,person('founder@pulsify.test'));
  assert.equal(r.status,302);
  assert.equal(r.headers.get('location'),'https://pulsify-ai.com/app/');
  const cookie=sessionCookie(r);
  assert.match(cookie,/^__Host-pulsify_operator=[A-Za-z0-9_-]{40,}; Path=\/; Max-Age=43200; HttpOnly; Secure; SameSite=Lax$/);
  assert.equal(db.sessions.size,1);
  assert.ok(![...db.sessions.keys()][0].includes(cookie.split(';')[0].split('=')[1]),'only the hash is stored');
  assert.equal(db.events.length,1);
  const page=await through(env,'https://pulsify-ai.com/app/crm',cookie.split(';')[0]);
  assert.equal(await page.text(),'app');
});

test('anyone not on OPERATOR_EMAILS, unconfirmed or locked is refused',async()=>{
  for(const user of [person('stranger@example.test'),person('founder@pulsify.test',{email_confirmed:false}),person('founder@pulsify.test',{locked:true})]){
    const db=fakeDB();const r=await signIn(baseEnv(db),user);
    assert.match(r.headers.get('location'),/^https:\/\/pulsify-ai\.com\/login\/operator\?auth_error=(not_operator|unlinked)$/);
    assert.equal(sessionCookie(r),undefined);assert.equal(db.sessions.size,0);
  }
});

test('expired, revoked, forged or de-listed sessions are signed out',async()=>{
  const db=fakeDB(),env=baseEnv(db);
  const cookie=sessionCookie(await signIn(env,person('second@pulsify.test'))).split(';')[0];
  const signedOut=async (e,c)=>new URL((await through(e,'https://pulsify-ai.com/app/crm',c)).headers.get('location')).pathname;
  assert.equal(await signedOut({...env,OPERATOR_EMAILS:'founder@pulsify.test'},cookie),'/login/operator');
  assert.equal(await signedOut(env,OPERATOR_COOKIE+'=forged-token-value-that-is-long-enough'),'/login/operator');
  [...db.sessions.values()][0].expires_at='2000-01-01T00:00:00.000Z';
  assert.equal(await signedOut(env,cookie),'/login/operator');
});

test('sign out revokes the session server-side and clears the cookie',async()=>{
  const db=fakeDB(),env=baseEnv(db);
  const cookie=sessionCookie(await signIn(env,person('founder@pulsify.test'))).split(';')[0];
  const r=await logout({request:new Request('https://pulsify-ai.com/api/operator-logout',{headers:{cookie}}),env});
  assert.equal(r.headers.get('location'),'https://pulsify-ai.com/login/operator?signed_out=1');
  assert.ok(r.headers.getSetCookie().some(c=>c.startsWith(OPERATOR_COOKIE+'=;')&&c.includes('Max-Age=0')));
  assert.ok([...db.sessions.values()][0].revoked_at);
  const after=await through(env,'https://pulsify-ai.com/app/',cookie);
  assert.equal(new URL(after.headers.get('location')).pathname,'/login/operator');
});

test('a signed-in operator cannot be made to write from another site',async()=>{
  const env=baseEnv(fakeDB());
  const cookie=sessionCookie(await signIn(env,person('founder@pulsify.test'))).split(';')[0];
  const r=await through(env,'https://pulsify-ai.com/api/clients',cookie,{method:'POST',headers:{origin:'https://evil.test'}});
  assert.equal(r.status,403);
});

test('the old operator mode of the shared login forwards to the new pages',async()=>{
  const env=baseEnv(fakeDB());
  assert.equal((await through(env,'https://pulsify-ai.com/portal/login?operator=1','')).headers.get('location'),'https://pulsify-ai.com/login/operator');
  assert.equal((await through(env,'https://pulsify-ai.com/portal/login?operator=1&logout=1','')).headers.get('location'),'https://pulsify-ai.com/api/operator-logout');
});

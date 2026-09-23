// One-key connections: the key is checked, Pulsify's webhook is registered on
// the provider's side, the signing secret is stored, and a rejected key leaves
// nothing half-connected. Provider APIs are mocked; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {autoConnect} from '../functions/_shared/autoconnect.js';
import {getIntegration, isIntegrationConnected} from '../functions/_shared/integrations.js';

const sql=new DatabaseSync(':memory:');
for(const st of readFileSync(new URL('../migrations/0008_integrations_hub.sql',import.meta.url),'utf8').replace(/--[^\n]*/g,'').split(';'))if(st.trim())try{sql.exec(st);}catch{}
const env={DB:{prepare(q){let a=[];const p={bind(...v){a=v;return p},async first(){return sql.prepare(q).get(...a)||null},async all(){return {results:sql.prepare(q).all(...a)}},async run(){const r=sql.prepare(q).run(...a);return {meta:{changes:r.changes}}}};return p},async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}}};
const origin='https://pulsify-ai.com';
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

test('Stripe: one restricted key registers the webhook and stores its secret', async()=>{
  const calls=[];
  const fetcher=async(url,init={})=>{calls.push({url,method:init.method||'GET',body:String(init.body||'')});
    if(url.includes('/v1/webhook_endpoints')&&(init.method||'GET')==='GET')return reply(200,{data:[]});
    if(url.endsWith('/v1/webhook_endpoints')&&init.method==='POST')return reply(200,{id:'we_1',secret:'whsec_abc',livemode:true});
    return reply(404,{});};
  const r=await autoConnect(env,{scope:'client',client:'acme',provider:'stripe',apiKey:'rk_live_1234567890abcdef',origin,fetcher});
  assert.equal(r.ok,true,r.error);assert.equal(r.account,'Live mode');
  const rec=await getIntegration(env,'client','acme','stripe');
  assert.equal(rec.secrets.webhook_secret,'whsec_abc');assert.equal(rec.secrets.api_key,'rk_live_1234567890abcdef');
  assert.equal(rec.config.webhook_endpoint_id,'we_1');assert.equal(rec.config.connected_via,'one-key');
  assert.equal(isIntegrationConnected(rec),true);
  const post=calls.find(c=>c.method==='POST');
  assert.match(decodeURIComponent(post.body),new RegExp(`url=${origin}/api/hooks/stripe/${rec.secrets.path_secret}`));
  assert.match(decodeURIComponent(post.body),/enabled_events\[\]=charge.refunded/);
});

test('Stripe: a rejected key leaves no connection behind', async()=>{
  const r=await autoConnect(env,{scope:'client',client:'beta',provider:'stripe',apiKey:'rk_live_badbadbadbad',origin,fetcher:async()=>reply(401,{error:{message:'Invalid API Key'}})});
  assert.equal(r.ok,false);assert.match(r.error,/rejected that key/);
  assert.equal(await getIntegration(env,'client','beta','stripe'),null);
});

test('Stripe: a failed reconnect restores the previous key', async()=>{
  const r=await autoConnect(env,{scope:'client',client:'acme',provider:'stripe',apiKey:'rk_live_newkeynewkey',origin,fetcher:async()=>reply(403,{})});
  assert.equal(r.ok,false);assert.match(r.error,/Webhook Endpoints set to Write/);
  const rec=await getIntegration(env,'client','acme','stripe');
  assert.equal(rec.secrets.api_key,'rk_live_1234567890abcdef');assert.equal(rec.secrets.webhook_secret,'whsec_abc');
});

test('Stripe: the key shape is checked before any call', async()=>{
  let called=false;
  const r=await autoConnect(env,{scope:'client',client:'gamma',provider:'stripe',apiKey:'pk_live_publishablekey',origin,fetcher:async()=>{called=true;return reply(200,{});}});
  assert.equal(r.ok,false);assert.equal(called,false);
});

test('Whop and Calendly register their webhooks and keep the account details', async()=>{
  const whop=await autoConnect(env,{scope:'client',client:'acme',provider:'whop',apiKey:'whop_key_1234567890',origin,fetcher:async(url,init)=>{
    assert.equal(url,'https://api.whop.com/api/v1/webhooks');const body=JSON.parse(init.body);assert.ok(body.events.includes('payment.succeeded'));
    return reply(200,{id:'hook_1',webhook_secret:'ws_1',resource_id:'biz_9'});}});
  assert.equal(whop.ok,true,whop.error);
  assert.equal((await getIntegration(env,'client','acme','whop')).secrets.webhook_secret,'ws_1');
  const calendly=await autoConnect(env,{scope:'client',client:'acme',provider:'calendly',apiKey:'eyJcalendlytoken123',origin,fetcher:async(url,init={})=>{
    if(url.endsWith('/users/me'))return reply(200,{resource:{uri:'https://api.calendly.com/users/U1',current_organization:'https://api.calendly.com/organizations/O1',scheduling_url:'https://calendly.com/acme',email:'a@acme.com',name:'Acme'}});
    const body=JSON.parse(init.body);assert.equal(body.scope,'user');assert.deepEqual(body.events,['invitee.created','invitee.canceled']);
    return reply(201,{resource:{uri:'https://api.calendly.com/webhook_subscriptions/W1'}});}});
  assert.equal(calendly.ok,true,calendly.error);assert.equal(calendly.account,'a@acme.com');
  const rec=await getIntegration(env,'client','acme','calendly');
  assert.equal(rec.config.booking_url,'https://calendly.com/acme');assert.equal(isIntegrationConnected(rec),true);
});

test('Services without one-key setup are refused', async()=>{
  const r=await autoConnect(env,{scope:'client',client:'acme',provider:'kit',apiKey:'x'.repeat(20),origin});
  assert.equal(r.ok,false);
});

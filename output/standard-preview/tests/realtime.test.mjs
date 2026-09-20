// Live push: broadcast helper hits Supabase's REST endpoint with the public
// key only, is a no-op when unconfigured, and the config endpoint hands the
// right topic to operators and clients without leaking anything else.
import test from 'node:test';
import assert from 'node:assert/strict';
import {broadcast, pushOperator, realtimeConfigured} from '../functions/_shared/realtime.js';
import {onRequestGet as configGet} from '../functions/api/realtime-config.js';
import {rememberOperator} from '../functions/_shared/access.js';

test('broadcast posts an opaque payload with the publishable key and tolerates failure', async()=>{
  const calls=[];
  const fetcher=async(url,init)=>{calls.push({url,init});return new Response('',{status:202});};
  const env={SUPABASE_URL:'https://ref.supabase.co/',SUPABASE_ANON_KEY:'sb_publishable_x'};
  assert.equal(realtimeConfigured(env),true);
  const r=await broadcast(env,'pulsify:operator','tracker.changed',{conversation_id:'c1',reason:'reply'},fetcher);
  assert.equal(r.ok,true);
  assert.equal(calls[0].url,'https://ref.supabase.co/realtime/v1/api/broadcast');
  assert.equal(calls[0].init.headers.apikey,'sb_publishable_x');
  const body=JSON.parse(calls[0].init.body);
  assert.equal(body.messages[0].topic,'pulsify:operator');assert.equal(body.messages[0].event,'tracker.changed');
  assert.equal(body.messages[0].payload.conversation_id,'c1');assert.ok(body.messages[0].payload.at);
  assert.deepEqual(Object.keys(body.messages[0].payload).sort(),['at','conversation_id','reason'],'ids and reasons only');
  const off=await broadcast({},'t','e',{},fetcher);
  assert.equal(off.skipped,true);assert.equal(calls.length,1);
  const boom=await broadcast(env,'t','e',{},async()=>{throw new Error('net');});
  assert.equal(boom.ok,false);
  assert.equal((await pushOperator({}, 'x', {})).ok,false);
});

test('realtime-config: operator gets the console topic, anonymous gets 401, unconfigured says off', async()=>{
  const env={SUPABASE_URL:'https://ref.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_x',DB:{prepare(){return {bind(){return this},async first(){return null},async all(){return {results:[]}}}}}};
  const r=new Request('https://x/api/realtime-config',{headers:{'x-pulsify-operator':'1'}});
  rememberOperator(r,{email:'op@test',via:'access'});
  const d=await (await configGet({request:r,env,data:{operator:{email:'op@test'}}})).json();
  assert.equal(d.ok,true);assert.equal(d.topic,'pulsify:operator');assert.equal(d.key,'sb_publishable_x');
  assert.deepEqual(Object.keys(d).sort(),['key','ok','topic','url']);
  const anon=await configGet({request:new Request('https://x/api/realtime-config'),env,data:{}});
  assert.equal(anon.status,401);
  const off=await (await configGet({request:new Request('https://x/api/realtime-config'),env:{},data:{}})).json();
  assert.equal(off.off,true);
});


test('broadcast drops readable data, nested values and unknown reasons',async()=>{
  let sent;
  await broadcast({SUPABASE_URL:'https://test',SUPABASE_ANON_KEY:'public'},'pulsify:operator','notification',
    {id:'ntf_123',conversation_id:{text:'private'},reason:'a private message',text:'secret',email:'private@example.test',body:'private'},
    async(u,i)=>{sent=JSON.parse(i.body).messages[0].payload;return new Response('',{status:202});});
  assert.deepEqual(Object.keys(sent).sort(),['at','id']);
});

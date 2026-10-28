import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { resolveJaneAi, streamJaneText, generateJaneText, janeStats } from '../functions/_shared/jane-provider.js';
import { janeObject } from '../functions/_shared/jane-models.ts';

const env = { JANE_GEMINI_API_KEY: 'synthetic-secret', JANE_GEMINI_MODEL: 'test-model', JANE_GEMINI_FREE_VERIFIED: 'true' };

test('Jane requires explicit free-project verification and does not leak credentials in stats', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ inputTokenLimit: 100000 }));
  assert.equal((await resolveJaneAi({ ...env, JANE_GEMINI_FREE_VERIFIED: '' }, 'a')).mode, 'manual');
  const ai = await resolveJaneAi(env, 'a');
  assert.equal(ai.mode, 'gemini');
  const stats = await janeStats(env, ai, 'a');
  assert.equal(stats.context_window, 100000);
  assert.equal(stats.allowance_remaining, null);
  assert.equal(stats.provider_quota_remaining, null);
  assert.ok(!JSON.stringify(ai).includes('synthetic-secret'));
});

test('usage stats report Jane\'s own 30-a-day allowance', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({}));
  let asked;
  const DB = { prepare: query => ({ bind: (...args) => { asked = { query, args }; return { first: async () => ({ count: 2 }) }; } }) };
  const ai = await resolveJaneAi({ ...env, DB }, 'a');
  const stats = await janeStats({ ...env, DB }, ai, 'a');
  assert.equal(stats.allowance_remaining, 28);
  assert.equal(stats.allowance_cap, 30);
  assert.equal(asked.args[1], 'jane');
});

test('the AI SDK Gemini stream handles split UTF-8, excludes thinking text and records usage exactly once', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    if (!init.method) return Response.json({ inputTokenLimit: 100000 });
    const text = 'data: '+JSON.stringify({ candidates:[{content:{parts:[{text:'hidden',thought:true},{text:'Café'}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:1}})+'\r\n\r\n' +
      'data: '+JSON.stringify({ candidates:[{finishReason:'STOP',content:{parts:[{text:' done'}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:3,thoughtsTokenCount:2}})+'\r\n\r\n';
    const bytes = new TextEncoder().encode(text);
    return new Response(new ReadableStream({start(c){for (const byte of bytes) c.enqueue(Uint8Array.of(byte));c.close();}}));
  });
  const ai = await resolveJaneAi(env,'a'); let result='';
  for await(const chunk of streamJaneText({system:'rules',messages:[{role:'user',content:'hi'}]},ai)) result+=chunk;
  assert.equal(result,'Café done');
  assert.equal(ai.calls.length,1); assert.equal(ai.calls[0].input_tokens,10); assert.equal(ai.calls[0].thinking_tokens,2);
  assert.ok(ai.calls[0].output_tokens >= 3);
  assert.ok(calls.find(call => call.init.method).url.endsWith(':streamGenerateContent?alt=sse'));
});

test('helpers get a typed object from Gemini structured output, no Cloudflare calls; truncated drafts fail closed',async t=>{
  let payload, url;
  t.mock.method(globalThis,'fetch',async (address,init)=>{
    if (!init.method) return Response.json({});
    payload=JSON.parse(init.body); url=String(address);
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"calls":["read"]}'}]}}]});
  });
  const ai=await resolveJaneAi(env,'a');
  const result=await janeObject(ai,{system:'rules',prompt:'find'},z.object({calls:z.array(z.string())}));
  assert.deepEqual(result,{calls:['read']});
  assert.match(url,/generativelanguage.googleapis.com/);
  assert.equal(payload.generationConfig.responseMimeType,'application/json');
  assert.ok(JSON.stringify(payload.generationConfig).includes('calls'),'the Zod schema reaches Gemini');
  assert.equal(ai.calls[0].stage,'helper');
  globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]});
  await assert.rejects(generateJaneText({system:'rules',user:'hi'},ai),/did not complete/);
});

test('with one model configured, 429 never retries and never leaks provider response',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async (_url,init)=>{
    if (!init.method) return Response.json({});
    calls++; return new Response('private provider debug',{status:429});
  });
  const ai=await resolveJaneAi(env,'a');
  await assert.rejects(generateJaneText({system:'rules',user:'hi'},ai),error=>error.code==='GEMINI_LIMIT'&&!error.message.includes('private'));
  assert.equal(calls,1);
});

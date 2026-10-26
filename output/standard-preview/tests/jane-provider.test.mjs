import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveJaneAi, streamJaneText, generateJaneText, janeStats } from '../functions/_shared/jane-provider.js';

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

test('stream handles split UTF-8, thought exclusion, final unterminated event and cumulative usage exactly once', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    if (!init.method) return Response.json({ inputTokenLimit: 100000 });
    const text = 'data: '+JSON.stringify({ candidates:[{content:{parts:[{text:'hidden',thought:true},{text:'Café'}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:1}})+'\r\n\r\n' +
      'data: '+JSON.stringify({ candidates:[{finishReason:'STOP',content:{parts:[{text:' done'}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:3,thoughtsTokenCount:2}});
    const bytes = new TextEncoder().encode(text);
    return new Response(new ReadableStream({start(c){for (const byte of bytes) c.enqueue(Uint8Array.of(byte));c.close();}}));
  });
  const ai = await resolveJaneAi(env,'a'); let result='';
  for await(const chunk of streamJaneText({system:'rules',messages:[{role:'user',content:'hi'}]},ai)) result+=chunk;
  assert.equal(result,'Café done');
  assert.equal(ai.calls.length,1); assert.equal(ai.calls[0].output_tokens,3);
  assert.equal(ai.calls[0].input_tokens,10);
  assert.ok(calls[1].url.endsWith(':streamGenerateContent?alt=sse'));
});

test('helpers use Gemini structured JSON, no Cloudflare calls; truncated drafts fail closed',async t=>{
  let payload;
  t.mock.method(globalThis,'fetch',async (_url,init)=>{
    if (!init.method) return Response.json({});
    payload=JSON.parse(init.body);
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"calls":[]}'}]}}]});
  });
  const ai=await resolveJaneAi(env,'a');
  const result=await ai.binding.run('ignored-cloudflare-model',{messages:[{role:'system',content:'rules'},{role:'user',content:'find'}],response_format:{json_schema:{type:'object'}},max_tokens:600});
  assert.equal(result.response,'{"calls":[]}');
  assert.deepEqual(payload.generationConfig.responseJsonSchema,{type:'object'});
  assert.equal(ai.calls[0].input_tokens,null);
  globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]});
  await assert.rejects(generateJaneText({system:'rules',user:'hi'},ai),/did not complete/);
});

test('429 never retries or falls back to another model and never leaks provider response',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async (_url,init)=>{
    if (!init.method) return Response.json({});
    calls++; return new Response('private provider debug',{status:429});
  });
  const ai=await resolveJaneAi(env,'a');
  await assert.rejects(generateJaneText({system:'rules',user:'hi'},ai),error=>error.code==='GEMINI_LIMIT'&&!error.message.includes('private'));
  assert.equal(calls,1);
});

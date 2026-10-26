// Jane-only Gemini integration. No model fallback or paid provider escalation.
import { resolveAi as resolveDefault, generateText as generateDefault, streamText as streamDefault } from './ai-provider.js';
import { attachGuard, allowanceLeft, aiDailyCap } from './ai-guard.js';
import { HUMANIZER } from './humanizer.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const positive = value => Number.isFinite(value) && value >= 0 ? value : null;
const textOf = data => (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');

export async function resolveJaneAi(env, client) {
  const original = await resolveDefault(env, client);
  // Existing client-owned connections retain their chosen provider.
  if (original.source === 'client' || !env.JANE_GEMINI_API_KEY || !env.JANE_GEMINI_MODEL || env.JANE_GEMINI_FREE_VERIFIED !== 'true') return original;
  const ai = attachGuard({ mode: 'gemini', source: 'platform', model: String(env.JANE_GEMINI_MODEL), janeGemini: true }, env, client);
  Object.defineProperty(ai, 'apiKey', { value: env.JANE_GEMINI_API_KEY });
  ai.calls = [];
  try {
    const response = await fetch(`${BASE}${encodeURIComponent(ai.model)}`, { headers: { 'x-goog-api-key': ai.apiKey }, signal: AbortSignal.timeout(4000) });
    const model = response.ok ? await response.json() : {};
    ai.contextWindow = positive(model.inputTokenLimit);
  } catch { ai.contextWindow = null; }
  ai.binding = { async run(_model, payload) {
    const system = payload.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const messages = payload.messages.filter(m => m.role !== 'system');
    return { response: await generateJaneText({ system, messages }, ai, { json: true, schema: payload.response_format?.json_schema, maxOutputTokens: payload.max_tokens, stage: 'helper' }) };
  } };
  return ai;
}

function body(prompt, options = {}) {
  return {
    systemInstruction: { parts: [{ text: [prompt.system, HUMANIZER].filter(Boolean).join('\n\n') }] },
    contents: (prompt.messages || [{ role: 'user', content: prompt.user }]).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { temperature: options.temperature ?? 0.5, maxOutputTokens: options.maxOutputTokens || 4096,
      ...(options.json ? { responseMimeType: 'application/json' } : {}), ...(options.schema ? { responseJsonSchema: options.schema } : {}) },
  };
}

async function request(ai, method, payload) {
  const response = await fetch(`${BASE}${encodeURIComponent(ai.model)}:${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': ai.apiKey }, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'Gemini has reached a provider limit. Please try later; daily limits reset at midnight Pacific time.' : 'Gemini could not finish this request.');
    error.code = response.status === 429 ? 'GEMINI_LIMIT' : 'GEMINI_ERROR';
    throw error;
  }
  return response;
}

function record(ai, data, stage) {
  const u = data?.usageMetadata;
  ai.calls.push({ stage, input_tokens: positive(u?.promptTokenCount), output_tokens: positive(u?.candidatesTokenCount), thinking_tokens: positive(u?.thoughtsTokenCount), cached_tokens: positive(u?.cachedContentTokenCount) });
}

export async function generateJaneText(prompt, ai, options = {}) {
  if (!ai.janeGemini) return generateDefault(prompt, ai, options);
  const data = await (await request(ai, 'generateContent', body(prompt, options))).json();
  record(ai, data, options.stage || 'review');
  if (data.candidates?.[0]?.finishReason && data.candidates[0].finishReason !== 'STOP') throw new Error('Gemini did not complete the answer.');
  const text = textOf(data);
  if (!text.trim()) throw new Error('Gemini returned no answer.');
  return text;
}

export async function* streamJaneText(prompt, ai, options = {}) {
  if (!ai.janeGemini) { yield* streamDefault(prompt, ai, options); return; }
  const response = await request(ai, 'streamGenerateContent?alt=sse', body(prompt, options));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', last = {}, finish = '', emitted = false;
  function parse(line) {
    if (!line.startsWith('data:')) return null;
    const data = JSON.parse(line.slice(5).trim());
    if (data.error) throw new Error('Gemini stream failed.');
    if (data.usageMetadata) last = data;
    finish = data.candidates?.[0]?.finishReason || finish;
    return textOf(data);
  }
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() || '';
      if (done && buffer) { lines.push(buffer); buffer = ''; }
      for (const line of lines) { const text = parse(line); if (text) { emitted = true; yield text; } }
      if (done) break;
    }
    if (!emitted || finish !== 'STOP') throw new Error('Gemini did not complete the answer.');
  } finally { record(ai, last, 'writer'); reader.releaseLock(); }
}

export async function janeStats(env, ai, client, grounding = null) {
  const remaining = await allowanceLeft(env, ai, client);
  return {
    model: ai.model || null, provider: ai.mode, gemini_setup: Boolean(env.JANE_GEMINI_API_KEY && env.JANE_GEMINI_MODEL && env.JANE_GEMINI_FREE_VERIFIED === 'true') ? 'configured' : 'not_configured',
    allowance_remaining: remaining, allowance_cap: remaining === null ? null : aiDailyCap(env), allowance_reset: remaining === null ? null : new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
    provider_quota_remaining: null, context_window: ai.contextWindow || null, calls: ai.calls || [], grounding,
  };
}

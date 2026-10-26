// Jane-only Gemini integration. Free models only: when one is rate-limited or overloaded, the next configured
// free model answers (each Gemini model has its own free quota on the project). No paid provider escalation.
import { resolveAi as resolveDefault, generateText as generateDefault, streamText as streamDefault } from './ai-provider.js';
import { attachGuard, allowanceLeft, allowanceFor } from './ai-guard.js';
import { HUMANIZER } from './humanizer.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const positive = value => Number.isFinite(value) && value >= 0 ? value : null;
const textOf = data => (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');

// What the model menu says about each model. Unknown IDs still work and show their ID.
const MODEL_INFO = {
  'gemini-3.5-flash-lite': { label: 'Gemini 3.5 Flash Lite', description: 'Fast for everyday writing' },
  'gemini-3.1-flash-lite': { label: 'Gemini 3.1 Flash Lite', description: 'Backup when the main model is busy' },
  'gemini-3.8-flash': { label: 'Gemini 3.8 Flash', description: 'Best writing, only a few free replies a day' },
};
// A model that said "limit" or "busy" is tried last for a while, per isolate.
const BUSY_MS = { 429: 10 * 60 * 1000, 500: 60 * 1000, 503: 60 * 1000 };
const busyUntil = new Map();
const contextWindows = new Map();

export function janeModels(env) {
  const ids = [env.JANE_GEMINI_MODEL, ...String(env.JANE_GEMINI_FALLBACK_MODELS || '').split(',')].map(id => String(id || '').trim()).filter(Boolean);
  return [...new Set(ids)].map(id => ({ id, ...(MODEL_INFO[id] || { label: id, description: '' }) }));
}

function janeConfigured(env) {
  return Boolean(env.JANE_GEMINI_API_KEY && env.JANE_GEMINI_MODEL && env.JANE_GEMINI_FREE_VERIFIED === 'true');
}

export async function resolveJaneAi(env, client, preferred = 'auto') {
  const original = await resolveDefault(env, client);
  // Existing client-owned connections retain their chosen provider.
  if (original.source === 'client' || !janeConfigured(env)) return original;
  const ids = janeModels(env).map(model => model.id);
  const selected = ids.includes(preferred) ? preferred : 'auto';
  const now = Date.now();
  const ready = id => !(busyUntil.get(id) > now);
  const wanted = selected === 'auto' ? ids : [selected, ...ids.filter(id => id !== selected)];
  const order = [...wanted.filter(ready), ...wanted.filter(id => !ready(id))];
  const ai = attachGuard({ mode: 'gemini', source: 'platform', model: order[0], janeGemini: true }, env, client);
  Object.defineProperty(ai, 'apiKey', { value: env.JANE_GEMINI_API_KEY });
  Object.assign(ai, { selected, order, calls: [], fallbacks: [] });
  ai.contextWindow = await contextWindow(ai, ai.model);
  ai.binding = { async run(_model, payload) {
    const system = payload.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const messages = payload.messages.filter(m => m.role !== 'system');
    return { response: await generateJaneText({ system, messages }, ai, { json: true, schema: payload.response_format?.json_schema, maxOutputTokens: payload.max_tokens, stage: 'helper' }) };
  } };
  return ai;
}

async function contextWindow(ai, model) {
  if (contextWindows.has(model)) return contextWindows.get(model);
  try {
    const response = await fetch(`${BASE}${encodeURIComponent(model)}`, { headers: { 'x-goog-api-key': ai.apiKey }, signal: AbortSignal.timeout(4000) });
    const value = positive((response.ok ? await response.json() : {}).inputTokenLimit);
    if (value) contextWindows.set(model, value);
    return value;
  } catch { return null; }
}

function body(prompt, options = {}) {
  return {
    systemInstruction: { parts: [{ text: [prompt.system, HUMANIZER].filter(Boolean).join('\n\n') }] },
    contents: (prompt.messages || [{ role: 'user', content: prompt.user }]).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { temperature: options.temperature ?? 0.5, maxOutputTokens: options.maxOutputTokens || 4096,
      ...(options.json ? { responseMimeType: 'application/json' } : {}), ...(options.schema ? { responseJsonSchema: options.schema } : {}) },
  };
}

// Starts at the model that last answered in this reply and moves down the list on a limit or overload.
// Any other failure stops: it would fail the same way on the next model.
async function request(ai, method, payload, stage) {
  const start = Math.max(0, ai.order.indexOf(ai.model));
  let limited = false;
  for (const model of ai.order.slice(start)) {
    let response;
    try {
      response = await fetch(`${BASE}${encodeURIComponent(model)}:${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': ai.apiKey }, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000),
      });
    } catch {
      response = { ok: false, status: 503 };
    }
    if (response.ok) {
      if (model !== ai.model) { ai.model = model; ai.contextWindow = await contextWindow(ai, model); }
      return response;
    }
    if (!BUSY_MS[response.status]) break;
    limited ||= response.status === 429;
    busyUntil.set(model, Date.now() + BUSY_MS[response.status]);
    ai.fallbacks.push({ model, stage, reason: response.status === 429 ? 'limit' : 'busy' });
  }
  const error = new Error(limited
    ? 'Every free model has reached its limit for now. Please try later; daily limits reset at midnight Pacific time.'
    : 'Gemini could not finish this request.');
  error.code = limited ? 'GEMINI_LIMIT' : 'GEMINI_ERROR';
  throw error;
}

function record(ai, data, stage) {
  const u = data?.usageMetadata;
  ai.calls.push({ stage, model: ai.model, input_tokens: positive(u?.promptTokenCount), output_tokens: positive(u?.candidatesTokenCount), thinking_tokens: positive(u?.thoughtsTokenCount), cached_tokens: positive(u?.cachedContentTokenCount) });
}

export async function generateJaneText(prompt, ai, options = {}) {
  if (!ai.janeGemini) return generateDefault(prompt, ai, options);
  const stage = options.stage || 'review';
  const data = await (await request(ai, 'generateContent', body(prompt, options), stage)).json();
  record(ai, data, stage);
  if (data.candidates?.[0]?.finishReason && data.candidates[0].finishReason !== 'STOP') throw new Error('Gemini did not complete the answer.');
  const text = textOf(data);
  if (!text.trim()) throw new Error('Gemini returned no answer.');
  return text;
}

export async function* streamJaneText(prompt, ai, options = {}) {
  if (!ai.janeGemini) { yield* streamDefault(prompt, ai, options); return; }
  // Fallback happens only before the first word; a reply never switches model halfway.
  const response = await request(ai, 'streamGenerateContent?alt=sse', body(prompt, options), 'writer');
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
    model: ai.model || null, provider: ai.mode, gemini_setup: janeConfigured(env) ? 'configured' : 'not_configured',
    selected: ai.janeGemini ? ai.selected : null, models: ai.janeGemini ? janeModels(env) : [], fallbacks: ai.fallbacks || [],
    allowance_remaining: remaining, allowance_cap: remaining === null ? null : allowanceFor(env, ai).cap, allowance_reset: remaining === null ? null : new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
    provider_quota_remaining: null, context_window: ai.contextWindow || null, calls: ai.calls || [], grounding,
  };
}

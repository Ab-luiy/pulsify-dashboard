// Which model Jane uses, and what the usage panel shows. Free models only on the Jane Gemini project: when one is
// rate-limited or overloaded, the next configured free model answers (each Gemini model has its own free quota on
// the project). No paid provider escalation. The calls themselves run on the AI SDK in jane-models.ts.
import { resolveAi as resolveDefault } from './ai-provider.js';
import { attachGuard, allowanceLeft, allowanceFor } from './ai-guard.js';
import { janeText, janeStream, modelReady } from './jane-models.ts';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const positive = value => Number.isFinite(value) && value >= 0 ? value : null;

// What the model menu says about each model. Unknown IDs still work and show their ID.
const MODEL_INFO = {
  'gemini-3.5-flash-lite': { label: 'Gemini 3.5 Flash Lite', description: 'Fast for everyday writing' },
  'gemini-3.1-flash-lite': { label: 'Gemini 3.1 Flash Lite', description: 'Backup when the main model is busy' },
  'gemini-3.8-flash': { label: 'Gemini 3.8 Flash', description: 'Best writing, only a few free replies a day' },
};
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
  const wanted = selected === 'auto' ? ids : [selected, ...ids.filter(id => id !== selected)];
  const order = [...wanted.filter(modelReady), ...wanted.filter(id => !modelReady(id))];
  const ai = attachGuard({ mode: 'gemini', source: 'platform', model: order[0], janeGemini: true }, env, client);
  Object.defineProperty(ai, 'apiKey', { value: env.JANE_GEMINI_API_KEY });
  Object.assign(ai, { selected, order, calls: [], fallbacks: [] });
  ai.contextWindow = await contextWindow(ai, ai.model);
  // When a limit moves Jane to the next free model, the usage panel shows that model's context window.
  ai.onModelSwitch = async (model) => { ai.contextWindow = await contextWindow(ai, model); };
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

// The calls themselves go through the AI SDK in jane-models.ts (founder 2026-10-27: the standard agent stack).
export function generateJaneText(prompt, ai, options = {}) {
  return janeText(ai, { system: prompt.system, ...(prompt.messages ? { messages: prompt.messages } : { prompt: prompt.user }) },
    { stage: options.stage, temperature: options.temperature, maxOutputTokens: options.maxOutputTokens, humanize: true });
}

export function streamJaneText(prompt, ai, options = {}) {
  return janeStream(ai, { system: prompt.system, messages: prompt.messages }, { temperature: options.temperature, maxOutputTokens: options.maxOutputTokens });
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

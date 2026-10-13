// The one switch for every Growth generator (pulsify-saas #18), resolved per client on every request.
//   1. The client's own key (Integrations -> AI writing): their Google or Anthropic key, sealed in the database.
//      They pay their provider directly and their data stays under their own account's terms. This is the default way
//      a client gets writing inside the app, so Pulsify pays nothing for it.
//   2. A platform Anthropic key (ANTHROPIC_API_KEY): Opus for every client, paid by Pulsify, when it chooses to.
//   3. A platform Gemini key (GEMINI_API_KEY): only for the clients named in AI_PLATFORM_CLIENTS (demo and test
//      workspaces, or "*"). A free Gemini key may be used by Google to improve its products, so a real client's
//      business details never go through it unless that is switched on on purpose.
//   4. Pulsify AI: Cloudflare Workers AI through the AI binding, for every client (founder decision 2026-10-12:
//      the app writes for clients on our side). No key exists; the free plan allows about 20 stories a day.
//   5. Otherwise "manual": the generator hands the client a prompt to run in their own AI.
// Callers resolve once per request, then pass the result to generateText / streamText.
import { cleanId } from "./common.js";
import { callAnthropic, GROWTH_MODEL, streamAnthropic } from "./anthropic.js";
import { callGemini, streamGemini } from "./gemini.js";
import { callWorkersAi, streamWorkersAi, WORKERS_AI_MODEL } from "./workers-ai.js";
import { callOpenAI, pickOpenAiModel, streamOpenAI } from "./openai.js";
import { seal, unseal } from "./secret-box.js";
import { HUMANIZER } from "./humanizer.js";

export const AI_PROVIDERS = ["gemini", "anthropic", "openai"];
export const aiKeyContext = (client, provider) => `ai-key:${cleanId(client)}:${provider}`;

async function clientKey(env, client, provider) {
  try {
    const row = await env.DB.prepare("SELECT secret_json FROM integrations WHERE scope='client' AND client_id=? AND provider=?").bind(client, provider).first();
    const sealed = row?.secret_json ? JSON.parse(row.secret_json)?.api_key : "";
    return sealed ? await unseal(env, sealed, aiKeyContext(client, provider)) : "";
  } catch {
    return "";
  }
}

/** The model chosen for a client's key when it was saved (OpenAI: picked from the key's own model list). */
async function clientModel(env, client, provider) {
  try {
    const row = await env.DB.prepare("SELECT config_json FROM integrations WHERE scope='client' AND client_id=? AND provider=?").bind(client, provider).first();
    return String(JSON.parse(row?.config_json || "{}")?.model || "") || undefined;
  } catch {
    return undefined;
  }
}

function platformGeminiAllowed(env, client) {
  const list = String(env?.AI_PLATFORM_CLIENTS || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  return list.includes("*") || list.includes(client);
}

/** {mode: "anthropic" | "gemini" | "workers" | "manual", apiKey, source: "client" | "platform" | "none", model} for one client. */
export async function resolveAi(env, clientId) {
  const client = cleanId(clientId, "");
  const model = String(env?.GEMINI_MODEL || "").trim() || undefined;
  if (client && env?.DB) {
    const claude = await clientKey(env, client, "anthropic");
    if (claude) return { mode: "anthropic", apiKey: claude, source: "client", model };
    const chatgpt = await clientKey(env, client, "openai");
    if (chatgpt) return { mode: "openai", apiKey: chatgpt, source: "client", model: await clientModel(env, client, "openai") };
    const gemini = await clientKey(env, client, "gemini");
    if (gemini) return { mode: "gemini", apiKey: gemini, source: "client", model };
  }
  if (env?.ANTHROPIC_API_KEY) return { mode: "anthropic", apiKey: env.ANTHROPIC_API_KEY, source: "platform", model };
  if (env?.GEMINI_API_KEY && platformGeminiAllowed(env, client)) return { mode: "gemini", apiKey: env.GEMINI_API_KEY, source: "platform", model };
  if (env?.AI?.run && env?.PULSIFY_AI !== "off") {
    return { mode: "workers", apiKey: "", binding: env.AI, source: "platform", model: String(env?.WORKERS_AI_MODEL || "").trim() || WORKERS_AI_MODEL };
  }
  return { mode: "manual", apiKey: "", source: "none", model };
}

export const aiMode = (ai) => ai?.mode || "manual";
export const aiConfigured = (ai) => aiMode(ai) !== "manual";

/** The provider's name for the client-facing status. */
export const providerLabel = (ai) => ({ anthropic: "Claude", openai: "ChatGPT", gemini: "Gemini", workers: "Pulsify AI", manual: "Your own AI" })[aiMode(ai)];

/** {system, user} in, the full text out. */
// Every writer carries the house humanizer rules (founder 2026-10-13); callers clean the output with humanize().
const humanized = (prompt) => ({ ...prompt, system: [prompt?.system, HUMANIZER].filter(Boolean).join("\n\n") });

export async function generateText(input, ai, options = {}) {
  const prompt = humanized(input);
  if (aiMode(ai) === "anthropic") return callAnthropic(prompt, ai.apiKey);
  if (aiMode(ai) === "openai") return callOpenAI(prompt, ai.apiKey, { ...options, model: ai.model });
  if (aiMode(ai) === "gemini") return callGemini(prompt, ai.apiKey, { ...options, model: ai.model });
  if (aiMode(ai) === "workers") return callWorkersAi(prompt, ai.binding, { ...options, model: ai.model });
  throw new Error("No AI provider is configured");
}

/** {system, messages} in, an async iterator of text chunks out. */
export function streamText(input, ai, options = {}) {
  const prompt = humanized(input);
  if (aiMode(ai) === "anthropic") return streamAnthropic(prompt, ai.apiKey, options);
  if (aiMode(ai) === "openai") return streamOpenAI(prompt, ai.apiKey, { ...options, model: ai.model });
  if (aiMode(ai) === "gemini") return streamGemini(prompt, ai.apiKey, { ...options, model: ai.model });
  if (aiMode(ai) === "workers") return streamWorkersAi(prompt, ai.binding, { ...options, model: ai.model });
  throw new Error("No AI provider is configured");
}

const KEY_SHAPE = { gemini: /^AIza[\w-]{30,}$/, anthropic: /^sk-ant-[\w-]{20,}$/, openai: /^sk-(?!ant-)[\w-]{20,}$/ };
const NAME = { gemini: "Google", anthropic: "Anthropic", openai: "OpenAI" };

/**
 * Checks a key a client pasted by asking the provider for its model list (read-only, no cost).
 * Returns {ok: true} or {ok: false, message} in words the client can act on.
 */
export async function validateAiKey(provider, apiKey) {
  const key = String(apiKey || "").trim();
  if (!KEY_SHAPE[provider]?.test(key)) {
    return { ok: false, message: `That does not look like a ${NAME[provider]} key. Copy the whole key and paste it again.` };
  }
  try {
    const response = provider === "gemini"
      ? await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key } })
      : provider === "openai"
        ? await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` } })
        : await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } });
    if (response.ok && provider === "openai") {
      // Pick the chat model from what this key can actually use; never a guessed name.
      const model = pickOpenAiModel(((await response.json().catch(() => ({})))?.data || []).map((entry) => entry?.id));
      return model ? { ok: true, model } : { ok: false, message: "That OpenAI key works, but it has no chat model switched on. Check your OpenAI project settings." };
    }
    if (response.ok) return { ok: true };
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return { ok: false, message: `${NAME[provider]} did not accept that key. Check you copied the whole key, and that it is switched on.` };
    }
    return { ok: false, message: `${NAME[provider]} could not check the key right now. Try again in a minute.` };
  } catch {
    return { ok: false, message: `${NAME[provider]} could not be reached to check the key. Try again in a minute.` };
  }
}

/** The key as it is stored: sealed to this client and provider, so a copied database row cannot be reused elsewhere. */
export const sealAiKey = (env, client, provider, apiKey) => seal(env, apiKey, aiKeyContext(client, provider));

export { GROWTH_MODEL };

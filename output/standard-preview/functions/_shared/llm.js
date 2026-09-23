// One text-generation entry point for server-side automations.
// Order: Claude (ANTHROPIC_API_KEY) -> Gemini (GEMINI_API_KEY) -> Workers AI
// (the AI binding, no key needed). Claude is the house writer; the others keep
// automations running when no key is configured. Callers get the provider back
// so drafts can say which model wrote them.
import { str } from "./common.js";

const CLAUDE_MODEL = "claude-sonnet-5";
const GEMINI_MODEL = "gemini-2.5-flash";
const WORKERS_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function llmAvailable(env) {
  return Boolean(env?.ANTHROPIC_API_KEY || env?.GEMINI_API_KEY || env?.AI);
}

export async function complete(env, { system = "", prompt, maxTokens = 1200, fetcher = fetch }) {
  if (!prompt) throw new Error("prompt required");
  if (env?.ANTHROPIC_API_KEY) {
    const r = await fetcher("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, ...(system ? { system } : {}), messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(60000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`claude ${r.status}: ${str(d?.error?.message).slice(0, 200)}`);
    return { text: str((d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n")), provider: "claude" };
  }
  if (env?.GEMINI_API_KEY) {
    const r = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } }),
      signal: AbortSignal.timeout(60000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`gemini ${r.status}: ${str(d?.error?.message).slice(0, 200)}`);
    return { text: str((d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("")), provider: "gemini" };
  }
  if (env?.AI) {
    const result = await env.AI.run(WORKERS_MODEL, { messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }], max_tokens: maxTokens });
    return { text: str(result?.response), provider: "workers-ai" };
  }
  throw new Error("no text model configured");
}

// The house voice rules every generated draft passes through, from
// raw-sources/prompts/_voice-guard.md.
export const VOICE_GUARD = `Voice rules (apply before answering):
- No "it's not X, it's Y" constructions.
- At most three em dashes; prefer commas and periods.
- No "here's the thing", "here's the kicker", "let's break this down".
- Use "is", not "serves as", "represents", "stands as".
- No filler: "it's worth noting", "importantly", "notably".
- No "delve", "leverage", "utilize", "robust", "seamless", "streamline", "harness".
- Straight quotes, "->" instead of arrow glyphs. No emojis, no exclamation marks.
- Never invent a stat, a result or a person's background. If the inputs do not show it, write "unknown".`;

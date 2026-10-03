// The one switch for every Growth generator (pulsify-saas #18).
//   ANTHROPIC_API_KEY set -> Opus writes it (the paid, best quality route)
//   else GEMINI_API_KEY   -> Gemini writes it (the free route until payments)
//   else                  -> "manual": the generator hands the client a prompt for their own AI
// Callers never name a provider; they ask for text and get it, or a manual prompt when there is no key.
import { callAnthropic, GROWTH_MODEL, streamAnthropic } from "./anthropic.js";
import { callGemini, streamGemini } from "./gemini.js";

export function aiMode(env) {
  if (env?.ANTHROPIC_API_KEY) return "anthropic";
  if (env?.GEMINI_API_KEY) return "gemini";
  return "manual";
}

export const aiConfigured = (env) => aiMode(env) !== "manual";

/** The provider's name for the client-facing "Written by" note and status. */
export function providerLabel(env) {
  return { anthropic: "Claude", gemini: "Gemini", manual: "Your own AI" }[aiMode(env)];
}

/** {system, user} in, the full text out. */
export async function generateText(prompt, env, options = {}) {
  const mode = aiMode(env);
  if (mode === "anthropic") return callAnthropic(prompt, env.ANTHROPIC_API_KEY);
  if (mode === "gemini") return callGemini(prompt, env.GEMINI_API_KEY, { ...options, env });
  throw new Error("No AI provider is configured");
}

/** {system, messages} in, an async iterator of text chunks out. */
export function streamText(prompt, env, options = {}) {
  const mode = aiMode(env);
  if (mode === "anthropic") return streamAnthropic(prompt, env.ANTHROPIC_API_KEY, options);
  if (mode === "gemini") return streamGemini(prompt, env.GEMINI_API_KEY, { ...options, env });
  throw new Error("No AI provider is configured");
}

export { GROWTH_MODEL };

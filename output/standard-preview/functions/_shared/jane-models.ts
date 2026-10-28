// Jane's one door to language models, on the AI SDK (founder 2026-10-27: "move to the new stack").
// Every Jane model call goes through here: the lookup loop (Zod tools), notes and checks (Zod objects) and
// the writer (a text stream). Providers: the Jane Gemini project (free models, next model on a limit), a
// client's own Claude, ChatGPT or Gemini key, or Cloudflare Workers AI. The app's SSE protocol is unchanged.
// The Create writers (stories, carousels, reels, YouTube, thumbnails) reach janeText through ai-provider.js
// generateText when they run on the Jane Gemini project (create-writer.js).
import { generateText, streamText, Output, APICallError, type LanguageModel, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createWorkersAI } from "workers-ai-provider";
import type { z } from "zod";
import { HUMANIZER } from "./humanizer.js";
import { GROWTH_MODEL } from "./anthropic.js";
import { GEMINI_MODELS } from "./gemini.js";

type JaneAi = Record<string, any>;
type Call = { stage?: string; helper?: boolean; humanize?: boolean; json?: boolean; temperature?: number; maxOutputTokens?: number; timeoutMs?: number };
type Prompt = { system?: string; messages?: { role: string; content: string }[]; prompt?: string };

// Small helper calls on Workers AI (lookups, notes, checks) use the model that follows a JSON schema best.
export const JANE_HELPER_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// A model that said "limit" or "busy" is tried last for a while, per isolate.
const BUSY_MS: Record<number, number> = { 429: 10 * 60 * 1000, 500: 60 * 1000, 503: 60 * 1000 };
const busyUntil = new Map<string, number>();
export const modelReady = (id: string) => !(Number(busyUntil.get(id)) > Date.now());
const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

/** Models to try, in order. Only Gemini has free siblings to fall back to. */
function modelOrder(ai: JaneAi, helper = false): string[] {
  if (ai.languageModel) return [String(ai.model || "test-model")];
  if (ai.janeGemini) return ai.order.slice(Math.max(0, ai.order.indexOf(ai.model)));
  if (ai.mode === "gemini") {
    const wanted = String(ai.model || "").trim();
    return wanted ? [wanted, ...GEMINI_MODELS.filter((id: string) => id !== wanted)] : GEMINI_MODELS;
  }
  if (ai.mode === "anthropic") return [ai.model || GROWTH_MODEL];
  if (ai.mode === "workers") return [helper ? JANE_HELPER_MODEL : ai.model];
  return [ai.model];
}

/** The AI SDK model for one provider and model ID. `ai.languageModel` is supplied directly by tests and evaluation runs. */
export function janeModel(ai: JaneAi, id: string): LanguageModel {
  if (ai.languageModel) return ai.languageModel;
  if (ai.janeGemini || ai.mode === "gemini") return createGoogleGenerativeAI({ apiKey: ai.apiKey })(id);
  if (ai.mode === "anthropic") return createAnthropic({ apiKey: ai.apiKey })(id);
  if (ai.mode === "openai") return createOpenAI({ apiKey: ai.apiKey })(id);
  if (ai.mode === "workers") return createWorkersAI({ binding: ai.binding })(id);
  throw new Error("No AI provider is configured");
}

// A limit or an overload is worth trying the next model for; a network failure counts as busy.
function busyStatus(error: unknown) {
  if (!APICallError.isInstance(error)) return 0;
  const status = error.statusCode ?? 503;
  return BUSY_MS[status] ? status : 0;
}

/** One model call in the usage panel. Multi-step calls record each step. */
export function recordJaneUsage(ai: JaneAi, stage: string, model: string, usage: any) {
  (ai.calls ||= []).push({ stage, model, input_tokens: count(usage?.inputTokens), output_tokens: count(usage?.outputTokens),
    thinking_tokens: count(usage?.outputTokenDetails?.reasoningTokens), cached_tokens: count(usage?.inputTokenDetails?.cacheReadTokens) });
}

function system(prompt: Prompt, call: Call) {
  return [prompt.system, call.humanize ? HUMANIZER : ""].filter(Boolean).join("\n\n") || undefined;
}

function input(prompt: Prompt): { messages: ModelMessage[] } | { prompt: string } {
  return prompt.messages ? { messages: prompt.messages.map((turn) => ({ role: turn.role === "assistant" ? "assistant" : "user", content: String(turn.content ?? "") })) as ModelMessage[] }
    : { prompt: String(prompt.prompt ?? "") };
}

function limitError(limited: boolean) {
  const error: Error & { code?: string } = new Error(limited
    ? "Every free model has reached its limit for now. Please try later; daily limits reset at midnight Pacific time."
    : "Gemini could not finish this request.");
  error.code = limited ? "GEMINI_LIMIT" : "GEMINI_ERROR";
  return error;
}

/** Runs one AI SDK call, moving down the model order on a limit or overload. Any other failure stops:
 *  it would fail the same way on the next model. */
export async function janeRun<T>(ai: JaneAi, call: Call, run: (model: LanguageModel, id: string) => Promise<T>): Promise<T> {
  const order = modelOrder(ai, call.helper);
  let limited = false;
  for (const [index, id] of order.entries()) {
    try {
      const result = await run(janeModel(ai, id), id);
      if (ai.janeGemini && id !== ai.model) { ai.model = id; await ai.onModelSwitch?.(id); }
      return result;
    } catch (error) {
      const status = busyStatus(error);
      if (ai.languageModel) throw error;
      // On the Jane Gemini project a provider error never reaches the client as-is (no provider text leaks).
      if (!status) throw ai.janeGemini && APICallError.isInstance(error) ? limitError(false) : error;
      limited ||= status === 429;
      busyUntil.set(id, Date.now() + BUSY_MS[status]);
      (ai.fallbacks ||= []).push({ model: id, stage: call.stage || "review", reason: status === 429 ? "limit" : "busy" });
      if (!ai.janeGemini && index === order.length - 1) throw error;
    }
  }
  throw limitError(limited);
}

/** Plain text from one call; `json` asks the model for a JSON answer (no schema) and returns its text. */
export async function janeText(ai: JaneAi, prompt: Prompt, call: Call = {}) {
  const stage = call.stage || "review";
  return janeRun(ai, call, async (model, id) => {
    const result = await generateText({ model, system: system(prompt, call), ...input(prompt), maxRetries: 0, ...(call.json ? { output: Output.json() } : {}),
      temperature: call.temperature ?? 0.5, maxOutputTokens: call.maxOutputTokens || 4096, timeout: call.timeoutMs || 60000 });
    recordJaneUsage(ai, stage, id, result.usage);
    if (result.finishReason === "length" || result.finishReason === "content-filter") throw new Error("The model did not complete the answer.");
    if (!result.text.trim()) throw new Error("The model returned no answer.");
    return result.text;
  });
}

/** A typed object from one call: the Zod schema shapes the request and validates the answer. */
export async function janeObject<S extends z.ZodType>(ai: JaneAi, prompt: Prompt, schema: S, call: Call = {}): Promise<z.infer<S>> {
  const stage = call.stage || "helper";
  return janeRun(ai, { helper: true, ...call }, async (model, id) => {
    const result = await generateText({ model, system: system(prompt, call), ...input(prompt), output: Output.object({ schema }), maxRetries: 0,
      temperature: call.temperature ?? 0, maxOutputTokens: call.maxOutputTokens || 1200, timeout: call.timeoutMs || 30000 });
    recordJaneUsage(ai, stage, id, result.usage);
    return result.output as z.infer<S>;
  });
}

/** The writer: text chunks as they arrive. A reply never switches model halfway; the next model is
 *  only tried when the first one fails before writing anything. */
export async function* janeStream(ai: JaneAi, prompt: Prompt, call: Call = {}) {
  const stage = call.stage || "writer";
  const order = modelOrder(ai, false);
  let limited = false;
  for (const id of order) {
    let emitted = false, finish = "", usage: any = null;
    try {
      const result = streamText({ model: janeModel(ai, id), system: system(prompt, { humanize: true, ...call }), ...input(prompt), maxRetries: 0,
        temperature: call.temperature ?? 0.5, maxOutputTokens: call.maxOutputTokens || 4096 });
      for await (const part of result.fullStream) {
        if (part.type === "text-delta" && part.text) { emitted = true; yield part.text; }
        else if (part.type === "error") throw part.error;
        else if (part.type === "finish") { finish = part.finishReason; usage = part.totalUsage; }
      }
    } catch (error) {
      const status = busyStatus(error);
      if (emitted || !status || ai.languageModel) {
        recordJaneUsage(ai, stage, id, usage);
        throw ai.janeGemini && !ai.languageModel && APICallError.isInstance(error) ? limitError(status === 429) : error;
      }
      limited ||= status === 429;
      busyUntil.set(id, Date.now() + BUSY_MS[status]);
      (ai.fallbacks ||= []).push({ model: id, stage, reason: status === 429 ? "limit" : "busy" });
      if (!ai.janeGemini && id === order.at(-1)) throw error;
      continue;
    }
    recordJaneUsage(ai, stage, id, usage);
    // A cut-off, blocked or failed reply is never shown as finished; providers that send no reason are fine.
    if (!emitted || ["length", "content-filter", "error"].includes(finish)) throw new Error("The model did not complete the answer.");
    if (ai.janeGemini && id !== ai.model) { ai.model = id; await ai.onModelSwitch?.(id); }
    return;
  }
  throw limitError(limited);
}

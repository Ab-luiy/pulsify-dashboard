// Pulsify AI (functions/_shared/workers-ai.js): the platform writer on Cloudflare Workers AI, used for
// every client when no Anthropic or Gemini key is set (founder decision 2026-10-12). Fake AI binding.
import test from "node:test";
import assert from "node:assert/strict";
import { aiConfigured, generateText, providerLabel, resolveAi, streamText } from "../functions/_shared/ai-provider.js";
import { WORKERS_AI_MODEL } from "../functions/_shared/workers-ai.js";

const binding = (handler) => ({ calls: [], async run(model, input) { this.calls.push({ model, input }); return handler(model, input); } });

test("with only the AI binding, every client gets Pulsify AI instead of a prompt hand-out", async () => {
  const AI = binding(() => ({ response: "ok" }));
  const ai = await resolveAi({ AI }, "demo-rio");
  assert.equal(ai.mode, "workers");
  assert.equal(ai.model, WORKERS_AI_MODEL);
  assert.equal(aiConfigured(ai), true);
  assert.equal(providerLabel(ai), "Pulsify AI");
  assert.equal((await resolveAi({ AI, PULSIFY_AI: "off" }, "demo-rio")).mode, "manual", "it can be switched off");
  assert.equal((await resolveAi({ AI, ANTHROPIC_API_KEY: "sk-ant-x" }, "demo-rio")).mode, "anthropic", "a Claude key still wins");
});

test("generateText sends system and user, returns only the answer", async () => {
  const AI = binding(() => ({ choices: [{ message: { content: "<think>plan</think>{\"slides\":[]}" } }] }));
  const ai = await resolveAi({ AI }, "demo-rio");
  assert.equal(await generateText({ system: "S", user: "U" }, ai, { json: true }), "{\"slides\":[]}");
  assert.deepEqual(AI.calls[0].input.messages, [{ role: "system", content: "S" }, { role: "user", content: "U" }]);
  assert.equal(AI.calls[0].model, WORKERS_AI_MODEL);
});

test("the daily free limit reads as plain words", async () => {
  const AI = binding(() => { throw new Error("AiError: 4006: you have used up your daily free allocation of 10,000 neurons"); });
  const ai = await resolveAi({ AI }, "demo-rio");
  await assert.rejects(generateText({ system: "S", user: "U" }, ai), /reached today's limit/);
});

test("streamText yields the streamed text, skipping thinking", async () => {
  const sse = ["data: {\"response\":\"<think>x\"}\n", "data: {\"response\":\"</think>Hel\"}\n", "data: {\"choices\":[{\"delta\":{\"content\":\"lo\"}}]}\n", "data: [DONE]\n"];
  const AI = binding(() => new ReadableStream({ start(c) { for (const line of sse) c.enqueue(new TextEncoder().encode(line)); c.close(); } }));
  const ai = await resolveAi({ AI }, "demo-rio");
  let text = "";
  for await (const chunk of streamText({ system: "S", messages: [{ role: "user", content: "hi" }] }, ai)) text += chunk;
  assert.equal(text, "Hello");
});

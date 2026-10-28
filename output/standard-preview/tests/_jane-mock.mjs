// Test helper: a Jane `ai` whose model is an AI SDK mock, so tests run the real AI SDK code paths (tools, Zod
// outputs, streaming) without a network. `handler(request)` sees {system, user, tools, json, stream} for each model
// call and returns a string (text, or the JSON answer), {calls: [{tool, input}]} for tool calls, or throws.
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

const usage = (input = 10, output = 5) => ({
  inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: output, reasoning: undefined },
});

function partText(part) {
  if (part.type === "text") return part.text;
  if (part.type === "tool-result") return typeof part.output?.value === "string" ? part.output.value : JSON.stringify(part.output?.value ?? part.output);
  if (part.type === "tool-call") return `CALL ${part.toolName} ${typeof part.input === "string" ? part.input : JSON.stringify(part.input)}`;
  return "";
}

function read(options) {
  return {
    system: options.prompt.filter((message) => message.role === "system").map((message) => message.content).join("\n"),
    user: options.prompt.filter((message) => message.role !== "system")
      .map((message) => typeof message.content === "string" ? message.content : message.content.map(partText).join("\n")).join("\n"),
    tools: (options.tools || []).map((tool) => tool.name),
    json: options.responseFormat?.type === "json",
  };
}

export function mockJaneAi(handler, extra = {}) {
  const seen = [];
  const languageModel = new MockLanguageModelV4({
    doGenerate: async (options) => {
      const request = read(options);
      seen.push(request);
      const answer = await handler(request);
      if (answer && typeof answer === "object" && Array.isArray(answer.calls)) {
        return { content: answer.calls.map((call, index) => ({ type: "tool-call", toolCallId: `call-${seen.length}-${index}`, toolName: call.tool, input: JSON.stringify(call.input ?? {}) })),
          finishReason: { unified: answer.calls.length ? "tool-calls" : "stop", raw: undefined }, usage: usage(), warnings: [] };
      }
      return { content: [{ type: "text", text: typeof answer === "string" ? answer : JSON.stringify(answer) }], finishReason: { unified: "stop", raw: undefined }, usage: usage(), warnings: [] };
    },
    doStream: async (options) => {
      const request = { ...read(options), stream: true };
      seen.push(request);
      const text = await handler(request);
      return { stream: simulateReadableStream({ chunks: [
        { type: "text-start", id: "text-1" },
        ...String(text).match(/[\s\S]{1,24}/g).map((delta) => ({ type: "text-delta", id: "text-1", delta })),
        { type: "text-end", id: "text-1" },
        { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: usage(20, 30) },
      ] }) };
    },
  });
  return { ai: { mode: "mock", source: "platform", model: "mock-model", languageModel, calls: [], fallbacks: [], ...extra }, seen };
}

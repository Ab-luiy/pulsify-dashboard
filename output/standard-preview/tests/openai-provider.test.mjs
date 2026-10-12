// ChatGPT on the client's own key: the model comes from the key's own list, never a guessed name.
import test from "node:test";
import assert from "node:assert/strict";
import { pickOpenAiModel } from "../functions/_shared/openai.js";
import { validateAiKey } from "../functions/_shared/ai-provider.js";

test("the strongest general chat model the key can use is picked", () => {
  assert.equal(pickOpenAiModel(["gpt-4o-mini", "gpt-4.1", "whisper-1", "gpt-5-mini"]), "gpt-5-mini");
  assert.equal(pickOpenAiModel(["gpt-4o-mini", "gpt-4.1", "dall-e-3"]), "gpt-4.1");
  assert.equal(pickOpenAiModel(["whisper-1", "text-embedding-3-small"]), "");
});

test("an OpenAI key is checked against its own model list", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/models");
    assert.equal(init.headers.authorization, "Bearer sk-proj-abcdefghijklmnopqrstuvwxyz");
    return new Response(JSON.stringify({ data: [{ id: "gpt-4o-mini" }, { id: "gpt-4.1-mini" }] }), { status: 200 });
  };
  try {
    assert.deepEqual(await validateAiKey("openai", "sk-proj-abcdefghijklmnopqrstuvwxyz"), { ok: true, model: "gpt-4.1-mini" });
    assert.equal((await validateAiKey("openai", "sk-ant-abcdefghijklmnopqrstuvwxyz")).ok, false, "an Anthropic key is not an OpenAI key");
  } finally {
    globalThis.fetch = realFetch;
  }
});

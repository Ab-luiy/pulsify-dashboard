// The one switch behind every Growth generator: Opus with an Anthropic key, Gemini with a Gemini key, a manual
// prompt with neither. Mocked network, real provider code.
import assert from "node:assert/strict";
import { aiConfigured, aiMode, generateText, providerLabel, streamText } from "../functions/_shared/ai-provider.js";
import * as ideasApi from "../functions/api/youtube-ideas.js";
import { DatabaseSync } from "node:sqlite";
import { sha256Hex } from "../functions/_shared/common.js";

assert.equal(aiMode({}), "manual");
assert.equal(aiMode({ GEMINI_API_KEY: "g" }), "gemini");
assert.equal(aiMode({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" }), "anthropic", "the paid key wins");
assert.equal(aiConfigured({}), false);
assert.equal(providerLabel({ GEMINI_API_KEY: "g" }), "Gemini");
await assert.rejects(() => generateText({ system: "s", user: "u" }, {}), /No AI provider/);

const realFetch = globalThis.fetch;
const seen = [];
let script = [];
globalThis.fetch = async (url, init) => {
  seen.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
  const next = script.shift();
  return typeof next === "function" ? next() : next;
};
const ok = (text) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
const stream = (...texts) => new Response(texts.map((text) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`).join(""), { status: 200 });

try {
  // The key travels in a header, never in the URL, and the system prompt is a system instruction.
  script = [ok("hello")];
  assert.equal(await generateText({ system: "SYS", user: "USER" }, { GEMINI_API_KEY: "g-key" }), "hello");
  assert.doesNotMatch(seen[0].url, /g-key/);
  assert.equal(seen[0].headers["x-goog-api-key"], "g-key");
  assert.equal(seen[0].body.systemInstruction.parts[0].text, "SYS");
  assert.equal(seen[0].body.contents[0].parts[0].text, "USER");

  // Structured generators ask for JSON.
  script = [ok("{}")];
  await generateText({ system: "s", user: "u" }, { GEMINI_API_KEY: "g" }, { json: true });
  assert.equal(seen.at(-1).body.generationConfig.responseMimeType, "application/json");

  // Out of quota on the stronger model: the faster one answers instead of the client seeing an error.
  seen.length = 0;
  script = [new Response("quota", { status: 429 }), ok("from the fallback")];
  assert.equal(await generateText({ system: "s", user: "u" }, { GEMINI_API_KEY: "g" }), "from the fallback");
  assert.match(seen[0].url, /gemini-2\.5-pro/);
  assert.match(seen[1].url, /gemini-2\.5-flash/);

  // A real error is not retried against another model.
  seen.length = 0;
  script = [new Response("bad key", { status: 400 })];
  await assert.rejects(() => generateText({ system: "s", user: "u" }, { GEMINI_API_KEY: "g" }), /400/);
  assert.equal(seen.length, 1);

  // An answer Gemini declines to give is an error with a plain reason.
  script = [new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }), { status: 200 })];
  await assert.rejects(() => generateText({ system: "s", user: "u" }, { GEMINI_API_KEY: "g" }), /declined/);

  // A configured model name is tried first.
  seen.length = 0;
  script = [ok("x")];
  await generateText({ system: "s", user: "u" }, { GEMINI_API_KEY: "g", GEMINI_MODEL: "gemini-custom" });
  assert.match(seen[0].url, /gemini-custom/);

  // Streaming: chunks in order, an assistant turn becomes a model turn, a fallback works on 429.
  seen.length = 0;
  script = [new Response("busy", { status: 503 }), stream("Hel", "lo ", "there")];
  let out = "";
  for await (const piece of streamText({ system: "S", messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }] }, { GEMINI_API_KEY: "g" })) out += piece;
  assert.equal(out, "Hello there");
  assert.deepEqual(seen[1].body.contents.map((turn) => turn.role), ["user", "model", "user"]);
  assert.match(seen[1].url, /streamGenerateContent\?alt=sse/);
  script = [stream()];
  await assert.rejects(async () => { for await (const _ of streamText({ system: "S", messages: [{ role: "user", content: "a" }] }, { GEMINI_API_KEY: "g" })); }, /no text/);

  // A structured generator now runs on Gemini alone: no Anthropic key needed.
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT DEFAULT 'prospect');
  CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
  CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
  sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES (?,?,?)").run("a", "A", await sha256Hex("token-a"));
  const DB = { prepare(query) { let args = []; const s = { bind(...v) { args = v; return s; }, async first() { return sql.prepare(query).get(...args) || null; }, async all() { return { results: sql.prepare(query).all(...args) }; }, async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes } }; } }; return s; } };
  const idea = { bucket: "pain", idea: "Why you size up after a loss", working_title: "Stop sizing up after a loss", why: "It is the commonest account killer.", funnel: "TOF", format: "camera" };
  script = [ok(JSON.stringify({ ideas: [idea, { ...idea, bucket: "belief", idea: "More trades is not more edge" }, { ...idea, bucket: "breakdown", idea: "My risk rule on a board" }] }))];
  const answers = Array.from({ length: 3 }, (_, index) => ({ id: `q${index}`, question: `Question ${index}`, answer: "A real answer long enough to count as one." }));
  const response = await ideasApi.onRequestPost({ env: { DB, GEMINI_API_KEY: "g" }, request: new Request("https://t/api/youtube-ideas", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": "token-a" }, body: JSON.stringify({ answers }) }) });
  const body = await response.json();
  assert.equal(body.mode, "generated", "Gemini alone is enough for generated mode");
  assert.ok(Array.isArray(body.ideas) && body.ideas.length >= 1);

  console.log("PASS ai provider: precedence, key in header, JSON mode, fallback model on quota, real errors not retried, declined answers, stream order, structured generator on Gemini alone.");
} finally {
  globalThis.fetch = realFetch;
}

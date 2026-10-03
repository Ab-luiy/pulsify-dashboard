// The Copywriter chat (pulsify-saas #18): per-client saved chats, streaming from Gemini (and Opus when its key is set),
// sources never shown, ratings that teach, memory, isolation. Real SQLite, mocked provider.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as chat from "../functions/api/copy-chat.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT DEFAULT 'prospect');
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
for (const file of ["0042_studio_feedback.sql", "0053_copy_chat.sql"]) sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES (?,?,?),(?,?,?)").run("a", "Alpha", await sha256Hex("token-a"), "b", "Beta", await sha256Hex("token-b"));
sql.prepare("INSERT INTO client_brain VALUES (1,?,?,?,?,?,?),(2,?,?,?,?,?,?)").run(
  "a", "voice", "tone", '"ALPHA VOICE: blunt and dry"', "test", "2026-10-01",
  "b", "voice", "tone", '"PRIVATE BETA VOICE"', "test", "2026-10-01",
);

const DB = {
  prepare(query) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }; },
    };
    return statement;
  },
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
};

const req = (body, token = "token-a", method = "POST", query = "") => new Request(`https://test/api/copy-chat${query}`, {
  method,
  headers: { "content-type": "application/json", ...(token ? { "x-portal-token": token } : {}) },
  body: method === "GET" ? undefined : JSON.stringify(body),
});
const get = (env, query = "", token = "token-a") => chat.onRequestGet({ env, request: req(null, token, "GET", query) });
const manualEnv = { DB };
const geminiEnv = { DB, GEMINI_API_KEY: "g-key", AI_PLATFORM_CLIENTS: "*" };

/** Run a send, collect the background work, and parse the event stream if there is one. */
async function post(env, body, token = "token-a") {
  const pending = [];
  const response = await chat.onRequestPost({ env, request: req(body, token), waitUntil: (promise) => pending.push(promise) });
  const type = response.headers.get("content-type") || "";
  if (!type.includes("event-stream")) return { response, json: await response.json().catch(() => null), events: [] };
  const text = await response.text();
  await Promise.all(pending);
  const events = text.split("\n\n").filter(Boolean).map((block) => {
    const lines = block.split("\n");
    return { event: lines[0].slice(7), data: JSON.parse(lines[1].slice(6)) };
  });
  return { response, events, text: events.filter((e) => e.event === "delta").map((e) => e.data.text).join("") };
}

// ---- the provider, mocked: Gemini streams, and answers the memory question as JSON.
const realFetch = globalThis.fetch;
let calls;
let reply;
let memoryNotes;
let failStream;
function sse(chunks) {
  const encoder = new TextEncoder();
  const body = chunks.map((text) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`).join("");
  // Split mid-event on purpose: a real network does.
  const pieces = [body.slice(0, 40), body.slice(40, 130), body.slice(130)];
  return new ReadableStream({ start(controller) { for (const piece of pieces) controller.enqueue(encoder.encode(piece)); controller.close(); } });
}
globalThis.fetch = async (url, init) => {
  const target = String(url);
  const payload = init?.body ? JSON.parse(init.body) : {};
  calls.push({ url: target, payload });
  if (target.includes(":streamGenerateContent")) {
    if (failStream) return new Response("overloaded", { status: 500 });
    const words = reply.match(/.{1,9}/gs);
    return new Response(sse(words), { status: 200, headers: { "content-type": "text/event-stream" } });
  }
  if (target.includes(":generateContent")) {
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ notes: memoryNotes }) }] } }] }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (target.includes("api.anthropic.com")) {
    const encoder = new TextEncoder();
    const events = [
      { type: "content_block_delta", delta: { type: "text_delta", text: "Opus wrote this. " } },
      { type: "content_block_delta", delta: { type: "text_delta", text: "Second part." } },
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
    return new Response(new ReadableStream({ start(c) { c.enqueue(encoder.encode(events)); c.close(); } }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${target}`);
};

try {
  calls = [];
  reply = "Slide 1: You blew the account on a Tuesday.\nSlide 2: Here is the rule.";
  memoryNotes = ["Prefers blunt, dry openings."];

  // ---- access and validation
  assert.equal((await chat.onRequestGet({ env: geminiEnv, request: req(null, "bad", "GET") })).status, 401);
  assert.equal((await post(geminiEnv, { action: "send", message: "hi" }, "bad")).response.status, 401);
  assert.equal((await post(geminiEnv, { action: "send", message: "   " })).response.status, 422);
  assert.equal((await post(geminiEnv, { action: "send", message: "x".repeat(8001) })).response.status, 413);
  assert.equal((await post(geminiEnv, { action: "nope" })).response.status, 422);
  assert.equal((await chat.onRequestPost({ env: {}, request: req({ action: "send", message: "hi" }) })).status, 500);

  // ---- the idle state
  let state = await (await get(geminiEnv)).json();
  assert.equal(state.mode, "generated");
  assert.equal(state.provider, "Gemini");
  assert.deepEqual(state.chats, []);
  assert.equal((await (await get(manualEnv)).json()).mode, "manual");
  assert.equal((await (await get({ DB, ANTHROPIC_API_KEY: "a-key" })).json()).provider, "Claude");

  // ---- a generated reply streams, is saved, and the chat is titled from the first message
  let result = await post(geminiEnv, { action: "send", message: "A 6-slide story about the Tuesday I blew an account", format: "story" });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.events.map((e) => e.event).slice(0, 1), ["meta"]);
  assert.equal(result.events.at(-1).event, "done");
  assert.equal(result.text, reply, "the stream reassembles to the reply");
  const chatId = result.events[0].data.chat_id;
  assert.equal(result.events[0].data.title, "A 6-slide story about the Tuesday I");
  const saved = sql.prepare("SELECT role, content FROM copy_messages WHERE chat_id=? ORDER BY id").all(chatId);
  assert.deepEqual(saved.map((m) => m.role), ["user", "assistant"]);
  assert.equal(saved[1].content, reply);
  assert.equal(sql.prepare("SELECT format FROM copy_chats WHERE id=?").get(chatId).format, "story");

  // ---- what Gemini was actually told
  const first = calls.find((c) => c.url.includes(":streamGenerateContent"));
  assert.match(first.url, /gemini-2\.5-pro/, "the stronger free model goes first");
  assert.equal(first.payload.contents.at(-1).role, "user");
  const system = first.payload.systemInstruction.parts[0].text;
  assert.match(system, /ALPHA VOICE: blunt and dry/, "the client's own brain is in the prompt");
  assert.doesNotMatch(system, /PRIVATE BETA VOICE/, "another client's brain never is");
  assert.match(system, /never say or hint where Pulsify's methods/i, "the hard limit on sources is in the prompt");
  assert.doesNotMatch(system, /niksetting|haynes|alexei|ayman|soowei/i, "the method text the model reads names no source");
  assert.match(system, /story sequence/i, "story format loads the story method");
  assert.match(system, /THE LEVEL OF WRITING EXPECTED/, "a worked example sets the level");
  assert.match(system, /Slide 1: \[Real result\]/, "the story example leaves facts as brackets");

  // ---- the background memory call ran and stored a note
  assert.deepEqual(sql.prepare("SELECT note, source FROM copy_memory WHERE client_id='a' AND active=1").all().map((r) => [r.note, r.source]), [["Prefers blunt, dry openings.", "chat"]]);
  assert.ok(calls.some((c) => c.url.includes(":generateContent") && c.payload.generationConfig.responseMimeType === "application/json"));

  // ---- a source name the model lets slip is scrubbed before the client sees it or it is saved
  calls = [];
  reply = "Use Jeremy Haynes' call funnel, the way Niksetting teaches it. Slide 1: your hook.";
  result = await post(geminiEnv, { action: "send", chat_id: chatId, message: "Where did this come from?" });
  assert.doesNotMatch(result.text, /haynes|niksetting/i);
  assert.match(result.text, /Pulsify/);
  assert.doesNotMatch(sql.prepare("SELECT content FROM copy_messages WHERE chat_id=? ORDER BY id DESC LIMIT 1").get(chatId).content, /haynes|niksetting/i);

  // ---- history goes back to the model, and memory and format carry over
  const second = calls.find((c) => c.url.includes(":streamGenerateContent"));
  assert.deepEqual(second.payload.contents.map((c) => c.role), ["user", "model", "user"]);
  assert.match(second.payload.systemInstruction.parts[0].text, /Prefers blunt, dry openings\./);

  // ---- ratings teach: a liked draft becomes an example, a disliked one with a reason becomes a rule
  const assistantRows = sql.prepare("SELECT id FROM copy_messages WHERE chat_id=? AND role='assistant' ORDER BY id").all(chatId);
  assert.equal((await post(geminiEnv, { action: "rate", message_id: assistantRows[0].id, rating: "up" })).json.rating, "up");
  assert.equal((await post(geminiEnv, { action: "rate", message_id: assistantRows[1].id, rating: "down", note: "Never open with a date." })).json.rating, "down");
  assert.equal(sql.prepare("SELECT rule, scope FROM studio_feedback WHERE client_id='a'").get().scope, "client");
  calls = [];
  reply = "Fine.";
  await post(geminiEnv, { action: "send", chat_id: chatId, message: "Again please" });
  const learned = calls.find((c) => c.url.includes(":streamGenerateContent")).payload.systemInstruction.parts[0].text;
  assert.match(learned, /Never open with a date\./);
  assert.match(learned, /You blew the account on a Tuesday/, "the liked draft is offered as an example");
  assert.equal((await post(geminiEnv, { action: "rate", message_id: sql.prepare("SELECT id FROM copy_messages WHERE role='user' LIMIT 1").get().id, rating: "up" }, "token-a")).response.status, 404, "only replies can be rated");

  // ---- isolation: another client sees none of it and cannot touch it
  assert.deepEqual((await (await get(geminiEnv, "", "token-b")).json()).chats, []);
  assert.equal((await get(geminiEnv, `?chat=${chatId}`, "token-b")).status, 404);
  assert.equal((await post(geminiEnv, { action: "rename", chat_id: chatId, title: "Hijack" }, "token-b")).response.status, 404);
  assert.equal((await post(geminiEnv, { action: "delete", chat_id: chatId }, "token-b")).response.status, 404);
  assert.equal((await post(geminiEnv, { action: "send", chat_id: chatId, message: "Hi" }, "token-b")).response.status, 404);
  assert.deepEqual((await (await get(geminiEnv, "", "token-b")).json()).memory, []);

  // ---- reading a chat back, rename, explicit memory
  const read = await (await get(geminiEnv, `?chat=${chatId}`)).json();
  assert.equal(read.messages.length, 6);
  assert.equal(read.messages[0].role, "user");
  assert.equal((await post(geminiEnv, { action: "rename", chat_id: chatId, title: "Tuesday story" })).json.title, "Tuesday story");
  memoryNotes = [];
  result = await post(geminiEnv, { action: "send", message: "Remember that I never use the word guru" });
  assert.ok(sql.prepare("SELECT 1 FROM copy_memory WHERE client_id='a' AND source='client' AND note LIKE 'I never use the word guru'").get());
  const memoryId = (await (await get(geminiEnv)).json()).memory.find((m) => m.source === "client").id;
  assert.equal((await post(geminiEnv, { action: "memory-delete", id: memoryId })).json.memory.some((m) => m.id === memoryId), false);
  assert.equal((await post(geminiEnv, { action: "memory-add", note: "Writes for coaches" })).json.memory.some((m) => m.note === "Writes for coaches"), true);
  assert.equal((await post(geminiEnv, { action: "memory-add", note: "x" })).response.status, 422);

  // ---- delete removes the chat and its messages
  assert.equal((await post(geminiEnv, { action: "delete", chat_id: chatId })).json.ok, true);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM copy_messages WHERE chat_id=?").get(chatId).n, 0);

  // ---- a provider failure is reported in the stream, the message stays saved, no reply is stored
  failStream = true;
  const before = sql.prepare("SELECT COUNT(*) n FROM copy_messages").get().n;
  result = await post(geminiEnv, { action: "send", message: "Write something" });
  assert.equal(result.events.at(-1).event, "error");
  assert.match(result.events.at(-1).data.prompt, /CONVERSATION SO FAR/, "a failure still hands back the prompt");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM copy_messages").get().n, before + 1, "only the client's message was saved");
  failStream = false;

  // ---- the burst limit
  sql.exec("DELETE FROM copy_messages; DELETE FROM copy_chats;");
  reply = "ok";
  for (let i = 0; i < 12; i++) assert.equal((await post(geminiEnv, { action: "send", message: `message ${i}` })).response.status, 200);
  assert.equal((await post(geminiEnv, { action: "send", message: "one too many" })).response.status, 429);
  sql.exec("DELETE FROM copy_messages; DELETE FROM copy_chats;");

  // ---- no key: the same chat hands over a prompt and takes the pasted answer
  calls = [];
  result = await post(manualEnv, { action: "send", message: "An email about my launch", format: "email" });
  assert.equal(result.json.mode, "manual");
  assert.match(result.json.prompt, /ALPHA VOICE: blunt and dry/);
  assert.match(result.json.prompt, /An email about my launch/);
  assert.doesNotMatch(result.json.prompt, /PRIVATE BETA VOICE|niksetting|haynes/i);
  assert.equal(calls.length, 0, "no provider is called without a key");
  const pasted = await post(manualEnv, { action: "paste", chat_id: result.json.chat_id, content: "Subject: Doors open" });
  assert.equal(pasted.json.ok, true);
  assert.equal((await post(manualEnv, { action: "paste", chat_id: result.json.chat_id, content: " " })).response.status, 422);
  assert.equal((await (await get(manualEnv, `?chat=${result.json.chat_id}`)).json()).messages.at(-1).content, "Subject: Doors open");

  // ---- with an Anthropic key, Opus streams the same chat
  calls = [];
  result = await post({ DB, ANTHROPIC_API_KEY: "a-key", GEMINI_API_KEY: "g-key" }, { action: "send", message: "Another one" });
  assert.equal(result.text, "Opus wrote this. Second part.");
  assert.ok(calls.some((c) => c.url.includes("api.anthropic.com")));
  assert.ok(!calls.some((c) => c.url.includes("generativelanguage")), "the paid key wins over the free one");

  console.log("PASS copy chat: saved chats per client, Gemini streaming with fallback model, Opus when keyed, sources scrubbed from reply and prompt, ratings teach by example and rule, memory, isolation, burst limit, failures keep the message, manual prompt without a key.");
} finally {
  globalThis.fetch = realFetch;
}

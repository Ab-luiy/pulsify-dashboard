// Growth #18: YouTube ideation. Real SQLite through a D1-shaped wrapper; the Anthropic call is mocked.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import * as ideasApi from "../functions/api/youtube-ideas.js";
import { sanitizeIdeas } from "../functions/_shared/youtube-ideas.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT DEFAULT 'active');
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES (?,?,?),(?,?,?)")
  .run("a", "Alpha Trades", await sha256Hex("token-a"), "b", "Beta", await sha256Hex("token-b"));
sql.prepare("INSERT INTO client_brain VALUES (1,?,?,?,?,?,?)").run("a", "offer", "direction", '"TEACH FUTURES RISK RULES"', "client-form", "2026-09-20");
sql.prepare("INSERT INTO client_brain VALUES (2,?,?,?,?,?,?)").run("b", "offer", "direction", '"PRIVATE BETA OFFER"', "client-form", "2026-09-20");

const DB = {
  prepare(query) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes } }; },
    };
    return statement;
  },
};
const answers = [
  { id: "solved", question: "What's something you've solved?", answer: "STOPPED MOVING MY STOP" },
  { id: "mistake", question: "What's a common mistake you see?", answer: "sizing from the target" },
  { id: "longest", question: "What took you the longest to figure out?", answer: "patience between setups" },
];
const post = (env, body, token = "token-a") => ideasApi.onRequestPost({
  env,
  request: new Request("https://test/api/youtube-ideas", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": token }, body: JSON.stringify(body) }),
});

assert.equal((await post({ DB }, { answers }, "wrong")).status, 401, "client sign-in required");
assert.equal((await post({ DB }, { answers: answers.slice(0, 2) })).status, 422, "three answers minimum");

// Without a key the client gets the full prompt for their own AI.
let body = await (await post({ DB }, { answers })).json();
assert.equal(body.mode, "manual");
assert.match(body.prompt, /STOPPED MOVING MY STOP/);
assert.match(body.prompt, /TEACH FUTURES RISK RULES/, "the brain is in the prompt");
assert.match(body.prompt, /Detect market outliers/, "the YouTube method is bundled in");
assert.match(body.prompt, /Never BOF/);
assert.match(body.prompt, /Never invent results/);
assert.doesNotMatch(body.prompt, /PRIVATE BETA OFFER/, "another client's brain never leaks");

// With a key, Opus writes the ideas and junk is cleaned out.
const realFetch = globalThis.fetch;
let reply;
let sent;
globalThis.fetch = async (url, init) => {
  sent = JSON.parse(init.body);
  return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: reply }] }), { status: 200 });
};
try {
  reply = "```json\n" + JSON.stringify({ ideas: [
    { bucket: "pain", idea: "Why moving your stop drains the account", working_title: "the stop loss mistake", why: "they feel it weekly", funnel: "TOF", format: "camera-miro", mindset_heavy: false, needs_proof: "", from_answer: "solved" },
    { bucket: "belief", idea: "You need a better strategy", funnel: "BOF", format: "hologram", mindset_heavy: true },
    { bucket: "nonsense", idea: "dropped" },
    { bucket: "breakdown" },
  ] }) + "\n```";
  body = await (await post({ DB, ANTHROPIC_API_KEY: "test-key" }, { answers })).json();
  assert.equal(body.mode, "generated");
  assert.equal(sent.model, "claude-opus-5-5");
  assert.deepEqual(sent.system[0].cache_control, { type: "ephemeral" });
  assert.equal(body.ideas.length, 2, "ideas without a known bucket or text are dropped");
  assert.equal(body.ideas[1].funnel, "TOF", "BOF is never used");
  assert.equal(body.ideas[1].format, "camera", "unknown formats fall back");
  assert.equal(body.ideas[1].mindset_heavy, true);

  reply = "Sorry, here are some thoughts without JSON.";
  body = await (await post({ DB, ANTHROPIC_API_KEY: "test-key" }, { answers })).json();
  assert.equal(body.mode, "manual", "an unreadable answer falls back to the copy-paste prompt");
  assert.match(body.warning, /unreadable/);
} finally {
  globalThis.fetch = realFetch;
}

assert.deepEqual(sanitizeIdeas(null), []);
assert.equal(sanitizeIdeas([{ bucket: "pain", idea: "x".repeat(400) }])[0].idea.length, 240);

console.log("PASS youtube ideas: client auth, answer minimum, brain and method in the prompt, tenant isolation, Opus switch, cleaning, unreadable fallback. Anthropic mocked.");

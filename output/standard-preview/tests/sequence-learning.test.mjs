// Growth #18: the review gate teaches the story sequence generator.
// Real SQLite through a D1-shaped wrapper; the Anthropic call is mocked.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as generateApi from "../functions/api/studio-generate.js";
import * as sequencesApi from "../functions/api/studio-sequences.js";
import * as feedbackApi from "../functions/api/studio-feedback.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active');
CREATE TABLE client_dashboard_content(client_id TEXT, section TEXT, json TEXT);
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
for (const file of ["0012_client_dashboard_studio.sql", "0041_studio_feedback.sql"]) {
  sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
}
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES (?,?,?,'{}'),(?,?,?,'{}')")
  .run("a", "Alpha", await sha256Hex("token-a"), "b", "Beta", await sha256Hex("token-b"));

const insertSequence = sql.prepare(`INSERT INTO studio_sequences(client_id, type, topic, params_json, output_json, status, created_at, updated_at)
  VALUES (?, ?, ?, '{}', ?, ?, ?, ?)`);
const slides = (...lines) => JSON.stringify({ slides: lines.map((line, index) => ({ n: index + 1, text_pills: [line] })) });
insertSequence.run("a", "credibility", "Alpha approved", slides("APPROVED LINE A", "second line"), "approved", "2026-09-20", "2026-09-20");
insertSequence.run("a", "value-driven", "Alpha empty approved", JSON.stringify({ slides: [{ n: 1, text_pills: [] }] }), "approved", "2026-09-21", "2026-09-21");
insertSequence.run("b", "credibility", "Beta approved", slides("PRIVATE B LINE"), "approved", "2026-09-20", "2026-09-20");
insertSequence.run("a", "credibility", "Alpha in review", slides("REVIEW DRAFT"), "review", "2026-09-22", "2026-09-22");
insertSequence.run("b", "credibility", "Beta in review", slides("BETA DRAFT"), "review", "2026-09-22", "2026-09-22");

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
};
const operator = { operator: { email: "operator@example.com", via: "access" } };
const post = (path, body, headers = {}) => new Request(`https://test/api/${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const generate = (env, body = {}) => generateApi.onRequestPost({ env, request: post("studio-generate", { type: "credibility", topic: "A student result", goal: "dms", ...body }, { "x-portal-token": "token-a" }) });

// Rejections become rules: client-only by default, every client when the operator ticks it.
const [reviewA] = sql.prepare("SELECT id FROM studio_sequences WHERE topic='Alpha in review'").all();
const [reviewB] = sql.prepare("SELECT id FROM studio_sequences WHERE topic='Beta in review'").all();
let response = await sequencesApi.onRequestPost({ env: { DB }, request: post("studio-sequences", { action: "reject", id: reviewA.id }), data: operator });
assert.equal(response.status, 422, "a rejection needs a reason");
response = await sequencesApi.onRequestPost({ env: { DB }, request: post("studio-sequences", { action: "reject", id: reviewA.id, note: "RULE A ONLY" }), data: operator });
assert.equal(response.status, 200);
response = await sequencesApi.onRequestPost({ env: { DB }, request: post("studio-sequences", { action: "reject", id: reviewB.id, note: "GLOBAL RULE", apply_to_all: true }), data: operator });
assert.equal(response.status, 200);
sql.prepare("UPDATE studio_sequences SET status='review' WHERE id=?").run(reviewB.id);
await sequencesApi.onRequestPost({ env: { DB }, request: post("studio-sequences", { action: "reject", id: reviewB.id, note: "B ONLY RULE" }), data: operator });
assert.deepEqual(
  sql.prepare("SELECT client_id, rule, scope FROM studio_feedback ORDER BY id").all().map((row) => ({ ...row })),
  [
    { client_id: "a", rule: "RULE A ONLY", scope: "client" },
    { client_id: "b", rule: "GLOBAL RULE", scope: "all" },
    { client_id: "b", rule: "B ONLY RULE", scope: "client" },
  ],
);
// The rule survives the client resubmitting (review_note is cleared then).
await sequencesApi.onRequestPost({ env: { DB }, request: post("studio-sequences", { action: "submit-for-review", id: reviewA.id }, { "x-portal-token": "token-a" }) });
assert.equal(sql.prepare("SELECT review_note FROM studio_sequences WHERE id=?").get(reviewA.id).review_note, null);

// Without a key the client gets the full package to run in their own AI.
response = await generate({ DB });
let body = await response.json();
assert.equal(body.mode, "manual");
const prompt = body.manual_prompt;
assert.match(prompt, /REFERENCE MATERIAL/);
assert.match(prompt, /Divide-by-three/i, "the method is bundled in");
assert.match(prompt, /APPROVED LINE A/, "approved sequences are examples");
assert.match(prompt, /RULE A ONLY/);
assert.match(prompt, /GLOBAL RULE/);
assert.doesNotMatch(prompt, /PRIVATE B LINE|B ONLY RULE/, "another client's work never leaks");
assert.doesNotMatch(prompt, /REVIEW DRAFT/, "only approved drafts are examples");
assert.ok(prompt.indexOf("GLOBAL RULE") < prompt.indexOf("RULE A ONLY"), "every-client rules come first");
const saved = sql.prepare("SELECT params_json FROM studio_sequences WHERE id=?").get(body.id);
assert.equal(JSON.parse(saved.params_json).learning.rules_used, 2);
assert.equal(JSON.parse(saved.params_json).learning.example_ids.length, 1, "empty approved drafts are skipped");

// The operator manages the rules.
response = await feedbackApi.onRequestGet({ env: { DB }, request: new Request("https://test/api/studio-feedback") });
assert.equal(response.status, 401, "operator only");
response = await feedbackApi.onRequestGet({ env: { DB }, request: new Request("https://test/api/studio-feedback"), data: operator });
body = await response.json();
assert.equal(body.rows[0].rule, "GLOBAL RULE");
const ruleA = body.rows.find((row) => row.rule === "RULE A ONLY");
response = await feedbackApi.onRequestPost({ env: { DB }, request: post("studio-feedback", { action: "retire", id: ruleA.id }), data: operator });
assert.equal(response.status, 200);
response = await feedbackApi.onRequestPost({ env: { DB }, request: post("studio-feedback", { action: "retire", id: ruleA.id }), data: operator });
assert.equal(response.status, 404, "a retired rule cannot be retired twice");
assert.equal((await feedbackApi.onRequestPost({ env: { DB }, request: post("studio-feedback", { action: "delete", id: 1 }), data: operator })).status, 422);
const ruleB = body.rows.find((row) => row.rule === "B ONLY RULE");
await feedbackApi.onRequestPost({ env: { DB }, request: post("studio-feedback", { action: "apply-to-all", id: ruleB.id }), data: operator });
body = await (await generate({ DB })).json();
assert.doesNotMatch(body.manual_prompt, /RULE A ONLY/, "retired rules stop applying");
assert.match(body.manual_prompt, /B ONLY RULE/, "a rule applied to all reaches every client");

// One switch: with a key set, Opus 5.5 writes the draft with the method cached.
const realFetch = globalThis.fetch;
let sent;
globalThis.fetch = async (url, init) => {
  sent = { url, body: JSON.parse(init.body) };
  const draft = { type: "credibility", slides: [{ n: 1, job: "curiosity", text_pills: ["A real line"] }], hooks: [], why_order: "", posting_note: "" };
  return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify(draft) }] }), { status: 200 });
};
try {
  body = await (await generate({ DB, ANTHROPIC_API_KEY: "test-key" })).json();
} finally {
  globalThis.fetch = realFetch;
}
assert.equal(body.mode, "generated");
assert.equal(sent.url, "https://api.anthropic.com/v1/messages");
assert.equal(sent.body.model, "claude-opus-5-5");
assert.deepEqual(sent.body.system[0].cache_control, { type: "ephemeral" });
assert.match(sent.body.messages[0].content, /APPROVED LINE A/);
assert.deepEqual(body.output.slides[0].text_pills, ["A real line"]);

console.log("PASS sequence learning: rejections become client or all-client rules, approved drafts become examples, tenant isolation, rule management, Opus switch. Anthropic mocked.");

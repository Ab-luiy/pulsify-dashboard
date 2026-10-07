// The review gate teaches the carousel generator (same loop as sequences and YouTube): a rejection note
// becomes a rule tagged 'carousel' (so it never reaches sequences or YouTube), an approved carousel
// becomes an example for the same client only. Real SQLite through a D1-shaped wrapper.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as carouselApi from "../functions/api/studio-carousels.js";
import { loadRules } from "../functions/_shared/content-learning.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active');
CREATE TABLE client_dashboard_content(client_id TEXT, section TEXT, json TEXT);
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
for (const file of ["0018_studio_carousels.sql", "0042_studio_feedback.sql", "0058_studio_feedback_format.sql"]) {
  sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
}
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES (?,?,?,'{}'),(?,?,?,'{}')")
  .run("a", "Alpha", await sha256Hex("token-a"), "b", "Beta", await sha256Hex("token-b"));

const insert = sql.prepare(`INSERT INTO studio_carousels(client_id, structure, topic, goal, params_json, output_json, manual_prompt, status, created_at, updated_at)
  VALUES (?, ?, ?, 'reach', '{}', ?, '', ?, ?, ?)`);
const out = (structure, ...headlines) => JSON.stringify({ structure, title: headlines[0], slides: headlines.map((headline, index) => ({ n: index + 1, headline, cta: index === headlines.length - 1 ? "Comment GUIDE" : "" })) });
insert.run("a", "methodology", "Alpha approved", out("methodology", "APPROVED COVER A", "step two"), "approved", "2026-09-20", "2026-09-20");
insert.run("b", "methodology", "Beta approved", out("methodology", "PRIVATE B COVER"), "approved", "2026-09-20", "2026-09-20");
insert.run("a", "taxonomy", "Alpha in review", out("taxonomy", "REVIEW DRAFT"), "review", "2026-09-22", "2026-09-22");
insert.run("b", "taxonomy", "Beta in review", out("taxonomy", "BETA DRAFT"), "review", "2026-09-22", "2026-09-22");

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
const post = (body, headers = {}) => new Request("https://test/api/studio-carousels", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const generate = () => carouselApi.onRequestPost({ env: { DB }, request: post({ action: "generate", structure: "methodology", topic: "A student result", goal: "reach" }, { "x-portal-token": "token-a" }) });

const reviewA = sql.prepare("SELECT id FROM studio_carousels WHERE topic='Alpha in review'").get().id;
const reviewB = sql.prepare("SELECT id FROM studio_carousels WHERE topic='Beta in review'").get().id;

// A rejection becomes a rule: client-only by default, every client when ticked, tagged 'carousel'.
let response = await carouselApi.onRequestPost({ env: { DB }, request: post({ action: "reject", id: reviewA }), data: operator });
assert.equal(response.status, 422, "a reject without a note is refused");
response = await carouselApi.onRequestPost({ env: { DB }, request: post({ action: "reject", id: reviewA, note: "COVER TOO WORDY" }), data: operator });
assert.equal(response.status, 200);
response = await carouselApi.onRequestPost({ env: { DB }, request: post({ action: "reject", id: reviewB, note: "NEVER SAY GUARANTEE", apply_to_all: true }), data: operator });
assert.equal(response.status, 200);
const rules = sql.prepare("SELECT client_id, rule, scope, format FROM studio_feedback ORDER BY id").all();
assert.deepEqual(rules.map((r) => [r.client_id, r.rule, r.scope, r.format]), [["a", "COVER TOO WORDY", "client", "carousel"], ["b", "NEVER SAY GUARANTEE", "all", "carousel"]]);

// The next draft for Alpha carries its own approved example and both rules, never Beta's example or draft.
response = await generate();
const body = await response.json();
assert.equal(body.ok, true);
const prompt = sql.prepare("SELECT manual_prompt, params_json FROM studio_carousels WHERE id=?").get(body.id);
assert.match(prompt.manual_prompt, /COVER TOO WORDY/);
assert.match(prompt.manual_prompt, /NEVER SAY GUARANTEE/);
assert.match(prompt.manual_prompt, /APPROVED COVER A/);
assert.doesNotMatch(prompt.manual_prompt, /PRIVATE B COVER|REVIEW DRAFT|BETA DRAFT/);
assert.deepEqual(JSON.parse(prompt.params_json).learning, { example_ids: [1], rules_used: 2 });

// Carousel rules stay out of the other formats; untagged rules still reach everyone.
sql.prepare("INSERT INTO studio_feedback(client_id, rule, scope, active, created_at, updated_at, format) VALUES ('a','NEVER CALL REVENUE PROFIT','all',1,'2026-09-01','2026-09-01','')").run();
const forSequences = await loadRules({ DB }, "a", "sequence");
assert.deepEqual(forSequences, ["NEVER CALL REVENUE PROFIT"]);
assert.equal((await loadRules({ DB }, "a", "carousel")).length, 3);

// Before migration 0058 the format column does not exist: rules still load, nothing throws.
const legacy = new DatabaseSync(":memory:");
legacy.exec(readFileSync(new URL("../migrations/0042_studio_feedback.sql", import.meta.url), "utf8"));
legacy.prepare("INSERT INTO studio_feedback(client_id, rule, scope, active, created_at, updated_at) VALUES ('a','OLD RULE','client',1,'2026-09-01','2026-09-01')").run();
const legacyDB = { prepare(query) { let a = []; const s = { bind(...v) { a = v; return s; }, async all() { return { results: legacy.prepare(query).all(...a) }; } }; return s; } };
assert.deepEqual(await loadRules({ DB: legacyDB }, "a", "carousel"), ["OLD RULE"]);
console.log("carousel learning ok");

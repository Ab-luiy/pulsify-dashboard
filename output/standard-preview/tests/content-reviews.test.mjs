// Growth #18: the review gate for YouTube packages. Real SQLite through a D1-shaped wrapper.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as reviewsApi from "../functions/api/content-reviews.js";
import * as titlesApi from "../functions/api/youtube-titles.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT DEFAULT 'active');
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);
CREATE TABLE workspace_records(id TEXT PRIMARY KEY, client_id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`);
for (const file of ["0042_studio_feedback.sql", "0044_content_reviews.sql"]) sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES (?,?,?),(?,?,?)")
  .run("a", "Alpha Trades", await sha256Hex("token-a"), "b", "Beta", await sha256Hex("token-b"));
const insertRecord = sql.prepare("INSERT INTO workspace_records VALUES (?,?,?,?,?,?,?)");
const full = { stage: "package", headline: "APPROVED TITLE A", thumbnail_text: "no more blown accounts", hook: "THE APPROVED OPENING", outline: "Problem: ...", review: { status: "approved" }, secret_field: "not in the snapshot" };
insertRecord.run("vid-a", "a", "youtube", "The one risk rule", JSON.stringify(full), "2026-09-28", "2026-09-28");
insertRecord.run("vid-a2", "a", "youtube", "Half done", JSON.stringify({ stage: "title", headline: "a title" }), "2026-09-28", "2026-09-28");
insertRecord.run("vid-b", "b", "youtube", "Beta video", JSON.stringify({ headline: "PRIVATE BETA TITLE", hook: "beta opening" }), "2026-09-28", "2026-09-28");

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
const operator = { operator: { email: "operator@example.com", via: "access" } };
const req = (path, body, token) => new Request(`https://test/api/${path}`, {
  method: body ? "POST" : "GET",
  headers: { "content-type": "application/json", ...(token ? { "x-portal-token": token } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});
const submit = (recordId, token = "token-a") => reviewsApi.onRequestPost({ env: { DB }, request: req("content-reviews", { action: "submit", record_id: recordId }, token) });

// Clients send their own finished packages only.
assert.equal((await submit("vid-a", "wrong")).status, 401);
assert.equal((await submit("vid-b")).status, 404, "another client's project cannot be sent");
assert.equal((await submit("vid-a2")).status, 422, "a package needs a title and an opening");
let body = await (await submit("vid-a")).json();
assert.equal(body.status, "review");
const firstId = body.id;
body = await (await submit("vid-a")).json();
assert.equal(body.id, firstId, "sending again while waiting updates the same review");
const snapshot = JSON.parse(sql.prepare("SELECT snapshot_json FROM content_reviews WHERE id=?").get(firstId).snapshot_json);
assert.equal(snapshot.headline, "APPROVED TITLE A");
assert.equal(snapshot.secret_field, undefined, "only package fields are snapshotted");
assert.equal(snapshot.review, undefined, "a client-written review field never reaches the snapshot");

// A client cannot approve; the operator sees every client's queue.
assert.equal((await reviewsApi.onRequestPost({ env: { DB }, request: req("content-reviews", { action: "approve", id: firstId }, "token-a") })).status, 401);
body = await (await reviewsApi.onRequestGet({ env: { DB }, request: req("content-reviews?status=review"), data: operator })).json();
assert.equal(body.rows.length, 1);
assert.equal(body.rows[0].snapshot.hook, "THE APPROVED OPENING");

// Before approval nothing is an example.
const titlesPrompt = async () => (await (await titlesApi.onRequestPost({ env: { DB }, request: req("youtube-titles", { idea: { idea: "next video" } }, "token-a") })).json()).prompt;
assert.doesNotMatch(await titlesPrompt(), /APPROVED TITLE A/);

assert.equal((await reviewsApi.onRequestPost({ env: { DB }, request: req("content-reviews", { action: "approve", id: firstId }), data: operator })).status, 200);
assert.equal((await reviewsApi.onRequestPost({ env: { DB }, request: req("content-reviews", { action: "approve", id: firstId }), data: operator })).status, 409, "decided once");
let prompt = await titlesPrompt();
assert.match(prompt, /Videos the Pulsify team approved/);
assert.match(prompt, /APPROVED TITLE A/, "an approved package is an example for the next one");

// A rejection needs a reason, and the reason becomes a rule every YouTube step follows.
sql.prepare("UPDATE workspace_records SET data_json=? WHERE id='vid-a2'").run(JSON.stringify({ headline: "second title", hook: "an opening" }));
const second = (await (await submit("vid-a2")).json()).id;
assert.equal((await reviewsApi.onRequestPost({ env: { DB }, request: req("content-reviews", { action: "reject", id: second }), data: operator })).status, 422);
await reviewsApi.onRequestPost({ env: { DB }, request: req("content-reviews", { action: "reject", id: second, note: "TITLES UNDER 50 CHARACTERS" }), data: operator });
prompt = await titlesPrompt();
assert.match(prompt, /Team rules from past reviews/);
assert.match(prompt, /TITLES UNDER 50 CHARACTERS/);
assert.equal(sql.prepare("SELECT scope FROM studio_feedback WHERE rule=?").get("TITLES UNDER 50 CHARACTERS").scope, "client");

// The client sees the latest decision per project, with the reason; another client sees nothing of it.
body = await (await reviewsApi.onRequestGet({ env: { DB }, request: req("content-reviews", null, "token-a") })).json();
const byRecord = Object.fromEntries(body.rows.map((row) => [row.record_id, row]));
assert.equal(byRecord["vid-a"].status, "approved");
assert.equal(byRecord["vid-a2"].status, "rejected");
assert.equal(byRecord["vid-a2"].review_note, "TITLES UNDER 50 CHARACTERS");
assert.equal(byRecord["vid-a"].snapshot, undefined, "clients get statuses, not snapshots");
body = await (await reviewsApi.onRequestGet({ env: { DB }, request: req("content-reviews", null, "token-b") })).json();
assert.equal(body.rows.length, 0);
assert.doesNotMatch(await (async () => (await (await titlesApi.onRequestPost({ env: { DB }, request: req("youtube-titles", { idea: { idea: "x" } }, "token-b") })).json()).prompt)(), /APPROVED TITLE A|TITLES UNDER 50/, "learning stays with its client");

console.log("PASS content reviews: client-only submit with snapshot, operator-only decisions, one decision per review, approved packages as examples, rejection reasons as rules, tenant isolation.");

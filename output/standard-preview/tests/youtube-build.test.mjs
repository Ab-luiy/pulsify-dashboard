// Growth #18: YouTube "build the video" (openings and outline). Real SQLite via a D1 wrapper; Anthropic mocked.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import * as buildApi from "../functions/api/youtube-build.js";
import { sanitizePlan } from "../functions/_shared/youtube-build.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT DEFAULT 'active');
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES (?,?,?),(?,?,?)")
  .run("a", "Alpha Trades", await sha256Hex("token-a"), "b", "Beta", await sha256Hex("token-b"));
sql.prepare("INSERT INTO client_brain VALUES (1,?,?,?,?,?,?)").run("a", "offer", "unique_mechanism", '"THE ONE-RULE METHOD"', "operator", "2026-09-20");
sql.prepare("INSERT INTO proof_items VALUES (1,?,?,?,?,?,?)").run("a", "image", "", "SAM WEEK 6 PAYOUT", "granted", "2026-09-20");
sql.prepare("INSERT INTO proof_items VALUES (2,?,?,?,?,?,?)").run("a", "image", "", "UNCONFIRMED RESULT", "unknown", "2026-09-20");
sql.prepare("INSERT INTO client_brain VALUES (2,?,?,?,?,?,?)").run("b", "offer", "unique_mechanism", '"PRIVATE BETA METHOD"', "operator", "2026-09-20");

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
const video = { idea: "My one risk rule on a Miro board", title: "THE ONE RISK RULE BEHIND EVERY FUNDED STUDENT", thumbnail_text: "no more blown accounts", funnel: "tof", format: "miro" };
const answers = [{ id: "authority", question: "Why should they believe you?", answer: "EIGHT STUDENTS FUNDED THIS YEAR" }];
const post = (env, body, token = "token-a") => buildApi.onRequestPost({
  env,
  request: new Request("https://test/api/youtube-build", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": token }, body: JSON.stringify(body) }),
});

assert.equal((await post({ DB }, { video, answers }, "wrong")).status, 401);
assert.equal((await post({ DB }, { video: { idea: "x" }, answers })).status, 422, "a title is required");

let body = await (await post({ DB }, { video, answers, next_step: "call" })).json();
assert.equal(body.mode, "manual");
assert.match(body.prompt, /THE ONE RISK RULE BEHIND EVERY FUNDED STUDENT/);
assert.match(body.prompt, /EIGHT STUDENTS FUNDED THIS YEAR/);
assert.match(body.prompt, /THE ONE-RULE METHOD/, "their method is in the prompt");
assert.match(body.prompt, /SAM WEEK 6 PAYOUT/, "granted proof is in the prompt");
assert.doesNotMatch(body.prompt, /UNCONFIRMED RESULT/, "proof without permission is left out");
assert.doesNotMatch(body.prompt, /PRIVATE BETA METHOD/, "another client's brain never leaks");
assert.match(body.prompt, /Funnel stage: TOF/);
assert.match(body.prompt, /book a call/);
assert.match(body.prompt, /never makes a hard pitch/);
assert.match(body.prompt, /Problem → Struggle → Discovery → Result/, "the YouTube method is bundled");

body = await (await post({ DB }, { video, answers, next_step: "teleport" })).json();
assert.match(body.prompt, /watch the next video/, "unknown next steps fall back to the open loop");

const realFetch = globalThis.fetch;
let reply;
globalThis.fetch = async () => new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: reply }] }), { status: 200 });
try {
  reply = JSON.stringify({
    openings: [{ confirm: "This is the one rule.", authority: "Eight students funded.", open_loop: "The mistake at the end." }, { authority: "no confirm, dropped" }],
    outline: [
      { beat: "problem", heading: "Why accounts blow", points: ["Sizing from the target", ""], cue: "camera" },
      { beat: "epilogue", heading: "dropped" },
      { beat: "discovery", heading: "The rule", points: ["Size from the stop"], cue: "hologram" },
    ],
    resolves_loop: "The rule",
    close: { payoff: "One rule.", next_step: "Watch the breakdown next." },
  });
  body = await (await post({ DB, ANTHROPIC_API_KEY: "k" }, { video, answers })).json();
  assert.equal(body.mode, "generated");
  assert.equal(body.plan.openings.length, 1);
  assert.equal(body.plan.outline.length, 2, "sections without a known beat are dropped");
  assert.deepEqual(body.plan.outline[0].points, ["Sizing from the target"]);
  assert.equal(body.plan.outline[1].cue, "camera", "unknown cues fall back");
  assert.equal(body.plan.resolves_loop, "The rule");

  reply = JSON.stringify({ openings: [], outline: [] });
  body = await (await post({ DB, ANTHROPIC_API_KEY: "k" }, { video, answers })).json();
  assert.equal(body.mode, "manual", "an empty plan falls back to the copy-paste prompt");
} finally {
  globalThis.fetch = realFetch;
}

assert.deepEqual(sanitizePlan(null).openings, []);
console.log("PASS youtube build: client auth, title required, video, answers, method and granted proof in the prompt, tenant isolation, next-step fallback, Opus switch, cleaning, empty fallback. Anthropic mocked.");

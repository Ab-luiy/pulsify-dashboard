// Growth #18: YouTube title and thumbnail pairs. Real SQLite through a D1-shaped wrapper; Anthropic mocked.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import * as titlesApi from "../functions/api/youtube-titles.js";
import { sanitizePairs } from "../functions/_shared/youtube-titles.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT DEFAULT 'active');
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES (?,?,?),(?,?,?)")
  .run("a", "Alpha Trades", await sha256Hex("token-a"), "b", "Beta", await sha256Hex("token-b"));
sql.prepare("INSERT INTO proof_items VALUES (1,?,?,?,?,?,?)").run("a", "image", "", "STUDENT PAYOUT WEEK 6", "granted", "2026-09-20");
sql.prepare("INSERT INTO proof_items VALUES (2,?,?,?,?,?,?)").run("b", "image", "", "PRIVATE BETA RESULT", "granted", "2026-09-20");

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
const idea = { idea: "MY ONE RISK RULE ON A MIRO BOARD", working_title: "the one risk rule", why: "shows the method", bucket: "breakdown" };
const answers = [{ id: "proof", question: "What result does this video show?", answer: "SAM PASSED HIS FUNDED CHALLENGE" }];
const post = (env, body, token = "token-a") => titlesApi.onRequestPost({
  env,
  request: new Request("https://test/api/youtube-titles", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": token }, body: JSON.stringify(body) }),
});

assert.equal((await post({ DB }, { idea, answers }, "wrong")).status, 401);
assert.equal((await post({ DB }, { idea: {}, answers })).status, 422, "an idea is required");

let body = await (await post({ DB }, { idea, answers, layout: "board" })).json();
assert.equal(body.mode, "manual");
assert.match(body.prompt, /MY ONE RISK RULE ON A MIRO BOARD/);
assert.match(body.prompt, /SAM PASSED HIS FUNDED CHALLENGE/);
assert.match(body.prompt, /STUDENT PAYOUT WEEK 6/, "the proof vault is in the prompt");
assert.match(body.prompt, /Pattern B, board breakdown/);
assert.match(body.prompt, /yellow bar survives on Pattern B only/i, "the layout rules are bundled");
assert.match(body.prompt, /never invent one/, "titles take numbers only from real facts");
assert.match(body.prompt, /TITLE METHOD \(the Pulsify title bank/, "titles follow the title voice bank (founder 2026-10-28)");
assert.match(body.prompt, /FACTS \(Pulsify rule for every piece of content\)/, "every Create prompt carries the facts rule");
assert.doesNotMatch(body.prompt, /PRIVATE BETA RESULT/, "another client's proof never leaks");

body = await (await post({ DB }, { idea, answers, layout: "hologram" })).json();
assert.match(body.prompt, /not chosen yet/, "an unknown layout is ignored");

const realFetch = globalThis.fetch;
let reply;
globalThis.fetch = async () => new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: reply }] }), { status: 200 });
try {
  reply = JSON.stringify({ pairs: [
    { title: "the one risk rule behind every funded student", core: "one risk rule", formula: "c", thumbnail_text: "ONE RULE", frame: "me at the board", why: "board shows it" },
    { title: "", thumbnail_text: "dropped" },
    { title: "don't add another strategy, fix your risk", formula: "Z" },
  ] });
  body = await (await post({ DB, ANTHROPIC_API_KEY: "k" }, { idea, answers, layout: "board" })).json();
  assert.equal(body.mode, "generated");
  assert.equal(body.pairs.length, 2, "pairs without a title are dropped");
  assert.equal(body.pairs[0].formula, "C");
  assert.equal(body.pairs[1].formula, "", "unknown formulas are blanked");

  reply = "no json here";
  body = await (await post({ DB, ANTHROPIC_API_KEY: "k" }, { idea, answers })).json();
  assert.equal(body.mode, "manual");
  assert.match(body.warning, /unreadable/);
} finally {
  globalThis.fetch = realFetch;
}

assert.deepEqual(sanitizePairs(undefined), []);
console.log("PASS youtube titles: client auth, idea required, idea, answers, proof and layout rules in the prompt, tenant isolation, Opus switch, cleaning, unreadable fallback. Anthropic mocked.");

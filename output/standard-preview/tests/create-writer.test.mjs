// Founder 2026-10-28: every Create writer on Jane's writer, the number check everywhere, unscripted reels,
// the title bank for YouTube. Real SQLite through a D1-shaped wrapper; Gemini mocked at fetch.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { checkCreateNumbers, resolveCreateAi, writerFailure, NUMBER_SLOT } from "../functions/_shared/create-writer.js";
import { resolveJaneAi } from "../functions/_shared/jane-provider.js";
import { allowanceFor } from "../functions/_shared/ai-guard.js";
import { generateText } from "../functions/_shared/ai-provider.js";
import { methodFor } from "../functions/_shared/copy-brain.js";
import { EXEMPLARS } from "../functions/_shared/copy-exemplars.js";
import { sha256Hex } from "../functions/_shared/common.js";
import * as storiesApi from "../functions/api/studio-generate.js";
import * as titlesApi from "../functions/api/youtube-titles.js";
import * as copywriterApi from "../functions/api/copywriter.js";

const JANE = { JANE_GEMINI_API_KEY: "synthetic-secret", JANE_GEMINI_MODEL: "gemini-test", JANE_GEMINI_FREE_VERIFIED: "true" };

test("invented results become a visible slot; real figures and craft numbers stay", () => {
  const sources = ["Proof: my student Sam made $22,410 in his first funded month. 7 funded accounts. I teach the 200 EMA pullback."];
  const { output, numbers } = checkCreateNumbers({
    slides: [
      { n: 1, job: "hook", text_pills: ["Student Chad passed the $100k prop firm challenge in just 4 weeks", "+$2k in a day"] },
      { n: 2, job: "proof", text_pills: ["Sam made $22,410 in his first funded month", "7 funded accounts"] },
      { n: 3, job: "method", text_pills: ["the 200 EMA pullback on the 15 minute chart", "wait for the 50% retracement", "risk 1:2 at the 9:30 open", "same size for 24 hours"] },
      { n: 4, job: "claims", text_pills: ["40% more reach", "40 students joined", "results in 14 days", "in 2026"] },
    ],
    layout: "split 300",
  }, sources);
  assert.deepEqual(output.slides[0].text_pills, [`Student Chad passed the ${NUMBER_SLOT} prop firm challenge in just 4 weeks`, `+${NUMBER_SLOT} in a day`]);
  assert.deepEqual(output.slides[1].text_pills, ["Sam made $22,410 in his first funded month", "7 funded accounts"], "real proof is kept");
  assert.deepEqual(output.slides[2].text_pills, ["the 200 EMA pullback on the 15 minute chart", "wait for the 50% retracement", "risk 1:2 at the 9:30 open", "same size for 24 hours"], "craft numbers, times and rules are not results");
  assert.deepEqual(output.slides[3].text_pills, [`${NUMBER_SLOT} more reach`, `${NUMBER_SLOT} students joined`, `results in ${NUMBER_SLOT} days`, "in 2026"]);
  assert.equal(output.layout, "split 300", "labels the app reads are never touched");
  assert.deepEqual(numbers.sort(), ["$100k", "$2k", "14", "40", "40%"].sort());
  assert.equal(checkCreateNumbers("Made $27,000 last month", ["made 27k"]).output, "Made $27,000 last month", "the same value written another way is real");
  // Figures written as words are checked too (the real Gemini story wrote "twenty trading days").
  assert.equal(checkCreateNumbers("he kept his daily drawdown under one percent for twenty trading days straight", []).output,
    `he kept his daily drawdown under ${NUMBER_SLOT} for ${NUMBER_SLOT} trading days straight`);
  assert.equal(checkCreateNumbers("twenty students joined", ["We have twenty students"]).output, "20 students joined", "a real figure in words is real");
  assert.equal(checkCreateNumbers("the one rule, two steps and five setups", []).output, "the one rule, two steps and five setups");
  assert.equal(checkCreateNumbers("40 percent more reach, risk 0.5 percent per trade", []).output, `${NUMBER_SLOT} more reach, risk 0.5% per trade`);
});

test("Create runs on Jane's Gemini but keeps its own daily counter; Jane chat keeps hers", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({}));
  const create = await resolveCreateAi(JANE, "a");
  assert.equal(create.janeGemini, true);
  assert.equal(create.model, "gemini-test");
  assert.deepEqual(allowanceFor(JANE, create), { kind: "ai", cap: 8 });
  assert.deepEqual(allowanceFor(JANE, await resolveJaneAi(JANE, "a")), { kind: "jane", cap: 30 });
  assert.ok(!JSON.stringify(create).includes("synthetic-secret"));
  // Preview deployments have no Jane settings and keep the shared switch.
  assert.equal((await resolveCreateAi({ AI: { run() {} } }, "a")).mode, "workers");
});

test("a Create JSON request reaches Gemini in JSON mode with the humanizer rules", async (t) => {
  let payload, url;
  t.mock.method(globalThis, "fetch", async (address, init) => {
    if (!init?.method) return Response.json({});
    url = String(address); payload = JSON.parse(init.body);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"ok":true}' }] } }] });
  });
  const ai = await resolveCreateAi(JANE, "a");
  assert.equal(await generateText({ system: "rules", user: "write" }, ai, { json: true }), '{"ok":true}');
  assert.match(url, /generativelanguage\.googleapis\.com.*gemini-test/);
  assert.equal(payload.generationConfig.responseMimeType, "application/json");
  assert.match(JSON.stringify(payload.systemInstruction), /rules/);
  assert.equal(ai.calls.at(-1).stage, "create");
});

test("a spent free quota reaches the client in plain words, never provider text", () => {
  const limit = Object.assign(new Error("Every free model has reached its limit for now."), { code: "GEMINI_LIMIT" });
  assert.deepEqual(writerFailure(limit), { status: 429, body: { ok: false, error: limit.message, limit: true } });
  assert.equal(writerFailure(new Error("other")), null);
});

test("reels are unscripted: hooks and talking points, never a script to read (founder 2026-10-15)", () => {
  const guide = methodFor("reel");
  assert.match(guide, /unscripted/);
  assert.match(guide, /Never write a word-for-word script/);
  assert.match(guide, /Talk about:/);
  assert.doesNotMatch(guide, /90 to 130 words/);
  assert.match(EXEMPLARS.reel, /Hooks:\n1\./);
  assert.match(EXEMPLARS.reel, /Talk about:\n- /);
  assert.doesNotMatch(EXEMPLARS.reel, /^Hook: /m);
});

// ---- the writers themselves, on Jane's Gemini ----

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT DEFAULT 'active', page_content_json TEXT);
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);
CREATE TABLE client_dashboard_content(client_id TEXT, section TEXT, json TEXT);
CREATE TABLE usage_counters(client TEXT, kind TEXT, day TEXT, count INTEGER, PRIMARY KEY(client, kind, day));
CREATE TABLE studio_sequences(id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT, type TEXT, intent TEXT, topic TEXT, goal TEXT, trigger_word TEXT, params_json TEXT, output_json TEXT, manual_prompt TEXT, status TEXT, review_note TEXT, created_at TEXT, updated_at TEXT);`);
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES (?,?,?)").run("a", "Alpha Trades", await sha256Hex("token-a"));
sql.prepare("INSERT INTO client_brain VALUES (1,?,?,?,?,?,?)").run("a", "identity", "niche", JSON.stringify("trading"), "test", "2026-10-28");
sql.prepare("INSERT INTO proof_items VALUES (1,?,?,?,?,?,?)").run("a", "image", "", "Sam made $22,410 in his first funded month", "granted", "2026-10-28");
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
const env = { DB, ...JANE };
const call = (api, path, body) => api.onRequestPost({ env, request: new Request(`https://test${path}`, { method: "POST", headers: { "content-type": "application/json", "x-portal-token": "token-a" }, body: JSON.stringify(body) }) });

function gemini(t, reply) {
  const sent = [];
  t.mock.method(globalThis, "fetch", async (address, init) => {
    if (!init?.method) return Response.json({});
    sent.push({ url: String(address), body: JSON.parse(init.body) });
    const text = typeof reply === "function" ? reply() : reply;
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] });
  });
  return sent;
}

test("a story is written by Jane's Gemini, invented numbers are slotted before it is saved", async (t) => {
  const sent = gemini(t, JSON.stringify({ type: "credibility", slides: [
    { n: 1, job: "hook", text_pills: ["Student Chad passed the $100k challenge"], emphasis: "", photo: { primary: "desk", alternative: "" }, interactive: "none" },
    { n: 2, job: "proof", text_pills: ["Sam made $22,410 in his first funded month"], emphasis: "", photo: { primary: "screen", alternative: "" }, interactive: "none" },
  ] }));
  const response = await call(storiesApi, "/api/studio-generate", { type: "credibility", topic: "my funded students", goal: "dms", slide_count: 2 });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.provider, "gemini");
  assert.match(sent[0].url, /generativelanguage\.googleapis\.com/);
  assert.match(JSON.stringify(sent[0].body.systemInstruction), /FACTS \(Pulsify rule for every piece of content\)/);
  const pills = body.output.slides.flatMap((slide) => slide.text_pills);
  assert.ok(pills.includes(`Student Chad passed the ${NUMBER_SLOT} challenge`), pills.join(" | "));
  assert.ok(pills.includes("Sam made $22,410 in his first funded month"));
  assert.deepEqual(body.checks.numbers, ["$100k"]);
  const saved = sql.prepare("SELECT output_json FROM studio_sequences WHERE id=?").get(body.id);
  assert.doesNotMatch(saved.output_json, /\$100k/, "the saved story never carries the invented figure");
  assert.equal(sql.prepare("SELECT count FROM usage_counters WHERE client='a' AND kind='ai'").get()?.count, 1, "counted on the Create allowance");
});

test("YouTube titles use the title bank in the client's niche and never carry an invented number", async (t) => {
  const sent = gemini(t, JSON.stringify({ pairs: [
    { title: "how sam made $22,410 in one funded month (proof)", core: "sam's funded month", formula: "A", thumbnail_text: "first payout", frame: "screen", why: "real proof" },
    { title: "how i made $50k in 30 days (step by step)", core: "made in days", formula: "E", thumbnail_text: "", frame: "board", why: "" },
  ] }));
  const body = await (await call(titlesApi, "/api/youtube-titles", { idea: { idea: "my risk rule" }, answers: [], layout: "screen" })).json();
  assert.equal(body.mode, "generated");
  const system = JSON.stringify(sent[0].body.systemInstruction);
  assert.match(system, /TITLE METHOD \(the Pulsify title bank/);
  assert.match(system, /price action setup/, "trading examples from the title bank");
  assert.doesNotMatch(system, /tiktok shop commission/, "not another niche's examples");
  assert.equal(body.pairs[0].title, "how sam made $22,410 in one funded month (proof)");
  assert.equal(body.pairs[1].title, `how i made ${NUMBER_SLOT} in ${NUMBER_SLOT} days (step by step)`);
});

test("a reel from Create comes back as hooks and talking points, with the number check", async (t) => {
  const sent = gemini(t, "Hooks:\n1. My students stopped revenge trading.\nTalk about:\n- 90% of my students fixed it in 2 weeks\nShow: the chart\nEnd with: follow for more\nCaption: One rule.");
  const body = await (await call(copywriterApi, "/api/copywriter", { format: "Reel", action: "draft", brief: "A reel about revenge trading. Don't script it." })).json();
  assert.equal(body.mode, "generated");
  const system = JSON.stringify(sent[0].body.systemInstruction);
  assert.match(system, /reels are never a word-for-word script/);
  assert.match(system, /Reels are filmed unscripted/);
  assert.match(body.output, new RegExp(`- ${NUMBER_SLOT.replace(/[[\]]/g, "\\$&")} of my students fixed it in 2 weeks`));
  assert.deepEqual(body.checks.numbers, ["90%"]);
});

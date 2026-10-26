// Ticket #78 prerequisite: the per-client daily AI allowance and the output number check.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolveAi, generateText } from "../functions/_shared/ai-provider.js";
import { AI_DAILY_CAP, JANE_DAILY_CAP, AiAllowanceError, allowanceFor, allowanceLeft, attachGuard, enforceAllowance, figuresIn, findUnsupportedNumbers } from "../functions/_shared/ai-guard.js";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(new URL("../migrations/0059_usage_counters.sql", import.meta.url), "utf8"));
sql.exec("CREATE TABLE integrations(scope TEXT,client_id TEXT,provider TEXT,secret_json TEXT,config_json TEXT)");
const DB = { prepare(query) { let args = []; const p = { bind(...a) { args = a; return p; }, async first() { return sql.prepare(query).get(...args) || null; }, async all() { return { results: sql.prepare(query).all(...args) }; }, async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes } }; } }; return p; } };
let calls = 0;
const AI = { run: async () => { calls += 1; return { response: "ok", choices: [{ message: { content: "ok" } }] }; } };
const env = { DB, AI };

// The cap counts generations per client per day and stops the next one with a plain message.
const ai = await resolveAi(env, "client-a");
assert.equal(ai.source, "platform");
assert.deepEqual(Object.keys(ai).includes("guard"), false, "the guard is invisible to logs and JSON");
for (let i = 0; i < AI_DAILY_CAP; i += 1) await generateText({ system: "s", user: "u" }, ai);
assert.equal(calls, AI_DAILY_CAP);
await assert.rejects(() => generateText({ system: "s", user: "u" }, ai), (error) => error instanceof AiAllowanceError && error.code === "AI_ALLOWANCE" && /resets tomorrow/.test(error.message) && error.status === 429);
assert.equal(calls, AI_DAILY_CAP, "a refused generation never reaches the model");
assert.equal(await allowanceLeft(env, ai, "client-a"), 0);

// One client cannot use another client's day.
const other = await resolveAi(env, "client-b");
await generateText({ system: "s", user: "u" }, other);
assert.equal(await allowanceLeft(env, other, "client-b"), AI_DAILY_CAP - 1);

// Small helper calls can opt out of the count.
await generateText({ system: "s", user: "u" }, ai, { uncounted: true });

// The cap is configurable and a client with their own AI is never limited.
const tight = await resolveAi({ ...env, AI_DAILY_CAP: "1" }, "client-c");
await generateText({ system: "s", user: "u" }, tight);
await assert.rejects(() => generateText({ system: "s", user: "u" }, tight), /allowance/);
const own = { mode: "anthropic", apiKey: "k", source: "client" };
assert.equal(await allowanceLeft(env, own, "client-a"), null);

// Jane's Gemini chat has her own counter of 30 messages a day and never spends the Workers AI writers' allowance.
assert.equal(JANE_DAILY_CAP, 30);
const jane = attachGuard({ mode: "gemini", source: "platform", janeGemini: true }, env, "client-d");
for (let i = 0; i < JANE_DAILY_CAP; i += 1) await enforceAllowance(jane);
await assert.rejects(() => enforceAllowance(jane), (error) => error instanceof AiAllowanceError);
assert.equal(await allowanceLeft(env, jane, "client-d"), 0);
assert.equal(await allowanceLeft(env, await resolveAi(env, "client-d"), "client-d"), AI_DAILY_CAP, "Jane's messages leave the writers' allowance alone");
assert.deepEqual(allowanceFor({ JANE_DAILY_CAP: "5" }, jane), { kind: "jane", cap: 5 });
assert.deepEqual(allowanceFor({ AI_DAILY_CAP: "5" }, jane), { kind: "jane", cap: JANE_DAILY_CAP }, "the writers' setting does not change Jane's");

// Number check.
assert.deepEqual(figuresIn("$12,000 a month, up 40% and 2.5x, 12k followers").map((f) => f.value), [12000, 40, 2.5, 12000]);
const proof = "Rio went from $4,000 to $12k a month in 90 days. 3 videos a week.";
assert.deepEqual(findUnsupportedNumbers("Rio reached $12,000 a month in 90 days with 3 videos a week.", [proof]), []);
assert.deepEqual(findUnsupportedNumbers("Rio grew 340% and added 25,000 followers in 90 days.", [proof]), ["340%", "25,000"]);
assert.deepEqual(findUnsupportedNumbers("Here are 5 steps, started in 2024.", [proof]), [], "small counts and years are structure");
assert.deepEqual(findUnsupportedNumbers("Join 150 creators.", [proof]), ["150"]);
assert.deepEqual(findUnsupportedNumbers("Join 150 creators.", [proof, "The request mentions 150 creators."]), [], "figures in the request itself are allowed");
console.log("PASS ai guard: daily allowance per client, plain refusal, own-AI clients unlimited, opt-out for helpers, Jane's own 30-a-day counter, invented figures flagged.");

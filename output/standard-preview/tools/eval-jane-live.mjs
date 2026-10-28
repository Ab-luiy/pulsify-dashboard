// Live check of Jane end to end: the real copy-chat handler, real free Gemini, a synthetic SQLite client only.
// Replaces the Workers-only eval-jane.mjs and eval-jane-agent.mjs (2026-10-27, when Jane moved to the AI SDK).
// node tools/eval-jane-live.mjs --out ABSOLUTE.json [--env PATH_TO_BRAIN_ENV] [--case funnel|story|recall ...]
// Reads JANE_GEMINI_API_KEY from the Brain .env (never printed). Spaced to stay under 15 requests a minute.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import * as chat from "../functions/api/copy-chat.js";
import { sha256Hex } from "../functions/_shared/common.js";

const arg = (name, fallback = "") => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const out = arg("--out");
if (!path.isAbsolute(out)) throw Error("Pass an absolute --out path.");
const root = new URL("..", import.meta.url);
const envFile = arg("--env", new URL("../../../.env", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const key = /^JANE_GEMINI_API_KEY=(.+)$/m.exec(fs.readFileSync(envFile, "utf8"))?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!key) throw Error("No JANE_GEMINI_API_KEY in the env file.");
const only = process.argv.flatMap((value, index) => process.argv[index - 1] === "--case" ? [value] : []);

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT);
  CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
  CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
for (const name of ["0012_client_dashboard_studio.sql", "0018_studio_carousels.sql", "0042_studio_feedback.sql", "0053_copy_chat.sql", "0059_usage_counters.sql", "0083_jane_documents.sql", "0084_jane_learnings.sql"]) {
  sql.exec(fs.readFileSync(new URL(`migrations/${name}`, root), "utf8"));
}
const insert = (table, values) => sql.prepare(`INSERT INTO ${table} (${Object.keys(values).join(",")}) VALUES (${Object.keys(values).map(() => "?").join(",")})`).run(...Object.values(values));
const DB = { prepare(query) { let args = []; const statement = { bind(...values) { args = values; return statement; },
  async all() { return { results: sql.prepare(query).all(...args) }; }, async first() { return sql.prepare(query).get(...args) || null; },
  async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }; } }; return statement; },
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); } };

insert("client_config", { client: "qa", client_name: "QA Trader", portal_token_hash: await sha256Hex("token-qa"), status: "active" });
[["identity", "name", "Sam"], ["identity", "niche", "trading"],
  ["identity", "craft", "I teach full-time workers to journal their futures trades and follow strict risk rules."],
  ["icp", "who", "New futures traders with day jobs who overtrade after a losing day."],
  ["offer", "name", "Quiet Edge"], ["offer", "price", "$1,700"], ["offer", "promise", "A calmer decision process through journaling and risk rules. No profit promises."],
  ["program", "delivery", "Thursday group journal review and async feedback. No weekend calls."],
  ["funnel", "cta", "Viewers DM the word JOURNAL, then book a call."],
  ["content", "youtube", "2 videos a week. Last 8 videos average 1,900 views. 3 calls booked from YouTube last month."],
  ["voice", "tone", "Calm, direct, plain English. No hype."],
  ["donot", "claims", "No verified student income results yet. Never invent testimonials."],
].forEach(([section, field, value], i) => insert("client_brain", { id: i + 1, client_id: "qa", section, field, value_json: JSON.stringify(value), updated_at: "2026-10-25" }));
insert("copy_chats", { client_id: "qa", title: "Launch decisions", created_at: "2026-10-20", updated_at: "2026-10-20" });
insert("copy_messages", { chat_id: 1, client_id: "qa", role: "user", content: "We decided the signup keyword is CEDAR. No weekend calls, ever.", created_at: "2026-10-20" });
insert("copy_messages", { chat_id: 1, client_id: "qa", role: "assistant", content: "Noted: CEDAR, and calls only on weekdays.", created_at: "2026-10-20" });

const env = { DB, JANE_GEMINI_API_KEY: key, JANE_GEMINI_MODEL: "gemini-3.5-flash-lite", JANE_GEMINI_FALLBACK_MODELS: "gemini-3.1-flash-lite", JANE_GEMINI_FREE_VERIFIED: "true" };
const CASES = [
  { id: "funnel", message: "People watch my videos but almost nobody books a call. What should I fix first?",
    check: (text) => ({ uses_their_numbers: /1,900|3 calls/.test(text), no_invented_income: !/\$\d{2},?\d{3}/.test(text) }) },
  { id: "story", message: "Write me a short story sequence about why journaling beats more screen time.", format: "story",
    check: (text) => ({ slides: /slide\s*\d/i.test(text), their_dm_word: /JOURNAL/.test(text), no_testimonial: !/student made|testimonial/i.test(text) }) },
  { id: "recall", message: "Remind me, what did we decide about the signup keyword and weekend calls?",
    check: (text) => ({ found_cedar: /CEDAR/.test(text), weekends: /weekend/i.test(text) }) },
].filter((item) => !only.length || only.includes(item.id));

const results = [];
for (const [index, item] of CASES.entries()) {
  if (index) await new Promise((resolve) => setTimeout(resolve, 25000));
  const started = Date.now();
  const pending = [];
  const response = await chat.onRequestPost({ env, waitUntil: (value) => pending.push(value), request: new Request("https://test/api/copy-chat", {
    method: "POST", headers: { "content-type": "application/json", "x-portal-token": "token-qa" }, body: JSON.stringify({ action: "send", message: item.message, format: item.format }) }) });
  const raw = await response.text();
  await Promise.allSettled(pending);
  const events = [...raw.matchAll(/event: (\w+)\ndata: (.*)\n/g)].map(([, event, data]) => ({ event, data: JSON.parse(data) }));
  const text = events.filter((e) => e.event === "delta").map((e) => e.data.text).join("");
  const stats = events.filter((e) => e.event === "stats").at(-1)?.data;
  const row = { id: item.id, message: item.message, seconds: Math.round((Date.now() - started) / 1000),
    stages: events.filter((e) => e.event === "status").map((e) => e.data.stage), lookups: events.filter((e) => e.event === "lookup").map((e) => e.data.area || e.data.tool),
    playbooks: events.find((e) => e.event === "meta")?.data?.grounding?.playbooks, research: events.find((e) => e.event === "done")?.data?.grounding,
    calls: stats?.calls?.map((call) => `${call.stage}:${call.model}:${call.input_tokens}/${call.output_tokens}`), fallbacks: stats?.fallbacks,
    error: events.find((e) => e.event === "error")?.data?.error, checks: item.check(text), text };
  results.push(row);
  console.log(`${row.id}: ${row.seconds}s, ${row.stages.join(" > ")}, lookups ${row.lookups.join(", ") || "none"}, checks ${JSON.stringify(row.checks)}, ${row.error || "ok"}`);
}
fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), synthetic_only: true, results }, null, 2));

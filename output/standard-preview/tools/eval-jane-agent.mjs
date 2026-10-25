// Real Cloudflare lookup+writer evaluation, synthetic SQLite workspace only.
// node tools/eval-jane-agent.mjs --out ABSOLUTE_PATH [--case ID] [--writer-model MODEL]
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createJaneTools, gatherJaneContext, extractJaneMemory, JANE_LOOKUP_MODEL } from "../functions/_shared/copy-agent.ts";
import { buildJaneBrainContext } from "../functions/_shared/client-brain-context.js";
import { buildCopySystem, plainReplyChunks } from "../functions/_shared/copy-brain.js";
import { retrieveCopyKnowledge } from "../functions/_shared/copy-knowledge.js";
import { streamText } from "../functions/_shared/ai-provider.js";
import { WORKERS_AI_MODEL } from "../functions/_shared/workers-ai.js";
import { scrubSources } from "../functions/_shared/source-scrub.js";

const arg = (key, fallback = "") => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
const out = arg("--out");
if (!path.isAbsolute(out)) throw Error("Pass an absolute --out path.");
const cfg = fs.readFileSync(path.join(process.env.APPDATA, "xdg.config/.wrangler/config/default.toml"), "utf8");
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(cfg)?.[1];
if (!token) throw Error("Existing Wrangler authentication unavailable.");
const model = arg("--writer-model", WORKERS_AI_MODEL);
const calls = [];
const binding = { async run(chosen, payload) {
  const started = Date.now();
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/437f6dfbb738a4267395bd5da251494a/ai/run/${chosen}`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Error(`Cloudflare ${response.status}: ${String(error.errors?.[0]?.message || "inference failed").slice(0, 200)}`);
  }
  calls.push({ model: chosen, kind: payload.stream ? "writer" : payload.messages[0].content.startsWith("Jane memory") ? "memory" : "lookup", elapsed_to_response_ms: Date.now() - started });
  return payload.stream ? response.body : (await response.json()).result;
} };

const sql = new DatabaseSync(":memory:");
for (const file of ["0012_client_dashboard_studio.sql", "0018_studio_carousels.sql", "0053_copy_chat.sql"]) sql.exec(fs.readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
sql.exec(`INSERT INTO copy_chats VALUES(1,'qa','Earlier launch','general','2026-10-20','2026-10-20');
  INSERT INTO copy_messages(chat_id,client_id,role,content,created_at) VALUES(1,'qa','user','We decided the signup keyword is CEDAR. No weekend calls.','2026-10-20');
  INSERT INTO copy_messages(chat_id,client_id,role,content,created_at) VALUES(1,'qa','assistant','I assume your offer guarantees $20,000.','2026-10-20');
  INSERT INTO copy_chats VALUES(2,'other','Other private launch','general','2026-10-20','2026-10-20');
  INSERT INTO copy_messages(chat_id,client_id,role,content,created_at) VALUES(2,'other','user','Our launch keyword is PINE. OTHER_PRIVATE_DATA.','2026-10-20');
  INSERT INTO studio_sequences(client_id,topic,params_json,output_json,created_at,updated_at) VALUES('qa','Journal launch','{}','{"slides":[{"text":"Your trading journal is a trophy shelf."},{"text":"Write down what made you enter, before judging the outcome."},{"text":"Change one rule, not the whole setup."}]}','2026-10-24','2026-10-24');`);
const DB = { prepare(query) { let args = []; const statement = { bind(...value) { args = value; return statement; },
  async all() { return { results: sql.prepare(query).all(...args) }; }, async first() { return sql.prepare(query).get(...args) || null; } }; return statement; } };
const row = (section, field, value) => ({ section, field, value_json: JSON.stringify(value), updated_at: "2026-10-25" });
const brainData = { rows: [row("identity", "name", "QA Trader"), row("identity", "craft", "I teach full-time workers to journal futures trades and follow risk rules."),
  row("offer", "name", "Quiet Edge"), row("offer", "price", "$1700"), row("program", "delivery", "Thursday group journal review and async feedback. No weekend calls."),
  row("voice", "tone", "Calm, direct, plain English. No hype."), row("donot", "claims", "No verified student income results. Never invent testimonials."), row("money", "budget", "No paid ads budget. Income is private.")], proof_items: [] };
const cases = [
  { id: "earlier-chat", message: "What signup keyword did we settle on in my earlier chat? Check it, please. Just the keyword and the weekend-call decision.",
    check: (text, lookup) => ({ keyword: /CEDAR/.test(text), weekends: /no weekend|weekends?.*(?:none|no)/i.test(text), tool_used: lookup.results.some((entry) => entry.tool === "search_history"), no_other_client: !/PINE|OTHER_PRIVATE_DATA/.test(text) }) },
  { id: "saved-draft", message: "Open my saved Journal launch story. The trophy shelf line is too harsh. Give me two calmer replacements for just that opening. Keep the rest as it is.",
    check: (text, lookup) => ({ read_actual_draft: lookup.results.some((entry) => entry.tool === "read_draft" && entry.result.includes("trophy shelf")), partial_edit: text.split(/\s+/).length < 130, alternatives: /(?:1[.)]|option 1|first)/i.test(text), no_fake_income: !/20,?000/.test(text) }) },
  { id: "conversation", message: "People watch my videos, but almost nobody books. Don't write anything yet. Talk it through with me, give me two possible causes, then ask one useful question.",
    check: (text) => ({ one_question: (text.match(/\?/g) || []).length === 1, no_unrequested_script: !/slide 1|subject:/i.test(text), practical: /call|book|offer|proof|audience|trust/i.test(text) }) },
  { id: "depth", message: "Explain a useful plan for a futures trader who teaches journaling and has no student income proof yet. Around 250 words, with concrete things to film and how they lead to a call. This is a private strategy discussion, not a finished post.",
    check: (text) => ({ developed: text.split(/\s+/).length >= 210, concrete: /screen|journal|trade|decision/i.test(text), no_fake_income: !/20,?000/.test(text) }) },
];
const report = { at: new Date().toISOString(), synthetic_only: true, writer_model: model, lookup_model: JANE_LOOKUP_MODEL, results: [] };
let limited = false;
for (const item of cases.filter((item) => !arg("--case") || item.id === arg("--case"))) {
  const started = Date.now(); const before = calls.length;
  try {
    const brain = buildJaneBrainContext(brainData, { query: item.message });
    const knowledge = retrieveCopyKnowledge({ query: item.message });
    const messages = [{ role: "user", content: item.message }];
    const lookup = await gatherJaneContext({ binding, tools: createJaneTools({ env: { DB }, client: "qa", brainData }), message: item.message, messages,
      currentContext: `${brain.prompt_text}\n${knowledge.prompt_text}` });
    const system = buildCopySystem({ client: { contextText: brain.prompt_text }, query: item.message, knowledge, toolContext: lookup.prompt_text });
    let text = "";
    for await (const chunk of plainReplyChunks(streamText({ system, messages }, { mode: "workers", model, binding }))) text += chunk;
    text = scrubSources(text).trim();
    const checks = item.check(text, lookup);
    report.results.push({ id: item.id, elapsed_ms: Date.now() - started, checks, passed: Object.values(checks).every(Boolean), lookup_status: lookup.status,
      lookups: lookup.results, model_calls: calls.slice(before), text });
    console.log(`${item.id}: ${Object.values(checks).every(Boolean) ? "passed" : "REVIEW"}, ${lookup.calls} lookups, ${text.split(/\s+/).length} words, ${Date.now() - started}ms`);
  } catch (error) {
    report.results.push({ id: item.id, error: error.message, passed: false });
    console.log(`${item.id}: ${error.message}`);
    if (/401|403|429|allocation|neurons|limit/i.test(error.message)) { limited = true; break; }
  }
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2));
}
if (!arg("--case") && !limited) {
  try {
    const message = "Actually, I prefer detailed replies from now on.";
    report.memory = await extractJaneMemory(binding, message, [{ id: 1, note: "I prefer short replies." }]);
    console.log(`memory: ${report.memory.length} explicit quote(s)`);
  } catch (error) { report.memory_error = error.message; }
}
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2));
if (report.results.some((item) => !item.passed)) process.exitCode = 1;

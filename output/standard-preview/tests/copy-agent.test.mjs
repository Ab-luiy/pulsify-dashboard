import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createJaneTools, gatherJaneContext, weighJaneEvidence, extractJaneMemory, JANE_AGENT_VERSION } from "../functions/_shared/copy-agent.ts";
import * as chat from "../functions/api/copy-chat.js";
import { sha256Hex } from "../functions/_shared/common.js";
import { mockJaneAi } from "./_jane-mock.mjs";

function fixture() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT);
    CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
    CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
  for (const name of ["0012_client_dashboard_studio.sql", "0018_studio_carousels.sql", "0042_studio_feedback.sql", "0053_copy_chat.sql", "0083_jane_documents.sql"]) sql.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
  const DB = { prepare(query) {
    let args = [];
    const statement = { bind(...values) { args = values; return statement; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }; } };
    return statement;
  }, async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); } };
  const insert = (table, values) => sql.prepare(`INSERT INTO ${table} (${Object.keys(values).join(",")}) VALUES (${Object.keys(values).map(() => "?").join(",")})`).run(...Object.values(values));
  const rows = [
    { section: "offer", field: "name", value_json: '"Quiet Edge"' },
    { section: "program", field: "delivery", value_json: JSON.stringify("Thursday group review. " + "Long neutral notes. ".repeat(700) + "Launch keyword JUNIPER.") },
    { section: "money", field: "budget", value_json: '"PRIVATE_MONEY"' },
    { section: "proof", field: "items", value_json: JSON.stringify([{ permission: "denied", claim: "DENIED_PROOF" }, { permission: "granted", claim: "GRANTED_PROOF" }]) },
  ];
  rows.forEach((row, i) => insert("client_brain", { ...row, id: i + 1, client_id: "a", updated_at: "2026-10-25" }));
  insert("client_brain", { id: 99, client_id: "b", section: "offer", field: "name", value_json: '"OTHER_CLIENT_SECRET"' });
  for (const client of ["a", "b"]) {
    insert("copy_chats", { client_id: client, title: `${client} launch decisions`, created_at: "2026-10-24", updated_at: "2026-10-24" });
    const id = Number(sql.prepare("SELECT max(id) id FROM copy_chats").get().id);
    insert("copy_messages", { chat_id: id, client_id: client, role: "user", content: client === "a" ? "Our launch keyword is JUNIPER, not RIVER." : "OTHER_CLIENT_SECRET JUNIPER", created_at: "2026-10-24" });
    insert("copy_messages", { chat_id: id, client_id: client, role: "assistant", content: client === "a" ? "JUNIPER draft with an ASSISTANT_GUESS." : "OTHER_CLIENT_SECRET draft", created_at: "2026-10-24" });
    for (const table of ["studio_sequences", "studio_carousels"]) insert(table, {
      client_id: client, topic: client === "a" ? "Journal launch" : "OTHER_CLIENT_SECRET Journal launch", goal: "book", params_json: '{"secret":"PARAM_SECRET"}',
      output_json: JSON.stringify({ slides: [{ text: client === "a" ? "Open your journal. BEFORE YOU CHANGE IT." : "OTHER_CLIENT_SECRET" }], manual_prompt: "PROMPT_SECRET" }),
      ...(table === "studio_carousels" ? { structure: "list" } : {}), created_at: "2026-10-24", updated_at: "2026-10-24",
    });
  }
  return { sql, DB, rows, insert, tools: createJaneTools({ env: { DB }, client: "a", brainData: { rows } }) };
}
const call = (tool, query = "", id = "") => ({ tool, query, id });
const inputFor = (c) => c.tool.startsWith("search_") ? { query: c.query } : c.tool === "read_workspace" ? { area: c.id } : { id: c.id, ...(c.query ? { focus: c.query } : {}) };
// A scripted planner on the AI SDK mock model: each step takes the next plan ({calls}) or throws a given Error.
const plans = (...values) => mockJaneAi(() => {
  const next = values.shift() ?? { calls: [] };
  if (next instanceof Error) throw next;
  return { calls: (next.calls || []).map((c) => ({ tool: c.tool, input: c.input ?? inputFor(c) })) };
}).ai;

test("tools recover long fields, filter denied proof and enforce the public-draft private-field boundary", async () => {
  const { tools, DB, rows } = fixture();
  assert.match(await tools.run(call("read_brain", "JUNIPER", "program/delivery")), /JUNIPER/);
  const proof = await tools.run(call("read_brain", "", "proof/items"));
  assert.match(proof, /GRANTED_PROOF/); assert.doesNotMatch(proof, /DENIED_PROOF/);
  assert.match(await tools.run(call("read_brain", "", "money/budget")), /PRIVATE_MONEY/);
  const publicTools = createJaneTools({ env: { DB }, client: "a", brainData: { rows }, publicDraft: true });
  assert.doesNotMatch(await publicTools.run(call("read_brain", "", "money/budget")), /PRIVATE_MONEY/);
  assert.doesNotMatch(await publicTools.run(call("search_brain", "PRIVATE_MONEY")), /PRIVATE_MONEY/);
});

test("history search reads user decisions across chats, excluding assistant guesses and other clients", async () => {
  const { tools } = fixture();
  const result = await tools.run(call("search_history", "launch keyword"));
  assert.match(result, /JUNIPER/);
  assert.doesNotMatch(result, /OTHER_CLIENT_SECRET|ASSISTANT_GUESS/);
  assert.doesNotMatch(await tools.run(call("search_history", "' OR 1=1 --")), /OTHER_CLIENT_SECRET/);
});

test("saved draft tools open real writing with typed scoped IDs and omit prompts, params and review notes", async () => {
  const { tools } = fixture();
  const found = JSON.parse(await tools.run(call("search_drafts", "Journal")));
  assert.ok(found.matches.some((row) => row.id === "story:1"));
  assert.ok(found.matches.some((row) => row.id === "carousel:1"));
  assert.match(await tools.run(call("read_draft", "", "story:1")), /BEFORE YOU CHANGE IT/);
  assert.doesNotMatch(JSON.stringify(found), /OTHER_CLIENT_SECRET|PARAM_SECRET|PROMPT_SECRET/);
  assert.match(await tools.run(call("read_draft", "", "story:2")), /not found/);
  assert.match(await tools.run(call("read_draft", "", "story:1 OR 1=1")), /Invalid/);
  assert.match(await tools.run(call("read_draft", "", "credentials:1")), /Invalid/);
});

test("service tools read only approved guide IDs and cannot read a vault path", async () => {
  const { tools } = fixture();
  const found = JSON.parse(await tools.run(call("search_knowledge", "pre-call no shows")));
  assert.ok(found.source_ids.includes("pre-call"));
  assert.match(await tools.run(call("read_knowledge", "confirmation", "pre-call")), /shared_method_not_client_facts/);
  assert.match(await tools.run(call("read_knowledge", "", "../../.env")), /not found/);
  assert.equal(await tools.run(call("execute_sql", "DELETE FROM copy_messages")), "Tool unavailable.");
});

test("lookup planner reads a search result, then opens the matching draft in a second step", async () => {
  const { tools } = fixture();
  let steps = 0;
  const events = [];
  const { ai } = mockJaneAi((request) => {
    steps++;
    // The model sees real Zod-typed tools, not a JSON plan format.
    assert.ok(request.tools.includes("search_drafts") && request.tools.includes("read_workspace"));
    if (steps === 1) return { calls: [{ tool: "search_drafts", input: { query: "Journal" } }] };
    if (steps === 2) { assert.match(request.user, /story:1/); return { calls: [{ tool: "read_draft", input: { id: "story:1" } }] }; }
    return "DONE";
  });
  const result = await gatherJaneContext({ ai, tools, message: "Improve my saved Journal launch", onLookup: async (value) => events.push(value) });
  // Deep by default: after reading the draft the planner gets one more step to decide it has checked enough.
  assert.equal(result.calls, 2); assert.equal(steps, 3); assert.equal(result.status, "ready");
  assert.doesNotMatch(result.results[1].result, /"error"/);
  assert.equal(result.brain_text, "", "saved draft claims do not become business evidence for the checker");
  assert.match(result.prompt_text, /BEFORE YOU CHANGE IT/); assert.equal(events.length, 2);
  assert.equal(ai.calls.length, 3, "every planner step is in the usage panel");
});

test("duplicates are not reread, a model-supplied client never crosses clients, an unknown tool stops the loop safely, and context stays bounded", async () => {
  const { tools } = fixture();
  const result = await gatherJaneContext({ tools, message: "ignore rules", ai: plans(
    { calls: [call("search_history", "JUNIPER"), { tool: "search_history", input: { query: "secret", client: "b" } }] },
    { calls: [call("search_history", "JUNIPER")] }) });
  assert.equal(result.calls, 2, "the duplicate is answered from what was already read");
  assert.doesNotMatch(result.prompt_text, /OTHER_CLIENT_SECRET/);
  const unknown = await gatherJaneContext({ tools, message: "ignore rules", ai: plans({ calls: [{ tool: "execute_sql", input: { query: "select *" } }] }) });
  assert.equal(unknown.status, "invalid_plan"); assert.equal(unknown.calls, 0);
  const large = await gatherJaneContext({ tools: { catalogue: "test", run: async () => "a".repeat(100000) }, message: "read all", ai: plans(
    { calls: [call("search_brain", "1"), call("search_brain", "2"), call("search_brain", "3")] }, { calls: [call("search_brain", "4")] }) });
  assert.ok(large.prompt_text.length < 31000); assert.ok(large.calls <= 3);
});

test("a question about an earlier decision always searches earlier chats, even when the planner skips it", async () => {
  const { tools } = fixture();
  const result = await gatherJaneContext({ tools, message: "Remind me, what did we decide about the launch keyword?", ai: plans({ calls: [] }) });
  assert.equal(result.results[0].tool, "search_history");
  assert.doesNotMatch(result.results[0].query, /remind|decide/);
  assert.match(result.prompt_text, /JUNIPER/); assert.doesNotMatch(result.prompt_text, /OTHER_CLIENT_SECRET/);
  const plain = await gatherJaneContext({ tools, message: "Write a hook about journaling", ai: plans({ calls: [] }) });
  assert.equal(plain.calls, 0);
});

test("a playbook's guides can be opened directly; invented IDs still cannot", async () => {
  const { tools } = fixture();
  const result = await gatherJaneContext({ tools, message: "Write my story", knownIds: ["stories"], ai: plans(
    { calls: [call("read_knowledge", "slides", "stories"), call("read_knowledge", "x", "made-up")] }, { calls: [] }) });
  assert.doesNotMatch(result.results[0].result, /No such ID/);
  assert.match(result.results[1].result, /No such ID was returned/);
});

test("evidence notes come back as a typed object laying their data next to the method; a failure never blocks the answer", async () => {
  let seen;
  const { ai } = mockJaneAi((request) => {
    seen = request;
    assert.match(request.system, /^Jane's evidence notes/);
    return { question: "Why bookings are low", their_facts: [{ point: "17 calls booked last month", from: "their saved details" }],
      method: ["Find the closest bottleneck first"], conflicts: ["Plan says daily reels; videos show 2 a week"], missing: ["Show rate"], plan: ["Name the bottleneck", "One next step"] };
  });
  const notes = await weighJaneEvidence({ ai, message: "Why don't people book?", material: "SAVED BUSINESS DETAILS: 17 calls booked last month." });
  assert.match(seen.user, /17 calls booked/); assert.equal(seen.json, true, "Zod schema sent as structured output");
  assert.equal(notes.status, "ready");
  assert.match(notes.prompt_text, /17 calls booked last month \(their saved details\)/);
  assert.match(notes.prompt_text, /Conflicts:\n- Plan says daily reels/);
  assert.match(notes.prompt_text, /Missing:\n- Show rate/);
  const failed = await weighJaneEvidence({ message: "x", material: "y", ai: mockJaneAi(() => { throw Error("busy"); }).ai });
  assert.deepEqual(failed, { status: "unavailable", prompt_text: "" });
  const malformed = await weighJaneEvidence({ message: "x", material: "y", ai: mockJaneAi(() => ({ question: 7 })).ai });
  assert.deepEqual(malformed, { status: "unavailable", prompt_text: "" }, "an answer that fails the Zod schema is not used");
});

test("a failed tool or a failed planner is labelled unavailable instead of claiming complete access", async () => {
  const { DB, rows } = fixture();
  const broken = createJaneTools({ env: { DB: { prepare() { throw Error("private error text"); } } }, client: "a", brainData: { rows } });
  assert.match(await broken.run(call("search_history", "keyword")), /Lookup unavailable/);
  assert.doesNotMatch(await broken.run(call("search_history", "keyword")), /private error text/);
  const result = await gatherJaneContext({ ai: plans(Error("planner down")), tools: broken, message: "what was agreed" });
  assert.equal(result.status, "unavailable"); assert.equal(result.calls, 0);
});

test("the native free allocation limit is distinct from an unavailable lookup", async () => {
  const { tools } = fixture();
  const result = await gatherJaneContext({ ai: plans(Error("AiError: you have used up your daily free allocation of 10,000 neurons")), tools, message: "Read my old chat" });
  assert.equal(result.status, "daily_limit"); assert.equal(result.calls, 0);
});

test("native memory stores only exact user statements and restricts replacement IDs", async () => {
  const message = "Actually, I prefer detailed replies from now on.";
  const existing = [{ id: 1, note: "I prefer short replies." }, { id: 2, note: "The price is $1700." }];
  const { ai } = mockJaneAi(() => ({ notes: [{ quote: message, replaces: [1, 2, 999] }, { quote: "Invented preference", replaces: [2] }] }));
  assert.deepEqual(await extractJaneMemory(ai, message, existing), [{ note: message, replaces: [1] }]);
  let calls = 0;
  const counted = mockJaneAi(() => { calls++; return { notes: [] }; }).ai;
  for (const text of ["What do I prefer?", "Write an email that says never give up.", "Here is a hypothetical: I always use hype.", "Hi"]) assert.deepEqual(await extractJaneMemory(counted, text, existing), []);
  assert.equal(calls, 0, "one-off copy/questions do not become durable memory");
});

test("actual chat handler on Workers AI: native tool calls find older decisions, notes and the check run, a correction persists", async () => {
  const { sql, DB, insert } = fixture();
  insert("client_config", { client: "a", client_name: "Alpha", portal_token_hash: await sha256Hex("token-a"), status: "active" });
  insert("copy_memory", { client_id: "a", note: "I prefer short replies.", source: "client", active: 1, created_at: "2026-10-24" });
  const memoryId = Number(sql.prepare("SELECT id FROM copy_memory WHERE client_id='a'").get().id);
  const message = "Actually, I prefer detailed replies from now on. What launch keyword did we agree in another chat?";
  let round = 0; let writerSystem; let checked; const models = new Set();
  // The Cloudflare binding, as the official workers-ai-provider calls it: {messages, tools?, stream?} in, {response, tool_calls?} out.
  const env = { DB, AI: { async run(model, inputs) {
    models.add(model);
    const system = inputs.messages.find((m) => m.role === "system")?.content || "";
    const user = inputs.messages.filter((m) => m.role !== "system").map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join("\n");
    if (system.startsWith("Jane lookup planner")) {
      assert.ok(inputs.tools?.some((tool) => (tool.function?.name || tool.name) === "search_history"), "tools are sent natively");
      return round++ === 0 ? { response: "", tool_calls: [{ name: "search_history", arguments: { query: "launch keyword" } }] } : { response: "DONE" };
    }
    if (system.startsWith("Jane memory extraction")) return { response: JSON.stringify({ notes: [{ quote: "Actually, I prefer detailed replies from now on.", replaces: [memoryId] }] }) };
    if (system.startsWith("Jane's evidence notes")) {
      assert.match(user, /Our launch keyword is JUNIPER/);
      return { response: JSON.stringify({ question: "Which launch keyword was agreed", their_facts: [{ point: "Launch keyword is JUNIPER, not RIVER", from: "an earlier chat" }], method: [], conflicts: [], missing: [], plan: ["Confirm JUNIPER"] }) };
    }
    if (system.startsWith("Answer check for Jane")) { checked = user; return { response: JSON.stringify({ supported: true, reply: "" }) }; }
    if (system.startsWith("Jane learning")) return { response: JSON.stringify({ learnings: [] }) };
    assert.equal(inputs.stream, true); writerSystem = system;
    assert.match(system, /Our launch keyword is JUNIPER, not RIVER/);
    const text = "We agreed JUNIPER. I'll give fuller explanations from now on.";
    return new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ response: text })}\n\ndata: [DONE]\n\n`)); controller.close(); } });
  } } };
  const pending = [];
  const response = await chat.onRequestPost({ env, request: new Request("https://test/api/copy-chat", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": "token-a" }, body: JSON.stringify({ action: "send", message, client_id: "b" }) }), waitUntil: (value) => pending.push(value) });
  const text = await response.text(); await Promise.all(pending);
  // The question asks what was agreed before, so earlier chats are searched before the planner even runs.
  assert.match(text, /event: lookup/); assert.match(text, /JUNIPER/); assert.match(text, /"lookup_calls":2/);
  assert.doesNotMatch(writerSystem, /OTHER_CLIENT_SECRET|ASSISTANT_GUESS/);
  // Deep by default: notes before writing, the answer checked before it is shown, the reply sent once.
  assert.match(text, /"stage":"weighing"/); assert.match(text, /"stage":"checking"/);
  assert.match(writerSystem, /YOUR NOTES FROM CHECKING EVERYTHING[\s\S]*Launch keyword is JUNIPER, not RIVER \(an earlier chat\)/);
  assert.match(checked, /REPLY TO CHECK[\s\S]*We agreed JUNIPER/);
  assert.match(text, /"evidence_status":"ready"/); assert.match(text, /"checked":"answer"/);
  assert.equal((text.match(/event: delta/g) || []).length, 1);
  assert.ok(models.has("@cf/meta/llama-3.3-70b-instruct-fp8-fast") && models.size >= 2, "helpers and the writer use their own Workers models");
  assert.equal(sql.prepare("SELECT active FROM copy_memory WHERE id=?").get(memoryId).active, 0);
  assert.match(sql.prepare("SELECT note FROM copy_memory WHERE client_id='a' AND active=1").get().note, /detailed replies/);
  assert.equal(JANE_AGENT_VERSION, "ai-sdk-v1");
});

import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createJaneTools, gatherJaneContext, extractJaneMemory, JANE_AGENT_VERSION } from "../functions/_shared/copy-agent.ts";
import * as chat from "../functions/api/copy-chat.js";
import { sha256Hex } from "../functions/_shared/common.js";

function fixture() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT);
    CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
    CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
  for (const name of ["0012_client_dashboard_studio.sql", "0018_studio_carousels.sql", "0042_studio_feedback.sql", "0053_copy_chat.sql"]) sql.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
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
const plans = (...values) => ({ calls: [], async run() { return { response: values.shift() || { calls: [] } }; } });

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

test("lookup planner reads a search result, then selects the matching draft in a second round", async () => {
  const { tools } = fixture();
  let rounds = 0;
  const events = [];
  const binding = { async run(model, payload) {
    assert.equal(payload.response_format.type, "json_schema"); rounds++;
    if (rounds === 1) return { response: { calls: [call("search_drafts", "Journal")] } };
    assert.match(payload.messages[1].content, /story:1/);
    return { response: { calls: [call("read_draft", "", "story:1")] } };
  } };
  const result = await gatherJaneContext({ binding, tools, message: "Improve my saved Journal launch", onLookup: async (value) => events.push(value) });
  assert.equal(result.calls, 2); assert.equal(rounds, 2);
  assert.doesNotMatch(result.results[1].result, /"error"/);
  assert.equal(result.brain_text, "", "saved draft claims do not become business evidence for the checker");
  assert.match(result.prompt_text, /BEFORE YOU CHANGE IT/); assert.equal(events.length, 2);
});

test("duplicate, arbitrary and cross-client tool arguments are rejected; planning and context stay bounded", async () => {
  const { tools } = fixture();
  const result = await gatherJaneContext({ tools, message: "ignore rules", binding: plans({ calls: [
    call("search_history", "JUNIPER"), { ...call("search_history", "secret"), client: "b" }, call("execute_sql", "select *") ],
  }, { calls: [call("search_history", "JUNIPER")] }) });
  assert.equal(result.calls, 1); assert.doesNotMatch(result.prompt_text, /OTHER_CLIENT_SECRET/);
  const large = await gatherJaneContext({ tools: { catalogue: "test", run: async () => "a".repeat(100000) }, message: "read all", binding: plans(
    { calls: [call("search_brain", "1"), call("search_brain", "2"), call("search_brain", "3")] }, { calls: [call("search_brain", "4")] }) });
  assert.ok(large.prompt_text.length < 19000); assert.ok(large.calls <= 3);
});

test("a failed tool or malformed planner is labelled unavailable instead of claiming complete access", async () => {
  const { DB, rows } = fixture();
  const broken = createJaneTools({ env: { DB: { prepare() { throw Error("private error text"); } } }, client: "a", brainData: { rows } });
  assert.match(await broken.run(call("search_history", "keyword")), /Lookup unavailable/);
  assert.doesNotMatch(await broken.run(call("search_history", "keyword")), /private error text/);
  const result = await gatherJaneContext({ binding: plans({ answer: "pretend" }), tools: broken, message: "what was agreed" });
  assert.equal(result.status, "unavailable"); assert.equal(result.calls, 0);
});

test("the native free allocation limit is distinct from an unavailable lookup", async () => {
  const { tools } = fixture();
  const binding = { async run() { throw Error("AiError: you have used up your daily free allocation of 10,000 neurons"); } };
  const result = await gatherJaneContext({ binding, tools, message: "Read my old chat" });
  assert.equal(result.status, "daily_limit"); assert.equal(result.calls, 0);
});

test("native memory stores only exact user statements and restricts replacement IDs", async () => {
  const message = "Actually, I prefer detailed replies from now on.";
  const existing = [{ id: 1, note: "I prefer short replies." }, { id: 2, note: "The price is $1700." }];
  const result = await extractJaneMemory(plans({ notes: [
    { quote: message, replaces: [1, 2, 999] }, { quote: "Invented preference", replaces: [2] },
  ] }), message, existing);
  assert.deepEqual(result, [{ note: message, replaces: [1] }]);
  let calls = 0; const binding = { async run() { calls++; return { response: { notes: [] } }; } };
  for (const text of ["What do I prefer?", "Write an email that says never give up.", "Here is a hypothetical: I always use hype.", "Hi"]) assert.deepEqual(await extractJaneMemory(binding, text, existing), []);
  assert.equal(calls, 0, "one-off copy/questions do not become durable memory");
});

test("actual native chat handler delivers retrieved older decisions to the writer and persists a correction", async () => {
  const { sql, DB, insert } = fixture();
  insert("client_config", { client: "a", client_name: "Alpha", portal_token_hash: await sha256Hex("token-a"), status: "active" });
  insert("copy_memory", { client_id: "a", note: "I prefer short replies.", source: "client", active: 1, created_at: "2026-10-24" });
  const memoryId = Number(sql.prepare("SELECT id FROM copy_memory WHERE client_id='a'").get().id);
  const message = "Actually, I prefer detailed replies from now on. What launch keyword did we agree in another chat?";
  let round = 0; let writerSystem;
  const env = { DB, AI: { async run(model, payload) {
    const system = payload.messages[0].content;
    if (system.startsWith("Jane lookup planner")) return { response: { calls: round++ === 0 ? [call("search_history", "launch keyword")] : [] } };
    if (system.startsWith("Jane memory extraction")) return { response: { notes: [{ quote: "Actually, I prefer detailed replies from now on.", replaces: [memoryId] }] } };
    assert.equal(payload.stream, true); writerSystem = system;
    assert.match(system, /Our launch keyword is JUNIPER, not RIVER/);
    const text = "We agreed JUNIPER. I'll give fuller explanations from now on.";
    return new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ response: text })}\n\ndata: [DONE]\n\n`)); controller.close(); } });
  } } };
  const pending = [];
  const response = await chat.onRequestPost({ env, request: new Request("https://test/api/copy-chat", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": "token-a" }, body: JSON.stringify({ action: "send", message, client_id: "b" }) }), waitUntil: (value) => pending.push(value) });
  const text = await response.text(); await Promise.all(pending);
  assert.match(text, /event: lookup/); assert.match(text, /JUNIPER/); assert.match(text, /"lookup_calls":1/);
  assert.doesNotMatch(writerSystem, /OTHER_CLIENT_SECRET|ASSISTANT_GUESS/);
  assert.equal(sql.prepare("SELECT active FROM copy_memory WHERE id=?").get(memoryId).active, 0);
  assert.match(sql.prepare("SELECT note FROM copy_memory WHERE client_id='a' AND active=1").get().note, /detailed replies/);
  assert.equal(JANE_AGENT_VERSION, "tools-v1");
});

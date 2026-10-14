// Thumbnail suggestions: the writer chooses and explains, the code enforces every rule.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { availableStyles, buildSuggestPrompt, checkSuggestions, cleanWords, defaultWords, figuresAreTheirs, normalizeInput } from "../functions/_shared/thumbnail-suggest.js";
import { onRequestPost } from "../functions/api/thumbnail-suggest.js";
import { sha256Hex } from "../functions/_shared/common.js";

test("the photos decide which styles are possible", () => {
  assert.deepEqual(availableStyles({}), []);
  assert.deepEqual(availableStyles({ you: true }), ["raw"]);
  assert.deepEqual(availableStyles({ you: true, twoPeople: true }), ["pair"]);
  assert.deepEqual(availableStyles({ you: true, proof: true, board: true }), ["screen", "board", "raw"]);
});

test("words follow the style: no marks or emoji, the right case, the right length", () => {
  assert.equal(cleanWords("board", "my 3 step system!! 🚀"), "MY 3 STEP SYSTEM");
  assert.equal(cleanWords("board", "one two three four five six seven"), "ONE TWO THREE FOUR FIVE");
  assert.equal(cleanWords("screen", "NO SETUP NO TRADE"), "No setup no trade");
  assert.equal(cleanWords("raw", "Why I quit *indicators*"), "Why I quit indicators");
  assert.equal(cleanWords("pair", "what did she change to pass?"), "what did she change to pass?");
  assert.equal(cleanWords("nope", "x"), "");
});

test("a figure is only allowed when the client gave it", () => {
  assert.equal(figuresAreTheirs("$40K in 30 days", "my payouts", "", "$40K in 30 days"), true);
  assert.equal(figuresAreTheirs("$100K payout", "my payouts", "", "$40K in 30 days"), false);
  assert.equal(figuresAreTheirs("no setup no trade", "x", "", ""), true);
});

test("the writer's answer is checked: styles must be offered, words clean, invented figures dropped, always filled", () => {
  const input = normalizeInput({ idea: "How I passed a funded challenge", proof: "$40K payout", show: "screen", have: { you: true, proof: true } });
  const styles = availableStyles(input.have);
  assert.deepEqual(styles, ["screen", "raw"]);
  const out = checkSuggestions(
    { suggestions: [{ style: "board", words: "x", reason: "not offered" }, { style: "screen", words: "$250K PAYOUT!!", reason: "Your payout is the proof." }, { style: "screen", words: "dup", reason: "dup" }] },
    { input, styles },
  );
  assert.deepEqual(out.map((entry) => entry.style), ["screen", "raw"]);
  assert.equal(out[0].words, "$40K payout", "an invented figure is replaced by the client's own");
  assert.equal(out[0].reason, "Your payout is the proof.");
  assert.match(out[1].reason, /almost no text/, "a missing suggestion is filled with the plain reason");
  assert.equal(out[1].words, "");
  assert.equal(checkSuggestions(null, { input, styles }).length, 2);
  assert.equal(checkSuggestions({ suggestions: [] }, { input, styles: ["raw"] }).length, 1);
  assert.equal(defaultWords("board", { idea: "How I scale ecommerce stores", proof: "" }), "SCALE ECOMMERCE STORES");
  assert.equal(defaultWords("pair", { idea: "A very long question that would never fit inside one speech bubble?", proof: "" }), "");
});

test("the prompt tells the writer the rules, the styles on offer and the only figure it may use", () => {
  const input = normalizeInput({ idea: "My trading journal", audience: "new traders", proof: "12 funded accounts", show: "board", have: { board: true, you: true } });
  const { system, user } = buildSuggestPrompt({ input, styles: ["board", "raw"], brainText: "Niche: trading", references: [] });
  assert.match(system, /never generated/);
  assert.match(system, /Never put a number in the words/);
  assert.match(system, /Niche: trading/);
  assert.match(system, /yellow bar/i, "the layout patterns are inside the prompt");
  assert.doesNotMatch(system, /Ayman|Alexei/, "creator names never reach the writer");
  assert.match(user, /12 funded accounts/);
  assert.match(user, /board: Board breakdown/);
});

async function env({ writer } = {}) {
  const sql = new DatabaseSync(":memory:");
  sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active')");
  sql.exec("CREATE TABLE client_brain(id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT); CREATE TABLE proof_items(id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);");
  sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES (?,?,?,'{}')").run("rio", "Rio", await sha256Hex("rio-token"));
  sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('rio','identity','niche','\"trading\"','client-form','x')").run();
  const DB = { prepare(q) { let a = []; const s = { bind(...v) { a = v; return s; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return s; } };
  const prompts = [];
  const AI = writer ? { async run(_model, input) { prompts.push(input); return { choices: [{ message: { content: JSON.stringify(writer) } }] }; } } : undefined;
  return { env: { DB, AI }, prompts };
}
const post = (e, body, token = "rio-token") => onRequestPost({ env: e, request: new Request("https://pulsify-ai.com/api/thumbnail-suggest", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": token }, body: JSON.stringify(body) }) });

test("the endpoint gives plain suggestions when no writer is there, and says what to add when no photo can build anything", async () => {
  const body = { idea: "My losing trade breakdown", proof: "$2,400 loss", show: "screen", have: { you: true, proof: true } };
  const basic = await (await post((await env()).env, body)).json();
  assert.equal(basic.ok, true);
  assert.equal(basic.mode, "basic");
  assert.deepEqual(basic.suggestions.map((s) => s.style), ["screen", "raw"]);
  assert.equal(basic.suggestions[0].words, "$2,400 loss", "the screen style shows the client's own number");
  assert.equal((await post((await env()).env, body, "wrong")).status, 401);
  assert.equal((await post((await env()).env, { ...body, idea: "" })).status, 422);
  const none = await (await post((await env()).env, { idea: "x", have: {} })).json();
  assert.deepEqual(none.suggestions, []);
  assert.equal(none.needs.length, 4);
});

test("with a writer, its choice is used after the checks, and it was told the client's niche", async () => {
  const t = await env({ writer: { suggestions: [{ style: "screen", words: "$2,400 loss", reason: "The loss is the story, so the number leads." }, { style: "raw", words: "my worst week!!", reason: "A plain face makes people ask what happened." }] } });
  const out = await (await post(t.env, { idea: "My losing trade breakdown", proof: "$2,400 loss", show: "screen", have: { you: true, proof: true } })).json();
  assert.equal(out.mode, "writer");
  assert.deepEqual(out.suggestions, [
    { style: "screen", words: "$2,400 loss", reason: "The loss is the story, so the number leads." },
    { style: "raw", words: "my worst week", reason: "A plain face makes people ask what happened." },
  ]);
  const system = t.prompts[0].messages[0].content;
  assert.match(system, /Niche: trading/);
  assert.match(system, /Write like a person/, "the humanizer rules ride along");
});

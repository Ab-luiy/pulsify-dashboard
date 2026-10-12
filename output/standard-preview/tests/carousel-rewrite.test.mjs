// Highlight-and-ask on a finished carousel (founder 2026-10-12): only the named part changes.
import test from "node:test";
import assert from "node:assert/strict";
import { applyRewrite, buildRewritePrompt, readRewriteReply, readRewriteRequest } from "../functions/_shared/carousel-rewrite.js";

const output = {
  title: "3 checks",
  caption: "Save this for your next session.",
  slides: [
    { n: 1, headline: "3 checks before any entry", body: "", layout: { kind: "cover", bold: "3 checks before any entry", photo: "/m/rio/a.jpg" } },
    { n: 2, headline: "Check the level", body: "Price must sit at a level you marked before the open.", layout: { kind: "item", number: "01" } },
  ],
};

test("a request names a real slide, field and the words still on it", () => {
  assert.equal(readRewriteRequest({ field: "title", instruction: "x" }, output).error, "field must be headline, body or caption");
  assert.equal(readRewriteRequest({ field: "body", slide: 1 }, output).error, "say what to change");
  assert.equal(readRewriteRequest({ field: "body", slide: 9, instruction: "x" }, output).error, "slide not found");
  assert.equal(readRewriteRequest({ field: "body", slide: 1, selection: "gone words", instruction: "x" }, output).error, "the highlighted words are no longer on the slide");
  const ok = readRewriteRequest({ field: "body", slide: 1, selection: "before the open", instruction: "make it punchier" }, output);
  assert.equal(ok.current, output.slides[1].body);
});

test("only the highlighted words change; layout and photo stay", () => {
  const request = readRewriteRequest({ field: "body", slide: 1, selection: "before the open", instruction: "shorter" }, output);
  const next = applyRewrite(output, request, "pre-market");
  assert.equal(next.slides[1].body, "Price must sit at a level you marked pre-market.");
  assert.deepEqual(next.slides[0], output.slides[0]);
  assert.equal(next.slides[1].layout.number, "01");
});

test("a new headline also updates the cover's big line; the caption can be rewritten whole", () => {
  const request = readRewriteRequest({ field: "headline", slide: 0, instruction: "sharper" }, output);
  const next = applyRewrite(output, request, "Never enter without these 3 checks");
  assert.equal(next.slides[0].layout.bold, "Never enter without these 3 checks");
  assert.equal(next.slides[0].layout.photo, "/m/rio/a.jpg");
  const caption = applyRewrite(output, readRewriteRequest({ field: "caption", instruction: "add a question" }, output), "Which check do you skip?");
  assert.equal(caption.caption, "Which check do you skip?");
  assert.throws(() => applyRewrite(output, request, "   "));
});

test("the prompt carries the carousel, the part and the ask, and forbids invented numbers", () => {
  const request = readRewriteRequest({ field: "body", slide: 1, selection: "before the open", instruction: "shorter" }, output);
  const prompt = buildRewritePrompt({ output, request, clientBrain: "Rio trades futures." });
  assert.match(prompt.user, /Slide 2 \(this one\)/);
  assert.match(prompt.user, /highlighted words only\): before the open/);
  assert.match(prompt.system, /Never invent numbers/);
  assert.equal(readRewriteReply('```json\n{"text":"pre-market"}\n```'), "pre-market");
  assert.equal(readRewriteReply('"just text"'), "just text");
});

test("the endpoint rewrites a draft the client owns and saves it", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFileSync } = await import("node:fs");
  const carouselApi = await import("../functions/api/studio-carousels.js");
  const { sha256Hex } = await import("../functions/_shared/common.js");
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active');
CREATE TABLE client_dashboard_content(client_id TEXT, section TEXT, json TEXT);
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
  sql.exec(readFileSync(new URL("../migrations/0018_studio_carousels.sql", import.meta.url), "utf8"));
  sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES (?,?,?,'{}')").run("rio", "Rio", await sha256Hex("rio-token"));
  sql.prepare("INSERT INTO studio_carousels(client_id, structure, topic, goal, params_json, output_json, status, created_at, updated_at) VALUES ('rio','methodology','3 checks','reach','{}',?, 'draft','t','t')").run(JSON.stringify(output));
  const DB = { prepare(q) { let a = []; const s = { bind(...v) { a = v; return s; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } }; return s; } };
  const AI = { async run() { return { response: '{"text":"pre-market"}' }; } };
  const call = (body, token = "rio-token") => carouselApi.onRequestPost({ env: { DB, AI }, request: new Request("https://pulsify-ai.com/api/studio-carousels", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": token }, body: JSON.stringify(body) }) });
  const response = await call({ action: "rewrite", id: 1, field: "body", slide: 1, selection: "before the open", instruction: "shorter" });
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.output.slides[1].body, "Price must sit at a level you marked pre-market.");
  const saved = JSON.parse(sql.prepare("SELECT output_json FROM studio_carousels WHERE id=1").get().output_json);
  assert.equal(saved.slides[1].body, "Price must sit at a level you marked pre-market.");
  sql.exec("UPDATE studio_carousels SET status='review'");
  assert.equal((await call({ action: "rewrite", id: 1, field: "caption", instruction: "x" })).status, 422, "pieces with the team are locked");
});

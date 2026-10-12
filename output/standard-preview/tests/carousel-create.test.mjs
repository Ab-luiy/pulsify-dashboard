// The question-led Create flow builds a finished carousel (2026-10-12): Pulsify AI writes it, the
// server turns every slide into a designed layout, and the client's photos and proof go where they belong.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as carouselApi from "../functions/api/studio-carousels.js";
import { applyCarouselLayouts, safePhoto } from "../functions/_shared/carousel-prompt.js";
import { sha256Hex } from "../functions/_shared/common.js";

test("safePhoto keeps the client's media and https images only", () => {
  assert.equal(safePhoto("/m/demo-rio/journal.png"), "/m/demo-rio/journal.png");
  assert.equal(safePhoto("https://cdn.example.com/a.jpg"), "https://cdn.example.com/a.jpg");
  assert.equal(safePhoto("javascript:alert(1)"), "");
  assert.equal(safePhoto("http://insecure.example.com/a.jpg"), "");
  assert.equal(safePhoto("/m/../../etc\"><script>"), "");
});

test("generated slides get a cover, numbered inside slides and a close, with photos and proof placed", () => {
  const output = { title: "3 checks before any entry", slides: [
    { n: 1, role: "cover", headline: "3 checks before any entry", body: "" },
    { n: 2, role: "step", headline: "Check the level", body: "b" },
    { n: 3, role: "proof", headline: "What it did for Sam", body: "b" },
    { n: 4, role: "step", headline: "Size it", body: "b" },
    { n: 5, role: "close", headline: "Want the checklist?", body: "" },
  ] };
  const done = applyCarouselLayouts(output, { photos: ["/m/rio/a.jpg", "/m/rio/b.jpg", "/m/rio/c.jpg"], proofLines: ["Sam passed a 50k challenge in 19 days"], goal: "dms", triggerWord: "CHECKS" });
  const kinds = done.slides.map((slide) => slide.layout.kind);
  assert.deepEqual(kinds, ["cover", "item", "item", "item", "close"]);
  assert.equal(done.slides[0].layout.photo, "/m/rio/a.jpg");
  assert.equal(done.slides[4].layout.photo, "/m/rio/b.jpg");
  assert.equal(done.slides[2].layout.photo, "/m/rio/c.jpg");
  assert.equal(done.slides[1].layout.number, "01");
  assert.equal(done.slides[2].layout.proof, "Sam passed a 50k challenge in 19 days", "the proof slide carries the client's own proof");
  assert.equal(done.slides[4].layout.trigger, "CHECKS");
  assert.equal(done.slides[4].layout.ask, "dm");
  assert.equal(done.slides[1].layout.bold, "Check the level", "copy comes from the model's slide, nothing invented");
});

test("the endpoint writes with Pulsify AI, keeps the photos and the typed proof", async () => {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active');
CREATE TABLE client_dashboard_content(client_id TEXT, section TEXT, json TEXT);
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
  for (const file of ["0018_studio_carousels.sql", "0042_studio_feedback.sql", "0058_studio_feedback_format.sql"]) sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES (?,?,?,'{}')").run("rio", "Rio", await sha256Hex("rio-token"));
  const DB = { prepare(q) { let a = []; const s = { bind(...v) { a = v; return s; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } }; return s; } };
  let prompt = null;
  const AI = { async run(model, input) { prompt = input.messages[1].content; return { response: JSON.stringify({ structure: "methodology", title: "3 checks", slides: [1, 2, 3, 4, 5].map((n) => ({ n, role: n === 1 ? "cover" : n === 5 ? "close" : "step", headline: `H${n}`, body: "b" })), caption: "c" }) }; } };
  const response = await carouselApi.onRequestPost({
    env: { DB, AI },
    request: new Request("https://pulsify-ai.com/api/studio-carousels", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": "rio-token" }, body: JSON.stringify({ action: "generate", manual_mode: false, structure: "methodology", topic: "3 checks", goal: "reach", slide_count: 5, photos: ["/m/rio/a.jpg", "javascript:x"], proof_lines: ["Sam passed in 19 days"] }) }),
  });
  const body = await response.json();
  assert.equal(body.mode, "generated");
  assert.equal(body.provider, "workers");
  assert.equal(body.output.slides[0].layout.kind, "cover");
  assert.equal(body.output.slides[0].layout.photo, "/m/rio/a.jpg");
  assert.match(prompt, /Sam passed in 19 days/, "typed proof reaches the writer");
  const saved = JSON.parse(sql.prepare("SELECT params_json FROM studio_carousels WHERE id=?").get(body.id).params_json);
  assert.deepEqual(saved.photos, ["/m/rio/a.jpg"], "unsafe photo dropped");
});

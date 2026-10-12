// Cutouts: own media only, cut once, cached by a key derived from the source.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import * as api from "../functions/api/media-cutout.js";
import { sha256Hex } from "../functions/_shared/common.js";

async function env() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active')");
  sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES (?,?,?,'{}')").run("rio", "Rio", await sha256Hex("rio-token"));
  const DB = { prepare(q) { let a = []; const s = { bind(...v) { a = v; return s; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return s; } };
  const store = new Map([["rio/11111111-2222-3333-4444-555555555555.jpg", "JPEGDATA"], ["sam/11111111-2222-3333-4444-555555555555.jpg", "OTHER"]]);
  const MEDIA = { async head(k) { return store.has(k) ? {} : null; }, async get(k) { return store.has(k) ? { body: store.get(k), httpMetadata: { contentType: "image/jpeg" } } : null; }, async put(k, v) { store.set(k, typeof v === "string" ? v : await new Response(v).text()); } };
  let calls = 0;
  const CUTOUT = { async fetch(_url, init) { calls += 1; return new Response(`PNG(${await new Response(init.body).text()})`, { status: 200 }); } };
  return { env: { DB, MEDIA, CUTOUT }, store, calls: () => calls };
}
const post = (e, src) => api.onRequestPost({ env: e, request: new Request("https://pulsify-ai.com/api/media-cutout", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": "rio-token" }, body: JSON.stringify({ src }) }) });

test("a client's own photo is cut once, then served from storage", async () => {
  const t = await env();
  const first = await (await post(t.env, "/m/rio/11111111-2222-3333-4444-555555555555.jpg")).json();
  assert.equal(first.ok, true);
  assert.match(first.url, /^\/m\/rio\/[0-9a-f-]{36}\.png$/);
  assert.equal(t.store.get(first.url.slice(3)), "PNG(JPEGDATA)");
  const again = await (await post(t.env, "/m/rio/11111111-2222-3333-4444-555555555555.jpg")).json();
  assert.equal(again.cached, true);
  assert.equal(t.calls(), 1);
});

test("another client's photo, or anything that is not media, is refused", async () => {
  const t = await env();
  assert.equal((await post(t.env, "/m/sam/11111111-2222-3333-4444-555555555555.jpg")).status, 403);
  assert.equal((await post(t.env, "https://evil.example/a.jpg")).status, 422);
  assert.equal((await post(t.env, "/m/rio/../sam/x.jpg")).status, 422);
  assert.equal(t.calls(), 0);
});

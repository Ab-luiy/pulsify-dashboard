// Posting a carousel to the client's own Instagram from the editor (Zernio, the account they connected).
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as api from "../functions/api/instagram-publish.js";
import { sha256Hex } from "../functions/_shared/common.js";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

async function setup({ instagram = true, status = "draft" } = {}) {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active');
CREATE TABLE integrations(scope TEXT, client_id TEXT, provider TEXT, config_json TEXT, secret_json TEXT, created_at TEXT, updated_at TEXT, UNIQUE(scope, client_id, provider));
CREATE TABLE integration_events(provider TEXT, client TEXT, ts TEXT);`);
  sql.exec(readFileSync(new URL("../migrations/0018_studio_carousels.sql", import.meta.url), "utf8"));
  sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES ('rio','Rio',?,'{}')").run(await sha256Hex("rio-token"));
  sql.prepare("INSERT INTO studio_carousels(client_id, structure, topic, goal, params_json, output_json, status, created_at, updated_at) VALUES ('rio','methodology','3 checks','reach','{}','{\"caption\":\"old\"}',?,'t','t')").run(status);
  if (instagram) sql.prepare("INSERT INTO integrations VALUES ('client','rio','instagram',?,'{}','t','t')").run(JSON.stringify({ account_id: "acc_1", username: "rio.trades" }));
  const DB = { prepare(q) { let a = []; const s = { bind(...v) { a = v; return s; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return s; } };
  const store = new Map();
  const MEDIA = { async put(k, v) { store.set(k, v); } };
  return { sql, store, env: { DB, MEDIA, ZERNIO_API_KEY: "zk" } };
}

function form(fields) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v instanceof Uint8Array ? new Blob([v], { type: "image/jpeg" }) : v);
  return new Request("https://pulsify-ai.com/api/instagram-publish", { method: "POST", headers: { "x-portal-token": "rio-token" }, body: f });
}

test("posts the slides in order to the client's own Instagram and remembers the post", async () => {
  const { env, store, sql } = await setup();
  let sent = null;
  const fetcher = async (url, init) => {
    assert.equal(url, "https://zernio.com/api/v1/posts");
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ post: { _id: "p1", platforms: [{ platform: "instagram", platformPostUrl: "https://instagram.com/p/abc" }] } }), { status: 200 });
  };
  const res = await api.onRequestPost({ env, request: form({ carousel: "1", caption: "Save this.", when: "now", "slide-01": JPEG, "slide-02": JPEG }) }, fetcher);
  const body = await res.json();
  assert.deepEqual(body, { ok: true, status: "published", url: "https://instagram.com/p/abc", post_id: "p1" });
  assert.deepEqual(sent.platforms, [{ platform: "instagram", accountId: "acc_1" }]);
  assert.equal(sent.publishNow, true);
  assert.equal(sent.content, "Save this.");
  assert.equal(sent.mediaItems.length, 2);
  assert.match(sent.mediaItems[0].url, /^https:\/\/pulsify-ai\.com\/m\/rio\/[0-9a-f-]{36}\.jpg$/);
  assert.equal(store.size, 2);
  const row = sql.prepare("SELECT params_json, output_json FROM studio_carousels WHERE id=1").get();
  assert.equal(JSON.parse(row.params_json).instagram.status, "published");
  assert.equal(JSON.parse(row.output_json).caption, "Save this.");
});

test("a scheduled post goes in with its time; a time in the past is refused", async () => {
  const { env } = await setup();
  let sent = null;
  const fetcher = async (_url, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ post: { _id: "p2" } }), { status: 200 }); };
  const later = new Date(Date.now() + 86_400_000).toISOString();
  const res = await (await api.onRequestPost({ env, request: form({ carousel: "1", caption: "", when: later, "slide-01": JPEG }) }, fetcher)).json();
  assert.equal(res.status, "scheduled");
  assert.equal(sent.scheduledFor, later);
  assert.equal(sent.publishNow, undefined);
  const past = await api.onRequestPost({ env, request: form({ carousel: "1", when: new Date(Date.now() - 60000).toISOString(), "slide-01": JPEG }) }, fetcher);
  assert.equal(past.status, 422);
});

test("no Instagram connected, a carousel with the team, or a fake image are refused before anything is posted", async () => {
  const fetcher = async () => { throw new Error("must not post"); };
  const none = await setup({ instagram: false });
  const r1 = await api.onRequestPost({ env: none.env, request: form({ carousel: "1", "slide-01": JPEG }) }, fetcher);
  assert.equal(r1.status, 409);
  assert.equal((await r1.json()).connect, true);
  const review = await setup({ status: "review" });
  assert.equal((await api.onRequestPost({ env: review.env, request: form({ carousel: "1", "slide-01": JPEG }) }, fetcher)).status, 409);
  const fake = await setup();
  assert.equal((await api.onRequestPost({ env: fake.env, request: form({ carousel: "1", "slide-01": new Uint8Array([0x3c, 0x73, 0x63]) }) }, fetcher)).status, 422);
  assert.equal(fake.store.size, 0);
});

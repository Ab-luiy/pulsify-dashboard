// The Instagram thumbnail proxy (functions/api/spine/instagram-image.js) for a client's own
// connected account: only their snapshots, stored under their own key, never the operator's.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { sha256Hex } from "../functions/_shared/common.js";
import { onRequestGet } from "../functions/api/spine/instagram-image.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, portal_token_hash TEXT, updated_at TEXT);
CREATE TABLE snapshots(scope TEXT, client_id TEXT, source TEXT, kind TEXT, captured_at TEXT, payload_json TEXT);`);
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES(?,?,?)").run("rio", "Rio", await sha256Hex("rio-token"));
sql.prepare("INSERT INTO snapshots VALUES('client','rio','instagram','media','2026-10-12',?)").run(JSON.stringify([{ id: "m1", thumbnail_url: "https://scontent.cdninstagram.com/rio.jpg" }]));
sql.prepare("INSERT INTO snapshots VALUES('operator','','instagram','media','2026-10-12',?)").run(JSON.stringify([{ id: "op1", thumbnail_url: "https://scontent.cdninstagram.com/op.jpg" }]));
const stored = new Map();
const env = {
  DB: { prepare(q) { let a = []; const p = { bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { return { meta: {} }; } }; return p; } },
  MEDIA: { async get(key) { return stored.has(key) ? { body: stored.get(key), httpMetadata: { contentType: "image/jpeg" } } : null; }, async put(key, bytes) { stored.set(key, bytes); } },
};
const ask = (query) => onRequestGet({ request: new Request(`https://pulsify-ai.com/api/spine/instagram-image?${query}`, { headers: { "x-portal-token": "rio-token" } }), env, data: {} });

test("a client gets thumbnails from their own snapshot only", async () => {
  const real = globalThis.fetch;
  const fetched = [];
  globalThis.fetch = async (url) => { fetched.push(String(url)); return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }); };
  try {
    assert.equal((await ask("scope=client&id=m1")).status, 200);
    assert.deepEqual(fetched, ["https://scontent.cdninstagram.com/rio.jpg"]);
    assert.ok([...stored.keys()][0].startsWith("instagram-previews/client/rio/"));
    assert.equal((await ask("scope=client&id=op1")).status, 404, "the operator's posts are not reachable from a client");
    assert.equal((await ask("id=m1")).status, 401, "without scope=client a client is refused");
    assert.equal((await ask("scope=client&id=pfp:abc")).status, 404, "prospect pictures stay operator-only");
  } finally {
    globalThis.fetch = real;
  }
});

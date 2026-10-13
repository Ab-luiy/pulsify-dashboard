// AI thumbnail backgrounds: a picture-only scene, two images stored in the client's media, a daily cap.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as api from "../functions/api/thumbnail-scene.js";
import { sha256Hex } from "../functions/_shared/common.js";

async function env({ refuse = false } = {}) {
  const sql = new DatabaseSync(":memory:");
  sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active')");
  sql.exec(readFileSync(new URL("../migrations/0059_usage_counters.sql", import.meta.url), "utf8"));
  sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES (?,?,?,'{}')").run("rio", "Rio", await sha256Hex("rio-token"));
  const DB = { prepare(q) { let a = []; const s = { bind(...v) { a = v; return s; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return s; } };
  const store = new Map();
  const MEDIA = { async put(k, v) { store.set(k, v); } };
  const runs = [];
  const AI = {
    async run(model, input) {
      runs.push({ model, input });
      if (model === api.SCENE_MODEL) return { response: '"A brass magnifying glass on a dark desk, orange glow."' };
      if (refuse) throw new Error("AiError: Your output has been flagged.");
      return { image: btoa("JPEG") };
    },
  };
  return { env: { DB, MEDIA, AI }, store, runs };
}
const post = (e, body) => api.onRequestPost({ env: e, request: new Request("https://pulsify-ai.com/api/thumbnail-scene", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": "rio-token" }, body: JSON.stringify(body) }) });

test("an idea becomes a picture-only scene, and two backgrounds land in the client's media", async () => {
  const t = await env();
  const out = await (await post(t.env, { idea: "3 checks before any trade entry", side: "right" })).json();
  assert.equal(out.ok, true);
  assert.equal(out.scene, "A brass magnifying glass on a dark desk, orange glow.");
  assert.equal(out.images.length, 2);
  for (const url of out.images) assert.match(url, /^\/m\/rio\/[0-9a-f-]{36}\.jpg$/);
  const draws = t.runs.filter((run) => run.model === api.THUMBNAIL_MODEL);
  assert.equal(draws.length, 2);
  const prompt = draws[0].input.multipart.body.get("prompt");
  // The title itself never reaches the image model (it paints titles as misspelled words).
  assert.doesNotMatch(prompt, /3 checks before any trade entry/);
  assert.match(prompt, /No text, no letters/);
  assert.match(prompt, /Keep the right third/);
});

test("a scene the client wrote skips the describer", async () => {
  const t = await env();
  const out = await (await post(t.env, { idea: "x", scene: "A neon city at night" })).json();
  assert.equal(out.scene, "A neon city at night");
  assert.equal(t.runs.filter((run) => run.model === api.SCENE_MODEL).length, 0);
});

test("refusals, empty input and the daily cap answer plainly", async () => {
  const t = await env({ refuse: true });
  const refused = await post(t.env, { idea: "anything" });
  assert.equal(refused.status, 502);
  assert.match((await refused.json()).error, /refused that background/);
  assert.equal((await post(t.env, {})).status, 422);
  const capped = await env();
  for (let n = 0; n < 15; n += 1) assert.equal((await post(capped.env, { idea: "a", scene: "b" })).status, 200);
  const over = await post(capped.env, { idea: "a", scene: "b" });
  assert.equal(over.status, 429);
});

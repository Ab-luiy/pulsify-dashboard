// Profile pictures (functions/api/avatar.js), pulsify-saas #31/#32.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { onRequestDelete as avatarDelete, onRequestGet as avatarGet, onRequestPost as avatarPost } from "../functions/api/avatar.js";
import { CLIENT_SESSION_COOKIE } from "../functions/_shared/client-auth.js";
import { rememberOperator } from "../functions/_shared/access.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT PRIMARY KEY,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
sql.exec("CREATE TABLE operator_sessions(token_hash TEXT PRIMARY KEY,email TEXT,expires_at TEXT,revoked_at TEXT)");
sql.prepare("INSERT INTO operator_sessions VALUES(?,?,?,NULL)").run(await sha256Hex("op-session-token-1234567890"), "abod.louai@gmail.com", "2099-01-01T00:00:00.000Z");
sql.prepare("INSERT INTO client_config VALUES(?,?,?)").run("acme", "Acme", "client");
sql.prepare("INSERT INTO client_sessions VALUES(?,?,?,?)").run(await sha256Hex("sess-client"), "acme", "2099-01-01T00:00:00.000Z", "x");

const r2 = new Map();
const env = {
  OPERATOR_EMAILS: "abod.louai@gmail.com",
  MEDIA: {
    async get(key) { const hit = r2.get(key); return hit ? { body: hit.body, httpMetadata: hit.httpMetadata } : null; },
    async put(key, body, options = {}) { r2.set(key, { body, httpMetadata: options.httpMetadata }); },
    async delete(key) { r2.delete(key); },
  },
  DB: {
    prepare(query) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args) }; },
        async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes } }; },
      };
      return statement;
    },
  },
};
const call = (fn, request) => fn({ request, env, data: {} });
const op = (request) => { rememberOperator(request, { email: "abod.louai@gmail.com", via: "access" }); return request; };
const upload = (owner, file, headers = {}) => {
  const form = new FormData();
  form.set("owner", owner);
  if (file) form.set("file", file);
  return new Request("https://x/api/avatar", { method: "POST", headers, body: form });
};
const png = new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], "me.png", { type: "image/png" });

test("operator picture: upload, read, delete", async () => {
  assert.equal((await call(avatarGet, op(new Request("https://x/api/avatar?owner=operator")))).status, 204, "no picture yet: empty, not an error");
  const saved = await call(avatarPost, op(upload("operator", png)));
  assert.equal(saved.status, 200);
  const read = await call(avatarGet, op(new Request("https://x/api/avatar?owner=operator")));
  assert.equal(read.status, 200);
  assert.equal(read.headers.get("content-type"), "image/png");
  await call(avatarDelete, op(new Request("https://x/api/avatar?owner=operator", { method: "DELETE" })));
  assert.equal((await call(avatarGet, op(new Request("https://x/api/avatar?owner=operator")))).status, 204);
});

test("operator picture shows in a plain <img>: the sign-in cookie is enough to read it", async () => {
  await call(avatarPost, op(upload("operator", png)));
  const cookie = { cookie: "__Host-pulsify_operator=op-session-token-1234567890" };
  const read = await call(avatarGet, new Request("https://x/api/avatar?owner=operator", { headers: cookie }));
  assert.equal(read.status, 200, "no x-pulsify-operator header, still the picture");
  assert.equal((await call(avatarGet, new Request("https://x/api/avatar?owner=operator"))).status, 401, "signed out: no picture");
  assert.equal((await call(avatarPost, upload("operator", png, cookie))).status, 401, "changing it still needs the bound operator");
  await call(avatarDelete, op(new Request("https://x/api/avatar?owner=operator", { method: "DELETE" })));
});

test("client picture needs their session; wrong types and sizes are refused", async () => {
  const cookie = { cookie: `${CLIENT_SESSION_COOKIE}=sess-client` };
  assert.equal((await call(avatarPost, upload("client", png))).status, 401);
  assert.equal((await call(avatarPost, upload("client", new File(["x"], "a.gif", { type: "image/gif" }), cookie))).status, 415);
  assert.equal((await call(avatarPost, upload("client", new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }), cookie))).status, 413);
  assert.equal((await call(avatarPost, upload("client", png, cookie))).status, 200);
  assert.ok(r2.has("avatars/client/acme"));
  assert.equal((await call(avatarGet, new Request("https://x/api/avatar?owner=client", { headers: cookie }))).status, 200);
});

// Bring your own key (pulsify-saas #18): a client pastes their own Google or Anthropic key, it is checked, stored
// sealed, used only for their chats, and never shown back. Real SQLite, mocked providers.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as integrationsApi from "../functions/api/client-integrations.js";
import * as chatApi from "../functions/api/copy-chat.js";
import * as rootApi from "../functions/api/integrations.js";
import { resolveAi, aiKeyContext } from "../functions/_shared/ai-provider.js";
import { unseal } from "../functions/_shared/secret-box.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, status TEXT DEFAULT 'prospect');
CREATE TABLE client_brain(id INTEGER, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT);
CREATE TABLE proof_items(id INTEGER, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);`);
for (const file of ["0008_integrations_hub.sql", "0042_studio_feedback.sql", "0053_copy_chat.sql"]) sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8").replace(/ALTER TABLE client_config[^;]*;/g, ""));
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES (?,?,?),(?,?,?)").run("a", "Alpha", await sha256Hex("token-a"), "b", "Beta", await sha256Hex("token-b"));
sql.prepare("INSERT INTO client_brain VALUES (1,?,?,?,?,?,?)").run("a", "voice", "tone", '"ALPHA VOICE"', "test", "2026-10-01");

const DB = {
  prepare(query) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }; },
    };
    return statement;
  },
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
};
const KEY = Buffer.alloc(32, 7).toString("base64");
const env = { DB, INTEGRATION_ENCRYPTION_KEY: KEY };

const GOOD_GEMINI = "AIza" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8";
const GOOD_CLAUDE = "sk-ant-" + "api03-abcdefghijklmnopqrstuvwxyz0123456789";
const realFetch = globalThis.fetch;
const seen = [];
let providerAnswer = 200;
globalThis.fetch = async (url, init) => {
  const target = String(url);
  seen.push({ url: target, headers: init?.headers || {}, body: init?.body ? JSON.parse(init.body) : null });
  if (target.includes("/v1beta/models?pageSize")) return new Response("{}", { status: providerAnswer });
  if (target.includes("api.anthropic.com/v1/models")) return new Response("{}", { status: providerAnswer });
  if (target.includes(":streamGenerateContent")) {
    return new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "Written on the client's own key." }] } }] })}\n\n`, { status: 200 });
  }
  if (target.includes(":generateContent")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"notes":[]}' }] } }] }), { status: 200 });
  throw new Error(`unexpected fetch ${target}`);
};

const post = (provider, secrets, token = "token-a", extra = {}) => integrationsApi.onRequestPost({
  env,
  request: new Request("https://t/api/client-integrations", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": token }, body: JSON.stringify({ provider, secrets, ...extra }) }),
});
const list = (token = "token-a") => integrationsApi.onRequestGet({ env, request: new Request("https://t/api/client-integrations", { headers: { "x-portal-token": token } }) });
const remove = (provider, token = "token-a") => integrationsApi.onRequestDelete({
  env,
  request: new Request("https://t/api/client-integrations", { method: "DELETE", headers: { "content-type": "application/json", "x-portal-token": token }, body: JSON.stringify({ provider }) }),
});

try {
  // ---- with no key anywhere the client gets the prompt flow
  assert.deepEqual((({ mode, source }) => ({ mode, source }))(await resolveAi(env, "a")), { mode: "manual", source: "none" });

  // ---- a key that is the wrong shape or that the provider refuses is not saved
  let response = await post("gemini", { api_key: "not-a-key" });
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /does not look like a Google key/);
  providerAnswer = 400;
  response = await post("gemini", { api_key: GOOD_GEMINI });
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /Google did not accept that key/);
  assert.equal((await post("gemini", {})).status, 422, "an empty paste is not a connection");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM integrations WHERE provider IN ('gemini','anthropic')").get().n, 0);
  providerAnswer = 200;

  // ---- a good key is checked read-only with its provider, then stored sealed
  seen.length = 0;
  response = await post("gemini", { api_key: GOOD_GEMINI }, "token-a", { config: { last_four: "HACK", connected_at: "1999-01-01" } });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.integration.connected, true);
  assert.equal(saved.integration.config.last_four, GOOD_GEMINI.slice(-4), "the client cannot choose what is displayed");
  assert.notEqual(saved.integration.config.connected_at, "1999-01-01");
  assert.equal(saved.integration.config.api_key_set, true);
  assert.doesNotMatch(JSON.stringify(saved), new RegExp(GOOD_GEMINI), "the response never carries the key");
  assert.equal(seen[0].headers["x-goog-api-key"], GOOD_GEMINI, "checked with the provider, key in a header");
  assert.doesNotMatch(seen[0].url, new RegExp(GOOD_GEMINI), "never in a URL");

  const raw = sql.prepare("SELECT secret_json FROM integrations WHERE client_id='a' AND provider='gemini'").get().secret_json;
  assert.doesNotMatch(raw, new RegExp(GOOD_GEMINI), "stored sealed, not as text");
  const sealed = JSON.parse(raw).api_key;
  assert.equal(await unseal(env, sealed, aiKeyContext("a", "gemini")), GOOD_GEMINI);
  await assert.rejects(() => unseal(env, sealed, aiKeyContext("b", "gemini")), undefined, "a copied row cannot be opened for another client");

  // ---- reading the list back shows connected and the last four only
  const listed = await (await list()).json();
  const row = listed.integrations.find((item) => item.provider === "gemini");
  assert.equal(row.connected, true);
  assert.equal(row.config.last_four, GOOD_GEMINI.slice(-4));
  assert.doesNotMatch(JSON.stringify(listed), new RegExp(GOOD_GEMINI));
  assert.equal((await (await list("token-b")).json()).integrations.find((item) => item.provider === "gemini").connected, false, "another client does not see it");

  // ---- resolution: their key is theirs alone
  let ai = await resolveAi(env, "a");
  assert.deepEqual([ai.mode, ai.source, ai.apiKey], ["gemini", "client", GOOD_GEMINI]);
  assert.equal((await resolveAi(env, "b")).mode, "manual", "client b has no key and gets no one else's");

  // ---- platform keys: Gemini only for allow-listed clients, Opus for everyone, a client key always wins
  const withPlatformGemini = { ...env, GEMINI_API_KEY: "platform-g" };
  assert.equal((await resolveAi(withPlatformGemini, "b")).mode, "manual", "a free platform key never touches a real client's data by default");
  assert.deepEqual((({ mode, source }) => ({ mode, source }))(await resolveAi({ ...withPlatformGemini, AI_PLATFORM_CLIENTS: "b, demo-rio" }, "b")), { mode: "gemini", source: "platform" });
  assert.equal((await resolveAi({ ...withPlatformGemini, AI_PLATFORM_CLIENTS: "*" }, "b")).source, "platform");
  assert.equal((await resolveAi({ ...withPlatformGemini, AI_PLATFORM_CLIENTS: "b" }, "a")).apiKey, GOOD_GEMINI, "their own key beats the platform key");
  assert.deepEqual((({ mode, source }) => ({ mode, source }))(await resolveAi({ ...env, ANTHROPIC_API_KEY: "platform-a" }, "b")), { mode: "anthropic", source: "platform" });
  response = await post("anthropic", { api_key: GOOD_CLAUDE });
  assert.equal(response.status, 200);
  assert.equal((await resolveAi(env, "a")).mode, "anthropic", "their Claude key is preferred over their Google key");
  assert.equal((await post("anthropic", { api_key: GOOD_CLAUDE }, "bad")).status, 401);

  // ---- the chat writes on the client's own key and says so
  await remove("anthropic");
  seen.length = 0;
  const state = await (await chatApi.onRequestGet({ env, request: new Request("https://t/api/copy-chat", { headers: { "x-portal-token": "token-a" } }) })).json();
  assert.equal(state.mode, "generated");
  assert.equal(state.source, "client");
  const pending = [];
  const reply = await chatApi.onRequestPost({
    env,
    waitUntil: (promise) => pending.push(promise),
    request: new Request("https://t/api/copy-chat", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": "token-a" }, body: JSON.stringify({ action: "send", message: "A reel about sizing" }) }),
  });
  assert.match(await reply.text(), /Written on the client's own key\./);
  await Promise.all(pending);
  assert.ok(seen.some((call) => call.url.includes(":streamGenerateContent") && call.headers["x-goog-api-key"] === GOOD_GEMINI), "Google was called with the client's own key");
  const stateB = await (await chatApi.onRequestGet({ env, request: new Request("https://t/api/copy-chat", { headers: { "x-portal-token": "token-b" } }) })).json();
  assert.deepEqual([stateB.mode, stateB.source], ["manual", "none"]);

  // ---- the route the portal's Integrations screen actually writes through protects the key the same way
  await remove("gemini");
  const viaRoot = (body, token = "token-a") => rootApi.onRequestPost({
    env,
    data: {},
    request: new Request("https://t/api/integrations?scope=client&client=a", { method: "POST", headers: { "content-type": "application/json", "x-portal-token": token }, body: JSON.stringify({ scope: "client", client: "a", ...body }) }),
  });
  providerAnswer = 400;
  response = await viaRoot({ provider: "gemini", secrets: { api_key: GOOD_GEMINI } });
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /Google did not accept that key/);
  providerAnswer = 200;
  response = await viaRoot({ provider: "gemini", secrets: { api_key: GOOD_GEMINI }, config: { last_four: "HACK" } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).integration.config.last_four, GOOD_GEMINI.slice(-4));
  assert.doesNotMatch(sql.prepare("SELECT secret_json FROM integrations WHERE client_id='a' AND provider='gemini'").get().secret_json, new RegExp(GOOD_GEMINI), "sealed on this route too");
  assert.equal((await resolveAi(env, "a")).apiKey, GOOD_GEMINI);
  assert.equal((await viaRoot({ provider: "gemini", secrets: {} })).status, 422, "nothing to save without a key");

  // ---- disconnecting puts them back on the prompt flow
  assert.equal((await (await remove("gemini")).json()).deleted, true);
  assert.equal((await resolveAi(env, "a")).mode, "manual");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM integrations WHERE provider IN ('gemini','anthropic')").get().n, 0);

  console.log("PASS client AI key: validated with the provider, stored sealed to one client, never shown back, their key beats platform keys, free platform key limited to allow-listed workspaces, chat writes on their key, disconnect returns to the prompt flow.");
} finally {
  globalThis.fetch = realFetch;
}

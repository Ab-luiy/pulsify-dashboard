// Canva Connect for the carousel editor: signed state, PKCE, sealed tokens with refresh, import/export, return.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { makeCanvaState, readCanvaState, pkcePair, authorizeUrl, canvaToken, verifyReturnJwt } from "../functions/_shared/canva.js";
import * as connect from "../functions/api/canva-connect.js";
import * as design from "../functions/api/canva-design.js";
import * as back from "../functions/api/canva-return.js";
import { sha256Hex } from "../functions/_shared/common.js";

const KEY = Buffer.alloc(32, 7).toString("base64");
const baseEnv = { CANVA_CLIENT_ID: "OC-test", CANVA_CLIENT_SECRET: "cnvsecret", INTEGRATION_ENCRYPTION_KEY: KEY };

async function makeEnv() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active');
CREATE TABLE integrations(scope TEXT, client_id TEXT, provider TEXT, config_json TEXT, secret_json TEXT, created_at TEXT, updated_at TEXT, UNIQUE(scope, client_id, provider));
CREATE TABLE integration_events(provider TEXT, client TEXT, ts TEXT);`);
  sql.exec(readFileSync(new URL("../migrations/0018_studio_carousels.sql", import.meta.url), "utf8"));
  sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES ('rio','Rio',?,'{}')").run(await sha256Hex("rio-token"));
  sql.prepare("INSERT INTO studio_carousels(client_id, structure, topic, goal, params_json, output_json, status, created_at, updated_at) VALUES ('rio','methodology','3 checks','reach','{}','{}','draft','t','t')").run();
  const DB = { prepare(q) { let a = []; const s = { bind(...v) { a = v; return s; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return s; } };
  const store = new Map();
  const MEDIA = { async put(k, v) { store.set(k, v); } };
  return { env: { ...baseEnv, DB, MEDIA }, sql, store };
}
const req = (path, init = {}) => new Request(`https://pulsify-ai.com${path}`, { ...init, headers: { "x-portal-token": "rio-token", ...(init.headers || {}) } });

test("state is signed to the workspace and expires; PKCE challenge matches the verifier", async () => {
  const state = await makeCanvaState(baseEnv, "rio", 7, 1_000);
  assert.deepEqual(await readCanvaState(baseEnv, state, 2_000), { client: "rio", carousel: 7 });
  assert.equal(await readCanvaState(baseEnv, state.replace("rio", "sam"), 2_000), null, "tampered state is refused");
  assert.equal(await readCanvaState(baseEnv, state, 1_000 + 31 * 60000), null, "expired state is refused");
  const { verifier, challenge } = await pkcePair();
  const digest = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64url");
  assert.equal(challenge, digest);
  const url = new URL(authorizeUrl(baseEnv, "https://pulsify-ai.com", challenge, state));
  assert.equal(url.origin + url.pathname, "https://www.canva.com/api/oauth/authorize");
  assert.equal(url.searchParams.get("redirect_uri"), "https://pulsify-ai.com/api/canva-connect");
  assert.equal(url.searchParams.get("code_challenge_method"), "s256");
  assert.equal(url.searchParams.get("scope"), "design:content:read design:content:write", "only the two scopes the flow uses");
});

test("start sets the verifier cookie; the callback stores sealed tokens for that workspace only", async () => {
  const { env, sql } = await makeEnv();
  const start = await connect.onRequestGet({ env, request: req("/api/canva-connect?action=start&carousel=1") });
  assert.equal(start.status, 302);
  const location = new URL(start.headers.get("location"));
  const verifier = start.headers.get("set-cookie").match(/pulsify_canva_pkce=([^;]+)/)[1];
  const realFetch = globalThis.fetch;
  let tokenForm = null;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.canva.com/rest/v1/oauth/token");
    assert.equal(init.headers.authorization, `Basic ${btoa("OC-test:cnvsecret")}`);
    tokenForm = new URLSearchParams(init.body);
    return new Response(JSON.stringify({ access_token: "AT1", refresh_token: "RT1", expires_in: 14400 }), { status: 200 });
  };
  try {
    const callback = await connect.onRequestGet({ env, request: req(`/api/canva-connect?code=abc&state=${encodeURIComponent(location.searchParams.get("state"))}`, { headers: { cookie: `pulsify_canva_pkce=${verifier}` } }) });
    assert.equal(callback.status, 302);
    assert.match(callback.headers.get("location"), /\/app\/portal\/instagram\/carousels\?id=1&canva=connected$/);
    assert.equal(tokenForm.get("code_verifier"), verifier);
    const row = sql.prepare("SELECT secret_json FROM integrations WHERE provider='canva'").get();
    assert.ok(!row.secret_json.includes("AT1"), "tokens are sealed at rest");
    assert.equal(await canvaToken(env, "rio"), "AT1");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("an expired token is refreshed and the rotated refresh token is kept", async () => {
  const { env, sql } = await makeEnv();
  const realFetch = globalThis.fetch;
  const forms = [];
  globalThis.fetch = async (_url, init) => {
    forms.push(new URLSearchParams(init.body));
    const n = forms.length;
    return new Response(JSON.stringify({ access_token: `AT${n}`, refresh_token: `RT${n}`, expires_in: n === 1 ? 0 : 14400 }), { status: 200 });
  };
  try {
    const { exchangeCode } = await import("../functions/_shared/canva.js");
    await exchangeCode(env, "rio", "https://pulsify-ai.com", "code", "verifier");
    assert.equal(await canvaToken(env, "rio"), "AT2", "the expired token was refreshed");
    assert.equal(forms[1].get("grant_type"), "refresh_token");
    assert.equal(forms[1].get("refresh_token"), "RT1");
    assert.ok(sql.prepare("SELECT secret_json FROM integrations WHERE provider='canva'").get().secret_json.length > 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("import sends the pptx and remembers the design; export stores the PNGs in the client's media", async () => {
  const { env, sql, store } = await makeEnv();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith("/oauth/token")) return new Response(JSON.stringify({ access_token: "AT", refresh_token: "RT", expires_in: 14400 }), { status: 200 });
    if (u.endsWith("/imports")) {
      const meta = JSON.parse(init.headers["import-metadata"]);
      assert.equal(meta.mime_type, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      return new Response(JSON.stringify({ job: { id: "J1", status: "in_progress" } }), { status: 200 });
    }
    if (u.endsWith("/imports/J1")) return new Response(JSON.stringify({ job: { id: "J1", status: "success", result: { designs: [{ id: "D1", urls: { edit_url: "https://www.canva.com/api/design/tok/edit" } }] } } }), { status: 200 });
    if (u.endsWith("/exports")) {
      assert.deepEqual(JSON.parse(init.body).format, { type: "png", width: 1080, height: 1350 });
      return new Response(JSON.stringify({ job: { id: "E1", status: "success", urls: ["https://export.canva.com/1.png", "https://export.canva.com/2.png"] } }), { status: 200 });
    }
    if (u.startsWith("https://export.canva.com/")) return new Response("PNG", { status: 200 });
    throw new Error(`unexpected ${u}`);
  };
  try {
    const { exchangeCode } = await import("../functions/_shared/canva.js");
    await exchangeCode(env, "rio", "https://pulsify-ai.com", "code", "verifier");
    const imported = await (await design.onRequestPost({ env, request: req("/api/canva-design?action=import&carousel=1", { method: "POST", body: "PPTXBYTES" }) })).json();
    assert.equal(imported.ok, true);
    assert.equal(imported.edit_url, "https://www.canva.com/api/design/tok/edit?correlation_state=c1");
    assert.equal(JSON.parse(sql.prepare("SELECT params_json FROM studio_carousels WHERE id=1").get().params_json).canva.design_id, "D1");
    const exported = await (await design.onRequestPost({ env, request: req("/api/canva-design?action=export&carousel=1", { method: "POST" }) })).json();
    assert.equal(exported.urls.length, 2);
    assert.match(exported.urls[0], /^\/m\/rio\/[0-9a-f-]{36}\.png$/);
    assert.equal(store.size, 2);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("without Canva connected, the editor is told to connect; another client's carousel is refused", async () => {
  const { env, sql } = await makeEnv();
  const missing = await design.onRequestPost({ env, request: req("/api/canva-design?action=import&carousel=1", { method: "POST", body: "x" }) });
  assert.equal(missing.status, 409);
  assert.equal((await missing.json()).connect, true);
  sql.exec("UPDATE studio_carousels SET client_id='sam'");
  assert.equal((await design.onRequestPost({ env, request: req("/api/canva-design?action=import&carousel=1", { method: "POST", body: "x" }) })).status, 404);
});

test("the return link only trusts a token signed by Canva for this app", async () => {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid: "K1" };
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const sign = async (claims) => {
    const head = enc({ alg: "RS256", kid: "K1" });
    const body = enc(claims);
    const sig = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${head}.${body}`))).toString("base64url");
    return `${head}.${body}.${sig}`;
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://api.canva.com/rest/v1/connect/keys");
    return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
  };
  try {
    const good = await sign({ aud: "OC-test", type: "rti", exp: Math.floor(Date.now() / 1000) + 3600, design_id: "D1", correlation_state: "c1" });
    const res = await back.onRequestGet({ env: baseEnv, request: new Request(`https://pulsify-ai.com/api/canva-return?correlation_jwt=${good}`) });
    assert.equal(res.headers.get("location"), "https://pulsify-ai.com/app/portal/instagram/carousels?id=1&canva=back");
    const wrongApp = await sign({ aud: "OC-other", type: "rti", exp: Math.floor(Date.now() / 1000) + 3600, correlation_state: "c1" });
    assert.equal(await verifyReturnJwt(baseEnv, wrongApp), null);
    const forged = good.slice(0, -4) + "AAAA";
    const res2 = await back.onRequestGet({ env: baseEnv, request: new Request(`https://pulsify-ai.com/api/canva-return?correlation_jwt=${forged}`) });
    assert.equal(res2.headers.get("location"), "https://pulsify-ai.com/app/portal/instagram/carousels");
  } finally {
    globalThis.fetch = realFetch;
  }
});

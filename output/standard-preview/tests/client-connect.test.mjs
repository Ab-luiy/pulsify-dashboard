// Clients connect their own Instagram and YouTube (functions/api/client-connect.js, founder 2026-10-12).
// Real SQLite with the migrations, fake Zernio, a client signed in with their portal token.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { sha256Hex } from "../functions/_shared/common.js";
import { onRequestGet, onRequestPost, makeState, readState } from "../functions/api/client-connect.js";
import { onRequestPost as saveIntegration } from "../functions/api/client-integrations.js";
import { getIntegration } from "../functions/_shared/integrations.js";

const sql = new DatabaseSync(":memory:");
// client_config predates the numbered migrations; this is the slice client auth reads.
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, portal_token_hash TEXT, updated_at TEXT)`);
for (const file of readdirSync(new URL("../migrations/", import.meta.url)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()) {
  for (const st of readFileSync(new URL("../migrations/" + file, import.meta.url), "utf8").replace(/--[^\n]*/g, "").split(";")) {
    if (st.trim()) try { sql.exec(st); } catch { /* later migrations alter tables this test does not need */ }
  }
}
const env = {
  ZERNIO_API_KEY: "test",
  INTEGRATION_ENCRYPTION_KEY: "k".repeat(44),
  DB: {
    prepare(q) { let a = []; const p = { bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return p; },
    async batch(list) { const out = []; for (const st of list) out.push(await st.run()); return out; },
  },
};
sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash) VALUES(?,?,?)").run("demo-rio", "Demo Rio", await sha256Hex("rio-token"));

const zernioCalls = [];
function fakeZernio() {
  return async (url, init = {}) => {
    const u = String(url);
    zernioCalls.push({ url: u, method: init.method || "GET" });
    if (u.endsWith("/v1/profiles") && init.method === "POST") return Response.json({ _id: "prof-rio" });
    if (u.includes("/v1/connect/instagram") || u.includes("/v1/connect/youtube")) return Response.json({ authUrl: "https://zernio.com/oauth/start?x=1" });
    if (u.includes("/v1/accounts/") && init.method === "DELETE") return Response.json({ ok: true });
    return Response.json({ error: "unexpected " + u }, { status: 500 });
  };
}

test("the signed state round-trips, and a changed or old one is refused", async () => {
  const state = await makeState(env, "demo-rio", "instagram");
  assert.deepEqual(await readState(env, state), { client: "demo-rio", platform: "instagram" });
  assert.equal(await readState(env, state.replace("demo-rio", "other-client")), null, "another workspace cannot be swapped in");
  assert.equal(await readState(env, await makeState(env, "demo-rio", "instagram", Date.now() - 3600000)), null, "expired after 30 minutes");
  assert.equal(await readState(env, "garbage"), null);
});

test("start needs a signed-in client and sends them to the platform sign-in on their own profile", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = fakeZernio();
  try {
    const anon = await onRequestGet({ request: new Request("https://pulsify-ai.com/api/client-connect?action=start&platform=instagram"), env });
    assert.ok(anon.status === 401 || anon.status === 403, "nobody signed in, no sign-in link");
    sql.exec("CREATE TABLE IF NOT EXISTS client_sessions(token_hash TEXT, client_id TEXT, expires_at TEXT, created_at TEXT)");
    sql.prepare("INSERT INTO client_sessions VALUES(?,?,?,?)").run(await sha256Hex("sess-rio"), "demo-rio", new Date(Date.now() + 3600000).toISOString(), new Date().toISOString());
    const signedIn = await onRequestGet({ request: new Request("https://pulsify-ai.com/api/client-connect?action=start&platform=instagram", { headers: { cookie: "pulsify_client_session=sess-rio" } }), env });
    assert.equal(signedIn.status, 302);
    assert.equal(signedIn.headers.get("location"), "https://zernio.com/oauth/start?x=1");
    const connect = zernioCalls.find((call) => call.url.includes("/v1/connect/instagram"));
    assert.match(connect.url, /profileId=prof-rio/, "the client's own Zernio profile, created on first connect");
    assert.match(decodeURIComponent(connect.url), /redirect_url=https:\/\/pulsify-ai\.com\/api\/client-connect\?action=callback&state=demo-rio\.instagram\./);
  } finally {
    globalThis.fetch = real;
  }
});

test("the callback saves the account on the workspace that started it; YouTube also sets the channel handle", async () => {
  const ig = await onRequestGet({ request: new Request(`https://pulsify-ai.com/api/client-connect?action=callback&state=${encodeURIComponent(await makeState(env, "demo-rio", "instagram"))}&connected=instagram&profileId=prof-rio&accountId=acc-ig&username=rio.trades`), env });
  assert.equal(ig.status, 302);
  assert.match(ig.headers.get("location"), /\/app\/portal\/access\?connected=instagram$/);
  const saved = await getIntegration(env, "client", "demo-rio", "instagram");
  assert.equal(saved.config.account_id, "acc-ig");
  assert.equal(saved.config.username, "rio.trades");
  assert.equal(saved.config.profile_id, "prof-rio");

  await onRequestGet({ request: new Request(`https://pulsify-ai.com/api/client-connect?action=callback&state=${encodeURIComponent(await makeState(env, "demo-rio", "youtube"))}&profileId=prof-rio&accountId=acc-yt&username=riotrades`), env });
  const yt = await getIntegration(env, "client", "demo-rio", "youtube");
  assert.equal(yt.config.handle, "@riotrades", "cash by video picks the channel up from here");

  const forged = await onRequestGet({ request: new Request("https://pulsify-ai.com/api/client-connect?action=callback&state=demo-rio.instagram.9999999999999.bad&accountId=evil"), env });
  assert.match(forged.headers.get("location"), /connect_error=unknown&reason=expired/);
  const failed = await onRequestGet({ request: new Request(`https://pulsify-ai.com/api/client-connect?action=callback&state=${encodeURIComponent(await makeState(env, "demo-rio", "instagram"))}&error=access_denied`), env });
  assert.match(failed.headers.get("location"), /connect_error=instagram&reason=access_denied/);
});

test("a client cannot set the connected account through the normal settings save", async () => {
  const response = await saveIntegration({
    request: new Request("https://pulsify-ai.com/api/client-integrations", { method: "POST", headers: { "x-portal-token": "rio-token", "content-type": "application/json" }, body: JSON.stringify({ provider: "instagram", config: { account_id: "someone-elses", username: "x" }, confirm: true }) }),
    env,
  });
  assert.equal(response.status, 200);
  assert.equal((await getIntegration(env, "client", "demo-rio", "instagram")).config.account_id, "acc-ig", "unchanged");
});

test("disconnect forgets it here and removes it on Zernio", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = fakeZernio();
  try {
    const response = await onRequestPost({ request: new Request("https://pulsify-ai.com/api/client-connect", { method: "POST", headers: { "x-portal-token": "rio-token", "content-type": "application/json" }, body: JSON.stringify({ action: "disconnect", platform: "instagram" }) }), env });
    assert.equal(response.status, 200);
    assert.equal(await getIntegration(env, "client", "demo-rio", "instagram"), null);
    assert.ok(zernioCalls.some((c) => c.method === "DELETE" && c.url.endsWith("/v1/accounts/acc-ig")));
  } finally {
    globalThis.fetch = real;
  }
});

test("coming from onboarding, every way out returns to the onboarding form, not the Integrations page", async () => {
  const state = encodeURIComponent(await makeState(env, "demo-rio", "youtube"));
  const ok = await onRequestGet({ request: new Request(`https://pulsify-ai.com/api/client-connect?action=callback&state=${state}&return=onboarding&accountId=acc-yt2&username=riotrades`), env });
  assert.match(ok.headers.get("location"), /\/app\/portal\/onboarding\?connected=youtube$/);
  const denied = await onRequestGet({ request: new Request(`https://pulsify-ai.com/api/client-connect?action=callback&state=${state}&return=onboarding&error=access_denied`), env });
  assert.match(denied.headers.get("location"), /\/app\/portal\/onboarding\?connect_error=youtube&reason=access_denied$/);
  const expired = await onRequestGet({ request: new Request("https://pulsify-ai.com/api/client-connect?action=callback&state=nope&return=onboarding"), env });
  assert.match(expired.headers.get("location"), /\/app\/portal\/onboarding\?connect_error=unknown&reason=expired$/);
  // An unknown return value falls back to the normal page, so nobody can send a client somewhere else.
  const other = await onRequestGet({ request: new Request(`https://pulsify-ai.com/api/client-connect?action=callback&state=${state}&return=https://evil.test&error=access_denied`), env });
  assert.match(other.headers.get("location"), /^https:\/\/pulsify-ai\.com\/app\/portal\/access\?/);
});

test("start from onboarding passes the return along, and says plainly when connecting is switched off", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = fakeZernio();
  try {
    const cookie = { cookie: "pulsify_client_session=sess-rio" };
    const started = await onRequestGet({ request: new Request("https://pulsify-ai.com/api/client-connect?action=start&platform=youtube&return=onboarding", { headers: cookie }), env });
    assert.equal(started.status, 302);
    const connect = zernioCalls.filter((call) => call.url.includes("/v1/connect/youtube")).at(-1);
    assert.match(decodeURIComponent(connect.url), /action=callback&state=demo-rio\.youtube\.[^&]+&return=onboarding/);

    const off = { ...env, ZERNIO_API_KEY: "" };
    const unavailable = await onRequestGet({ request: new Request("https://pulsify-ai.com/api/client-connect?action=start&platform=youtube&return=onboarding", { headers: cookie }), env: off });
    assert.match(unavailable.headers.get("location"), /\/app\/portal\/onboarding\?connect_error=youtube&reason=unavailable$/);

    const on = await (await onRequestGet({ request: new Request("https://pulsify-ai.com/api/client-connect?action=status", { headers: cookie }), env })).json();
    const gone = await (await onRequestGet({ request: new Request("https://pulsify-ai.com/api/client-connect?action=status", { headers: cookie }), env: off })).json();
    assert.deepEqual([on.available, gone.available], [true, false]);
  } finally {
    globalThis.fetch = real;
  }
});

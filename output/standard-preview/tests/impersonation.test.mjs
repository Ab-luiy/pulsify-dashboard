import * as copywriterApi from '../functions/api/copywriter.js';
import { strict as assert } from "node:assert";
import * as impersonateApi from "../functions/api/impersonate.js";
import * as clientBrainApi from "../functions/api/client-brain.js";
import * as clientDashboardApi from "../functions/api/client-dashboard.js";
import * as clientEmailCodeApi from "../functions/api/client-email-code.js";
import * as clientIntegrationsApi from "../functions/api/client-integrations.js";
import * as clientLogoutApi from "../functions/api/client-logout.js";
import * as clientSetPasswordApi from "../functions/api/client-set-password.js";
import * as mediaUploadApi from "../functions/api/media-upload.js";
import * as metricsSequencesApi from "../functions/api/metrics-sequences.js";
import * as metricsWeeklyApi from "../functions/api/metrics-weekly.js";
import * as operatorOverviewApi from "../functions/api/operator-overview.js";
import * as portalTokenApi from "../functions/api/portal-token.js";
import * as studioGenerateApi from "../functions/api/studio-generate.js";
import * as studioSequencesApi from "../functions/api/studio-sequences.js";
import * as todoApi from "../functions/api/client-dashboard-todo.js";
import * as onboardRoute from "../functions/onboard/[[path]].js";
import { onRequest as appPortalGate } from "../functions/app/portal/[[path]].js";
import * as portalRoute from "../functions/portal/[[path]].js";
import { CLIENT_SESSION_COOKIE } from "../functions/_shared/client-auth.js";

class MockDB {
  constructor() {
    this.configs = [{
      client: "alpha",
      client_name: "Alpha Coach",
      page_content_json: "{}",
      portal_token_hash: null,
    }];
    this.clientSessions = [];
    this.impersonationSessions = [];
    this.operatorEvents = [];
    this.brain = [];
    this.proof = [];
    this.dashboardContent = [{
      client_id: "alpha",
      section: "todos",
      json: JSON.stringify([{ title: "Ship the sequence", done: false }]),
      updated_at: futureIso(-1),
    }];
    this.payments = [{
      id: 1,
      client: "alpha",
      amount_cents: 125000,
      currency: "USD",
      rail: "stripe",
      reference: "paid-1",
      occurred_at: futureIso(-1),
      note: "Mentorship",
      recorded_by: "test",
    }];
    this.contentItems = [];
    this.studioSequences = [];
    this.nextIds = { impersonation: 1, operator: 1, brain: 1, proof: 1, studio: 1 };
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    const sql = this.sql;
    if (sql.startsWith("UPDATE impersonation_sessions") && sql.includes("RETURNING")) {
      const [tokenHash, consumedAt, exchangeHash, cutoff] = this.params;
      const row = this.db.impersonationSessions.find((entry) =>
        entry.exchange_hash === exchangeHash
        && entry.token_hash == null
        && entry.consumed_at == null
        && entry.expires_at > cutoff);
      if (!row) return null;
      Object.assign(row, {
        token_hash: tokenHash,
        exchange_hash: null,
        consumed_at: consumedAt,
      });
      return {
        client_id: row.client_id,
        expires_at: row.expires_at,
        created_by: row.created_by,
      };
    }
    if (sql.includes("FROM impersonation_sessions s")) {
      const [tokenHash, cutoff] = this.params;
      const row = this.db.impersonationSessions.find((entry) =>
        entry.token_hash === tokenHash
        && entry.consumed_at != null
        && entry.expires_at > cutoff);
      if (!row) return null;
      const config = this.db.configs.find((entry) => entry.client === row.client_id);
      return { ...row, client_name: config?.client_name || row.client_id };
    }
    if (sql.includes("FROM client_sessions s")) {
      const [tokenHash, cutoff] = this.params;
      const row = this.db.clientSessions.find((entry) =>
        entry.token_hash === tokenHash && entry.expires_at > cutoff);
      if (!row) return null;
      const config = this.db.configs.find((entry) => entry.client === row.client_id);
      return { ...row, client_name: config?.client_name || row.client_id };
    }
    if (sql.includes("COUNT(*) AS total") && sql.includes("FROM impersonation_sessions")) {
      const [createdBy, threshold] = this.params;
      return {
        total: this.db.impersonationSessions.filter((entry) =>
          entry.created_by === createdBy && entry.created_at >= threshold).length,
      };
    }
    if (sql.includes("FROM client_config WHERE client=?")) {
      const row = this.db.configs.find((entry) => entry.client === this.params[0]);
      if (!row) return null;
      if (sql.includes("page_content_json")) return row;
      return { client: row.client, client_name: row.client_name };
    }
    if (sql.includes("FROM client_config") && sql.includes("portal_token_hash=?")) {
      const row = this.db.configs.find((entry) => entry.portal_token_hash === this.params[0]);
      return row ? { client: row.client, client_name: row.client_name } : null;
    }
    if (sql.includes("FROM client_dashboard_content") && sql.includes("section='todos'")) {
      const row = this.db.dashboardContent.find((entry) =>
        entry.client_id === this.params[0] && entry.section === "todos");
      return row ? { json: row.json } : null;
    }
    throw new Error(`Unexpected first query: ${sql}`);
  }

  async all() {
    const sql = this.sql;
    const client = this.params[0];
    if (sql.includes("FROM payments")) {
      return { results: this.db.payments.filter((row) => row.client === client) };
    }
    if (sql.includes("FROM client_dashboard_content")) {
      return { results: this.db.dashboardContent.filter((row) => row.client_id === client) };
    }
    if (sql.includes("FROM content_items")) {
      return { results: this.db.contentItems.filter((row) => row.client === client) };
    }
    if (sql.includes("FROM client_brain")) {
      return { results: this.db.brain.filter((row) => row.client_id === client) };
    }
    if (sql.includes("FROM proof_items")) {
      return { results: this.db.proof.filter((row) => row.client_id === client) };
    }
    throw new Error(`Unexpected all query: ${sql}`);
  }

  async run() {
    const sql = this.sql;
    if (sql === "DELETE FROM client_sessions WHERE expires_at<?") {
      this.db.clientSessions = this.db.clientSessions.filter((row) => row.expires_at >= this.params[0]);
      return changes(1);
    }
    if (sql === "DELETE FROM impersonation_sessions WHERE expires_at<?") {
      this.db.impersonationSessions = this.db.impersonationSessions.filter((row) => row.expires_at >= this.params[0]);
      return changes(1);
    }
    if (sql === "DELETE FROM client_sessions WHERE token_hash=?") {
      const before = this.db.clientSessions.length;
      this.db.clientSessions = this.db.clientSessions.filter((row) => row.token_hash !== this.params[0]);
      return changes(before - this.db.clientSessions.length);
    }
    if (sql === "DELETE FROM impersonation_sessions WHERE token_hash=?") {
      const before = this.db.impersonationSessions.length;
      this.db.impersonationSessions = this.db.impersonationSessions.filter((row) => row.token_hash !== this.params[0]);
      return changes(before - this.db.impersonationSessions.length);
    }
    if (sql.startsWith("INSERT INTO impersonation_sessions")) {
      const [exchangeHash, clientId, createdAt, expiresAt, createdBy] = this.params;
      const id = this.db.nextIds.impersonation++;
      this.db.impersonationSessions.push({
        id,
        token_hash: null,
        exchange_hash: exchangeHash,
        client_id: clientId,
        created_at: createdAt,
        expires_at: expiresAt,
        created_by: createdBy,
        consumed_at: null,
      });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (sql.startsWith("INSERT INTO operator_events")) {
      const action = sql.includes("'impersonate-start'") ? "impersonate-start" : "impersonate-use";
      const [actor, client, detail, createdAt] = this.params;
      const id = this.db.nextIds.operator++;
      this.db.operatorEvents.unshift({ id, actor, action, client, detail, created_at: createdAt });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (sql.startsWith("INSERT INTO client_brain")) {
      const [clientId, section, field, valueJson, source, updatedAt] = this.params;
      const id = this.db.nextIds.brain++;
      this.db.brain.push({ id, client_id: clientId, section, field, value_json: valueJson, source, updated_at: updatedAt });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (sql.startsWith("INSERT INTO proof_items")) {
      const [clientId, url, claim, createdAt] = this.params;
      const id = this.db.nextIds.proof++;
      this.db.proof.push({ id, client_id: clientId, kind: "image", url, claim, permission: "unknown", created_at: createdAt });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (sql.startsWith("INSERT INTO studio_sequences")) {
      const id = this.db.nextIds.studio++;
      this.db.studioSequences.push({ id, client_id: this.params[0] });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (sql.startsWith("UPDATE client_dashboard_content")) {
      const [json, updatedAt, clientId] = this.params;
      const row = this.db.dashboardContent.find((entry) =>
        entry.client_id === clientId && entry.section === "todos");
      if (!row) return changes(0);
      Object.assign(row, { json, updated_at: updatedAt });
      return changes(1);
    }
    if (sql.startsWith("DELETE FROM client_brain")) return changes(0);
    throw new Error(`Unexpected run query: ${sql}`);
  }
}

class MockMedia {
  constructor() {
    this.objects = new Map();
  }

  async put(key, value) {
    this.objects.set(key, await new Response(value).arrayBuffer());
  }

  async delete(key) {
    this.objects.delete(key);
  }
}

function changes(count) {
  return { meta: { changes: count } };
}

function futureIso(offsetMinutes = 60) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function jsonRequest(url, method, body, headers = {}) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

function cookieHeader(rawToken) {
  return { cookie: `${CLIENT_SESSION_COOKIE}=${rawToken}` };
}

async function seedSession(db, rawToken, impersonated, expiresAt = futureIso(30)) {
  const row = {
    token_hash: await sha256Hex(rawToken),
    client_id: "alpha",
    created_at: futureIso(-1),
    expires_at: expiresAt,
  };
  if (impersonated) {
    db.impersonationSessions.push({
      id: db.nextIds.impersonation++,
      ...row,
      exchange_hash: null,
      created_by: "admin",
      consumed_at: futureIso(-1),
    });
  } else {
    db.clientSessions.push(row);
  }
}

async function assertReadOnly(response, label) {
  assert.equal(response.status, 403, `${label} must reject impersonation with 403`);
  assert.deepEqual(await response.json(), { error: "read only" }, `${label} must return the shared read-only error`);
}

async function testMintExchangeReadAndAudit() {
  const db = new MockDB();
  const env = { ADMIN_KEY: "secret", DB: db };

  const unauthorized = await impersonateApi.onRequestPost({
    request: jsonRequest("https://funnels.test/api/impersonate", "POST", { client: "alpha" }),
    env,
  });
  assert.equal(unauthorized.status, 401);

  const minted = await impersonateApi.onRequestPost({
    request: jsonRequest(
      "https://funnels.test/api/impersonate",
      "POST",
      { client: "alpha" },
      { "x-admin-key": "secret" },
    ),
    env,
  });
  assert.equal(minted.status, 201);
  const mintBody = await minted.json();
  assert.equal(mintBody.ok, true);
  assert.equal(mintBody.expires_in_minutes, 30);
  assert.match(mintBody.url, /^\/portal\/\?imp=[A-Za-z0-9_-]+$/);
  assert.equal(db.operatorEvents[0].action, "impersonate-start");
  assert.equal(db.operatorEvents[0].client, "alpha");
  assert.equal(db.impersonationSessions[0].token_hash, null);

  const exchangeUrl = new URL(mintBody.url, "https://funnels.test");
  assert.notEqual(
    db.impersonationSessions[0].exchange_hash,
    exchangeUrl.searchParams.get("imp"),
    "the one-time URL token must only be stored as a hash",
  );
  const exchangeResponse = await portalRoute.onRequest({
    request: new Request(exchangeUrl),
    env,
    params: { path: [] },
    next: () => new Response("next"),
  });
  assert.equal(exchangeResponse.status, 302);
  assert.equal(exchangeResponse.headers.get("location"), "https://funnels.test/app/portal?client=alpha");
  assert.equal(exchangeResponse.headers.get("referrer-policy"), "no-referrer");
  const sessionCookie = exchangeResponse.headers.get("set-cookie");
  assert.match(sessionCookie, new RegExp(`^${CLIENT_SESSION_COOKIE}=`));
  assert.equal(db.operatorEvents[0].action, "impersonate-use");
  assert.ok(db.impersonationSessions[0].token_hash);
  assert.equal(db.impersonationSessions[0].exchange_hash, null);

  const secondExchange = await portalRoute.onRequest({
    request: new Request(exchangeUrl),
    env,
    params: { path: [] },
    next: () => new Response("next"),
  });
  assert.equal(secondExchange.status, 302);
  assert.equal(secondExchange.headers.get("location"), "https://funnels.test/portal/login");
  assert.equal(secondExchange.headers.has("set-cookie"), false, "the one-time URL must not mint twice");

  const dashboard = await clientDashboardApi.onRequestGet({
    request: new Request("https://funnels.test/api/client-dashboard?client=alpha", {
      headers: { cookie: sessionCookie.split(";", 1)[0] },
    }),
    env,
  });
  assert.equal(dashboard.status, 200);
  const dashboardBody = await dashboard.json();
  assert.equal(dashboardBody.client, "alpha");
  assert.equal(dashboardBody.client_name, "Alpha Coach");
  assert.equal(dashboardBody.impersonated, true);
  assert.equal(dashboardBody.revenue.total_revenue_cents, 125000);

  const brainRead = await clientBrainApi.onRequestGet({
    request: new Request("https://funnels.test/api/client-brain?client=alpha", {
      headers: { cookie: sessionCookie.split(";", 1)[0] },
    }),
    env,
  });
  assert.equal(brainRead.status, 200);
  assert.equal((await brainRead.json()).client, "alpha");

  const expiresAt = new Date(mintBody.expires_at).getTime();
  const createdAt = new Date(mintBody.event.created_at).getTime();
  assert.ok(expiresAt - createdAt <= 30 * 60 * 1000);
  assert.ok(expiresAt - createdAt >= 29 * 60 * 1000);
}

async function testEveryWriteRejectsImpersonation() {
  const db = new MockDB();
  const env = { ADMIN_KEY: "secret", DB: db, MEDIA: new MockMedia() };
  const token = "impersonation-session";
  await seedSession(db, token, true);
  const cookie = cookieHeader(token);

  const portalToken = "normal-portal-token";
  db.configs[0].portal_token_hash = await sha256Hex(portalToken);
  await assertReadOnly(await clientBrainApi.onRequestPost({
    request: jsonRequest(
      "https://funnels.test/api/client-brain",
      "POST",
      { client: "alpha", answers: { identity: { name: "Blocked" } } },
      { ...cookie, "x-portal-token": portalToken },
    ),
    env,
  }), "client-brain POST with a valid portal-token header");

  const cases = [
    ["client-brain POST", () => clientBrainApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/client-brain", "POST", { client: "alpha", answers: { identity: { name: "Blocked" } } }, cookie), env })],
    ["media-upload POST", () => mediaUploadApi.onRequestPost({ request: new Request("https://funnels.test/api/media-upload", { method: "POST", headers: { ...cookie, "content-type": "image/png" }, body: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]) }), env })],
    ["studio-generate POST", () => studioGenerateApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/studio-generate", "POST", { topic: "Blocked", type: "credibility", manual_mode: true }, cookie), env })],
    ["client-dashboard-todo POST", () => todoApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/client-dashboard-todo", "POST", { index: 0, done: true }, cookie), env })],
    ["metrics-sequences POST", () => metricsSequencesApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/metrics-sequences", "POST", { posted_on: "2026-07-16", type: "credibility", topic: "Blocked", slide_count: 1, slide_views: [1] }, cookie), env })],
    ["metrics-weekly POST", () => metricsWeeklyApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/metrics-weekly", "POST", { taken_on: "2026-07-16", followers: 1 }, cookie), env })],
    ["studio-sequences attach-output", () => studioSequencesApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/studio-sequences", "POST", { action: "attach-output", id: 1, raw_text: "blocked" }, cookie), env })],
    ["studio-sequences submit-for-review", () => studioSequencesApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/studio-sequences", "POST", { action: "submit-for-review", id: 1 }, cookie), env })],
    ["studio-sequences delete", () => studioSequencesApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/studio-sequences", "POST", { action: "delete", id: 1 }, cookie), env })],
    ["client-integrations test", () => clientIntegrationsApi.onRequestGet({ request: new Request("https://funnels.test/api/client-integrations?action=test&provider=zapier", { headers: cookie }), env })],
    ["client-integrations POST", () => clientIntegrationsApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/client-integrations", "POST", { provider: "youtube", confirm: true }, cookie), env })],
    ["client-integrations DELETE", () => clientIntegrationsApi.onRequestDelete({ request: jsonRequest("https://funnels.test/api/client-integrations", "DELETE", { provider: "youtube" }, cookie), env })],
    ["client-set-password POST", () => clientSetPasswordApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/client-set-password", "POST", { setup_token: "setup", password: "long-password" }, cookie), env })],
    ["client-email-code POST", () => clientEmailCodeApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/client-email-code", "POST", { setup_token: "setup" }, cookie), env })],
  ];

  for (const [label, call] of cases) await assertReadOnly(await call(), label);

  // The form lives in the app now (pulsify-saas #16): the old link moves there,
  // and the app's portal gate serves the preview. Writes stay refused (above).
  const onboard = await onboardRoute.onRequest({
    request: new Request("https://funnels.test/onboard/", { headers: cookie }),
    env,
    params: { path: [] },
    next: () => new Response("next"),
  });
  assert.equal(onboard.status, 302);
  assert.equal(new URL(onboard.headers.get("location")).pathname, "/app/portal/onboarding");
  const preview = await appPortalGate({
    request: new Request("https://funnels.test/app/portal/onboarding", { headers: cookie }),
    env: {
      ...env,
      ASSETS: { fetch: async () => new Response("<html><head></head><body>Onboarding preview</body></html>", { headers: { "content-type": "text/html" } }) },
    },
  });
  assert.equal(preview.status, 200, "impersonation can preview onboarding without gaining write access");
  const html = await preview.text();
  assert.match(html, /Onboarding preview/);
  assert.match(html, /"impersonated":true/);

  const approve = await studioSequencesApi.onRequestPost({
    request: jsonRequest("https://funnels.test/api/studio-sequences", "POST", { action: "approve", id: 1 }, cookie),
    env,
  });
  assert.equal(approve.status, 401, "impersonation cannot use a Studio admin action");
}

async function testNormalSessionWritesStillWork() {
  const db = new MockDB();
  const env = { ADMIN_KEY: "secret", DB: db, MEDIA: new MockMedia() };
  const token = "normal-client-session";
  await seedSession(db, token, false, futureIso(60));
  const cookie = cookieHeader(token);

  const brain = await clientBrainApi.onRequestPost({
    request: jsonRequest("https://funnels.test/api/client-brain", "POST", {
      client: "alpha",
      answers: { identity: { name: "Alpha Coach" } },
    }, cookie),
    env,
  });
  assert.equal(brain.status, 200);
  assert.equal(db.brain.length, 1);

  const media = await mediaUploadApi.onRequestPost({
    request: new Request("https://funnels.test/api/media-upload", {
      method: "POST",
      headers: { ...cookie, "content-type": "image/png" },
      body: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    }),
    env,
  });
  assert.equal(media.status, 201);
  assert.equal(db.proof.length, 1);

  const generated = await studioGenerateApi.onRequestPost({
    request: jsonRequest("https://funnels.test/api/studio-generate", "POST", {
      topic: "A client result",
      type: "credibility",
      manual_mode: true,
    }, cookie),
    env,
  });
  assert.equal(generated.status, 200);
  assert.equal(db.studioSequences.length, 1);

  const todo = await todoApi.onRequestPost({
    request: jsonRequest("https://funnels.test/api/client-dashboard-todo", "POST", { index: 0, done: true }, cookie),
    env,
  });
  assert.equal(todo.status, 200);
  assert.equal(JSON.parse(db.dashboardContent[0].json)[0].done, true);

  const authPassesToValidation = [
    ["copywriter", copywriterApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/copywriter", "POST", {brief:"test"}, cookie), env })],
    ["metrics-sequences", metricsSequencesApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/metrics-sequences", "POST", {}, cookie), env })],
    ["metrics-weekly", metricsWeeklyApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/metrics-weekly", "POST", {}, cookie), env })],
    ["studio-sequences", studioSequencesApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/studio-sequences", "POST", {}, cookie), env })],
    ["client-integrations POST", clientIntegrationsApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/client-integrations", "POST", { provider: "not-allowed" }, cookie), env })],
    ["client-integrations DELETE", clientIntegrationsApi.onRequestDelete({ request: jsonRequest("https://funnels.test/api/client-integrations", "DELETE", { provider: "not-allowed" }, cookie), env })],
    ["client-integrations test", clientIntegrationsApi.onRequestGet({ request: new Request("https://funnels.test/api/client-integrations?action=test", { headers: cookie }), env })],
    ["client-set-password", clientSetPasswordApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/client-set-password", "POST", {}, cookie), env })],
    ["client-email-code", clientEmailCodeApi.onRequestPost({ request: jsonRequest("https://funnels.test/api/client-email-code", "POST", {}, cookie), env })],
  ];
  for (const [label, promise] of authPassesToValidation) {
    const response = await promise;
    assert.notEqual(response.status, 403, `${label} must not treat a normal session as impersonated`);
  }
}

async function testExpiryNonEscalationRateLimitAndLogout() {
  const db = new MockDB();
  const env = { ADMIN_KEY: "secret", DB: db };
  const expiredToken = "expired-impersonation";
  await seedSession(db, expiredToken, true, futureIso(-1));

  const expiredRead = await clientDashboardApi.onRequestGet({
    request: new Request("https://funnels.test/api/client-dashboard?client=alpha", {
      headers: cookieHeader(expiredToken),
    }),
    env,
  });
  assert.equal(expiredRead.status, 401);
  assert.equal(db.impersonationSessions.length, 0, "expired session must be purged server-side");

  const liveToken = "live-impersonation";
  await seedSession(db, liveToken, true);
  const cookie = cookieHeader(liveToken);
  const cannotMint = await impersonateApi.onRequestPost({
    request: jsonRequest("https://funnels.test/api/impersonate", "POST", { client: "alpha" }, cookie),
    env,
  });
  assert.equal(cannotMint.status, 401);

  const cannotReachOperator = await operatorOverviewApi.onRequestGet({
    request: new Request("https://funnels.test/api/operator-overview", { headers: cookie }),
    env,
  });
  assert.equal(cannotReachOperator.status, 401);

  const cannotRotatePortalToken = await portalTokenApi.onRequestPost({
    request: new Request("https://funnels.test/api/portal-token?client=alpha", { method: "POST", headers: cookie }),
    env,
  });
  assert.equal(cannotRotatePortalToken.status, 401);

  const rateDb = new MockDB();
  for (let index = 0; index < 10; index += 1) {
    rateDb.impersonationSessions.push({
      id: rateDb.nextIds.impersonation++,
      token_hash: `token-${index}`,
      exchange_hash: null,
      client_id: "alpha",
      created_at: futureIso(-1),
      expires_at: futureIso(29),
      created_by: "admin",
      consumed_at: futureIso(-1),
    });
  }
  const rateLimited = await impersonateApi.onRequestPost({
    request: jsonRequest("https://funnels.test/api/impersonate", "POST", { client: "alpha" }, { "x-admin-key": "secret" }),
    env: { ADMIN_KEY: "secret", DB: rateDb },
  });
  assert.equal(rateLimited.status, 429);
  assert.equal(rateDb.operatorEvents.length, 0);

  const loggedOut = await clientLogoutApi.onRequestPost({
    request: new Request("https://funnels.test/api/client-logout", { method: "POST", headers: cookie }),
    env,
  });
  assert.equal(loggedOut.status, 200);
  assert.equal(db.impersonationSessions.length, 0);
  assert.match(loggedOut.headers.get("set-cookie"), /Max-Age=0/);
}

try {
  await testMintExchangeReadAndAudit();
  await testEveryWriteRejectsImpersonation();
  await testNormalSessionWritesStillWork();
  await testExpiryNonEscalationRateLimitAndLogout();
  console.log("PASS impersonation: mint, one-time exchange, read access, all write blocks, normal writes, expiry, audit, non-escalation, rate limit, and logout");
} catch (error) {
  console.error(`FAIL impersonation: ${error?.stack || error}`);
  process.exitCode = 1;
}

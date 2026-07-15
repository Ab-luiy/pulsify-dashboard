import { strict as assert } from "node:assert";
import * as operatorApi from "../functions/api/operator-overview.js";
import * as campaignsApi from "../functions/api/campaigns.js";

class MockDB {
  constructor(seed) {
    this.seed = seed;
    this.queries = [];
  }

  prepare(sql) {
    this.queries.push(sql);
    return new MockStatement(this.seed, sql);
  }
}

class MockStatement {
  constructor(seed, sql) {
    this.seed = seed;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async all() {
    if (this.sql.includes("FROM client_config")) return { results: this.seed.configs || [] };
    if (this.sql.includes("FROM payments")) return { results: this.seed.payments || [] };
    if (this.sql.includes("FROM account_snapshots")) return { results: this.seed.snapshots || [] };
    if (this.sql.includes("FROM sequence_log")) return { results: this.seed.sequences || [] };
    if (this.sql.includes("FROM studio_sequences")) return { results: this.seed.studio || [] };
    if (this.sql.includes("FROM client_brain")) return { results: this.seed.brain || [] };
    if (this.sql.includes("FROM page_events")) return { results: this.seed.pageActivity || [] };
    if (this.sql.includes("FROM operator_events")) return { results: this.seed.operatorEvents || [] };
    throw new Error(`Unexpected query: ${this.sql}`);
  }

  async run() {
    if (!this.sql.includes("INSERT INTO operator_events")) {
      throw new Error(`Unexpected run: ${this.sql}`);
    }
    const [actor, client, detail, createdAt] = this.params;
    const event = {
      id: (this.seed.operatorEvents || []).length + 1,
      actor,
      action: "view-client",
      client,
      detail,
      created_at: createdAt,
    };
    this.seed.operatorEvents = [event, ...(this.seed.operatorEvents || [])];
    return { meta: { last_row_id: event.id } };
  }
}

class CampaignDB {
  prepare(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim();
    return {
      bind() { return this; },
      async all() {
        if (normalized.includes("FROM client_config")) {
          return { results: [{ client: "campaign", client_name: "Campaign", template_variant: "canonical", updated_at: isoDaysAgo(2) }] };
        }
        if (normalized.includes("FROM page_events")) {
          return { results: [{ client: "campaign", visitors: 2, page_views: 3, last_visit_at: isoDaysAgo(1) }] };
        }
        if (normalized.includes("FROM watch_events")) {
          return { results: [{ client: "campaign", plays: 1, max_percent: 60, last_watch_at: isoDaysAgo(1) }] };
        }
        if (normalized.includes("FROM leads")) {
          return { results: [{ client: "campaign", applications: 1, last_application_at: isoDaysAgo(1), kit_synced: 1 }] };
        }
        if (normalized.includes("FROM delivery_failures")) return { results: [] };
        throw new Error(`Unexpected campaign query: ${normalized}`);
      },
    };
  }
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function request(key = "secret", options = {}) {
  return new Request("https://funnels.test/api/operator-overview", {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(key ? { "x-admin-key": key } : {}),
    },
  });
}

async function testRollupAndHealthLabels() {
  const seed = {
    configs: [
      { client: "healthy", client_name: "Healthy client" },
      { client: "risk", client_name: "Risk client" },
      { client: "watch", client_name: "Watch client" },
      { client: "new", client_name: "New client" },
    ],
    payments: [
      { client: "healthy", total_collected_cents: 250000, payment_count: 2, currency: "USD", currency_count: 1, last_payment_at: isoDaysAgo(2) },
      { client: "risk", total_collected_cents: 100000, payment_count: 1, currency: "USD", currency_count: 1, last_payment_at: isoDaysAgo(80) },
      { client: "watch", total_collected_cents: 50000, payment_count: 1, currency: "USD", currency_count: 1, last_payment_at: isoDaysAgo(3) },
    ],
    snapshots: [
      { client_id: "healthy", followers: 1200, taken_on: isoDaysAgo(1), position: 1 },
      { client_id: "healthy", followers: 1000, taken_on: isoDaysAgo(8), position: 2 },
      { client_id: "risk", followers: 850, taken_on: isoDaysAgo(20), position: 1 },
      { client_id: "risk", followers: 900, taken_on: isoDaysAgo(27), position: 2 },
    ],
    sequences: [
      { client_id: "healthy", posted_7d: 4, last_posted_on: isoDaysAgo(1) },
      { client_id: "risk", posted_7d: 0, last_posted_on: isoDaysAgo(45) },
      { client_id: "watch", posted_7d: 1, last_posted_on: isoDaysAgo(3) },
    ],
    studio: [{ client_id: "healthy", last_studio_at: isoDaysAgo(0.5) }],
    brain: [
      { client_id: "healthy", sections_complete: 8 },
      { client_id: "risk", sections_complete: 4 },
      { client_id: "watch", sections_complete: 4 },
    ],
    pageActivity: [
      { client: "healthy", last_page_activity_at: isoDaysAgo(0.25) },
      { client: "risk", last_page_activity_at: isoDaysAgo(45) },
      { client: "watch", last_page_activity_at: isoDaysAgo(2) },
    ],
    operatorEvents: [
      { id: 1, actor: "admin", action: "view-client", client: "risk", detail: '{"surface":"command-center"}', created_at: isoDaysAgo(1) },
    ],
  };
  const db = new MockDB(seed);
  const env = { ADMIN_KEY: "secret", DB: db };

  const response = await operatorApi.onRequestGet({ request: request(), env });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.summary.client_count, 4);
  assert.equal(body.summary.at_risk_count, 1);
  assert.equal(body.summary.total_collected_cents, 400000);
  assert.deepEqual(body.clients.map((row) => row.client), ["risk", "watch", "new", "healthy"]);
  assert.equal(db.queries.length, 8, "rollup query count must stay fixed as client count grows");

  const healthy = body.clients.find((row) => row.client === "healthy");
  assert.equal(healthy.collected.total_cents, 250000);
  assert.equal(healthy.followers.latest, 1200);
  assert.equal(healthy.followers.delta, 200);
  assert.equal(healthy.followers.trend, "up");
  assert.equal(healthy.cadence.posted_7d, 4);
  assert.equal(healthy.brain.completeness_percent, 100);
  assert.equal(healthy.health.score, 100);
  assert.equal(healthy.health.label, "healthy");

  const risk = body.clients.find((row) => row.client === "risk");
  assert.equal(risk.followers.delta, -50);
  assert.equal(risk.followers.trend, "down");
  assert.equal(risk.brain.completeness_percent, 50);
  assert.equal(risk.health.score, 32);
  assert.equal(risk.health.label, "at-risk");

  const watch = body.clients.find((row) => row.client === "watch");
  assert.equal(watch.health.score, 51);
  assert.equal(watch.health.label, "watch");

  const brandNew = body.clients.find((row) => row.client === "new");
  assert.equal(brandNew.health.score, null);
  assert.equal(brandNew.health.label, "new / needs onboarding");
  assert.equal(brandNew.last_activity_at, null);
  assert.equal(body.operator_activity[0].detail.surface, "command-center");

  const auditResponse = await operatorApi.onRequestPost({
    request: request("secret", {
      method: "POST",
      body: JSON.stringify({ action: "view-client", client: "healthy" }),
    }),
    env,
  });
  assert.equal(auditResponse.status, 201);
  const auditBody = await auditResponse.json();
  assert.equal(auditBody.event.action, "view-client");
  assert.equal(auditBody.event.client, "healthy");
  assert.equal(seed.operatorEvents[0].client, "healthy");
}

async function testAdminKey401() {
  const getResponse = await operatorApi.onRequestGet({
    request: request(""),
    env: { ADMIN_KEY: "secret", DB: new MockDB({}) },
  });
  assert.equal(getResponse.status, 401);
  assert.equal((await getResponse.json()).error, "unauthorized");

  const postResponse = await operatorApi.onRequestPost({
    request: request("", {
      method: "POST",
      body: JSON.stringify({ action: "view-client", client: "healthy" }),
    }),
    env: { ADMIN_KEY: "secret", DB: new MockDB({}) },
  });
  assert.equal(postResponse.status, 401);
}

async function testCampaignRegression() {
  const response = await campaignsApi.onRequestGet({
    request: request(),
    env: { ADMIN_KEY: "secret", DB: new CampaignDB() },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.summary.total_pages, 1);
  assert.equal(body.summary.total_applications, 1);
  assert.equal(body.campaigns[0].signal, "applied");
}

try {
  await testRollupAndHealthLabels();
  await testAdminKey401();
  await testCampaignRegression();
  console.log("PASS operator overview: rollup, health labels, audit event, ADMIN_KEY 401, and campaigns regression");
} catch (error) {
  console.error(`FAIL operator overview: ${error?.stack || error}`);
  process.exitCode = 1;
}

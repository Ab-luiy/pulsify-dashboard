import { strict as assert } from "node:assert";
import * as followupsApi from "../functions/api/followups.js";

class MockDB {
  constructor(seed) {
    this.seed = seed;
  }

  prepare(sql) {
    return new MockStatement(this.seed, sql);
  }
}

class MockStatement {
  constructor(seed, sql) {
    this.seed = seed;
    this.sql = sql.replace(/\s+/g, " ").trim();
  }

  async all() {
    if (this.sql.includes("FROM client_config")) return { results: this.seed.configs };
    if (this.sql.includes("FROM page_events")) return { results: this.seed.pageRows };
    if (this.sql.includes("FROM watch_events")) return { results: this.seed.watchRows };
    if (this.sql.includes("FROM leads")) return { results: this.seed.leadRows };
    if (this.sql.includes("FROM integration_events")) return { results: this.seed.bookingRows };
    throw new Error(`Unexpected query: ${this.sql}`);
  }
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function request(key = "secret") {
  return new Request("https://funnels.test/api/followups", {
    headers: key ? { "x-admin-key": key } : {},
  });
}

async function testRankingAndExclusion() {
  const env = {
    ADMIN_KEY: "secret",
    DB: new MockDB({
      configs: [
        { client: "alpha", client_name: "Alpha", template_variant: "canonical" },
        { client: "beta", client_name: "Beta", template_variant: "variant-02" },
        { client: "cool", client_name: "Cool", template_variant: "canonical" },
        { client: "applied", client_name: "Applied", template_variant: "canonical" },
        { client: "booked", client_name: "Booked", template_variant: "canonical" },
        { client: "non-viewer", client_name: "Non-viewer", template_variant: "canonical" },
      ],
      pageRows: [
        { client: "alpha", visitors: 1, page_views: 3, last_view_at: isoDaysAgo(0.25) },
        { client: "beta", visitors: 1, page_views: 1, last_view_at: isoDaysAgo(2) },
        { client: "cool", visitors: 1, page_views: 1, last_view_at: isoDaysAgo(45) },
        { client: "applied", visitors: 1, page_views: 1, last_view_at: isoDaysAgo(45) },
        { client: "booked", visitors: 1, page_views: 1, last_view_at: isoDaysAgo(45) },
      ],
      watchRows: [
        { client: "alpha", plays: 3, max_percent: 90, watch_seconds: 240, last_watch_at: isoDaysAgo(0.2) },
        { client: "beta", plays: 1, max_percent: 60, watch_seconds: 80, last_watch_at: isoDaysAgo(2) },
      ],
      leadRows: [
        { client: "applied", applications: 1, last_application_at: isoDaysAgo(40) },
        { client: "non-viewer", applications: 1, last_application_at: isoDaysAgo(1) },
      ],
      bookingRows: [
        { client: "booked", bookings: 1, last_booked_at: isoDaysAgo(40) },
      ],
    }),
  };

  const response = await followupsApi.onRequestGet({ request: request(), env });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);

  const ids = body.followups.map((row) => row.client);
  assert.deepEqual(ids, ["alpha", "beta", "booked", "applied", "cool"]);
  assert.equal(ids.includes("non-viewer"), false, "configured non-viewers must not enter the queue");
  assert.ok(body.followups[0].score > body.followups[1].score);
  assert.equal(body.followups[0].signal, "hot");
  assert.equal(body.followups.at(-1).signal, "cool");
  assert.equal(body.followups.find((row) => row.client === "applied").outcomes.applied, true);
  assert.equal(body.followups.find((row) => row.client === "booked").outcomes.booked, true);
  assert.equal(body.summary.total_engaged, 5);
  assert.equal(body.summary.needing_followup, 3);
}

async function testAuth() {
  const response = await followupsApi.onRequestGet({
    request: request("wrong"),
    env: { ADMIN_KEY: "secret", DB: new MockDB({}) },
  });
  assert.equal(response.status, 401);
}

try {
  await testRankingAndExclusion();
  await testAuth();
  console.log("PASS follow-ups: viewers ranked by engagement and non-viewers excluded");
} catch (error) {
  console.error(`FAIL follow-ups: ${error?.stack || error}`);
  process.exitCode = 1;
}

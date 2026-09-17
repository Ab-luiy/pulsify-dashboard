import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet as seriesGet } from "../functions/api/spine/series.js";
import { onRequestGet as leadsGet } from "../functions/api/spine/leads.js";
import { onRequestGet as stateGet, onRequestPut as statePut } from "../functions/api/spine/state.js";

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() { return this.db.first(this.sql, this.values); }
  async all() { return { results: this.db.all(this.sql, this.values) }; }
  async run() { return this.db.run(this.sql, this.values); }
}

class MockDB {
  constructor() { this.state = new Map(); this.lastSeriesValues = null; }
  prepare(sql) { return new Statement(this, sql); }
  first(sql) {
    if (sql.includes("FROM client_config") && sql.includes("portal_token_hash=?")) return { client: "alpha" };
    if (sql.includes("operator_state")) return null;
    return null;
  }
  all(sql, values) {
    if (sql.includes("FROM metric_points")) {
      this.lastSeriesValues = values;
      return [{ id: 1, scope: values[0], client_id: values[1], source: "instagram", metric: "followers", ts: "2026-09-17T00:00:00Z", value: 100, value_text: null, dims_json: "{}" }];
    }
    if (sql.includes("FROM operator_state")) {
      return [...this.state.entries()].map(([key, row]) => ({ key, ...row }));
    }
    return [];
  }
  run(sql, values) {
    if (sql.includes("INSERT INTO operator_state")) {
      this.state.set(values[1], { value_json: values[2], updated_at: values[3] });
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }
}

test("operator can read operator series and write only their own state", async () => {
  const db = new MockDB();
  const request = new Request("https://pulsify-ai.com/api/spine/series?source=instagram&metric=followers");
  let response = await seriesGet({ request, env: { DB: db }, data: { operator: { email: "operator@example.com", via: "access" } } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).points.length, 1);
  assert.deepEqual(db.lastSeriesValues.slice(0, 2), ["operator", ""]);

  const putRequest = new Request("https://pulsify-ai.com/api/spine/state", {
    method: "PUT",
    body: JSON.stringify({ key: "targets", value: { calls: 5 } }),
  });
  response = await statePut({ request: putRequest, env: { DB: db }, data: { operator: { email: "operator@example.com", via: "access" } } });
  assert.equal(response.status, 200);
  const getRequest = new Request("https://pulsify-ai.com/api/spine/state");
  response = await stateGet({ request: getRequest, env: { DB: db }, data: { operator: { email: "operator@example.com", via: "access" } } });
  assert.deepEqual((await response.json()).state.targets.value, { calls: 5 });
});

test("client session is locked to its own scope", async () => {
  const db = new MockDB();
  const headers = { "x-portal-token": "client-token" };
  let request = new Request("https://pulsify-ai.com/api/spine/series?scope=client&client=alpha", { headers });
  let response = await seriesGet({ request, env: { DB: db }, data: {} });
  assert.equal(response.status, 200);
  assert.deepEqual(db.lastSeriesValues.slice(0, 2), ["client", "alpha"]);

  request = new Request("https://pulsify-ai.com/api/spine/series?scope=client&client=beta", { headers });
  response = await seriesGet({ request, env: { DB: db }, data: {} });
  assert.equal(response.status, 403);
});

test("anonymous and client requests cannot read operator leads", async () => {
  const env = { DB: new MockDB() };
  let response = await leadsGet({ request: new Request("https://pulsify-ai.com/api/spine/leads"), env, data: {} });
  assert.equal(response.status, 401);
  response = await leadsGet({ request: new Request("https://pulsify-ai.com/api/spine/leads", { headers: { "x-portal-token": "client-token" } }), env, data: {} });
  assert.equal(response.status, 401);
});

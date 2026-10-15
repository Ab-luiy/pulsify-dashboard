import { strict as assert } from "node:assert";
import * as drafts from "../functions/api/form-drafts.js";

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

class MockDB {
  constructor(configs) {
    this.configs = configs;
    this.rows = [];
  }
  prepare(sql) {
    const db = this;
    const text = sql.replace(/\s+/g, " ").trim();
    return {
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        if (text.includes("portal_token_hash")) {
          const row = db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
          return row ? { client: row.client, client_name: row.client } : null;
        }
        if (text.startsWith("SELECT draft_json")) {
          const [client, form] = this.values;
          return db.rows.find((row) => row.client_id === client && row.form_key === form) || null;
        }
        throw new Error(`Unexpected first: ${text}`);
      },
      async run() {
        if (text.startsWith("INSERT INTO form_drafts")) {
          const [client, form, draftJson, position, updatedAt] = this.values;
          db.rows = db.rows.filter((row) => !(row.client_id === client && row.form_key === form));
          db.rows.push({ client_id: client, form_key: form, draft_json: draftJson, position, updated_at: updatedAt });
          return { meta: { changes: 1 } };
        }
        if (text.startsWith("DELETE FROM form_drafts")) {
          const [client, form] = this.values;
          db.rows = db.rows.filter((row) => !(row.client_id === client && row.form_key === form));
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run: ${text}`);
      },
    };
  }
}

const TOKEN = "draft-token";
const headers = { "content-type": "application/json", "x-portal-token": TOKEN };

async function setup() {
  return { DB: new MockDB([{ client: "alpha", portal_token_hash: await sha256Hex(TOKEN) }]) };
}

async function testSaveThenRead() {
  const env = await setup();
  const put = await drafts.onRequestPut({
    request: new Request("https://funnels.test/api/form-drafts", { method: "PUT", headers, body: JSON.stringify({ form: "onboarding-v2", draft: { "you.name": "Rio" }, position: "you.age" }) }),
    env,
  });
  assert.equal(put.status, 200);
  const got = await drafts.onRequestGet({ request: new Request("https://funnels.test/api/form-drafts?form=onboarding-v2", { headers }), env });
  const body = await got.json();
  assert.deepEqual(body.draft, { "you.name": "Rio" });
  assert.equal(body.position, "you.age");
  assert.ok(body.updated_at);
}

async function testEmptyReadIsNull() {
  const env = await setup();
  const got = await drafts.onRequestGet({ request: new Request("https://funnels.test/api/form-drafts?form=onboarding-v2", { headers }), env });
  const body = await got.json();
  assert.equal(body.ok, true);
  assert.equal(body.draft, null);
}

async function testRejectsBadKeyAndHugeDraft() {
  const env = await setup();
  const bad = await drafts.onRequestPut({
    request: new Request("https://funnels.test/api/form-drafts", { method: "PUT", headers, body: JSON.stringify({ form: "../x", draft: {} }) }),
    env,
  });
  assert.equal(bad.status, 422);
  const huge = await drafts.onRequestPut({
    request: new Request("https://funnels.test/api/form-drafts", { method: "PUT", headers, body: JSON.stringify({ form: "onboarding-v2", draft: { text: "x".repeat(200_001) } }) }),
    env,
  });
  assert.equal(huge.status, 422);
}

async function testNoTokenIsRefused() {
  const env = await setup();
  const got = await drafts.onRequestGet({ request: new Request("https://funnels.test/api/form-drafts?form=onboarding-v2"), env });
  assert.notEqual(got.status, 200);
}

async function testDelete() {
  const env = await setup();
  await drafts.onRequestPut({
    request: new Request("https://funnels.test/api/form-drafts", { method: "PUT", headers, body: JSON.stringify({ form: "onboarding-v2", draft: { a: 1 } }) }),
    env,
  });
  const del = await drafts.onRequestDelete({ request: new Request("https://funnels.test/api/form-drafts?form=onboarding-v2", { method: "DELETE", headers }), env });
  assert.equal(del.status, 200);
  assert.equal(env.DB.rows.length, 0);
}

try {
  await testSaveThenRead();
  await testEmptyReadIsNull();
  await testRejectsBadKeyAndHugeDraft();
  await testNoTokenIsRefused();
  await testDelete();
  console.log("PASS form drafts: save, read, size and key limits, auth, delete");
} catch (error) {
  console.error(`FAIL form drafts: ${error?.stack || error}`);
  process.exitCode = 1;
}

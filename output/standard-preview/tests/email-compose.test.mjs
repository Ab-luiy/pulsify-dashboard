import { strict as assert } from "node:assert";
import * as emailApi from "../functions/api/email-compose.js";

class MockDB {
  constructor({ apiKey = null } = {}) {
    this.state = {
      integrations: apiKey ? [{
        scope: "operator",
        client_id: "",
        provider: "kit",
        config_json: JSON.stringify({ onboarding_sender_email: "sender@example.com" }),
        secret_json: JSON.stringify({ api_key: apiKey }),
        created_at: "2026-07-16T00:00:00.000Z",
        updated_at: "2026-07-16T00:00:00.000Z",
      }] : [],
      integration_events: [],
      email_drafts: [],
      delivery_failures: [],
    };
  }

  prepare(sql) {
    return new MockStatement(this, sql);
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

  async all() {
    const { state } = this.db;
    if (this.sql.includes("FROM integrations")) {
      let rows = [...state.integrations];
      let index = 0;
      if (this.sql.includes("scope=?")) rows = rows.filter((row) => row.scope === this.params[index++]);
      if (this.sql.includes("COALESCE(client_id,'')=?")) {
        rows = rows.filter((row) => (row.client_id || "") === this.params[index++]);
      }
      if (this.sql.includes("provider=?")) rows = rows.filter((row) => row.provider === this.params[index]);
      return { results: rows };
    }
    if (this.sql.includes("MAX(ts) AS last_event_ts") && this.sql.includes("FROM integration_events")) {
      return { results: [] };
    }
    if (this.sql.includes("FROM email_drafts")) {
      let rows = [...state.email_drafts];
      if (this.sql.includes("WHERE client=?")) rows = rows.filter((row) => row.client === this.params[0]);
      rows.sort((a, b) => b.id - a.id);
      return { results: rows.slice(0, 30) };
    }
    throw new Error(`Unexpected all query: ${this.sql}`);
  }

  async run() {
    const { state } = this.db;
    if (this.sql.startsWith("INSERT INTO email_drafts")) {
      const [client, subject, body, tagId, status, createdAt, sentAt] = this.params;
      const id = state.email_drafts.length + 1;
      state.email_drafts.push({
        id,
        client,
        subject,
        body,
        tag_id: tagId,
        status,
        created_at: createdAt,
        sent_at: sentAt,
      });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (this.sql.startsWith("INSERT INTO delivery_failures")) {
      const [client, kind, detail, at] = this.params;
      state.delivery_failures.push({ client, kind, detail, at });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("INSERT INTO integration_events")) {
      const [provider, kind, client, externalId, payloadSummaryJson, ts] = this.params;
      state.integration_events.push({
        provider,
        kind,
        client,
        external_id: externalId,
        payload_summary_json: payloadSummaryJson,
        ts,
      });
      return { meta: { changes: 1, last_row_id: state.integration_events.length } };
    }
    throw new Error(`Unexpected run query: ${this.sql}`);
  }
}

function env(options = {}) {
  return { ADMIN_KEY: "secret", DB: new MockDB(options) };
}

function getRequest(action, key = "secret") {
  return new Request(`https://funnels.test/api/email-compose?action=${action}`, {
    headers: key ? { "x-admin-key": key } : {},
  });
}

function postRequest(action, body, key = "secret") {
  return new Request(`https://funnels.test/api/email-compose?action=${action}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { "x-admin-key": key } : {}),
    },
    body: JSON.stringify(body),
  });
}

const composed = {
  client: "alpha",
  subject: "Alpha weekly note",
  body_text: "Line one\n\nLine two",
  tag_id: "42",
};

async function testAuthEveryAction() {
  const testEnv = env({ apiKey: "kit-secret" });
  const calls = [
    emailApi.onRequestGet({ request: getRequest("tags", "wrong"), env: testEnv }),
    emailApi.onRequestGet({ request: getRequest("drafts", "wrong"), env: testEnv }),
    emailApi.onRequestPost({ request: postRequest("draft", composed, "wrong"), env: testEnv }),
    emailApi.onRequestPost({ request: postRequest("send", composed, "wrong"), env: testEnv }),
  ];
  for (const call of calls) assert.equal((await call).status, 401);
}

async function testTagsWithoutKey() {
  const testEnv = env();
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  };
  try {
    const response = await emailApi.onRequestGet({ request: getRequest("tags"), env: testEnv });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.configured, false);
    assert.equal(data.api_key_set, false);
    assert.deepEqual(data.tags, []);
    assert.match(data.message, /Connect the operator Kit account/);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testTagsWithKey() {
  const testEnv = env({ apiKey: "kit-secret" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.kit.com/v4/tags?per_page=100");
    assert.equal(options.headers["X-Kit-Api-Key"], "kit-secret");
    return new Response(JSON.stringify({ tags: [{ id: 42, name: "Clients" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const response = await emailApi.onRequestGet({ request: getRequest("tags"), env: testEnv });
    const data = await response.json();
    assert.equal(data.configured, true);
    assert.equal(data.api_key_set, true);
    assert.deepEqual(data.tags, [{ id: "42", name: "Clients" }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testDraftActionAndList() {
  const testEnv = env();
  const response = await emailApi.onRequestPost({
    request: postRequest("draft", { ...composed, tag_id: null }),
    env: testEnv,
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.status, "draft");
  assert.equal(data.draft.status, "draft");
  assert.equal(testEnv.DB.state.email_drafts.length, 1);

  const listResponse = await emailApi.onRequestGet({ request: getRequest("drafts"), env: testEnv });
  const list = await listResponse.json();
  assert.equal(list.drafts.length, 1);
  assert.equal(list.drafts[0].subject, composed.subject);
}

async function testSendSuccess() {
  const testEnv = env({ apiKey: "kit-secret" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.kit.com/v4/broadcasts");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["X-Kit-Api-Key"], "kit-secret");
    const payload = JSON.parse(options.body);
    assert.equal(payload.subject, composed.subject);
    assert.equal(payload.content, "<p>Line one</p><p>Line two</p>");
    assert.deepEqual(payload.subscriber_filter[0].all, [{ type: "tag", ids: ["42"] }]);
    return new Response(JSON.stringify({ broadcast: { id: 701 } }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const response = await emailApi.onRequestPost({ request: postRequest("send", composed), env: testEnv });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.sent, true);
    assert.equal(data.status, "sent");
    assert.equal(data.broadcast_id, 701);
    assert.equal(testEnv.DB.state.email_drafts[0].status, "sent");
    assert.ok(testEnv.DB.state.email_drafts[0].sent_at);
    assert.equal(testEnv.DB.state.delivery_failures.length, 0);
    assert.equal(testEnv.DB.state.integration_events[0].kind, "operator_email");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testSendFailure() {
  const testEnv = env({ apiKey: "kit-secret" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ errors: ["bad tag"] }), {
    status: 422,
    headers: { "content-type": "application/json" },
  });
  try {
    const response = await emailApi.onRequestPost({ request: postRequest("send", composed), env: testEnv });
    const data = await response.json();
    assert.equal(response.status, 502);
    assert.equal(data.sent, false);
    assert.equal(data.status, "failed");
    assert.equal(data.draft.subject, composed.subject);
    assert.equal(data.draft.body_text, composed.body_text);
    assert.equal(data.draft.tag_id, composed.tag_id);
    assert.equal(testEnv.DB.state.email_drafts[0].status, "failed");
    assert.equal(testEnv.DB.state.delivery_failures.length, 1);
    assert.equal(testEnv.DB.state.delivery_failures[0].kind, "kit_email_compose");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testSendWithoutKey() {
  const testEnv = env();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("fetch should not run");
  };
  try {
    const response = await emailApi.onRequestPost({ request: postRequest("send", composed), env: testEnv });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.configured, false);
    assert.equal(data.sent, false);
    assert.equal(data.status, "draft");
    assert.equal(data.draft.subject, composed.subject);
    assert.equal(data.draft.body, composed.body_text);
    assert.equal(testEnv.DB.state.email_drafts[0].status, "draft");
    assert.equal(testEnv.DB.state.delivery_failures.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

try {
  await testAuthEveryAction();
  await testTagsWithoutKey();
  await testTagsWithKey();
  await testDraftActionAndList();
  await testSendSuccess();
  await testSendFailure();
  await testSendWithoutKey();
  console.log("PASS email composer: auth, tags, drafts, Kit send, and fail-soft storage");
} catch (error) {
  console.error(`FAIL email composer: ${error?.stack || error}`);
  process.exitCode = 1;
}

import { strict as assert } from "node:assert";
import * as clientIntegrationsApi from "../functions/api/client-integrations.js";
import { sha256Hex } from "../functions/_shared/common.js";

class MockDB {
  constructor(seed = {}) {
    this.state = {
      client_config: seed.client_config || [],
      integrations: seed.integrations || [],
      integration_events: seed.integration_events || [],
    };
    this.writes = 0;
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

  async first() {
    return this.dispatch("first");
  }

  async all() {
    return this.dispatch("all");
  }

  async run() {
    return this.dispatch("run");
  }

  async dispatch(mode) {
    const sql = this.sql;
    const params = this.params;
    const state = this.db.state;

    if (sql.includes("FROM client_config WHERE portal_token_hash=?")) {
      const row = state.client_config.find(
        (item) => item.portal_token_hash === params[0],
      );
      return row ? { client: row.client, client_name: row.client_name || row.client } : null;
    }

    if (sql.includes(
      "SELECT scope, client_id, provider, config_json, secret_json, created_at, updated_at FROM integrations",
    )) {
      let rows = [...state.integrations];
      let paramIndex = 0;
      if (sql.includes("scope=?")) {
        rows = rows.filter((row) => row.scope === params[paramIndex]);
        paramIndex += 1;
      }
      if (sql.includes("COALESCE(client_id,'')=?")) {
        rows = rows.filter(
          (row) => (row.client_id || "") === params[paramIndex],
        );
        paramIndex += 1;
      }
      if (sql.includes("provider=?")) {
        rows = rows.filter((row) => row.provider === params[paramIndex]);
      }
      return mode === "all" ? { results: rows } : rows[0] || null;
    }

    if (sql.includes(
      "SELECT provider, COALESCE(client,'') AS client_key, MAX(ts) AS last_event_ts FROM integration_events",
    )) {
      const grouped = new Map();
      for (const row of state.integration_events) {
        const key = `${row.provider}:${row.client || ""}`;
        const current = grouped.get(key);
        if (!current || row.ts > current.last_event_ts) {
          grouped.set(key, {
            provider: row.provider,
            client_key: row.client || "",
            last_event_ts: row.ts,
          });
        }
      }
      return { results: [...grouped.values()] };
    }

    if (sql.startsWith("INSERT INTO integrations")) {
      const [
        scope,
        clientId,
        provider,
        configJson,
        secretJson,
        createdAt,
        updatedAt,
      ] = params;
      const existing = state.integrations.find(
        (row) =>
          row.scope === scope &&
          (row.client_id || "") === (clientId || "") &&
          row.provider === provider,
      );
      if (existing) {
        existing.config_json = configJson;
        existing.secret_json = secretJson;
        existing.updated_at = updatedAt;
      } else {
        state.integrations.push({
          scope,
          client_id: clientId,
          provider,
          config_json: configJson,
          secret_json: secretJson,
          created_at: createdAt,
          updated_at: updatedAt,
        });
      }
      this.db.writes += 1;
      return { meta: { changes: 1 } };
    }

    if (sql.startsWith("DELETE FROM integrations")) {
      const [scope, clientId, provider] = params;
      const before = state.integrations.length;
      state.integrations = state.integrations.filter(
        (row) =>
          !(
            row.scope === scope &&
            (row.client_id || "") === clientId &&
            row.provider === provider
          ),
      );
      const changes = before - state.integrations.length;
      this.db.writes += changes;
      return { meta: { changes } };
    }

    throw new Error(`Unhandled SQL (${mode}): ${sql}`);
  }
}

function makeRequest(path = "", options = {}) {
  return new Request(`https://portal.example/api/client-integrations${path}`, options);
}

async function responseJson(response) {
  return JSON.parse(await response.text());
}

async function makeEnv(clients = [], integrations = []) {
  const client_config = await Promise.all(
    clients.map(async ({ client, token }) => ({
      client,
      portal_token_hash: await sha256Hex(token),
    })),
  );
  return {
    DB: new MockDB({ client_config, integrations }),
  };
}

function storedIntegration({
  client,
  provider,
  config = {},
  secrets = {},
}) {
  return {
    scope: "client",
    client_id: client,
    provider,
    config_json: JSON.stringify(config),
    secret_json: JSON.stringify(secrets),
    created_at: "2026-07-05T12:00:00.000Z",
    updated_at: "2026-07-05T12:00:00.000Z",
  };
}

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

test("token client overrides body and query client ids", async () => {
  const env = await makeEnv([
    { client: "alpha", token: "alpha-token" },
    { client: "beta", token: "beta-token" },
  ]);
  const response = await clientIntegrationsApi.onRequestPost({
    request: makeRequest("?client=beta", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-portal-token": "alpha-token",
      },
      body: JSON.stringify({
        provider: "kit",
        client: "beta",
        config: { tag_id: "123" },
        secrets: { api_key: "kit-alpha-secret" },
      }),
    }),
    env,
  });
  assert.equal(response.status, 200);
  assert.equal(env.DB.state.integrations.length, 1);
  assert.equal(env.DB.state.integrations[0].client_id, "alpha");
  assert.equal(
    env.DB.state.integrations.some((row) => row.client_id === "beta"),
    false,
  );
});

test("absent and invalid tokens return 401 with zero writes", async () => {
  const env = await makeEnv([{ client: "alpha", token: "alpha-token" }]);
  for (const token of [null, "wrong-token"]) {
    const headers = { "content-type": "application/json" };
    if (token) headers["x-portal-token"] = token;
    const response = await clientIntegrationsApi.onRequestPost({
      request: makeRequest("", {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider: "kit",
          secrets: { api_key: "must-not-write" },
        }),
      }),
      env,
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await responseJson(response), {
      ok: false,
      error: "invalid or expired portal link",
    });
  }
  assert.equal(env.DB.writes, 0);
  assert.equal(env.DB.state.integrations.length, 0);
});

test("GET returns all providers with masked secrets only", async () => {
  const env = await makeEnv(
    [{ client: "alpha", token: "alpha-token" }],
    [
      storedIntegration({
        client: "alpha",
        provider: "kit",
        config: { tag_id: "77" },
        secrets: { api_key: "raw-kit-key" },
      }),
      storedIntegration({
        client: "alpha",
        provider: "stripe",
        secrets: {
          path_secret: "raw-path-secret",
          webhook_secret: "raw-webhook-secret",
        },
      }),
      storedIntegration({
        client: "alpha",
        provider: "zapier",
        secrets: { webhook_url: "https://hooks.zapier.test/raw-secret" },
      }),
      storedIntegration({
        client: "beta",
        provider: "kit",
        secrets: { api_key: "beta-secret" },
      }),
    ],
  );
  const response = await clientIntegrationsApi.onRequestGet({
    request: makeRequest("?client=beta", {
      headers: { "x-portal-token": "alpha-token" },
    }),
    env,
  });
  const text = await response.text();
  const data = JSON.parse(text);

  assert.equal(response.status, 200);
  assert.equal(data.client, "alpha");
  assert.deepEqual(
    data.integrations.map((item) => item.provider),
    [
      "kit",
      "calcom",
      "calendly",
      "whop",
      "stripe",
      "youtube",
      "instagram",
      "zapier",
      "gemini",
      "anthropic",
      "openai",
    ],
  );
  assert.equal(data.integrations.length, 11);
  assert.equal(data.integrations.find((item) => item.provider === "kit").config.api_key_set, true);
  assert.equal(data.integrations.find((item) => item.provider === "zapier").config.webhook_url_set, true);
  assert.equal(data.integrations.find((item) => item.provider === "calcom").connected, false);
  for (const secret of [
    "raw-kit-key",
    "raw-path-secret",
    "raw-webhook-secret",
    "https://hooks.zapier.test/raw-secret",
    "beta-secret",
  ]) {
    assert.equal(text.includes(secret), false, `GET leaked ${secret}`);
  }
  for (const integration of data.integrations) {
    assert.equal("secrets" in integration, false);
  }
});

test("unknown and operator-only providers are rejected", async () => {
  const env = await makeEnv([{ client: "alpha", token: "alpha-token" }]);
  for (const provider of ["unknown-provider", "discord"]) {
    const response = await clientIntegrationsApi.onRequestPost({
      request: makeRequest("", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-portal-token": "alpha-token",
        },
        body: JSON.stringify({ provider }),
      }),
      env,
    });
    assert.equal(response.status, 422);
    assert.equal((await responseJson(response)).ok, false);
  }
  assert.equal(env.DB.writes, 0);
  assert.equal(env.DB.state.integrations.length, 0);
});

test("delegated confirmation controls YouTube connection state", async () => {
  const env = await makeEnv([{ client: "alpha", token: "alpha-token" }]);
  const post = async (confirm) => {
    const response = await clientIntegrationsApi.onRequestPost({
      request: makeRequest("", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-portal-token": "alpha-token",
        },
        body: JSON.stringify({
          provider: "youtube",
          confirm,
          config: { channel_note: "Delegated", confirmed: "body-bypass" },
          secrets: { api_key: "ignored-secret" },
        }),
      }),
      env,
    });
    return { response, data: await responseJson(response) };
  };

  const connected = await post(true);
  assert.equal(connected.response.status, 200);
  assert.equal(connected.data.integration.connected, true);
  assert.equal(connected.data.integration.config.confirmed, "true");
  assert.match(
    connected.data.integration.config.confirmed_at,
    /^\d{4}-\d{2}-\d{2}T/,
  );
  let row = env.DB.state.integrations[0];
  assert.equal(JSON.parse(row.config_json).confirmed, "true");
  assert.deepEqual(JSON.parse(row.secret_json), {});

  const disconnected = await post(false);
  assert.equal(disconnected.response.status, 200);
  assert.equal(disconnected.data.integration.connected, false);
  assert.equal("confirmed" in disconnected.data.integration.config, false);
  row = env.DB.state.integrations[0];
  assert.equal("confirmed" in JSON.parse(row.config_json), false);
  assert.deepEqual(JSON.parse(row.secret_json), {});
});

test("DELETE is scoped to the token client", async () => {
  const env = await makeEnv(
    [
      { client: "alpha", token: "alpha-token" },
      { client: "beta", token: "beta-token" },
    ],
    [
      storedIntegration({ client: "alpha", provider: "kit" }),
      storedIntegration({ client: "beta", provider: "kit" }),
    ],
  );
  const response = await clientIntegrationsApi.onRequestDelete({
    request: makeRequest("", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        "x-portal-token": "alpha-token",
      },
      body: JSON.stringify({ provider: "kit", client: "beta" }),
    }),
    env,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), { ok: true, deleted: true });
  assert.equal(
    env.DB.state.integrations.some((row) => row.client_id === "alpha"),
    false,
  );
  assert.equal(
    env.DB.state.integrations.some((row) => row.client_id === "beta"),
    true,
  );
});

test("non-live connection test reports stored config state", async () => {
  const env = await makeEnv(
    [{ client: "alpha", token: "alpha-token" }],
    [
      storedIntegration({
        client: "alpha",
        provider: "zapier",
        secrets: { webhook_url: "https://hooks.zapier.test/connected" },
      }),
    ],
  );
  const response = await clientIntegrationsApi.onRequestGet({
    request: makeRequest("?action=test&provider=zapier", {
      headers: { "x-portal-token": "alpha-token" },
    }),
    env,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), {
    ok: true,
    provider: "zapier",
    test: {
      status: "config_present",
      connected: true,
    },
  });
});

let passed = 0;
let failed = 0;

for (const { name, run } of tests) {
  try {
    await run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

console.log(`RESULT ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;

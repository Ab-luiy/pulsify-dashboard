import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import * as eventApi from "../functions/event.js";
import * as redirectApi from "../functions/a/[token].js";
import * as assetsApi from "../functions/api/assets.js";

const FALLBACK_URL = "https://pulsify-funnels.pages.dev/";

class MockDB {
  constructor(seed = {}) {
    this.assetLinks = seed.assetLinks || [];
    this.assetAggregates = seed.assetAggregates || [];
    this.config = seed.config || {};
    this.captures = [];
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
    const sql = this.sql;
    if (sql.includes("FROM client_config WHERE client=?") && sql.includes("COALESCE(client_name,client)")) {
      return {
        client: this.params[0],
        client_name: "Test client",
        wistia_media_id: "media-1",
        typeform_url: null,
        typeform_webhook_secret: null,
        kit_api_key: null,
        kit_tag_id: null,
        allowed_origin: null,
        prospect_email: this.db.config.prospect_email || null,
        acquisition_token: this.db.config.acquisition_token || null,
      };
    }
    if (sql.includes("SELECT 1 AS has_integration FROM integrations")) return null;
    if (sql.includes("SELECT kit_api_key, kit_tag_id FROM client_config")) {
      return { kit_api_key: null, kit_tag_id: null };
    }
    if (sql.includes("FROM asset_links") && sql.includes("archived=0")) {
      const token = this.params[0];
      return this.db.assetLinks.find((row) => row.token === token && !row.archived) || null;
    }
    return null;
  }

  async all() {
    const sql = this.sql;
    if (sql.includes("FROM integrations")) return { results: [] };
    if (sql.includes("FROM integration_events")) return { results: [] };
    if (sql.includes("FROM asset_links l") && sql.includes("COUNT(e.id) AS opens")) {
      return { results: this.db.assetAggregates };
    }
    return { results: [] };
  }

  async run() {
    const capture = { sql: this.sql, params: [...this.params] };
    this.db.captures.push(capture);

    if (this.sql.startsWith("INSERT INTO asset_links")) {
      const [token, client, label, targetUrl, leadEmail, createdAt] = this.params;
      this.db.assetLinks.push({
        token,
        client,
        label,
        target_url: targetUrl,
        lead_email: leadEmail,
        created_at: createdAt,
        archived: 0,
      });
    }
    if (this.sql.startsWith("UPDATE asset_links SET archived=1")) {
      const row = this.db.assetLinks.find((item) => item.token === this.params[0]);
      if (row) row.archived = 1;
    }
    return { meta: { changes: 1, last_row_id: 1 } };
  }
}

function request(url, options = {}, cf = null) {
  const value = new Request(url, options);
  if (cf) Object.defineProperty(value, "cf", { value: cf });
  return value;
}

function jsonBody(response) {
  return response.json();
}

function findCapture(db, prefix) {
  const capture = db.captures.find((item) => item.sql.startsWith(prefix));
  assert.ok(capture, `Missing SQL capture: ${prefix}`);
  return capture;
}

async function testEventTracking() {
  const db = new MockDB();
  const env = { DB: db };
  const pageResponse = await eventApi.onRequestPost({
    request: request("https://funnels.test/event?client=alpha", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.9",
        "user-agent": "View tracking test",
      },
      body: JSON.stringify({
        kind: "page",
        event: "page_view",
        visitor_id: "visitor-1",
        session_id: "session-1",
        path: "/alpha",
      }),
    }, { country: "TR", city: "Istanbul" }),
    env,
  });
  assert.equal(pageResponse.status, 200);
  assert.deepEqual(await jsonBody(pageResponse), { ok: true, kind: "page" });

  const pageInsert = findCapture(db, "INSERT INTO page_events");
  assert.equal(pageInsert.params[10], "203.0.113.9");
  assert.equal(pageInsert.params[11], "TR");
  assert.equal(pageInsert.params[12], "Istanbul");
  assert.equal(pageInsert.params[13], "View tracking test");

  const watchResponse = await eventApi.onRequestPost({
    request: request("https://funnels.test/event?client=alpha", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "198.51.100.4",
        "cf-ipcountry": "US",
      },
      body: JSON.stringify({
        source: "wistia",
        event: "play",
        visitor_id: "visitor-1",
        percent: 20,
        watch_seconds: 15,
      }),
    }),
    env,
  });
  assert.equal(watchResponse.status, 200);
  assert.deepEqual(await jsonBody(watchResponse), { ok: true, kind: "watch" });

  const watchInsert = findCapture(db, "INSERT INTO watch_events");
  assert.equal(watchInsert.params[16], "198.51.100.4");
  assert.equal(watchInsert.params[17], "US");
}

async function testLeadAttribution() {
  const db = new MockDB({
    config: {
      prospect_email: "lead@example.com",
      acquisition_token: "TrackedToken123",
    },
  });
  const env = { DB: db };
  const attributed = await eventApi.onRequestPost({
    request: request("https://funnels.test/event?client=alpha", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.22" },
      body: JSON.stringify({
        kind: "page",
        event: "page_view",
        visitor_id: "lead-visitor",
        lead_token: "TrackedToken123",
      }),
    }),
    env,
  });
  assert.equal(attributed.status, 200);
  const attributedInsert = db.captures.filter((item) => item.sql.startsWith("INSERT INTO page_events")).at(-1);
  assert.equal(attributedInsert.params[5], "lead@example.com");
  assert.equal(JSON.parse(attributedInsert.params[9]).attribution, "tracked_link");

  const invalid = await eventApi.onRequestPost({
    request: request("https://funnels.test/event?client=alpha", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "wistia",
        event: "play",
        visitor_id: "other-visitor",
        lead_token: "WrongToken",
      }),
    }),
    env,
  });
  assert.equal(invalid.status, 200);
  const invalidInsert = db.captures.filter((item) => item.sql.startsWith("INSERT INTO watch_events")).at(-1);
  assert.equal(invalidInsert.params[1], null);
}

function testOperatorPreviewContract() {
  const source = readFileSync(new URL("../js/funnel-integrations.js", import.meta.url), "utf8");
  assert.match(source, /query\.get\("operator_preview"\) === "1"/);
  assert.match(source, /if \(draftMode \|\| operatorPreview\) return \{ ok: true \};/);
  assert.match(source, /lead_token: leadToken/);

  const rootHandler = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");
  const slugHandler = readFileSync(new URL("../functions/[slug].js", import.meta.url), "utf8");
  for (const handler of [rootHandler, slugHandler]) {
    assert.match(handler, /if \(!page\.active && !operatorPreview\) return inactivePageResponse\(\);/);
    assert.match(handler, /status: 404/);
  }
}

async function testTrackedRedirect() {
  const known = {
    token: "KnownToken",
    client: "alpha",
    label: "Offer audit",
    target_url: "https://docs.example/audit",
    lead_email: "lead@example.com",
    archived: 0,
  };
  const db = new MockDB({
    assetLinks: [
      known,
      { ...known, token: "InvalidUrl", target_url: "javascript:alert(1)" },
    ],
  });
  const env = { DB: db };
  const pending = [];
  const knownResponse = await redirectApi.onRequestGet({
    request: request("https://funnels.test/a/KnownToken", {
      headers: {
        "cf-connecting-ip": "203.0.113.12",
        referer: "https://mail.example/",
      },
    }, { country: "TR", city: "Istanbul" }),
    env,
    params: { token: "KnownToken" },
    waitUntil: (promise) => pending.push(promise),
  });
  assert.equal(knownResponse.status, 302);
  assert.equal(knownResponse.headers.get("location"), known.target_url);
  assert.equal(knownResponse.headers.get("cache-control"), "no-store");
  await Promise.all(pending);
  const assetEvents = db.captures.filter((item) => item.sql.startsWith("INSERT INTO asset_events"));
  assert.equal(assetEvents.length, 1);
  assert.equal(assetEvents[0].params[0], "KnownToken");
  assert.equal(assetEvents[0].params[3], "203.0.113.12");
  assert.equal(assetEvents[0].params[4], "TR");

  const unknownResponse = await redirectApi.onRequestGet({
    request: request("https://funnels.test/a/Unknown"),
    env,
    params: { token: "Unknown" },
  });
  assert.equal(unknownResponse.status, 302);
  assert.equal(unknownResponse.headers.get("location"), FALLBACK_URL);
  assert.equal(
    db.captures.filter((item) => item.sql.startsWith("INSERT INTO asset_events")).length,
    1,
  );

  const invalidResponse = await redirectApi.onRequestGet({
    request: request("https://funnels.test/a/InvalidUrl"),
    env,
    params: { token: "InvalidUrl" },
  });
  assert.equal(invalidResponse.status, 302);
  assert.equal(invalidResponse.headers.get("location"), FALLBACK_URL);
}

async function testAssetsApi() {
  const db = new MockDB();
  const env = { DB: db, ADMIN_KEY: "secret" };
  const unauthorized = await assetsApi.onRequestPost({
    request: request("https://funnels.test/api/assets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target_url: "https://example.com" }),
    }),
    env,
  });
  assert.equal(unauthorized.status, 401);

  const invalid = await assetsApi.onRequestPost({
    request: request("https://funnels.test/api/assets", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "secret" },
      body: JSON.stringify({ target_url: "file:///private.txt" }),
    }),
    env,
  });
  assert.equal(invalid.status, 422);

  const created = await assetsApi.onRequestPost({
    request: request("https://funnels.test/api/assets", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "secret" },
      body: JSON.stringify({
        client: "Alpha",
        label: "Offer audit",
        target_url: "https://docs.example/audit",
        lead_email: "Lead@Example.com",
      }),
    }),
    env,
  });
  assert.equal(created.status, 200);
  const createdBody = await jsonBody(created);
  assert.match(createdBody.token, /^[A-Za-z0-9_-]{10}$/);
  assert.equal(createdBody.url, `https://funnels.test/a/${createdBody.token}`);
  assert.equal(db.assetLinks.length, 1);
  assert.equal(db.assetLinks[0].client, "alpha");

  db.assetAggregates = [{
    token: createdBody.token,
    label: "Offer audit",
    target_url: "https://docs.example/audit",
    lead_email: "lead@example.com",
    client: "alpha",
    created_at: "2026-07-06T12:00:00.000Z",
    opens: 4,
    unique_ips: 3,
    last_open_at: "2026-07-06T14:00:00.000Z",
  }];
  const listed = await assetsApi.onRequestGet({
    request: request("https://funnels.test/api/assets", {
      headers: { "x-admin-key": "secret" },
    }),
    env,
  });
  assert.equal(listed.status, 200);
  const listedBody = await jsonBody(listed);
  assert.equal(listedBody.assets[0].opens, 4);
  assert.equal(listedBody.assets[0].unique_ips, 3);
  assert.equal(listedBody.assets[0].url, `https://funnels.test/a/${createdBody.token}`);

  const archived = await assetsApi.onRequestDelete({
    request: request(`https://funnels.test/api/assets?token=${createdBody.token}`, {
      method: "DELETE",
      headers: { "x-admin-key": "secret" },
    }),
    env,
  });
  assert.equal(archived.status, 200);
  assert.deepEqual(await jsonBody(archived), { ok: true });
  assert.equal(db.assetLinks[0].archived, 1);
  const archiveWrite = findCapture(db, "UPDATE asset_links SET archived=1");
  assert.equal(archiveWrite.params[0], createdBody.token);
}

try {
  await testEventTracking();
  await testLeadAttribution();
  testOperatorPreviewContract();
  await testTrackedRedirect();
  await testAssetsApi();
  console.log("PASS view tracking: IP capture, lead attribution, operator preview, redirect, and assets API passed");
} catch (error) {
  console.error(`FAIL view tracking: ${error?.stack || error}`);
  process.exitCode = 1;
}

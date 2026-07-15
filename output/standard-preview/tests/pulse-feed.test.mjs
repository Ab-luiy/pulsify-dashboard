import { strict as assert } from "node:assert";
import * as pulseFeedApi from "../functions/api/pulse-feed.js";
import * as clientBrainApi from "../functions/api/client-brain.js";

class MockDB {
  constructor(seed = {}) {
    this.configs = seed.configs || [];
    this.tables = seed.tables || {};
    this.queries = [];
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }
}

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.sql.includes("FROM client_config") && this.sql.includes("portal_token_hash")) {
      const row = this.db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
      return row ? { client: row.client, client_name: row.client_name || row.client } : null;
    }
    if (this.sql.includes("FROM client_config") && this.sql.includes("client_name")) {
      const row = this.db.configs.find((entry) => entry.client === this.values[0]);
      return row ? { client_name: row.client_name || row.client } : null;
    }
    throw new Error(`Unexpected first query: ${this.sql}`);
  }

  async all() {
    const table = this.sql.match(/FROM ([a-z_]+)/i)?.[1];
    if (!table) throw new Error(`Unexpected all query: ${this.sql}`);
    this.db.queries.push({ table, values: [...this.values] });
    if (table === "client_brain") return { results: [] };

    const [client, cutoff, limit] = this.values;
    const clientField = ["studio_sequences", "sequence_log", "proof_items"].includes(table) ? "client_id" : "client";
    const timeField = ({
      payments: "occurred_at",
      page_events: "at",
      watch_events: "at",
      studio_sequences: "updated_at",
      sequence_log: "posted_on",
      proof_items: "created_at",
      integration_events: "ts",
      content_items: "updated_at",
    })[table];
    let rows = (this.db.tables[table] || [])
      .filter((row) => row[clientField] === client)
      .filter((row) => String(row[timeField] || "") >= String(cutoff || ""));
    if (table === "content_items") rows = rows.filter((row) => row.stage === "published");
    rows.sort((left, right) => String(right[timeField]).localeCompare(String(left[timeField])));
    rows = rows.slice(0, Number(limit || 12));
    return { results: rows.map((row) => ({ ...row, ts: row[timeField] })) };
  }

  async run() {
    if (this.sql.startsWith("UPDATE proof_items SET claim=")) {
      const [claim, id, client] = this.values;
      const row = (this.db.tables.proof_items || []).find((entry) => entry.id === id && entry.client_id === client);
      if (!row) return { meta: { changes: 0 } };
      row.claim = claim;
      return { meta: { changes: 1 } };
    }
    throw new Error(`Unexpected run query: ${this.sql}`);
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function ago(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function tokenRequest(path, token, options = {}) {
  return new Request(`https://funnels.test${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      "x-portal-token": token,
      ...(options.headers || {}),
    },
  });
}

async function run() {
  const token = "alpha-pulse-token";
  const db = new MockDB({
    configs: [{ client: "alpha", client_name: "Alpha Coach", portal_token_hash: await sha256Hex(token) }],
    tables: {
      payments: [
        { id: 1, client: "alpha", amount_cents: 250000, currency: "usd", rail: "stripe", note: "Paid in full", occurred_at: ago(5) },
        { id: 2, client: "beta", amount_cents: 900000, currency: "usd", rail: "stripe", occurred_at: ago(1) },
      ],
      page_events: [
        { id: 1, client: "alpha", event: "page_view", path: "/alpha", at: ago(35) },
        { id: 2, client: "beta", event: "page_view", path: "/beta", at: ago(2) },
      ],
      watch_events: [{ id: 1, client: "alpha", event: "exit", percent: 78, media_id: "alpha-vsl", at: ago(30) }],
      studio_sequences: [{ id: 1, client_id: "alpha", type: "credibility", topic: "Student result", status: "review", updated_at: ago(20) }],
      sequence_log: [{ id: 1, client_id: "alpha", type: "value-driven", topic: "Offer fix", posted_on: ago(40).slice(0, 10) }],
      proof_items: [
        { id: 1, client_id: "alpha", kind: "image", claim: "Student reached the target.", permission: "granted", created_at: ago(10) },
        { id: 2, client_id: "beta", kind: "image", claim: "Beta private proof", permission: "unknown", created_at: ago(1) },
      ],
      integration_events: [{ id: 1, client: "alpha", provider: "calcom", kind: "booking.created", payload_summary_json: JSON.stringify({ name: "Fit call" }), ts: ago(25) }],
      content_items: [{ id: 1, client: "alpha", title: "Offer breakdown", platform: "YouTube", stage: "published", updated_at: ago(45) }],
    },
  });
  const env = { DB: db };

  const unauthorized = await pulseFeedApi.onRequestGet({
    request: new Request("https://funnels.test/api/pulse-feed?client=alpha"),
    env,
  });
  assert.equal(unauthorized.status, 401);

  const feedResponse = await pulseFeedApi.onRequestGet({
    request: tokenRequest("/api/pulse-feed?client=alpha", token),
    env,
  });
  assert.equal(feedResponse.status, 200);
  const feed = await feedResponse.json();
  assert.equal(feed.ok, true);
  assert.equal(feed.client, "alpha");
  assert.deepEqual(feed.items.slice(0, 4).map((entry) => entry.kind), ["payment", "proof", "studio", "integration"]);
  assert.ok(feed.items.every((entry, index, items) => index === 0 || new Date(items[index - 1].ts) >= new Date(entry.ts)));
  assert.ok(feed.items.every((entry) => !`${entry.title} ${entry.detail}`.includes("Beta")));
  assert.deepEqual(
    db.queries.filter((query) => query.table !== "client_brain").map((query) => query.values[0]),
    Array(8).fill("alpha"),
  );

  const crossClientFeed = await pulseFeedApi.onRequestGet({
    request: tokenRequest("/api/pulse-feed?client=beta", token),
    env,
  });
  assert.equal(crossClientFeed.status, 403);

  const proofRead = await clientBrainApi.onRequestGet({
    request: tokenRequest("/api/client-brain?client=alpha", token),
    env,
  });
  assert.equal(proofRead.status, 200);
  const proofReadBody = await proofRead.json();
  assert.deepEqual(proofReadBody.proof_items.map((entry) => entry.id), [1]);

  const blockedProofWrite = await clientBrainApi.onRequestPost({
    request: tokenRequest("/api/client-brain", token, {
      method: "POST",
      body: JSON.stringify({ action: "update-proof", client: "alpha", id: 2, claim: "Changed by alpha" }),
    }),
    env,
  });
  assert.equal(blockedProofWrite.status, 404);
  assert.equal(db.tables.proof_items.find((entry) => entry.id === 2).claim, "Beta private proof");

  const ownProofWrite = await clientBrainApi.onRequestPost({
    request: tokenRequest("/api/client-brain", token, {
      method: "POST",
      body: JSON.stringify({ action: "update-proof", client: "alpha", id: 1, claim: "Student reached the verified target." }),
    }),
    env,
  });
  assert.equal(ownProofWrite.status, 200);
  assert.equal(db.tables.proof_items.find((entry) => entry.id === 1).claim, "Student reached the verified target.");

  const mismatchedProofWrite = await clientBrainApi.onRequestPost({
    request: tokenRequest("/api/client-brain", token, {
      method: "POST",
      body: JSON.stringify({ action: "update-proof", client: "beta", id: 1, claim: "Wrong scope" }),
    }),
    env,
  });
  assert.equal(mismatchedProofWrite.status, 403);

  console.log("PASS pulse feed: ordered merge, client isolation, 401, and token-scoped proof reads and writes");
}

run().catch((error) => {
  console.error(`FAIL pulse feed: ${error?.stack || error}`);
  process.exitCode = 1;
});

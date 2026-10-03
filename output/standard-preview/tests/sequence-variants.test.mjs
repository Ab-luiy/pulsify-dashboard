import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import * as variantsApi from "../functions/api/sequence-variants.js";
import { CLIENT_SESSION_COOKIE } from "../functions/_shared/client-auth.js";

class MockDB {
  constructor() {
    this.configs = [];
    this.clientSessions = [];
    this.impersonationSessions = [];
    this.sequences = [];
    this.variants = [];
    this.nextVariantId = 1;
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
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.sql.includes("FROM impersonation_sessions s")) {
      const [tokenHash, cutoff] = this.values;
      const row = this.db.impersonationSessions.find((entry) =>
        entry.token_hash === tokenHash && entry.consumed_at && entry.expires_at > cutoff);
      if (!row) return null;
      const config = this.db.configs.find((entry) => entry.client === row.client_id);
      return { ...row, client_name: config?.client_name || row.client_id };
    }
    if (this.sql.includes("FROM client_sessions s")) {
      const [tokenHash, cutoff] = this.values;
      const row = this.db.clientSessions.find((entry) => entry.token_hash === tokenHash && entry.expires_at > cutoff);
      if (!row) return null;
      const config = this.db.configs.find((entry) => entry.client === row.client_id);
      return { ...row, client_name: config?.client_name || row.client_id };
    }
    if (this.sql.includes("FROM client_config") && this.sql.includes("portal_token_hash=?")) {
      const row = this.db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
      return row ? { client: row.client, client_name: row.client_name || row.client } : null;
    }
    if (this.sql.includes("FROM sequence_log") && this.sql.includes("WHERE id=?")) {
      const row = this.db.sequences.find((entry) => entry.id === Number(this.values[0]));
      if (!row) return null;
      if (this.sql === "SELECT id, client_id FROM sequence_log WHERE id=?") {
        return { id: row.id, client_id: row.client_id };
      }
      return { ...row };
    }
    if (this.sql.includes("FROM sequence_variants") && this.sql.includes("WHERE id=?")) {
      const row = this.db.variants.find((entry) => entry.id === Number(this.values[0]));
      return row ? { ...row } : null;
    }
    throw new Error(`Unexpected first query: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("FROM sequence_variants")) {
      let rows = [...this.db.variants];
      if (this.sql.includes("WHERE client_id=? AND sequence_ref=? AND status='testing'")) {
        rows = rows.filter((row) => row.client_id === this.values[0]
          && row.sequence_ref === Number(this.values[1]) && row.status === "testing");
      } else if (this.sql.includes("WHERE client_id=? AND sequence_ref=?")) {
        rows = rows.filter((row) => row.client_id === this.values[0]
          && row.sequence_ref === Number(this.values[1]));
      } else if (this.sql.includes("WHERE client_id=?")) {
        rows = rows.filter((row) => row.client_id === this.values[0]);
      }
      return { results: rows.sort((a, b) => a.id - b.id).map((row) => ({ ...row })) };
    }
    if (this.sql.includes("FROM sequence_log")) {
      let rows = [...this.db.sequences];
      if (this.sql.includes("WHERE client_id=?")) rows = rows.filter((row) => row.client_id === this.values[0]);
      return { results: rows.map((row) => ({ ...row })) };
    }
    throw new Error(`Unexpected all query: ${this.sql}`);
  }

  async run() {
    if (this.sql === "DELETE FROM client_sessions WHERE expires_at<?") {
      this.db.clientSessions = this.db.clientSessions.filter((row) => row.expires_at >= this.values[0]);
      return changed(0);
    }
    if (this.sql === "DELETE FROM impersonation_sessions WHERE expires_at<?") {
      this.db.impersonationSessions = this.db.impersonationSessions.filter((row) => row.expires_at >= this.values[0]);
      return changed(0);
    }
    if (this.sql.startsWith("INSERT INTO sequence_variants")) {
      let clientId;
      let sequenceRef;
      let label;
      let hookText;
      let completionPct;
      let startedAt;
      let createdAt;
      if (this.sql.includes("VALUES (?, ?, 'v1'")) {
        [clientId, sequenceRef, hookText, completionPct, startedAt, createdAt] = this.values;
        label = "v1";
      } else {
        [clientId, sequenceRef, label, hookText, startedAt, createdAt] = this.values;
        completionPct = null;
      }
      const id = this.db.nextVariantId++;
      this.db.variants.push({
        id,
        client_id: clientId,
        sequence_ref: Number(sequenceRef),
        label,
        hook_text: hookText,
        status: "testing",
        completion_pct: completionPct,
        started_at: startedAt,
        resolved_at: null,
        created_at: createdAt,
      });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (this.sql.includes("SET completion_pct=?")) {
      const [completionPct, id, clientId] = this.values;
      const row = this.db.variants.find((entry) => entry.id === Number(id)
        && entry.client_id === clientId && entry.status === "testing");
      if (!row) return changed(0);
      row.completion_pct = completionPct;
      return changed(1);
    }
    if (this.sql.includes("SET status=CASE WHEN id=? THEN 'won' ELSE 'lost' END")) {
      const [winnerId, resolvedAt, clientId, sequenceRef, firstId, secondId] = this.values;
      const ids = new Set([Number(firstId), Number(secondId)]);
      const rows = this.db.variants.filter((entry) => ids.has(entry.id)
        && entry.client_id === clientId && entry.sequence_ref === Number(sequenceRef) && entry.status === "testing");
      for (const row of rows) Object.assign(row, { status: row.id === Number(winnerId) ? "won" : "lost", resolved_at: resolvedAt });
      return changed(rows.length);
    }
    if (this.sql.includes("SET status='won'")) return updateResolvedVariant(this.db, this.values, "won");
    if (this.sql.includes("SET status='lost'")) return updateResolvedVariant(this.db, this.values, "lost");
    if (this.sql.includes("SET status='testing', resolved_at=NULL")) {
      const [startedAt, id, clientId, sequenceRef] = this.values;
      const row = this.db.variants.find((entry) => entry.id === Number(id)
        && entry.client_id === clientId && entry.sequence_ref === Number(sequenceRef) && entry.status === "won");
      if (!row) return changed(0);
      Object.assign(row, { status: "testing", resolved_at: null, started_at: startedAt });
      return changed(1);
    }
    throw new Error(`Unexpected run query: ${this.sql}`);
  }
}

function updateResolvedVariant(db, values, status) {
  const [resolvedAt, id, clientId, sequenceRef] = values;
  const row = db.variants.find((entry) => entry.id === Number(id)
    && entry.client_id === clientId && entry.sequence_ref === Number(sequenceRef) && entry.status === "testing");
  if (!row) return changed(0);
  Object.assign(row, { status, resolved_at: resolvedAt });
  return changed(1);
}

function changed(changes) {
  return { meta: { changes } };
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function request(method, body, headers = {}, query = "") {
  return new Request(`https://funnels.test/api/sequence-variants${query}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

async function createFixture() {
  const db = new MockDB();
  const alphaToken = "alpha-portal-token";
  const betaToken = "beta-portal-token";
  db.configs.push(
    { client: "alpha", client_name: "Alpha Coach", portal_token_hash: await sha256Hex(alphaToken) },
    { client: "beta", client_name: "Beta Coach", portal_token_hash: await sha256Hex(betaToken) },
  );
  db.sequences.push(
    {
      id: 11,
      client_id: "alpha",
      posted_on: "2026-07-15",
      type: "value-driven",
      topic: "The profile fix that changed the DMs",
      slide_count: 4,
      slide_views_json: JSON.stringify([1000, 500, 450, 400]),
    },
    {
      id: 22,
      client_id: "beta",
      posted_on: "2026-07-15",
      type: "credibility",
      topic: "Beta private hook",
      slide_count: 4,
      slide_views_json: JSON.stringify([900, 300, 280, 250]),
    },
  );
  return { env: { DB: db, ADMIN_KEY: "operator-secret" }, db, alphaToken, betaToken };
}

async function testLifecycleAndIsolation() {
  const { env, db, alphaToken } = await createFixture();
  const started = await variantsApi.onRequestPost({
    request: request("POST", {
      action: "start",
      sequence_ref: 11,
      new_hook: "The DMs changed after one profile line moved.",
    }, { "x-portal-token": alphaToken }),
    env,
  });
  assert.equal(started.status, 200);
  const startedBody = await started.json();
  assert.equal(startedBody.leaking_slide, 2);
  assert.equal(startedBody.leak_loss_pct, 50);
  assert.equal(startedBody.variant.label, "v2");
  assert.equal(db.variants.length, 2);
  assert.deepEqual(db.variants.map((row) => row.client_id), ["alpha", "alpha"]);
  assert.equal(db.variants[0].sequence_ref, 11);
  assert.equal(db.variants[0].label, "v1");
  assert.equal(db.variants[0].hook_text, "The profile fix that changed the DMs");
  assert.equal(db.variants[0].completion_pct, 40);
  assert.equal(db.variants[1].label, "v2");
  assert.equal(db.variants[1].hook_text, "The DMs changed after one profile line moved.");
  assert.equal(db.variants[1].status, "testing");

  const crossClient = await variantsApi.onRequestPost({
    request: request("POST", {
      action: "start",
      sequence_ref: 22,
      new_hook: "This must stay blocked.",
    }, { "x-portal-token": alphaToken }),
    env,
  });
  assert.equal(crossClient.status, 404);

  const logged = await variantsApi.onRequestPost({
    request: request("POST", {
      action: "log",
      variant_id: db.variants[1].id,
      completion_pct: 61.5,
    }, { "x-portal-token": alphaToken }),
    env,
  });
  assert.equal(logged.status, 200);

  const resolved = await variantsApi.onRequestPost({
    request: request("POST", { action: "resolve", sequence_ref: 11 }, { "x-portal-token": alphaToken }),
    env,
  });
  assert.equal(resolved.status, 200);
  const resolvedBody = await resolved.json();
  assert.equal(resolvedBody.winner.label, "v2");
  assert.equal(resolvedBody.winner.status, "won");
  assert.equal(resolvedBody.loser.label, "v1");
  assert.equal(resolvedBody.loser.status, "lost");
  assert.equal(db.variants.find((row) => row.label === "v2").status, "won");
  assert.equal(db.variants.find((row) => row.label === "v1").status, "lost");
}

async function testImpersonationReadOnlyAndClientRead() {
  const { env, db } = await createFixture();
  db.variants.push({
    id: db.nextVariantId++,
    client_id: "alpha",
    sequence_ref: 11,
    label: "v1",
    hook_text: "Original hook",
    status: "testing",
    completion_pct: 40,
    started_at: new Date().toISOString(),
    resolved_at: null,
    created_at: new Date().toISOString(),
  });
  const rawToken = "impersonated-retest-session";
  db.impersonationSessions.push({
    token_hash: await sha256Hex(rawToken),
    client_id: "alpha",
    consumed_at: new Date().toISOString(),
    created_by: "admin",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
  const headers = { cookie: `${CLIENT_SESSION_COOKIE}=${rawToken}` };
  const read = await variantsApi.onRequestGet({ request: request("GET", null, headers), env });
  assert.equal(read.status, 200);
  assert.equal((await read.json()).rows[0].sequence_ref, 11);

  for (const body of [
    { action: "start", sequence_ref: 11, new_hook: "Blocked" },
    { action: "log", variant_id: 1, completion_pct: 60 },
    { action: "resolve", sequence_ref: 11 },
  ]) {
    const write = await variantsApi.onRequestPost({ request: request("POST", body, headers), env });
    assert.equal(write.status, 403, `${body.action} must reject impersonated sessions`);
    assert.deepEqual(await write.json(), { error: "read only" });
  }
}

async function testAdminReadAuthAndCrossClientCoverage() {
  const { env, db } = await createFixture();
  db.variants.push(
    { id: db.nextVariantId++, client_id: "alpha", sequence_ref: 11, label: "v1", hook_text: "Alpha", status: "won", completion_pct: 50, started_at: "a", resolved_at: "b", created_at: "a" },
    { id: db.nextVariantId++, client_id: "beta", sequence_ref: 22, label: "v1", hook_text: "Beta", status: "won", completion_pct: 55, started_at: "a", resolved_at: "b", created_at: "a" },
  );

  const denied = await variantsApi.onRequestGet({ request: request("GET", null, {}, "?admin=1"), env });
  assert.equal(denied.status, 401);

  const allowed = await variantsApi.onRequestGet({
    request: request("GET", null, { "x-admin-key": "operator-secret" }, "?admin=1"),
    env,
  });
  assert.equal(allowed.status, 200);
  const body = await allowed.json();
  assert.deepEqual(new Set(body.rows.map((row) => row.client_id)), new Set(["alpha", "beta"]));
}

async function testMigration() {
  const sql = await readFile(new URL("../migrations/0019_sequence_variants.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS sequence_variants/);
  assert.match(sql, /sequence_ref\s+INTEGER NOT NULL/);
  assert.match(sql, /UNIQUE \(client_id, sequence_ref, label\)/);
  assert.match(sql, /CHECK \(status IN \('testing', 'won', 'lost', 'retired'\)\)/);
  assert.doesNotMatch(sql, /\b(?:DROP|ALTER|DELETE|UPDATE)\b/i);
}

try {
  await testLifecycleAndIsolation();
  await testImpersonationReadOnlyAndClientRead();
  await testAdminReadAuthAndCrossClientCoverage();
  await testMigration();
  console.log("PASS sequence variants: start, capture, isolation, impersonation, logging, resolution, admin auth, and migration");
} catch (error) {
  console.error(`FAIL sequence variants: ${error?.stack || error}`);
  process.exitCode = 1;
}

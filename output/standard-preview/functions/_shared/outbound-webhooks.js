// Outbound webhooks. Producers call emitEvent() from any request handler; it
// only writes one outbox row and returns. The sync Worker sweeps the outbox
// once a minute and delivers with the Kendo-style signed contract:
//   X-Pulsify-Signature  HMAC SHA-256 (hex) over the raw JSON body
//   X-Pulsify-Event      event name
//   X-Pulsify-Delivery-Id delivery id
// Three attempts with 1s, 2s, 4s backoff and a 10s timeout.
import { generateOpaqueToken, json, nowIso, parseJson, sha256Hex, str } from "./common.js";
import { seal, unseal } from "./secret-box.js";

export const EVENTS = [
  "lead.created",
  "lead.stage_changed",
  "conversation.new_message",
  "payment.received",
  "payment.matched",
  "payment.unmatched",
  "payment.refunded",
  "client.provisioned",
  "client.checklist_step_completed",
  "content.sequence_published",
  "integration.sync_failed",
];
const EVENT_SET = new Set(EVENTS);
export const MAX_ATTEMPTS = 3;
export const BACKOFF_MS = [1000, 2000, 4000];
export const TIMEOUT_MS = 10000;

export function isValidEvent(name) {
  return EVENT_SET.has(str(name));
}

export function isValidUrl(value) {
  try {
    const url = new URL(str(value));
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || /^(\d+\.){3}\d+$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function emitEvent(env, { scope = "operator", clientId = "", event, data = {}, isTest = false }) {
  if (!env?.DB || !isValidEvent(event)) return null;
  const id = `evt_${generateOpaqueToken(12)}`;
  const createdAt = nowIso();
  const payload = { id, event, created_at: createdAt, data: isTest ? { ...data, _isTest: true } : data };
  await env.DB.prepare(
    `INSERT INTO webhook_outbox (id, scope, client_id, event, payload_json, is_test, created_at)
     VALUES (?,?,?,?,?,?,?)`,
  ).bind(id, scope, clientId, event, JSON.stringify(payload), isTest ? 1 : 0, createdAt).run();
  return id;
}

export async function createEndpoint(env, { scope, clientId = "", url, events, description, createdBy }) {
  if (!isValidUrl(url)) return { error: json({ ok: false, error: "url must be https and public" }, 422) };
  const list = Array.isArray(events) ? [...new Set(events.map(str))].filter(isValidEvent) : [];
  if (!list.length) return { error: json({ ok: false, error: "at least one valid event is required" }, 422) };
  const id = `whe_${generateOpaqueToken(10)}`;
  const secret = `whsec_${generateOpaqueToken(24)}`;
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO webhook_endpoints (id, scope, client_id, url, secret_enc, events_json, active, description, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?,?,1,?,?,?,?)`,
  ).bind(id, scope, clientId, str(url), await seal(env, secret, `webhook:${id}`), JSON.stringify(list), str(description).slice(0, 200) || null, str(createdBy), now, now).run();
  return { endpoint: { id, scope, client_id: clientId, url: str(url), events: list, active: 1, description: str(description).slice(0, 200) || null, created_at: now }, secret };
}

export async function listEndpoints(env, scope, clientId = "") {
  const result = await env.DB.prepare(
    `SELECT id, scope, client_id, url, events_json, active, description, created_by, created_at, updated_at
       FROM webhook_endpoints WHERE scope=? AND client_id=? ORDER BY created_at DESC`,
  ).bind(scope, clientId).all();
  return (result.results || []).map((row) => ({ ...row, events: parseJson(row.events_json, []), events_json: undefined }));
}

export async function updateEndpoint(env, scope, clientId, id, patch) {
  const existing = await env.DB.prepare(
    "SELECT id FROM webhook_endpoints WHERE id=? AND scope=? AND client_id=?",
  ).bind(id, scope, clientId).first();
  if (!existing) return { error: json({ ok: false, error: "endpoint not found" }, 404) };
  const sets = [];
  const values = [];
  if (patch.url !== undefined) {
    if (!isValidUrl(patch.url)) return { error: json({ ok: false, error: "url must be https and public" }, 422) };
    sets.push("url=?"); values.push(str(patch.url));
  }
  if (patch.events !== undefined) {
    const list = Array.isArray(patch.events) ? [...new Set(patch.events.map(str))].filter(isValidEvent) : [];
    if (!list.length) return { error: json({ ok: false, error: "at least one valid event is required" }, 422) };
    sets.push("events_json=?"); values.push(JSON.stringify(list));
  }
  if (patch.active !== undefined) { sets.push("active=?"); values.push(patch.active ? 1 : 0); }
  if (patch.description !== undefined) { sets.push("description=?"); values.push(str(patch.description).slice(0, 200) || null); }
  if (!sets.length) return { error: json({ ok: false, error: "nothing to update" }, 422) };
  sets.push("updated_at=?"); values.push(nowIso());
  await env.DB.prepare(`UPDATE webhook_endpoints SET ${sets.join(",")} WHERE id=?`).bind(...values, id).run();
  return { ok: true };
}

export async function deleteEndpoint(env, scope, clientId, id) {
  const result = await env.DB.prepare(
    "DELETE FROM webhook_endpoints WHERE id=? AND scope=? AND client_id=?",
  ).bind(id, scope, clientId).run();
  return (result.meta?.changes || 0) > 0;
}

export async function listDeliveries(env, endpointId, limit = 50) {
  const result = await env.DB.prepare(
    `SELECT d.id, d.event_id, d.attempt, d.status, d.status_code, d.error, d.sent_at, d.next_attempt_at, d.created_at, o.event
       FROM webhook_deliveries d LEFT JOIN webhook_outbox o ON o.id=d.event_id
      WHERE d.endpoint_id=? ORDER BY d.created_at DESC LIMIT ?`,
  ).bind(endpointId, Math.min(200, Math.max(1, limit))).all();
  return result.results || [];
}

export async function signBody(secret, rawBody) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Fan out: for every undispatched outbox row, create one pending delivery per
// matching active endpoint, then mark the row dispatched. Idempotent through
// the UNIQUE(endpoint_id, event_id) constraint.
export async function fanOut(env, limit = 200) {
  const pending = await env.DB.prepare(
    "SELECT id, scope, client_id, event FROM webhook_outbox WHERE dispatched_at IS NULL ORDER BY created_at LIMIT ?",
  ).bind(limit).all();
  let created = 0;
  for (const row of pending.results || []) {
    const endpoints = await env.DB.prepare(
      "SELECT id, events_json FROM webhook_endpoints WHERE scope=? AND client_id=? AND active=1",
    ).bind(row.scope, row.client_id).all();
    const now = nowIso();
    for (const endpoint of endpoints.results || []) {
      if (!parseJson(endpoint.events_json, []).includes(row.event)) continue;
      const result = await env.DB.prepare(
        `INSERT OR IGNORE INTO webhook_deliveries (id, endpoint_id, event_id, attempt, next_attempt_at, status, created_at)
         VALUES (?,?,?,0,?,'pending',?)`,
      ).bind(`whd_${generateOpaqueToken(10)}`, endpoint.id, row.id, now, now).run();
      created += result.meta?.changes || 0;
    }
    await env.DB.prepare("UPDATE webhook_outbox SET dispatched_at=? WHERE id=?").bind(now, row.id).run();
  }
  return created;
}

// Deliver every due pending delivery. `fetcher` is injectable for tests.
export async function deliverDue(env, { fetcher = fetch, now = () => Date.now(), limit = 100 } = {}) {
  const nowIsoValue = new Date(now()).toISOString();
  const due = await env.DB.prepare(
    `SELECT d.id, d.endpoint_id, d.event_id, d.attempt, e.url, e.secret_enc, o.payload_json, o.event
       FROM webhook_deliveries d
       JOIN webhook_endpoints e ON e.id=d.endpoint_id
       JOIN webhook_outbox o ON o.id=d.event_id
      WHERE d.status='pending' AND d.next_attempt_at<=? AND e.active=1
      ORDER BY d.next_attempt_at LIMIT ?`,
  ).bind(nowIsoValue, limit).all();
  let delivered = 0;
  for (const row of due.results || []) {
    const attempt = row.attempt + 1;
    let statusCode = null;
    let error = null;
    try {
      const secret = await unseal(env, row.secret_enc, `webhook:${row.endpoint_id}`);
      const signature = await signBody(secret, row.payload_json);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetcher(row.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "Pulsify-Webhooks/1.0",
            "x-pulsify-signature": signature,
            "x-pulsify-event": row.event,
            "x-pulsify-delivery-id": row.id,
          },
          body: row.payload_json,
          signal: controller.signal,
        });
        statusCode = response.status;
        if (statusCode < 200 || statusCode >= 300) error = `HTTP ${statusCode}`;
      } finally {
        clearTimeout(timer);
      }
    } catch (caught) {
      error = String(caught?.message || caught).slice(0, 500);
    }
    const sentAt = new Date(now()).toISOString();
    if (!error) {
      delivered += 1;
      await env.DB.prepare(
        "UPDATE webhook_deliveries SET attempt=?, status='delivered', status_code=?, error=NULL, sent_at=?, next_attempt_at=NULL WHERE id=?",
      ).bind(attempt, statusCode, sentAt, row.id).run();
    } else if (attempt >= MAX_ATTEMPTS) {
      await env.DB.prepare(
        "UPDATE webhook_deliveries SET attempt=?, status='failed', status_code=?, error=?, sent_at=?, next_attempt_at=NULL WHERE id=?",
      ).bind(attempt, statusCode, error, sentAt, row.id).run();
    } else {
      const next = new Date(now() + BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length) - 1]).toISOString();
      await env.DB.prepare(
        "UPDATE webhook_deliveries SET attempt=?, status_code=?, error=?, sent_at=?, next_attempt_at=? WHERE id=?",
      ).bind(attempt, statusCode, error, sentAt, next, row.id).run();
    }
  }
  return { due: (due.results || []).length, delivered };
}

export async function hashForLookup(value) {
  return sha256Hex(str(value));
}

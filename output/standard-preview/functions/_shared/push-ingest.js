// Push API: team-scoped API keys and validated ingestion of leads, messages,
// metrics and payments. Mirrors Kendo's Push API contract: X-API-Key or
// Authorization: Bearer, 30 requests per minute per key, 1 MB body, 201 with
// an id, idempotent on external id or reference.
import { cleanId, generateOpaqueToken, json, normalizeEmail, nowIso, numberOrNull, sha256Hex, str, strOrNull } from "./common.js";
import { emitEvent } from "./outbound-webhooks.js";
import { processNormalizedPayment } from "./payments.js";

export const RATE_LIMIT_PER_MINUTE = 30;
export const MAX_BODY_BYTES = 1024 * 1024;
const KINDS = new Set(["lead", "message", "metric", "payment"]);

export async function createApiKey(env, { scope, clientId = "", label, createdBy }) {
  const id = `key_${generateOpaqueToken(8)}`;
  const secret = `pk_${generateOpaqueToken(24)}`;
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO api_keys (id, scope, client_id, key_hash, key_prefix, label, created_by, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).bind(id, scope, clientId, await sha256Hex(secret), secret.slice(0, 7), str(label).slice(0, 100) || null, str(createdBy), now).run();
  return { key: { id, scope, client_id: clientId, key_prefix: secret.slice(0, 7), label: str(label).slice(0, 100) || null, created_at: now }, secret };
}

export async function listApiKeys(env, scope, clientId = "") {
  const result = await env.DB.prepare(
    `SELECT id, scope, client_id, key_prefix, label, created_by, created_at, last_used_at, revoked_at
       FROM api_keys WHERE scope=? AND client_id=? ORDER BY created_at DESC`,
  ).bind(scope, clientId).all();
  return result.results || [];
}

export async function revokeApiKey(env, scope, clientId, id) {
  const result = await env.DB.prepare(
    "UPDATE api_keys SET revoked_at=? WHERE id=? AND scope=? AND client_id=? AND revoked_at IS NULL",
  ).bind(nowIso(), id, scope, clientId).run();
  return (result.meta?.changes || 0) > 0;
}

export function extractApiKey(request) {
  const direct = str(request.headers.get("x-api-key"));
  if (direct) return direct;
  const auth = str(request.headers.get("authorization"));
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

export async function resolveApiKey(env, request) {
  const supplied = extractApiKey(request);
  if (!supplied || !supplied.startsWith("pk_") || supplied.length > 200) return null;
  const row = await env.DB.prepare(
    "SELECT id, scope, client_id, created_by FROM api_keys WHERE key_hash=? AND revoked_at IS NULL",
  ).bind(await sha256Hex(supplied)).first();
  return row || null;
}

// Returns true when the request is inside the limit. Bucket is one minute.
export async function consumeRateLimit(env, keyId, now = Date.now()) {
  const bucket = new Date(now).toISOString().slice(0, 16);
  await env.DB.prepare(
    `INSERT INTO api_key_usage (key_id, bucket, count) VALUES (?,?,1)
     ON CONFLICT(key_id, bucket) DO UPDATE SET count=count+1`,
  ).bind(keyId, bucket).run();
  const row = await env.DB.prepare("SELECT count FROM api_key_usage WHERE key_id=? AND bucket=?").bind(keyId, bucket).first();
  return (row?.count || 0) <= RATE_LIMIT_PER_MINUTE;
}

export function validateIngest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "JSON object body required" };
  const kind = str(body.kind).toLowerCase();
  if (!KINDS.has(kind)) return { error: "kind must be one of lead, message, metric, payment" };
  const data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : null;
  if (!data) return { error: "data object required" };
  if (kind === "lead") {
    const name = str(data.name).slice(0, 200);
    const handle = str(data.handle || data.instagram || data.ig).replace(/^@/, "").slice(0, 100);
    const email = normalizeEmail(data.email);
    if (!name && !handle && !email) return { error: "lead needs a name, handle or email" };
    return { kind, externalId: str(body.external_id || body.externalId || handle || email || name).slice(0, 200), data: { name: name || null, handle: handle || null, email: email || null, source: str(data.source).slice(0, 100) || "push-api", notes: str(data.notes).slice(0, 2000) || null, tags: Array.isArray(data.tags) ? data.tags.map(str).filter(Boolean).slice(0, 20) : [], stage: str(data.stage).slice(0, 50) || null } };
  }
  if (kind === "message") {
    const handle = str(data.handle).replace(/^@/, "").slice(0, 100);
    const direction = str(data.direction).toLowerCase();
    const text = str(data.text).slice(0, 4000);
    if (!handle || !["inbound", "outbound"].includes(direction) || !text) return { error: "message needs handle, direction (inbound|outbound) and text" };
    const ts = strOrNull(data.ts) || nowIso();
    const channel = str(data.channel).slice(0, 40) || "instagram";
    const externalId = str(body.external_id || body.externalId || `${channel}:${handle}:${direction}:${ts}:${text}`).slice(0, 200);
    return { kind, externalId, data: { handle, direction, text, ts, channel } };
  }
  if (kind === "metric") {
    const source = str(data.source).slice(0, 60);
    const metric = str(data.metric).slice(0, 80);
    const value = numberOrNull(data.value);
    if (!source || !metric || value == null) return { error: "metric needs source, metric and numeric value" };
    const dims = data.dims && typeof data.dims === "object" && !Array.isArray(data.dims) ? data.dims : {};
    if (Object.keys(dims).length > 20) return { error: "dims may hold at most 20 keys" };
    const ts = strOrNull(data.ts) || nowIso();
    return { kind, externalId: str(body.external_id || body.externalId || `${source}:${metric}:${ts}:${JSON.stringify(dims)}`).slice(0, 200), data: { source, metric, value, ts, dims } };
  }
  const amount = numberOrNull(data.amount_cents ?? data.amountCents);
  const amountMajor = numberOrNull(data.amount);
  const cents = amount != null ? Math.round(amount) : amountMajor != null ? Math.round(amountMajor * 100) : null;
  const reference = str(data.reference || data.id).slice(0, 200);
  if (cents == null || !reference) return { error: "payment needs amount (or amount_cents) and reference" };
  return { kind, externalId: reference, data: { amount_cents: cents, currency: str(data.currency || "USD").toUpperCase().slice(0, 3), reference, customer_email: normalizeEmail(data.customer_email || data.email) || null, customer_name: str(data.customer_name || data.name).slice(0, 200) || null, occurred_at: strOrNull(data.occurred_at || data.ts) || nowIso(), note: str(data.note).slice(0, 500) || null } };
}

// Writes the validated record. Returns { id, duplicate }.
export async function ingest(env, key, record) {
  const scope = key.scope;
  const clientId = key.client_id || "";
  const now = nowIso();
  const id = `ing_${generateOpaqueToken(10)}`;

  if (record.kind === "payment") {
    const result = await processNormalizedPayment(env, {
      client: clientId || operatorClientId(env),
      reference: `push:${record.data.reference}`,
      amountCents: record.data.amount_cents,
      currency: record.data.currency,
      rail: "push-api",
      occurredAt: record.data.occurred_at,
      recordedBy: `push-api:${key.id}`,
      note: record.data.note,
      eventId: `push:${record.data.reference}`,
      customerEmail: record.data.customer_email,
      customerName: record.data.customer_name,
      skipSideEffects: true,
    });
    if (!result.ok) return { error: result.error };
    if (!result.duplicate && (record.data.customer_email || record.data.customer_name)) {
      await env.DB.prepare("UPDATE payments SET customer_email=?, customer_name=? WHERE id=?")
        .bind(record.data.customer_email, record.data.customer_name, result.payment.id).run().catch(() => null);
    }
    if (!result.duplicate) {
      await emitEvent(env, { scope, clientId, event: "payment.received", data: { payment_id: result.payment.id, amount_cents: record.data.amount_cents, currency: record.data.currency, reference: record.data.reference, source: "push-api" } });
    }
    return { id: `pay_${result.payment.id}`, duplicate: Boolean(result.duplicate) };
  }

  if (record.kind === "metric") {
    const dimsJson = JSON.stringify(record.data.dims);
    const inserted = await env.DB.prepare(
      `INSERT OR IGNORE INTO metric_points (scope, client_id, source, metric, ts, value, dims_json) VALUES (?,?,?,?,?,?,?)`,
    ).bind(scope, clientId, record.data.source, record.data.metric, record.data.ts, record.data.value, dimsJson).run();
    const duplicate = (inserted.meta?.changes || 0) === 0;
    const row = await env.DB.prepare(
      "SELECT id FROM metric_points WHERE scope=? AND client_id=? AND source=? AND metric=? AND ts=? AND dims_json=?",
    ).bind(scope, clientId, record.data.source, record.data.metric, record.data.ts, dimsJson).first();
    return { id: row?.id ? `metric_${row.id}` : id, duplicate };
  }

  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO ingest_records (id, scope, client_id, kind, external_id, payload_json, key_id, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).bind(id, scope, clientId, record.kind, record.externalId, JSON.stringify(record.data), key.id, now).run();
  const duplicate = (inserted.meta?.changes || 0) === 0;
  if (duplicate) {
    const existing = await env.DB.prepare(
      "SELECT id FROM ingest_records WHERE scope=? AND client_id=? AND kind=? AND external_id=?",
    ).bind(scope, clientId, record.kind, record.externalId).first();
    return { id: existing?.id || id, duplicate: true };
  }

  if (record.kind === "lead" && scope === "operator") {
    // Operator-scope leads project straight into the live CRM (crm_added,
    // same merge contract as /api/crm-sync) so they appear in Lead Studio.
    // Same merge contract as /api/crm-sync: columns name,data,ts,sts,updated_at
    // and payload {n,h,niche,dms,stage,_ts}. Never overwrite a newer edit.
    const name = record.data.name || (record.data.handle ? `@${record.data.handle}` : record.data.email);
    const ts = Date.now();
    const data = { n: name, h: record.data.handle || "", email: record.data.email, niche: record.data.tags[0] || "", dms: record.data.notes || "", stage: record.data.stage || "New", source: record.data.source, tags: record.data.tags, _ts: ts };
    await env.DB.prepare(
      `INSERT INTO crm_added (name, data, ts, sts, updated_at) VALUES (?,?,?,?,?)
       ON CONFLICT(name) DO UPDATE SET data=excluded.data, ts=excluded.ts, sts=excluded.sts, updated_at=excluded.updated_at WHERE excluded.ts > crm_added.ts`,
    ).bind(name, JSON.stringify(data), ts, ts, now).run().catch(() => null);
    await emitEvent(env, { scope, clientId, event: "lead.created", data: { id, name, handle: record.data.handle, email: record.data.email, source: record.data.source } });
  } else if (record.kind === "lead") {
    await emitEvent(env, { scope, clientId, event: "lead.created", data: { id, ...record.data } });
  } else if (record.kind === "message") {
    if (scope === "operator" && record.data.channel === "instagram") {
      await projectPushInstagramMessage(env, key, record, now);
    }
    await emitEvent(env, { scope, clientId, event: "conversation.new_message", data: { id, ...record.data } });
  }
  return { id, duplicate: false };
}

async function projectPushInstagramMessage(env, key, record, now) {
  const digest = (await sha256Hex(record.externalId)).slice(0, 24);
  const handle = record.data.handle;
  const conversationId = `pushconv_${(await sha256Hex(handle)).slice(0, 20)}`;
  const messageId = `pushmsg_${digest}`;
  const operatorEmail = str(key.created_by || env.OPERATOR_EMAIL || "operator");
  await env.DB.prepare(
    `INSERT INTO ig_conversations(
       id,operator_email,connected_account_id,participant_id,participant_username,
       participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       last_message_at=CASE WHEN excluded.last_message_at > ig_conversations.last_message_at THEN excluded.last_message_at ELSE ig_conversations.last_message_at END,
       last_direction=CASE WHEN excluded.last_message_at >= ig_conversations.last_message_at THEN excluded.last_direction ELSE ig_conversations.last_direction END,
       payload_json=excluded.payload_json,updated_at=excluded.updated_at`,
  ).bind(conversationId, operatorEmail, `push-api:${key.id}`, handle, handle, handle, record.data.ts, record.data.ts, record.data.direction, JSON.stringify(record.data), now, now).run();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at)
     VALUES(?,?,?,?,?,?,?,?)`,
  ).bind(messageId, conversationId, operatorEmail, record.data.direction, record.data.ts, record.data.text, JSON.stringify(record.data), now).run();

  const ts = Date.now();
  const added = { n: handle, h: handle, niche: "", dms: 1, stage: "new-lead", src: "instagram", igConversationId: conversationId, _ts: ts };
  const existing = await env.DB.prepare("SELECT data FROM crm_overrides WHERE name=?").bind(handle).first().catch(() => null);
  let current = {};
  try { current = JSON.parse(existing?.data || "{}"); } catch { current = {}; }
  const terminal = new Set(["call-booked", "won", "dead"]);
  const statements = [env.DB.prepare(
    "INSERT OR IGNORE INTO crm_added(name,data,ts,sts,updated_at) VALUES(?,?,?,?,?)",
  ).bind(handle, JSON.stringify(added), ts, ts, now)];
  if (!terminal.has(current.status)) {
    const status = record.data.direction === "inbound" ? "replied" : "sent";
    statements.push(env.DB.prepare(
      `INSERT INTO crm_overrides(name,data,ts,sts,updated_at) VALUES(?,?,?,?,?)
       ON CONFLICT(name) DO UPDATE SET data=excluded.data,ts=excluded.ts,sts=excluded.sts,updated_at=excluded.updated_at
       WHERE excluded.ts > crm_overrides.ts`,
    ).bind(handle, JSON.stringify({ ...current, status, igConversationId: conversationId, _ts: ts }), ts, ts, now));
  }
  await env.DB.batch(statements);
}

export function ingestError(message, status = 422) {
  return json({ ok: false, error: message }, status);
}

// Operator-scope payments are recorded against the workspace that represents
// Pulsify itself. Set OPERATOR_CLIENT_ID in wrangler.toml to the client_config
// row for the founder workspace; it must exist or matching has no candidates.
export function operatorClientId(env) {
  return cleanId(env?.OPERATOR_CLIENT_ID, "") || "pulsify";
}

export function cleanClient(value) {
  return cleanId(value, "");
}

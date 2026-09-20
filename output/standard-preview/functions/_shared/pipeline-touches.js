// Applications, opt-ins, bookings and payments collapsed into one row per
// contact touch, so a lead is a person with a history, not three events.
import { cleanId, normalizeEmail, nowIso, parseJson, str, strOrNull } from "./common.js";

export async function recordTouch(env, { client, email, name, kind, ts, source, externalId, amountCents, payload }) {
  const clientId = cleanId(client, "");
  const contact = normalizeEmail(email);
  if (!clientId || !contact || !["application", "optin", "booking", "payment"].includes(kind)) return { ok: false };
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO pipeline_touches (client_id, contact_email, contact_name, kind, ts, source, external_id, amount_cents, payload_json)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).bind(clientId, contact, strOrNull(name), kind, ts || nowIso(), str(source) || kind, strOrNull(externalId) || `${kind}:${contact}:${ts || nowIso()}`, amountCents == null ? null : Math.round(amountCents), JSON.stringify(payload || {})).run();
  return { ok: true, inserted: (result.meta?.changes || 0) > 0 };
}

// One row per contact: latest touch, counts by kind, first seen.
export async function listContacts(env, clientId, { q = "", limit = 200 } = {}) {
  const client = cleanId(clientId, "");
  const like = q ? `%${str(q).toLowerCase().replace(/[\\%_]/g, "\\$&")}%` : null;
  const rows = await env.DB.prepare(
    `SELECT contact_email,
            MAX(contact_name) AS contact_name,
            MIN(ts) AS first_seen,
            MAX(ts) AS last_seen,
            SUM(kind='application') AS applications,
            SUM(kind='optin') AS optins,
            SUM(kind='booking') AS bookings,
            SUM(kind='payment') AS payments,
            COALESCE(SUM(CASE WHEN kind='payment' THEN amount_cents END),0) AS paid_cents
       FROM pipeline_touches
      WHERE client_id=? AND (? IS NULL OR LOWER(contact_email) LIKE ? OR LOWER(COALESCE(contact_name,'')) LIKE ?)
      GROUP BY contact_email
      ORDER BY last_seen DESC LIMIT ?`,
  ).bind(client, like, like, like, Math.min(500, limit)).all();
  const latest = await env.DB.prepare(
    `SELECT t.contact_email, t.kind, t.ts, t.source FROM pipeline_touches t
      WHERE t.client_id=? AND t.ts = (SELECT MAX(ts) FROM pipeline_touches x WHERE x.client_id=t.client_id AND x.contact_email=t.contact_email)`,
  ).bind(client).all();
  const latestByEmail = new Map((latest.results || []).map((r) => [r.contact_email, r]));
  return (rows.results || []).map((r) => ({ ...r, stage: stageFor(r), latest_kind: latestByEmail.get(r.contact_email)?.kind || null, latest_source: latestByEmail.get(r.contact_email)?.source || null }));
}

// Operator view: contacts across every client, one row per (client, email).
export async function listContactsAll(env, { q = "", limit = 300 } = {}) {
  const like = q ? `%${str(q).toLowerCase().replace(/[\\%_]/g, "\\$&")}%` : null;
  const rows = await env.DB.prepare(
    `SELECT t.client_id, t.contact_email,
            MAX(t.contact_name) AS contact_name,
            MIN(t.ts) AS first_seen,
            MAX(t.ts) AS last_seen,
            SUM(t.kind='application') AS applications,
            SUM(t.kind='optin') AS optins,
            SUM(t.kind='booking') AS bookings,
            SUM(t.kind='payment') AS payments,
            COALESCE(SUM(CASE WHEN t.kind='payment' THEN t.amount_cents END),0) AS paid_cents,
            (SELECT client_name FROM client_config c WHERE c.client=t.client_id) AS client_name
       FROM pipeline_touches t
      WHERE NOT EXISTS (SELECT 1 FROM client_config c WHERE c.client=t.client_id AND c.status='archived')
        AND (? IS NULL OR LOWER(t.contact_email) LIKE ? OR LOWER(COALESCE(t.contact_name,'')) LIKE ?)
      GROUP BY t.client_id, t.contact_email
      ORDER BY last_seen DESC LIMIT ?`,
  ).bind(like, like, like, Math.min(1000, limit)).all();
  return (rows.results || []).map((r) => ({ ...r, stage: stageFor(r) }));
}

export function stageFor(row) {
  if (Number(row.payments) > 0) return "Paid";
  if (Number(row.bookings) > 0) return "Booked";
  if (Number(row.applications) > 0) return "Applied";
  if (Number(row.optins) > 0) return "Opted in";
  return "New";
}

export async function timeline(env, clientId, email) {
  const rows = await env.DB.prepare(
    "SELECT kind, ts, source, amount_cents, payload_json FROM pipeline_touches WHERE client_id=? AND contact_email=? ORDER BY ts DESC LIMIT 100",
  ).bind(cleanId(clientId, ""), normalizeEmail(email)).all();
  return (rows.results || []).map((r) => ({ ...r, payload: parseJson(r.payload_json, {}), payload_json: undefined }));
}

// One-time backfill from integration_events into pipeline_touches. Idempotent
// through the unique external id. Returns the number inserted.
export async function backfillFromIntegrationEvents(env, clientId = null) {
  const rows = await env.DB.prepare(
    `SELECT id, provider, kind, client, external_id, payload_summary_json, ts FROM integration_events
      WHERE kind IN ('application','optin','booking','payment') ${clientId ? "AND client=?" : ""} ORDER BY id`,
  ).bind(...(clientId ? [cleanId(clientId, "")] : [])).all();
  let inserted = 0;
  for (const row of rows.results || []) {
    const summary = parseJson(row.payload_summary_json, {});
    const email = normalizeEmail(summary.email || summary.attendee_email || summary.invitee_email || summary.customer_email);
    if (!email || !row.client) continue;
    const result = await recordTouch(env, { client: row.client, email, name: summary.name || summary.invitee_name || summary.customer_name, kind: row.kind, ts: row.ts, source: row.provider, externalId: row.external_id || `ie:${row.id}`, amountCents: summary.amount_cents, payload: summary });
    if (result.inserted) inserted += 1;
  }
  return inserted;
}

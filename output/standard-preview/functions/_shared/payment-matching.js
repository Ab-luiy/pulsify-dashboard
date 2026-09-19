// Payment matching. Ranks candidate targets for a payment inside one client's
// scope and records the result. Exact email is the only automatic match.
// Everything else is a suggestion a human confirms. One payment attaches to
// one target, enforced by a partial unique index on confirmed rows.
import { json, normalizeEmail, nowIso, parseJson, str } from "./common.js";
import { emitEvent } from "./outbound-webhooks.js";

export const AUTO_CONFIRM_THRESHOLD = 0.95;
export const SUGGEST_THRESHOLD = 0.35;
const DAY_MS = 86400000;

function nameKey(value) {
  return str(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function daysBetween(a, b) {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.abs(ta - tb) / DAY_MS;
}

// Candidate sources, all scoped to the client:
//  - workspace_records kind='lead' for that client (portal leads)
//  - crm_added / crm_overrides when the client is the operator workspace
//  - integration_events of kind booking/application carrying an email
export async function loadCandidates(env, clientId) {
  const candidates = [];
  const operatorId = String(env?.OPERATOR_CLIENT_ID || "pulsify");
  const records = await env.DB.prepare(
    "SELECT id, title, data_json, updated_at FROM workspace_records WHERE client_id=? AND kind='lead' ORDER BY updated_at DESC LIMIT 2000",
  ).bind(clientId).all().catch(() => ({ results: [] }));
  for (const row of records.results || []) {
    const data = parseJson(row.data_json, {});
    candidates.push({ kind: "workspace_record", id: row.id, label: str(row.title), email: normalizeEmail(data.email), name: str(row.title), handle: str(data.ig || data.handle).replace(/^@/, ""), lastActivity: row.updated_at });
  }
  if (clientId === operatorId) {
    for (const table of ["crm_added", "crm_overrides"]) {
      const rows = await env.DB.prepare(`SELECT name, data FROM ${table} LIMIT 5000`).all().catch(() => ({ results: [] }));
      for (const row of rows.results || []) {
        const data = parseJson(row.data, {});
        candidates.push({ kind: "crm_lead", id: row.name, label: row.name, email: normalizeEmail(data.email), name: str(data.name || row.name), handle: str(data.ig).replace(/^@/, ""), lastActivity: data._ts ? new Date(Number(data._ts)).toISOString() : null });
      }
    }
  }
  const touches = await env.DB.prepare(
    "SELECT contact_email, contact_name, kind, ts, amount_cents FROM pipeline_touches WHERE client_id=? AND kind IN ('booking','application','optin') ORDER BY ts DESC LIMIT 500",
  ).bind(clientId).all().catch(() => ({ results: [] }));
  const seen = new Set();
  for (const row of touches.results || []) {
    if (seen.has(row.contact_email)) continue;
    seen.add(row.contact_email);
    candidates.push({ kind: "contact_email", id: row.contact_email, label: str(row.contact_name || row.contact_email), email: row.contact_email, name: str(row.contact_name), handle: "", lastActivity: row.ts, eventKind: row.kind, amountCents: row.amount_cents ?? null });
  }
  const events = await env.DB.prepare(
    "SELECT external_id, kind, payload_summary_json, ts FROM integration_events WHERE client=? AND kind IN ('booking','application') ORDER BY ts DESC LIMIT 500",
  ).bind(clientId).all().catch(() => ({ results: [] }));
  for (const row of events.results || []) {
    const summary = parseJson(row.payload_summary_json, {});
    const email = normalizeEmail(summary.email || summary.attendee_email || summary.invitee_email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const amountCents = Number(summary.amount_cents ?? (summary.amount != null ? Number(summary.amount) * 100 : NaN));
    candidates.push({ kind: "contact_email", id: email, label: str(summary.name || summary.invitee_name || email), email, name: str(summary.name || summary.invitee_name), handle: "", lastActivity: row.ts, eventKind: row.kind, expectedAmountCents: Number.isFinite(amountCents) ? Math.round(amountCents) : null });
  }
  return candidates;
}

export function rankCandidates(payment, candidates) {
  const email = normalizeEmail(payment.customer_email);
  const pname = nameKey(payment.customer_name);
  const ranked = [];
  for (const candidate of candidates) {
    let score = 0;
    const reasons = [];
    if (email && candidate.email && candidate.email === email) {
      score = 1;
      reasons.push("exact email");
    } else {
      const cname = nameKey(candidate.name || candidate.label);
      if (pname && cname && (pname === cname)) { score += 0.55; reasons.push("exact name"); }
      else if (pname && cname && (cname.includes(pname) || pname.includes(cname)) && Math.min(pname.length, cname.length) >= 5) { score += 0.35; reasons.push("partial name"); }
      if (candidate.lastActivity) {
        const days = daysBetween(candidate.lastActivity, payment.occurred_at);
        if (days != null) {
          if (days <= 3) { score += 0.3; reasons.push("activity within 3 days"); }
          else if (days <= 14) { score += 0.15; reasons.push("activity within 14 days"); }
        }
      }
      if (candidate.expectedAmountCents != null && Number.isFinite(Number(payment.amount_cents))) {
        const difference = Math.abs(Number(payment.amount_cents) - candidate.expectedAmountCents);
        if (difference === 0) { score += 0.2; reasons.push("exact expected amount"); }
        else if (candidate.expectedAmountCents > 0 && difference / candidate.expectedAmountCents <= 0.1) { score += 0.1; reasons.push("amount within 10%"); }
      }
      if (candidate.eventKind === "booking") { score += 0.1; reasons.push("had a booked call"); }
    }
    if (score >= SUGGEST_THRESHOLD) ranked.push({ ...candidate, confidence: Math.min(1, Number(score.toFixed(3))), reasons });
  }
  ranked.sort((a, b) => b.confidence - a.confidence);
  return ranked;
}

export async function matchPayment(env, payment, { decidedBy = "auto", candidates } = {}) {
  const existing = await env.DB.prepare(
    "SELECT id FROM payment_matches WHERE payment_id=? AND status IN ('confirmed','suggested') LIMIT 1",
  ).bind(payment.id).first();
  if (existing) return { skipped: true, reason: "already matched or suggested" };
  const list = rankCandidates(payment, candidates || await loadCandidates(env, payment.client));
  if (!list.length) return { suggested: 0, confirmed: 0 };
  const now = nowIso();
  const top = list[0];
  if (top.confidence >= AUTO_CONFIRM_THRESHOLD) {
    await env.DB.prepare(
      `INSERT INTO payment_matches (payment_id, client_id, target_kind, target_id, target_label, confidence, reasons_json, status, decided_by, decided_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,'confirmed',?,?,?,?)`,
    ).bind(payment.id, payment.client, top.kind, top.id, top.label, top.confidence, JSON.stringify(top.reasons), decidedBy, now, now, now).run();
    await emitEvent(env, { scope: "client", clientId: payment.client, event: "payment.matched", data: { payment_id: payment.id, target_kind: top.kind, target_id: top.id, confidence: top.confidence, auto: true } });
    return { suggested: 0, confirmed: 1 };
  }
  let suggested = 0;
  for (const candidate of list.slice(0, 5)) {
    await env.DB.prepare(
      `INSERT INTO payment_matches (payment_id, client_id, target_kind, target_id, target_label, confidence, reasons_json, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,'suggested',?,?)`,
    ).bind(payment.id, payment.client, candidate.kind, candidate.id, candidate.label, candidate.confidence, JSON.stringify(candidate.reasons), now, now).run();
    suggested += 1;
  }
  return { suggested, confirmed: 0 };
}

export async function confirmMatch(env, clientId, matchId, decidedBy) {
  const match = await env.DB.prepare(
    "SELECT id, payment_id, target_kind, target_id, status FROM payment_matches WHERE id=? AND client_id=?",
  ).bind(matchId, clientId).first();
  if (!match) return { error: json({ ok: false, error: "match not found" }, 404) };
  if (match.status === "confirmed") return { ok: true, already: true };
  const now = nowIso();
  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE payment_matches SET status='rejected', decided_by=?, decided_at=?, updated_at=? WHERE payment_id=? AND id<>? AND status<>'rejected'").bind(decidedBy, now, now, match.payment_id, match.id),
      env.DB.prepare("UPDATE payment_matches SET status='confirmed', decided_by=?, decided_at=?, updated_at=? WHERE id=?").bind(decidedBy, now, now, match.id),
    ]);
  } catch (error) {
    return { error: json({ ok: false, error: "this payment already has a confirmed match" }, 409) };
  }
  await emitEvent(env, { scope: "client", clientId, event: "payment.matched", data: { payment_id: match.payment_id, target_kind: match.target_kind, target_id: match.target_id, auto: false } });
  return { ok: true };
}

export async function unlinkMatch(env, clientId, matchId, decidedBy) {
  const match = await env.DB.prepare(
    "SELECT id, payment_id, status FROM payment_matches WHERE id=? AND client_id=?",
  ).bind(matchId, clientId).first();
  if (!match) return { error: json({ ok: false, error: "match not found" }, 404) };
  const now = nowIso();
  await env.DB.prepare("UPDATE payment_matches SET status='rejected', decided_by=?, decided_at=?, updated_at=? WHERE id=?").bind(decidedBy, now, now, match.id).run();
  if (match.status === "confirmed") {
    await emitEvent(env, { scope: "client", clientId, event: "payment.unmatched", data: { payment_id: match.payment_id } });
  }
  return { ok: true };
}

// Manual attach: operator picks any target for a payment.
export async function attachManual(env, clientId, paymentId, target, decidedBy) {
  const payment = await env.DB.prepare("SELECT id, client FROM payments WHERE id=? AND client=?").bind(paymentId, clientId).first();
  if (!payment) return { error: json({ ok: false, error: "payment not found" }, 404) };
  if (!["crm_lead", "workspace_record", "contact_email"].includes(target.kind) || !str(target.id)) {
    return { error: json({ ok: false, error: "target kind and id required" }, 422) };
  }
  const now = nowIso();
  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE payment_matches SET status='rejected', decided_by=?, decided_at=?, updated_at=? WHERE payment_id=? AND status<>'rejected'").bind(decidedBy, now, now, paymentId),
      env.DB.prepare(
        `INSERT INTO payment_matches (payment_id, client_id, target_kind, target_id, target_label, confidence, reasons_json, status, decided_by, decided_at, created_at, updated_at)
         VALUES (?,?,?,?,?,1,'["manual"]','confirmed',?,?,?,?)`,
      ).bind(paymentId, clientId, target.kind, str(target.id), str(target.label || target.id), decidedBy, now, now, now),
    ]);
  } catch {
    return { error: json({ ok: false, error: "could not attach payment" }, 409) };
  }
  await emitEvent(env, { scope: "client", clientId, event: "payment.matched", data: { payment_id: paymentId, target_kind: target.kind, target_id: str(target.id), auto: false, manual: true } });
  return { ok: true };
}

export async function listByStatus(env, clientId, status, limit = 200) {
  const rows = await env.DB.prepare(
    `SELECT m.id, m.payment_id, m.target_kind, m.target_id, m.target_label, m.confidence, m.reasons_json, m.status, m.decided_by, m.decided_at,
            p.amount_cents, p.currency, p.rail, p.reference, p.occurred_at, p.customer_email, p.customer_name, p.refunded_cents, p.kind
       FROM payment_matches m JOIN payments p ON p.id=m.payment_id
      WHERE m.client_id=? AND m.status=? ORDER BY m.updated_at DESC LIMIT ?`,
  ).bind(clientId, status, Math.min(500, limit)).all();
  return (rows.results || []).map((row) => ({ ...row, reasons: parseJson(row.reasons_json, []), reasons_json: undefined }));
}

export async function listUnlinked(env, clientId, limit = 200) {
  const rows = await env.DB.prepare(
    `SELECT p.id, p.amount_cents, p.currency, p.rail, p.reference, p.occurred_at, p.customer_email, p.customer_name, p.refunded_cents, p.kind
       FROM payments p
      WHERE p.client=? AND p.kind='charge'
        AND NOT EXISTS (SELECT 1 FROM payment_matches m WHERE m.payment_id=p.id AND m.status IN ('confirmed','suggested'))
      ORDER BY p.occurred_at DESC LIMIT ?`,
  ).bind(clientId, Math.min(500, limit)).all();
  return rows.results || [];
}

// KPIs from confirmed matches only. Refunds reduce cash collected.
export async function revenueKpis(env, clientId, from, to) {
  const row = await env.DB.prepare(
    `SELECT COUNT(DISTINCT p.id) AS won_calls,
            COALESCE(SUM(p.amount_cents - p.refunded_cents),0) AS cash_cents
       FROM payment_matches m JOIN payments p ON p.id=m.payment_id
      WHERE m.client_id=? AND m.status='confirmed' AND p.kind='charge'
        AND (? IS NULL OR p.occurred_at>=?) AND (? IS NULL OR p.occurred_at<=?)`,
  ).bind(clientId, from || null, from || null, to || null, to || null).first();
  const won = Number(row?.won_calls || 0);
  const cash = Number(row?.cash_cents || 0);
  return { won_calls: won, cash_collected_cents: cash, avg_deal_cents: won ? Math.round(cash / won) : 0 };
}

export async function applyRefund(env, clientId, reference, refundCents, options = {}) {
  const references = Array.isArray(reference) ? reference : [reference];
  let payment = null;
  for (const candidate of references.filter(Boolean)) {
    payment = await env.DB.prepare("SELECT id, amount_cents, refunded_cents FROM payments WHERE client=? AND reference=?").bind(clientId, candidate).first();
    if (payment) break;
  }
  if (!payment) return { ok: false, error: "payment not found" };
  const amount = Math.max(0, Math.round(refundCents));
  const total = Math.min(
    payment.amount_cents,
    options.mode === "absolute" ? Math.max(payment.refunded_cents, amount) : payment.refunded_cents + amount,
  );
  if (total === payment.refunded_cents) return { ok: true, duplicate: true, refunded_cents: total };
  await env.DB.prepare("UPDATE payments SET refunded_cents=? WHERE id=?").bind(total, payment.id).run();
  await emitEvent(env, { scope: "client", clientId, event: "payment.refunded", data: { payment_id: payment.id, refunded_cents: total } });
  return { ok: true, refunded_cents: total };
}

// Contract rows for the booked pipeline (ticket #80). Table `contracts`, migration 0080.
import { nowIso } from "./common.js";

/** DocuSign envelope status -> the word the pipeline shows. Anything unknown changes nothing. */
export const STATUS_FROM_ENVELOPE = {
  sent: "sent",
  delivered: "sent",
  completed: "signed",
  declined: "declined",
  voided: "voided",
};

/** The Connect event name (envelope-completed) to the envelope status word. */
export function envelopeStatusFromEvent(event) {
  const match = /^envelope-(\w+)$/.exec(String(event || ""));
  return match ? match[1] : "";
}

export function publicContract(row) {
  return {
    id: row.id,
    crm_key: row.crm_key,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    upfront: Number(row.upfront_cents || 0) / 100,
    fee_percent: Number(row.fee_percent),
    start_revenue: Number(row.start_revenue_cents || 0) / 100,
    notes: row.notes || "",
    // A hand-off that never finished reads as unsent so it can be sent again.
    status: row.status === "sending" ? "draft" : row.status,
    send_error: row.send_error || "",
    created_at: row.created_at,
    sent_at: row.sent_at || null,
    signed_at: row.signed_at || null,
  };
}

/**
 * Move a contract along from a DocuSign status (webhook or manual refresh).
 * Never moves a signed contract backwards, and never touches a draft: only
 * rows that already carry this envelope id are updated.
 */
export async function applyEnvelopeStatus(env, envelopeId, envelopeStatus, at = nowIso()) {
  const next = STATUS_FROM_ENVELOPE[String(envelopeStatus || "").toLowerCase()];
  if (!next || !envelopeId || !env?.DB) return null;
  const row = await env.DB.prepare("SELECT id, status FROM contracts WHERE envelope_id=?").bind(String(envelopeId)).first();
  if (!row || row.status === next || row.status === "signed") return row ? row.status : null;
  await env.DB.prepare("UPDATE contracts SET status=?, updated_at=?, signed_at=CASE WHEN ?='signed' THEN ? ELSE signed_at END WHERE id=?")
    .bind(next, at, next, at, row.id).run();
  return next;
}

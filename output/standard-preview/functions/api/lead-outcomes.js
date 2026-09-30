// POST /api/lead-outcomes   the post-call form: what happened on a booked call
// DELETE /api/lead-outcomes?id=   remove a form filed by mistake
// (InfoOS build; the brief's post-call form with the "arrived pre-sold?" question.)
// A client writes to its own workspace, an operator to the client named in the body.
// Operator previews are read-only.

import { json, normalizeEmail, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportWriter } from "../_shared/client-read.js";
import { notify } from "../_shared/notifications.js";

const ATTENDED = ["showed", "no_show", "cancelled", "rescheduled"];
const RESULTS = ["closed", "not_closed", "follow_up", "unqualified"];
const PAYMENT_TYPES = ["pif", "plan", "finance", "deposit"];
const PRE_SOLD = ["yes", "somewhat", "no"];

const pick = (value, allowed) => (allowed.includes(value) ? value : null);
const text = (value, max) => str(value).slice(0, max) || null;

export function validateOutcome(body) {
  const email = normalizeEmail(body.email);
  if (!email) return { error: "Choose the lead this call was with." };
  const attended = pick(body.attended, ATTENDED);
  if (!attended) return { error: "Say whether they showed up." };
  const result = attended === "showed" ? pick(body.result, RESULTS) : null;
  if (attended === "showed" && !result) return { error: "Say how the call ended." };
  let dealCents = null;
  if (result === "closed") {
    const cents = Math.round(Number(body.deal_cents));
    if (!Number.isFinite(cents) || cents <= 0) return { error: "Enter the deal value." };
    dealCents = Math.min(cents, 100000000);
  }
  const callAt = Number.isFinite(Date.parse(body.call_at || "")) ? new Date(body.call_at).toISOString() : null;
  return {
    value: {
      email,
      booking_ref: text(body.booking_ref, 300),
      call_at: callAt,
      attended,
      result,
      deal_cents: dealCents,
      payment_type: result === "closed" ? pick(body.payment_type, PAYMENT_TYPES) : null,
      pre_sold: attended === "showed" ? pick(body.pre_sold, PRE_SOLD) : null,
      objection: result === "not_closed" || result === "follow_up" ? text(body.objection, 200) : null,
      notes: text(body.notes, 2000),
      closer: text(body.closer, 80),
    },
  };
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  if (!body || typeof body !== "object") return json({ ok: false, error: "invalid JSON" }, 400);
  const access = await resolveReportWriter(request, env, body.client);
  if (access.error) return access.error;
  const checked = validateOutcome(body);
  if (checked.error) return json({ ok: false, error: checked.error }, 422);
  const o = checked.value;
  const now = new Date().toISOString();
  const existing = o.booking_ref
    ? await env.DB.prepare("SELECT id FROM lead_outcomes WHERE client_id=? AND booking_ref=?").bind(access.client, o.booking_ref).first()
    : null;
  let id = existing?.id || null;
  if (id) {
    await env.DB.prepare(
      `UPDATE lead_outcomes SET email=?, call_at=COALESCE(?,call_at), attended=?, result=?, deal_cents=?, payment_type=?, pre_sold=?,
              objection=?, notes=?, closer=?, updated_at=? WHERE id=? AND client_id=?`,
    ).bind(o.email, o.call_at, o.attended, o.result, o.deal_cents, o.payment_type, o.pre_sold, o.objection, o.notes, o.closer, now, id, access.client).run();
  } else {
    const inserted = await env.DB.prepare(
      `INSERT INTO lead_outcomes (client_id, email, booking_ref, call_at, attended, result, deal_cents, payment_type, pre_sold,
              objection, notes, closer, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(access.client, o.email, o.booking_ref, o.call_at, o.attended, o.result, o.deal_cents, o.payment_type, o.pre_sold,
      o.objection, o.notes, o.closer, access.actor, now, now).run();
    id = inserted.meta?.last_row_id || null;
  }
  if (!existing && o.result === "closed") {
    await notify(env, {
      scope: "operator",
      clientId: access.client,
      kind: "deal.closed",
      severity: "success",
      title: `${o.email} said yes on the call`,
      body: `Deal ${(o.deal_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}${o.payment_type ? `, ${o.payment_type}` : ""}`,
      link: "leads",
      entity: { client: access.client, email: o.email },
      dedupeKey: `deal:${access.client}:${o.booking_ref || id}`,
    }).catch(() => null);
  }
  return json({ ok: true, id });
}

async function handleDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportWriter(request, env);
  if (access.error) return access.error;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "choose a form" }, 422);
  const result = await env.DB.prepare("DELETE FROM lead_outcomes WHERE id=? AND client_id=?").bind(id, access.client).run();
  if (!result.meta?.changes) return json({ ok: false, error: "That form isn't in this workspace." }, 404);
  return json({ ok: true });
}

export const onRequestPost = withOperator(handlePost);
export const onRequestDelete = withOperator(handleDelete);

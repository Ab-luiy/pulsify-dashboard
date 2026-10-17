// Contracts from the booked pipeline (ticket #80). Operator only.
//   GET  /api/contracts[?key=]       contracts (newest first) and whether DocuSign is connected
//   POST /api/contracts {action}     save | send | refresh | cancel
// Save keeps a draft; Send hands it to DocuSign. A draft is the only editable
// state. Status moves on DocuSign's Connect events (docusign-connect.js) or on
// Refresh, which reads the envelope directly.
import { operatorIdentity, withOperator } from "../_shared/access.js";
import { amountToCents, generateOpaqueToken, json, normalizeEmail, nowIso, str } from "../_shared/common.js";
import { applyEnvelopeStatus, publicContract } from "../_shared/contracts.js";
import { createEnvelope, envelopeStatus, missingConfig, voidEnvelope } from "../_shared/docusign.js";
import { resolveOperator } from "../_shared/spine-auth.js";

const FRIENDLY_OFF = "DocuSign is not connected yet. The contract is saved and can be sent once it is.";

function parseDeal(body) {
  const first = str(body.first_name).slice(0, 80);
  const last = str(body.last_name).slice(0, 80);
  const email = normalizeEmail(body.email);
  const start = amountToCents(body.start_revenue);
  const upfront = body.upfront === undefined || body.upfront === "" ? 500000 : amountToCents(body.upfront);
  const fee = body.fee_percent === undefined || body.fee_percent === "" ? 30 : Number(body.fee_percent);
  if (!first) return { error: "Add their first name." };
  if (!last) return { error: "Add their last name." };
  if (!email) return { error: "Add a valid email address." };
  if (start === null || start < 0) return { error: "Add their starting monthly revenue (0 if none)." };
  if (upfront === null || upfront < 0) return { error: "The setup fee must be a number, or 0." };
  if (!Number.isInteger(fee) || fee < 1 || fee > 100) return { error: "The revenue share is a whole number from 1 to 100." };
  return { deal: { first_name: first, last_name: last, email, upfront_cents: upfront, fee_percent: fee, start_revenue_cents: start, notes: str(body.notes).slice(0, 1000) } };
}

async function load(env, id) {
  return id ? env.DB.prepare("SELECT * FROM contracts WHERE id=?").bind(id).first() : null;
}

async function list(env, key) {
  const query = key
    ? env.DB.prepare("SELECT * FROM contracts WHERE crm_key=? ORDER BY created_at DESC LIMIT 20").bind(key)
    : env.DB.prepare("SELECT * FROM contracts ORDER BY created_at DESC LIMIT 500");
  return (await query.all()).results.map(publicContract);
}

async function handleGet({ request, env }) {
  const operator = resolveOperator(request, env);
  if (operator.error) return operator.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const key = str(new URL(request.url).searchParams.get("key"));
  const missing = missingConfig(env);
  return json({ ok: true, configured: missing.length === 0, contracts: await list(env, key) });
}

export async function handlePostWith({ request, env, fetcher = fetch }) {
  const operator = resolveOperator(request, env);
  if (operator.error) return operator.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const action = str(body.action);
  const now = nowIso();
  const actor = operatorIdentity(request)?.email || operator.operatorEmail || "operator";
  const log = (verb, client, detail) =>
    env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
      .bind(actor, verb, client || "", JSON.stringify(detail), now).run().catch(() => null);

  if (action === "save") {
    const key = str(body.crm_key).slice(0, 200);
    if (!key) return json({ ok: false, error: "Pick the prospect first." }, 422);
    const parsed = parseDeal(body);
    if (parsed.error) return json({ ok: false, error: parsed.error }, 422);
    const d = parsed.deal;
    const id = str(body.id);
    if (id) {
      const existing = await load(env, id);
      if (!existing) return json({ ok: false, error: "That contract no longer exists." }, 404);
      if (existing.status !== "draft") return json({ ok: false, error: "This contract is already out. Cancel it to start a new one." }, 409);
      await env.DB.prepare("UPDATE contracts SET first_name=?,last_name=?,email=?,upfront_cents=?,fee_percent=?,start_revenue_cents=?,notes=?,send_error=NULL,updated_at=? WHERE id=?")
        .bind(d.first_name, d.last_name, d.email, d.upfront_cents, d.fee_percent, d.start_revenue_cents, d.notes || null, now, id).run();
      return json({ ok: true, contract: publicContract(await load(env, id)) });
    }
    const open = await env.DB.prepare("SELECT id FROM contracts WHERE crm_key=? AND status IN ('draft','sending','sent','signed') LIMIT 1").bind(key).first();
    if (open) return json({ ok: false, error: "This prospect already has a contract. Open it from the card." }, 409);
    const newId = "ctr_" + generateOpaqueToken(12);
    await env.DB.prepare("INSERT INTO contracts (id,crm_key,first_name,last_name,email,upfront_cents,fee_percent,start_revenue_cents,notes,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'draft',?,?,?)")
      .bind(newId, key, d.first_name, d.last_name, d.email, d.upfront_cents, d.fee_percent, d.start_revenue_cents, d.notes || null, actor, now, now).run();
    return json({ ok: true, contract: publicContract(await load(env, newId)) });
  }

  const row = await load(env, str(body.id));
  if (!row) return json({ ok: false, error: "That contract no longer exists." }, 404);

  if (action === "send") {
    if (missingConfig(env).length) return json({ ok: false, error: FRIENDLY_OFF, not_connected: true }, 503);
    // Claim the row first so a double click cannot send two envelopes. A claim older than five minutes is treated as dead.
    const stale = new Date(Date.now() - 5 * 60000).toISOString();
    const claimed = await env.DB.prepare("UPDATE contracts SET status='sending', send_error=NULL, updated_at=? WHERE id=? AND (status='draft' OR (status='sending' AND updated_at<?))")
      .bind(now, row.id, stale).run();
    if (!claimed.meta?.changes) return json({ ok: false, error: row.status === "sending" ? "This contract is being sent." : "This contract was already sent." }, 409);
    try {
      const { envelopeId } = await createEnvelope(env, { ...row, id: row.id }, fetcher);
      await env.DB.prepare("UPDATE contracts SET status='sent', envelope_id=?, sent_at=?, updated_at=? WHERE id=?").bind(envelopeId, now, now, row.id).run();
      await log("contract-sent", "", { contract: row.id, crm_key: row.crm_key });
    } catch (error) {
      const reason = str(error?.message).slice(0, 200) || "DocuSign could not send it.";
      await env.DB.prepare("UPDATE contracts SET status='draft', send_error=?, updated_at=? WHERE id=?").bind(reason, nowIso(), row.id).run();
      return json({ ok: false, error: `Not sent. ${reason}`, contract: publicContract(await load(env, row.id)) }, 502);
    }
    return json({ ok: true, contract: publicContract(await load(env, row.id)) });
  }

  if (action === "refresh") {
    if (!row.envelope_id) return json({ ok: true, contract: publicContract(row) });
    if (missingConfig(env).length) return json({ ok: false, error: FRIENDLY_OFF, not_connected: true }, 503);
    try {
      const { status, completedAt } = await envelopeStatus(env, row.envelope_id, fetcher);
      await applyEnvelopeStatus(env, row.envelope_id, status, completedAt || nowIso());
    } catch (error) {
      return json({ ok: false, error: `Could not check DocuSign. ${str(error?.message).slice(0, 160)}` }, 502);
    }
    return json({ ok: true, contract: publicContract(await load(env, row.id)) });
  }

  if (action === "cancel") {
    if (row.status === "signed") return json({ ok: false, error: "This contract is already signed." }, 409);
    if (row.status === "voided") return json({ ok: true, contract: publicContract(row) });
    if (row.envelope_id) {
      if (missingConfig(env).length) return json({ ok: false, error: FRIENDLY_OFF, not_connected: true }, 503);
      try { await voidEnvelope(env, row.envelope_id, "Cancelled by Pulsify", fetcher); }
      catch (error) { return json({ ok: false, error: `Could not cancel it in DocuSign. ${str(error?.message).slice(0, 160)}` }, 502); }
    }
    await env.DB.prepare("UPDATE contracts SET status='voided', updated_at=? WHERE id=?").bind(now, row.id).run();
    await log("contract-cancelled", "", { contract: row.id, crm_key: row.crm_key });
    return json({ ok: true, contract: publicContract(await load(env, row.id)) });
  }

  return json({ ok: false, error: "unknown action" }, 422);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator((context) => handlePostWith(context));

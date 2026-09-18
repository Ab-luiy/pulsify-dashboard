// Payment matching API.
//   GET  /api/payment-matches?client=&status=confirmed|suggested|unlinked      lists
//   GET  /api/payment-matches?client=&view=kpis&from=&to=                     confirmed-only KPIs
//   GET  /api/payment-matches?client=&view=candidates&payment_id=             ranked candidates for one payment
//   POST /api/payment-matches  {client, action: confirm|unlink|attach|rematch, ...}
// Operator only for writes. Client sessions may read kpis and confirmed only.
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { attachManual, confirmMatch, listByStatus, listUnlinked, loadCandidates, matchPayment, rankCandidates, revenueKpis, unlinkMatch } from "../_shared/payment-matching.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";

async function audit(env, actor, action, client, detail) {
  await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
    .bind(actor, action, client, JSON.stringify(detail), new Date().toISOString()).run().catch(() => null);
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const client = str(url.searchParams.get("client"));
  const access = await resolveSpineRead(request, env, "client", client);
  if (access.error) return access.error;
  const view = str(url.searchParams.get("view"));
  if (view === "kpis") {
    return json({ ok: true, client: access.client, kpis: await revenueKpis(env, access.client, url.searchParams.get("from"), url.searchParams.get("to")) });
  }
  if (access.role !== "operator") {
    return json({ ok: true, client: access.client, matches: await listByStatus(env, access.client, "confirmed") });
  }
  if (view === "candidates") {
    const paymentId = Number(url.searchParams.get("payment_id"));
    const payment = await env.DB.prepare("SELECT id, client, customer_email, customer_name, occurred_at FROM payments WHERE id=? AND client=?").bind(paymentId, access.client).first();
    if (!payment) return json({ ok: false, error: "payment not found" }, 404);
    const q = str(url.searchParams.get("q")).toLowerCase();
    let candidates = await loadCandidates(env, access.client);
    if (q) candidates = candidates.filter((c) => [c.label, c.email, c.handle, c.name].some((v) => str(v).toLowerCase().includes(q)));
    return json({ ok: true, candidates: q ? candidates.slice(0, 50) : rankCandidates(payment, candidates) });
  }
  const status = str(url.searchParams.get("status") || "suggested");
  if (status === "unlinked") return json({ ok: true, client: access.client, payments: await listUnlinked(env, access.client) });
  if (!["confirmed", "suggested", "rejected"].includes(status)) return json({ ok: false, error: "bad status" }, 422);
  return json({ ok: true, client: access.client, matches: await listByStatus(env, access.client, status) });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveSpineRead(request, env, "client", str(body.client));
  if (access.error) return access.error;
  if (access.role !== "operator") return json({ ok: false, error: "operator only" }, 403);
  const actor = access.operatorEmail;
  const action = str(body.action);
  let result;
  if (action === "confirm") result = await confirmMatch(env, access.client, Number(body.match_id), actor);
  else if (action === "unlink") result = await unlinkMatch(env, access.client, Number(body.match_id), actor);
  else if (action === "attach") result = await attachManual(env, access.client, Number(body.payment_id), body.target || {}, actor);
  else if (action === "rematch") {
    const payment = await env.DB.prepare("SELECT id, client, customer_email, customer_name, occurred_at FROM payments WHERE id=? AND client=?").bind(Number(body.payment_id), access.client).first();
    if (!payment) return json({ ok: false, error: "payment not found" }, 404);
    await env.DB.prepare("UPDATE payment_matches SET status='rejected', decided_by=?, decided_at=?, updated_at=? WHERE payment_id=? AND status='suggested'").bind(actor, new Date().toISOString(), new Date().toISOString(), payment.id).run();
    result = await matchPayment(env, payment, { decidedBy: "auto" });
  } else return json({ ok: false, error: "action must be confirm, unlink, attach or rematch" }, 422);
  if (result?.error) return result.error;
  await audit(env, actor, `payment-${action}`, access.client, { match_id: body.match_id, payment_id: body.payment_id, target: body.target });
  return json({ ok: true, ...result });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);

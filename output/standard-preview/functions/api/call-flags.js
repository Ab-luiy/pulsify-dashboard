// POST /api/call-flags {booking_ref, confirmed}   mark a booked call confirmed or not
// (InfoOS build, the Calls list flag). Write access as /api/lead-outcomes.

import { json, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportWriter } from "../_shared/client-read.js";

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const ref = str(body?.booking_ref).slice(0, 300);
  if (!ref) return json({ ok: false, error: "choose a call" }, 422);
  const known = await env.DB.prepare(
    "SELECT 1 AS ok FROM pipeline_touches WHERE client_id=? AND kind='booking' AND (external_id=? OR external_id=?)",
  ).bind(access.client, ref, `${ref}#canceled`).first();
  if (!known) return json({ ok: false, error: "That call isn't in this workspace." }, 404);
  if (body.confirmed) {
    await env.DB.prepare(
      `INSERT INTO call_flags (client_id, booking_ref, confirmed_at, confirmed_by) VALUES (?,?,?,?)
       ON CONFLICT(client_id, booking_ref) DO UPDATE SET confirmed_at=excluded.confirmed_at, confirmed_by=excluded.confirmed_by`,
    ).bind(access.client, ref, new Date().toISOString(), access.actor).run();
  } else {
    await env.DB.prepare("DELETE FROM call_flags WHERE client_id=? AND booking_ref=?").bind(access.client, ref).run();
  }
  return json({ ok: true, confirmed: Boolean(body.confirmed) });
}

export const onRequestPost = withOperator(handlePost);

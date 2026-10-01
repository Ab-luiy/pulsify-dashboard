// GET  /api/team[?client=]   the client's sales team: reps, 30-day numbers, forms, compliance,
//                             commissions this period and last, and flags (functions/_shared/team.js)
// POST /api/team {client?, action: "upsert-member", member}
//                {client?, action: "form", member_id, kind: "eod"|"set", lead_email?, data}
//                {client?, action: "mark-paid", member_id, period_start, period_end, amount_cents}
// (InfoOS build.) Reads: client, preview or operator (?client=). Writes: client or operator.

import { json, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";
import { fileForm, loadTeam, markPaid, upsertMember } from "../_shared/team.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  try {
    return json(await loadTeam(env, access.client));
  } catch (error) {
    console.error("team failed", error);
    return json({ ok: false, error: "Your team could not load. Try again shortly." }, 500);
  }
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const action = str(body?.action);
  const origin = new URL(request.url).origin;
  const result =
    action === "upsert-member" ? await upsertMember(env, access.client, body.member, origin)
      : action === "form" ? await fileForm(env, access.client, body)
        : action === "mark-paid" ? await markPaid(env, access.client, body, access.actor)
          : { error: "Unknown action." };
  if (result.error) return json({ ok: false, error: result.error }, result.status || 422);
  return json({ ok: true, ...result });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);

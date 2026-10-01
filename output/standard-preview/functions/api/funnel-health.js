// GET /api/funnel-health?range=7d|30d|90d|all[&client=]
// The client's funnel step by step, graded against targets, and what to fix
// in order of the money at stake (pulsify-saas #37).
// Client session, portal token or impersonation reads its own workspace; an operator
// reads any client with ?client= (functions/_shared/client-read.js). Always read-only.

import { json } from "../_shared/common.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { funnelHealthReport } from "../_shared/funnel-health.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const url = new URL(request.url);
  const range = ["7d", "30d", "90d", "all"].includes(url.searchParams.get("range")) ? url.searchParams.get("range") : "30d";
  try {
    return json(await funnelHealthReport(env, access.client, { range }));
  } catch (error) {
    console.error("funnel-health report failed", error);
    return json({ ok: false, error: "Your funnel report could not load. Try again shortly." }, 500);
  }
}

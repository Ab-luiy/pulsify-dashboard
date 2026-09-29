// GET /api/funnel-health?range=7d|30d|90d|all
// The client's funnel step by step, graded against targets, and what to fix
// in order of the money at stake (pulsify-saas #37).
// Client session, portal token or operator impersonation; always read-only.

import { json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { funnelHealthReport } from "../_shared/funnel-health.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true });
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

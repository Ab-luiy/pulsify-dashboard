// GET /api/funnel-analytics?range=24h|7d|30d|90d|all[&client=]
// Live funnel tiles, traffic sources, visitor globe, video and application answers for the
// Performance tabs (InfoOS build). Client session or preview reads its own workspace; an
// operator reads any client with ?client=. Read-only.

import { json } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { funnelAnalytics } from "../_shared/funnel-analytics.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const range = new URL(request.url).searchParams.get("range") || "30d";
  try {
    return json(await funnelAnalytics(env, access.client, { range }));
  } catch (error) {
    console.error("funnel-analytics failed", error);
    return json({ ok: false, error: "Your funnel numbers could not load. Try again shortly." }, 500);
  }
}

export const onRequestGet = withOperator(handleGet);

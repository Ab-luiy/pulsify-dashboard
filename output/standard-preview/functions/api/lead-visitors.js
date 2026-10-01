// GET /api/lead-visitors?range=live|24h|7d|30d[&client=]
// The latest visitors, anonymous or known, with their score (InfoOS build).
// Read access as /api/lead-pipeline. "live" = active in the last 5 minutes.

import { json } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { loadVisitors } from "../_shared/lead-people.js";

const WINDOWS = { live: 5 * 60000, "24h": 86400000, "7d": 7 * 86400000, "30d": 30 * 86400000 };
export const LIVE_MS = 5 * 60000;

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const url = new URL(request.url);
  const range = WINDOWS[url.searchParams.get("range")] ? url.searchParams.get("range") : "7d";
  const now = Date.now();
  try {
    const since = new Date(now - WINDOWS[range]).toISOString();
    const result = await loadVisitors(env, access.client, { since, limit: 200, now });
    const liveSince = new Date(now - LIVE_MS).toISOString();
    const totals = await env.DB.prepare(
      `SELECT COUNT(DISTINCT visitor_id) AS visitors,
              COUNT(DISTINCT CASE WHEN at >= ? THEN visitor_id END) AS live
         FROM page_events WHERE client=? AND at >= ? AND visitor_id IS NOT NULL`,
    ).bind(liveSince, access.client, since).first();
    const people = result.people.map((p) => ({ ...p, live: String(p.last_at || "") >= liveSince }));
    return json({
      ok: true,
      client: result.client,
      range,
      generated_at: new Date(now).toISOString(),
      present: result.present,
      totals: { visitors: Number(totals?.visitors || 0), live: Number(totals?.live || 0), known: people.filter((p) => !p.anonymous).length },
      people,
    });
  } catch (error) {
    console.error("lead-visitors failed", error);
    return json({ ok: false, error: "Your visitors could not load. Try again shortly." }, 500);
  }
}

export const onRequestGet = withOperator(handleGet);

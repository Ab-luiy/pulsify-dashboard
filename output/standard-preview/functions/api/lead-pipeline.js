// GET /api/lead-pipeline[?client=]
// Every known lead with their score, where they are in the pipeline and the next move
// (InfoOS build, founder 2026-09-30). Client session or preview reads its own workspace;
// an operator reads any client with ?client=. Read-only.

import { json } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { PIPELINE_STATUSES, loadPipeline } from "../_shared/lead-people.js";
import { DAY, MATURE_DAYS } from "../_shared/lead-score.js";

const RANK = { hot: 3, warm: 2, cool: 1, cold: 0 };

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const now = Date.now();
  try {
    const pipeline = await loadPipeline(env, access.client, { now });
    const counts = Object.fromEntries(PIPELINE_STATUSES.map((s) => [s, 0]));
    const bands = { hot: 0, warm: 0, cool: 0, cold: 0 };
    for (const p of pipeline.people) {
      counts[p.status] = (counts[p.status] || 0) + 1;
      if (p.band in bands) bands[p.band] += 1;
    }
    return json({
      ok: true,
      client: pipeline.client,
      generated_at: new Date(now).toISOString(),
      present: pipeline.present,
      has_video: pipeline.hasVideo,
      model: pipeline.model,
      counts,
      bands,
      accuracy: await accuracy(env, pipeline, now),
      people: pipeline.people,
    });
  } catch (error) {
    console.error("lead-pipeline failed", error);
    return json({ ok: false, error: "Your leads could not load. Try again shortly." }, 500);
  }
}

// How often people in each band went on to buy, judged only on scores recorded at
// least 30 days ago so every person had time to decide.
async function accuracy(env, pipeline, now) {
  const rows = await env.DB.prepare(
    "SELECT person_key, band FROM lead_score_snapshots WHERE client_id=? AND at <= ?",
  ).bind(pipeline.client, new Date(now - MATURE_DAYS * DAY).toISOString()).all().catch(() => ({ results: [] }));
  const top = new Map();
  for (const r of rows.results || []) {
    const rank = RANK[r.band] ?? -1;
    if (rank > (top.get(r.person_key) ?? -1)) top.set(r.person_key, rank);
  }
  const bought = new Set(pipeline.raw.filter((p) => p.stages.bought).flatMap((p) => [p.key, ...p.emails]));
  const out = { hot: { people: 0, bought: 0 }, warm: { people: 0, bought: 0 }, cool: { people: 0, bought: 0 }, cold: { people: 0, bought: 0 } };
  for (const [key, rank] of top) {
    const band = Object.keys(RANK).find((b) => RANK[b] === rank);
    if (!band) continue;
    out[band].people += 1;
    if (bought.has(key)) out[band].bought += 1;
  }
  return { judged_after_days: MATURE_DAYS, bands: out };
}

export const onRequestGet = withOperator(handleGet);

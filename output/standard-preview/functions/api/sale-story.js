// Part A of onboarding v2, "How you found us" (founder 2026-10-15: "whenever it stops at the last
// question I want that data registered to be ours"). Saved once the client answers the last
// question of the part; it is Pulsify's record of how the sale happened and no generator reads it.
//   POST /api/sale-story {answers}   client
//   GET  /api/sale-story?client=     operator: one client's story
//   GET  /api/sale-story             operator: every story, newest first
import { hasOperator, withOperator } from "../_shared/access.js";
import { checkAdmin, cleanId, json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const clip = (value, max = 4000) => str(value).slice(0, max);
const pickMore = (value) => ({ pick: clip(value?.pick, 40), more: clip(value?.more) });

export function cleanSaleStory(answers) {
  const a = answers && typeof answers === "object" ? answers : {};
  const touchpoints = (Array.isArray(a.touchpoints) ? a.touchpoints : []).slice(0, 10).map((entry) => ({
    pick: clip(entry?.pick, 40),
    rating: Math.min(5, Math.max(0, Number(entry?.rating) || 0)),
    note: clip(entry?.note, 1000),
  })).filter((entry) => entry.pick);
  return {
    believed: clip(a.believed),
    decision_time: clip(a.decision_time, 40),
    sooner_if: clip(a.sooner_if),
    almost_stopped: pickMore(a.almost_stopped),
    video: { link: clip(a.video?.link, 500), pick: clip(a.video?.pick, 40) },
    confidence: { score: Math.min(10, Math.max(0, Number(a.confidence?.score) || 0)), more: clip(a.confidence?.more) },
    touchpoints,
  };
}

const complete = (s) => Boolean(s.believed && s.decision_time && s.almost_stopped.pick && s.confidence.score && s.touchpoints.length);

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const story = cleanSaleStory(body.answers);
  if (!complete(story)) return json({ ok: false, error: "answer every question in this part first" }, 422);
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO sale_stories (client_id, answers_json, completed_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(client_id) DO UPDATE SET answers_json=excluded.answers_json, updated_at=excluded.updated_at`,
  ).bind(access.client, JSON.stringify(story), now, now).run();
  return json({ ok: true, completed_at: now });
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  if (!(hasOperator(request, env) || request.headers.get("x-admin-key") != null)) return json({ ok: false, error: "operators only" }, 403);
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  const client = cleanId(new URL(request.url).searchParams.get("client"));
  if (client) {
    const row = await env.DB.prepare("SELECT answers_json, completed_at, updated_at FROM sale_stories WHERE client_id=?").bind(client).first();
    return json({ ok: true, story: row ? { answers: JSON.parse(row.answers_json), completed_at: row.completed_at, updated_at: row.updated_at } : null });
  }
  const rows = await env.DB.prepare(
    "SELECT client_id, answers_json, completed_at FROM sale_stories ORDER BY completed_at DESC LIMIT 500",
  ).all();
  return json({ ok: true, stories: (rows.results || []).map((row) => ({ client_id: row.client_id, answers: JSON.parse(row.answers_json), completed_at: row.completed_at })) });
}

export const onRequestPost = withOperator(handlePost);
export const onRequestGet = withOperator(handleGet);

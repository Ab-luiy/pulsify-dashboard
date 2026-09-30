// Tracked links for any placement (InfoOS build, the Links tab):
//   GET    /api/tracked-links[?client=]                  every link with clicks, visits, applications, calls, buyers, cash
//   POST   /api/tracked-links {label, source, placement, target_url?}   create one
//   DELETE /api/tracked-links?token=                      archive one
// A link lands on the client's page (or target_url) wearing utm_source=<source>,
// utm_medium=<placement>, utm_content=l-<token> (functions/a/[token].js). Credit is first
// touch per person and cash is confirmed payments, the same rules as cash by video.
// Reads: client, preview or operator (?client=). Writes: client or operator, never a preview.

import { cleanId, json, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";
import { loadPipeline } from "../_shared/lead-people.js";

export const LINK_SOURCES = ["instagram", "tiktok", "youtube", "email", "facebook", "x", "linkedin", "ads", "other"];
export const LINK_PLACEMENTS = ["bio", "story", "post", "dm", "newsletter", "ad", "description", "other"];

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return [...bytes].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const origin = new URL(request.url).origin;
  const client = access.client;
  const [links, clicks, visits, pipeline] = await Promise.all([
    env.DB.prepare(
      `SELECT token, label, source, placement, target_url, created_at FROM asset_links
        WHERE client=? AND kind='link' AND archived=0 ORDER BY created_at DESC`,
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT e.token, COUNT(*) AS clicks FROM asset_events e JOIN asset_links l ON l.token=e.token
        WHERE l.client=? AND l.kind='link' GROUP BY e.token`,
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT utm_content, COUNT(DISTINCT visitor_id) AS visitors FROM page_events
        WHERE client=? AND utm_content LIKE 'l-%' AND event='page_view' GROUP BY utm_content`,
    ).bind(client).all(),
    loadPipeline(env, client),
  ]);
  const clickBy = new Map((clicks.results || []).map((r) => [r.token, Number(r.clicks || 0)]));
  const visitBy = new Map((visits.results || []).map((r) => [r.utm_content, Number(r.visitors || 0)]));
  const people = new Map();
  for (const person of pipeline.raw) {
    const tag = String(person.source?.utm?.utm_content || "");
    if (!tag.startsWith("l-")) continue;
    const s = people.get(tag) || { applications: 0, booked: 0, buyers: 0, cash_cents: 0 };
    if (person.stages.applied) s.applications += 1;
    if (person.stages.booked) s.booked += 1;
    if (person.stages.bought) { s.buyers += 1; s.cash_cents += person.money.collected_cents; }
    people.set(tag, s);
  }
  return json({
    ok: true,
    client,
    links: (links.results || []).map((l) => ({
      token: l.token,
      url: `${origin}/a/${l.token}`,
      label: l.label,
      source: l.source,
      placement: l.placement,
      target_url: l.target_url,
      created_at: l.created_at,
      clicks: clickBy.get(l.token) || 0,
      visitors: visitBy.get(`l-${l.token}`) || 0,
      ...(people.get(`l-${l.token}`) || { applications: 0, booked: 0, buyers: 0, cash_cents: 0 }),
    })),
  });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const label = str(body?.label).slice(0, 80);
  if (!label) return json({ ok: false, error: "Name the link, e.g. Instagram bio." }, 422);
  const source = LINK_SOURCES.includes(body.source) ? body.source : "other";
  const placement = LINK_PLACEMENTS.includes(body.placement) ? body.placement : "other";
  let target = str(body.target_url);
  if (target) {
    try {
      const url = new URL(target);
      if (!/^https?:$/.test(url.protocol)) throw new Error("bad");
      target = url.toString();
    } catch {
      return json({ ok: false, error: "The destination must be a full web address." }, 422);
    }
  }
  const origin = new URL(request.url).origin;
  const token = newToken();
  await env.DB.prepare(
    `INSERT INTO asset_links (token, client, label, target_url, created_at, archived, kind, source, placement)
     VALUES (?,?,?,?,?,0,'link',?,?)`,
  ).bind(token, access.client, label, target || `${origin}/${cleanId(access.client)}`, new Date().toISOString(), source, placement).run();
  return json({ ok: true, token, url: `${origin}/a/${token}` }, 201);
}

async function handleDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportWriter(request, env);
  if (access.error) return access.error;
  const token = str(new URL(request.url).searchParams.get("token")).slice(0, 40);
  const result = await env.DB.prepare(
    "UPDATE asset_links SET archived=1 WHERE token=? AND client=? AND kind='link'",
  ).bind(token, access.client).run();
  if (!result.meta?.changes) return json({ ok: false, error: "That link isn't in this workspace." }, 404);
  return json({ ok: true });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
export const onRequestDelete = withOperator(handleDelete);

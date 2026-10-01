// Funnel analytics for the Performance tabs (InfoOS build, 2026-09-30): live funnel tiles,
// traffic sources with what each one turned into, the visitor globe, the video (plays,
// watch depth, retention, time to first play) and the application answers with which
// ones book and buy. Every number is counted from the rows; nothing is estimated.
//
// People and money come from lead-people.js (first touch per person, confirmed payments
// only, net of refunds), so a source's cash matches the Payments page and cash by video.

import { cleanId, parseJson } from "./common.js";
import { loadPipeline, sourceFrom } from "./lead-people.js";

const DAY = 86400000;
const RANGES = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
const LIVE_MS = 5 * 60000;
const RETENTION_POINTS = 21; // 0%, 5%, ... 100%

export function analyticsRange(value) {
  return RANGES[value] || value === "all" ? value : "30d";
}

async function all(env, sql, params) {
  const result = await env.DB.prepare(sql).bind(...params).all();
  return result.results || [];
}

export async function funnelAnalytics(env, clientId, { range = "30d", now = Date.now() } = {}) {
  const client = cleanId(clientId, "");
  const rangeKey = analyticsRange(range);
  const from = RANGES[rangeKey] ? new Date(now - RANGES[rangeKey] * DAY).toISOString() : "0000";
  const liveSince = new Date(now - LIVE_MS).toISOString();

  const [tileRow, touchRow, firstRows, placeRows, watchRows, firstViewRows, pipeline, prefs] = await Promise.all([
    env.DB.prepare(
      `SELECT SUM(event='page_view') AS visits,
              COUNT(DISTINCT CASE WHEN event='page_view' THEN visitor_id END) AS visitors,
              COUNT(DISTINCT CASE WHEN at >= ? THEN visitor_id END) AS live
         FROM page_events WHERE client=? AND at >= ?`,
    ).bind(liveSince, client, from).first(),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT CASE WHEN kind='optin' AND ts >= ? THEN lower(contact_email) END) AS optins,
              COUNT(DISTINCT CASE WHEN kind='application' AND ts >= ? THEN lower(contact_email) END) AS applications,
              COUNT(DISTINCT CASE WHEN kind='booking' AND external_id NOT LIKE '%#canceled'
                                   AND COALESCE(json_extract(payload_json,'$.booked_at'), ts) >= ? THEN lower(contact_email) END) AS booked
         FROM pipeline_touches WHERE client_id=?`,
    ).bind(from, from, from, client).first(),
    // First visit of every visitor whose first visit is in range: where they came from.
    all(env, `SELECT visitor_id, utm_source, referrer, utm_json FROM (
                SELECT visitor_id, utm_source, referrer, utm_json, at,
                       ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY at, id) AS rn
                  FROM page_events WHERE client=? AND event='page_view' AND visitor_id IS NOT NULL)
               WHERE rn=1 AND at >= ? LIMIT 20000`, [client, from]),
    // Where each visitor in range is, for the globe (latest visit with a location).
    all(env, `SELECT visitor_id, lat, lng, at FROM (
                SELECT visitor_id, lat, lng, at, ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY at DESC, id DESC) AS rn
                  FROM page_events WHERE client=? AND at >= ? AND lat IS NOT NULL AND lng IS NOT NULL AND visitor_id IS NOT NULL)
               WHERE rn=1 ORDER BY at DESC LIMIT 400`, [client, from]),
    all(env, `SELECT COALESCE(visitor_id, lower(email), session_id) AS k, MAX(COALESCE(percent,0)) AS pct,
                     SUM(event='play') AS plays, MIN(CASE WHEN event='play' THEN at END) AS first_play
                FROM watch_events WHERE client=? AND at >= ? AND COALESCE(visitor_id, email, session_id) IS NOT NULL
               GROUP BY COALESCE(visitor_id, lower(email), session_id)`, [client, from]),
    all(env, `SELECT visitor_id, MIN(at) AS first_at FROM page_events
               WHERE client=? AND event='page_view' AND visitor_id IS NOT NULL AND at >= ? GROUP BY visitor_id`, [client, from]),
    loadPipeline(env, client, { now }),
    all(env, "SELECT key, value_json FROM workspace_preferences WHERE client_id=? AND key IN ('lead-qualify')", [client]).catch(() => []),
  ]);

  const tiles = {
    visits: Number(tileRow?.visits || 0),
    visitors: Number(tileRow?.visitors || 0),
    live: Number(tileRow?.live || 0),
    optins: Number(touchRow?.optins || 0),
    applications: Number(touchRow?.applications || 0),
    booked: Number(touchRow?.booked || 0),
  };
  tiles.application_rate = tiles.visitors ? tiles.applications / tiles.visitors : null;
  tiles.booking_rate = tiles.applications ? tiles.booked / tiles.applications : null;

  // Sources: visitors by first touch, then what the known people from each source did.
  const inRange = (iso) => Boolean(iso) && (rangeKey === "all" || String(iso) >= from);
  const sources = new Map();
  const bucket = (key) => {
    if (!sources.has(key)) sources.set(key, { source: key, visitors: 0, applications: 0, booked: 0, buyers: 0, cash_cents: 0 });
    return sources.get(key);
  };
  for (const row of firstRows) bucket(sourceFrom(row)).visitors += 1;
  for (const person of pipeline.raw) {
    const key = person.source?.channel || "direct";
    const b = bucket(key);
    if (inRange(person.stages.applied)) b.applications += 1;
    if (inRange(person.stages.booked)) b.booked += 1;
    if (inRange(person.stages.bought)) {
      b.buyers += 1;
      b.cash_cents += person.money.collected_cents;
    }
  }
  const sourceList = [...sources.values()].sort((a, b) => b.cash_cents - a.cash_cents || b.applications - a.applications || b.visitors - a.visitors);

  // Video.
  const firstView = new Map(firstViewRows.map((r) => [r.visitor_id, Date.parse(r.first_at)]));
  const viewers = watchRows.filter((r) => Number(r.plays || 0) > 0 || Number(r.pct || 0) > 0);
  const depths = viewers.map((r) => Math.min(100, Math.max(0, Number(r.pct || 0))));
  const toPlay = [];
  for (const r of viewers) {
    const start = firstView.get(r.k);
    const play = Date.parse(r.first_play || "");
    if (Number.isFinite(start) && Number.isFinite(play) && play >= start) toPlay.push((play - start) / 1000);
  }
  toPlay.sort((a, b) => a - b);
  const retention = [];
  for (let i = 0; i < RETENTION_POINTS; i += 1) {
    const at = (i * 100) / (RETENTION_POINTS - 1);
    retention.push({ at, share: depths.length ? depths.filter((d) => d >= at).length / depths.length : 0 });
  }
  const video = {
    viewers: viewers.length,
    plays: viewers.reduce((n, r) => n + Number(r.plays || 0), 0),
    play_rate: tiles.visitors ? Math.min(1, viewers.length / tiles.visitors) : null,
    avg_watched: depths.length ? depths.reduce((n, d) => n + d, 0) / depths.length / 100 : null,
    completion_rate: depths.length ? depths.filter((d) => d >= 90).length / depths.length : null,
    median_seconds_to_play: toPlay.length ? toPlay[Math.floor(toPlay.length / 2)] : null,
    retention,
  };

  // Applications: every answer, how often it was given, and what those people went on to do.
  const rules = parseJson(prefs.find((p) => p.key === "lead-qualify")?.value_json, null);
  const questions = new Map();
  const qualification = { rules_set: Boolean(rules?.questions && Object.keys(rules.questions).length), qualified: 0, unqualified: 0, unknown: 0 };
  for (const person of pipeline.raw) {
    if (!inRange(person.stages.applied)) continue;
    if (person.qualified === true) qualification.qualified += 1;
    else if (person.qualified === false) qualification.unqualified += 1;
    else qualification.unknown += 1;
    for (const [key, raw] of Object.entries(person.answers || {})) {
      if (raw == null || raw === "" || typeof raw === "object" && !Array.isArray(raw)) continue;
      if (/email|phone|name/i.test(key)) continue; // contact fields, not answers
      const values = (Array.isArray(raw) ? raw : [raw]).map((v) => String(v).trim()).filter(Boolean);
      if (!questions.has(key)) questions.set(key, new Map());
      const answers = questions.get(key);
      for (const value of values) {
        const label = value.length > 80 ? `${value.slice(0, 77)}...` : value;
        if (!answers.has(label)) answers.set(label, { value: label, people: 0, booked: 0, bought: 0 });
        const a = answers.get(label);
        a.people += 1;
        if (person.stages.booked) a.booked += 1;
        if (person.stages.bought) a.bought += 1;
      }
    }
  }
  const disqualify = rules?.questions || {};
  const questionList = [...questions.entries()]
    .map(([key, answers]) => {
      const bad = new Set((disqualify[key]?.disqualify || []).map((v) => String(v).trim().toLowerCase()));
      const list = [...answers.values()].map((a) => ({ ...a, disqualify: bad.has(a.value.toLowerCase()) })).sort((a, b) => b.people - a.people);
      // Free-text questions (almost every answer unique) are shown as a count, not a list of answers.
      const free = list.length > 12 && list.filter((a) => a.people === 1).length / list.length > 0.7;
      return { key, answered: list.reduce((n, a) => n + a.people, 0), free_text: free, answers: free ? [] : list.slice(0, 12) };
    })
    .sort((a, b) => b.answered - a.answered);

  return {
    ok: true,
    client,
    range: rangeKey,
    generated_at: new Date(now).toISOString(),
    tiles,
    sources: sourceList,
    globe: placeRows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lng), live: String(r.at) >= liveSince })),
    video,
    qualification,
    questions: questionList,
    has_video: pipeline.hasVideo,
  };
}

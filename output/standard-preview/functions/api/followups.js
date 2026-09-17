import { hasOperator } from '../_shared/access.js';
/**
 * Warm-lead follow-up queue.
 *
 * GET /api/followups
 * Header: x-admin-key: <ADMIN_KEY>
 *
 * Ranks configured prospect pages using the tracking data already collected in
 * page_events, watch_events, leads, and integration_events. This endpoint does
 * not create or update outreach activity.
 */

export async function onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const [configs, pageRows, watchRows, leadRows, bookingRows] = await Promise.all([
    safeAll(
      env,
      `SELECT client, COALESCE(client_name,client) AS client_name,
              COALESCE(template_variant,'canonical') AS template_variant
         FROM client_config`,
    ),
    safeAll(
      env,
      `SELECT client,
              COUNT(DISTINCT CASE WHEN event='page_view'
                THEN COALESCE(NULLIF(visitor_id,''),NULLIF(email,''),NULLIF(session_id,'')) END) AS visitors,
              SUM(CASE WHEN event='page_view' THEN 1 ELSE 0 END) AS page_views,
              MAX(CASE WHEN event='page_view' THEN at END) AS last_view_at
         FROM page_events GROUP BY client`,
    ),
    safeAll(
      env,
      `SELECT client,
              SUM(CASE WHEN event='play' THEN 1 ELSE 0 END) AS plays,
              MAX(COALESCE(percent,0)) AS max_percent,
              SUM(COALESCE(watch_seconds,0)) AS watch_seconds,
              MAX(at) AS last_watch_at
         FROM watch_events GROUP BY client`,
    ),
    safeAll(
      env,
      `SELECT client,
              SUM(CASE WHEN source='typeform' THEN 1 ELSE 0 END) AS applications,
              MAX(CASE WHEN source='typeform' THEN applied_at END) AS last_application_at
         FROM leads GROUP BY client`,
    ),
    safeAll(
      env,
      `SELECT client, COUNT(*) AS bookings, MAX(ts) AS last_booked_at
         FROM integration_events WHERE kind='booking' GROUP BY client`,
    ),
  ]);

  const configMap = toMap(configs);
  const pageMap = toMap(pageRows);
  const watchMap = toMap(watchRows);
  const leadMap = toMap(leadRows);
  const bookingMap = toMap(bookingRows);
  const engagedClients = new Set([...pageMap.keys(), ...watchMap.keys()]);

  const followups = [...engagedClients].map((client) => {
    const cfg = configMap.get(client) || {};
    const page = pageMap.get(client) || {};
    const watch = watchMap.get(client) || {};
    const lead = leadMap.get(client) || {};
    const booking = bookingMap.get(client) || {};
    const visitors = number(page.visitors);
    const pageViews = number(page.page_views);
    const plays = number(watch.plays);
    const maxPercent = clamp(number(watch.max_percent), 0, 100);
    const watchSeconds = number(watch.watch_seconds);
    const applications = number(lead.applications);
    const bookings = number(booking.bookings);
    const lastViewedAt = latest([page.last_view_at, watch.last_watch_at]);

    if (!visitors && !pageViews && !plays && !maxPercent && !watchSeconds) return null;

    const score = engagementScore({
      visitors,
      pageViews,
      plays,
      maxPercent,
      lastViewedAt,
      applications,
      bookings,
    });

    return {
      client,
      client_name: cfg.client_name || client,
      template_variant: cfg.template_variant || "canonical",
      page_path: `/?client=${encodeURIComponent(client)}`,
      score,
      signal: scoreLabel(score),
      engagement: {
        visitors,
        page_views: pageViews,
        plays,
        max_watch_percent: maxPercent,
        watch_seconds: watchSeconds,
        last_viewed_at: lastViewedAt,
      },
      outcomes: {
        applied: applications > 0,
        applications,
        last_application_at: lead.last_application_at || null,
        booked: bookings > 0,
        bookings,
        last_booked_at: booking.last_booked_at || null,
      },
    };
  }).filter(Boolean);

  followups.sort((a, b) => (
    b.score - a.score ||
    String(b.engagement.last_viewed_at || "").localeCompare(String(a.engagement.last_viewed_at || "")) ||
    String(a.client_name).localeCompare(String(b.client_name))
  ));

  return json({
    ok: true,
    summary: {
      total_engaged: followups.length,
      needing_followup: followups.filter((row) => !row.outcomes.applied && !row.outcomes.booked).length,
      hot: followups.filter((row) => row.signal === "hot").length,
      warm: followups.filter((row) => row.signal === "warm").length,
      cool: followups.filter((row) => row.signal === "cool").length,
    },
    followups,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

/**
 * Score shape: view signal 12 to 20, depth up to 50, plays up to 20,
 * recency up to 25, application 15, booking 20. Outcome points keep completed
 * prospects visible in their correct engagement position when filters are off.
 */
function engagementScore({ visitors, pageViews, plays, maxPercent, lastViewedAt, applications, bookings }) {
  const viewPoints = visitors || pageViews ? 12 + Math.min(Math.max(pageViews - 1, 0), 4) * 2 : 0;
  const depthPoints = maxPercent * 0.5;
  const playPoints = Math.min(plays, 5) * 4;
  const recencyPoints = scoreRecency(lastViewedAt);
  const outcomePoints = (applications > 0 ? 15 : 0) + (bookings > 0 ? 20 : 0);
  return Math.round(viewPoints + depthPoints + playPoints + recencyPoints + outcomePoints);
}

function scoreRecency(value) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  const ageDays = Math.max(0, Date.now() - timestamp) / 86400000;
  if (ageDays <= 1) return 25;
  if (ageDays <= 3) return 20;
  if (ageDays <= 7) return 15;
  if (ageDays <= 14) return 8;
  if (ageDays <= 30) return 4;
  return 0;
}

function scoreLabel(score) {
  if (score >= 60) return "hot";
  if (score >= 30) return "warm";
  return "cool";
}

function toMap(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row?.client) map.set(row.client, row);
  }
  return map;
}

function latest(values) {
  let best = null;
  for (const value of values) {
    if (value && (!best || String(value) > String(best))) best = value;
  }
  return best;
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function safeAll(env, sql) {
  try {
    const result = await env.DB.prepare(sql).all();
    return result.results || [];
  } catch {
    return [];
  }
}

function checkAuth(request, env) {
  if (!hasOperator(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}

function json(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

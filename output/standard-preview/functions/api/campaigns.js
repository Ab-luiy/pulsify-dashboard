import { withOperator } from '../_shared/access.js';
import { hasOperator } from '../_shared/access.js';
/**
 * Campaign board API — one operator-facing view across every client page.
 *
 * GET /api/campaigns
 * Header: x-admin-key: <ADMIN_KEY>
 *
 * Returns every client_config row merged with per-client aggregates from
 * page_events, watch_events, leads, and delivery_failures. Built as grouped
 * queries (one per table) merged in JS, so cost stays flat no matter how
 * many clients exist — never N queries per client.
 */

async function handle_onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  let configs = [];
  try {
    const result = await env.DB.prepare(
      `SELECT client, COALESCE(client_name,client) AS client_name,
              COALESCE(template_variant,'canonical') AS template_variant,
              wistia_media_id, page_content_json, COALESCE(page_active,1) AS page_active,
              prospect_email, acquisition_token, updated_at
         FROM client_config ORDER BY client_name COLLATE NOCASE`,
    ).all();
    configs = result.results || [];
  } catch {
    configs = [];
  }

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [visitsByClient, watchByClient, leadsByClient, failuresByClient, placeByClient] = await Promise.all([
    safeAll(
      env,
      `SELECT client,
              COUNT(DISTINCT CASE WHEN event='page_view' THEN COALESCE(visitor_id,session_id) END) AS visitors,
              COUNT(DISTINCT CASE WHEN event='page_view' AND email IS NOT NULL THEN COALESCE(visitor_id,session_id) END) AS attributed_visitors,
              COUNT(DISTINCT CASE WHEN event='page_view' THEN ip END) AS unique_ips,
              SUM(CASE WHEN event='page_view' THEN 1 ELSE 0 END) AS page_views,
              MAX(at) AS last_visit_at
         FROM page_events GROUP BY client`,
    ),
    safeAll(
      env,
      `SELECT client,
              SUM(CASE WHEN event='play' THEN 1 ELSE 0 END) AS plays,
              MAX(COALESCE(percent,0)) AS max_percent,
              MAX(at) AS last_watch_at
         FROM watch_events GROUP BY client`,
    ),
    safeAll(
      env,
      `SELECT client,
              COUNT(*) AS applications,
              MAX(applied_at) AS last_application_at,
              SUM(CASE WHEN kit_status='synced' THEN 1 ELSE 0 END) AS kit_synced
         FROM leads GROUP BY client`,
    ),
    safeAll(
      env,
      `SELECT client, COUNT(*) AS failures
         FROM delivery_failures WHERE at >= ? GROUP BY client`,
      [since7d],
    ),
    // Where the latest page view came from (pulsify-saas #34: "last seen 6 h ago, Lisbon").
    safeAll(
      env,
      `SELECT p.client, p.city, p.country FROM page_events p
         JOIN (SELECT client, MAX(id) AS id FROM page_events WHERE event='page_view' GROUP BY client) last ON last.id = p.id`,
    ),
  ]);

  const visitsMap = toMap(visitsByClient);
  const watchMap = toMap(watchByClient);
  const leadsMap = toMap(leadsByClient);
  const failuresMap = toMap(failuresByClient);
  const placeMap = toMap(placeByClient);

  // Aggregate tables may reference clients that have since been removed from
  // client_config (or vice versa) — union every client id we've seen so the
  // board never silently drops activity for an unconfigured page.
  const allClients = new Set([
    ...configs.map((c) => c.client),
    ...visitsMap.keys(),
    ...watchMap.keys(),
    ...leadsMap.keys(),
    ...failuresMap.keys(),
  ]);

  const configByClient = new Map(configs.map((c) => [c.client, c]));

  const campaigns = [...allClients].map((client) => {
    const cfg = configByClient.get(client) || {};
    const visits = visitsMap.get(client) || {};
    const watch = watchMap.get(client) || {};
    const leads = leadsMap.get(client) || {};
    const failures = failuresMap.get(client) || {};

    const visitors = Number(visits.visitors || 0);
    const pageViews = Number(visits.page_views || 0);
    const attributedVisitors = Number(visits.attributed_visitors || 0);
    const uniqueIps = Number(visits.unique_ips || 0);
    const plays = Number(watch.plays || 0);
    const maxPercent = Number(watch.max_percent || 0);
    const applications = Number(leads.applications || 0);
    const kitSynced = Number(leads.kit_synced || 0);
    const failures7d = Number(failures.failures || 0);

    const lastActivityAt = latest([
      visits.last_visit_at,
      watch.last_watch_at,
      leads.last_application_at,
      cfg.updated_at,
    ]);

    const pageContent = parseJson(cfg.page_content_json);
    const acquisitionToken = cfg.acquisition_token || null;
    return {
      client,
      client_name: cfg.client_name || client,
      template_variant: cfg.template_variant || "canonical",
      page_active: cfg.page_active !== 0,
      prospect_email: cfg.prospect_email || null,
      wistia_media_id: cfg.wistia_media_id || null,
      preview: {
        page_title: pageContent.PAGE_TITLE || `${cfg.client_name || client} - Private Application`,
        headline: [pageContent.HEADLINE_LINE_ONE, pageContent.HEADLINE_EMPHASIS].filter(Boolean).join(" ")
          || "A private breakdown, then apply to work together.",
      },
      share_url: acquisitionToken
        ? `${new URL(request.url).origin}/${encodeURIComponent(client)}?lead=${encodeURIComponent(acquisitionToken)}`
        : null,
      updated_at: cfg.updated_at || null,
      visits: {
        visitors,
        attributed_visitors: attributedVisitors,
        unique_ips: uniqueIps,
        page_views: pageViews,
        last_visit_at: visits.last_visit_at || null,
        last_city: placeMap.get(client)?.city || null,
        last_country: placeMap.get(client)?.country || null,
      },
      video: {
        plays,
        max_watch_percent: maxPercent,
        last_watched_at: watch.last_watch_at || null,
      },
      applications: {
        count: applications,
        last_application_at: leads.last_application_at || null,
        kit_synced: kitSynced,
      },
      failures_7d: failures7d,
      signal: computeSignal({ applications, maxPercent, visitors }),
      last_activity_at: lastActivityAt,
    };
  });

  campaigns.sort((a, b) => {
    const rank = signalRank(b.signal) - signalRank(a.signal);
    if (rank !== 0) return rank;
    return (b.last_activity_at || "").localeCompare(a.last_activity_at || "");
  });

  const summary = {
    total_pages: campaigns.length,
    active_pages: campaigns.filter((c) => c.page_active).length,
    pages_with_activity: campaigns.filter((c) => c.signal !== "no activity").length,
    total_applications: campaigns.reduce((total, c) => total + c.applications.count, 0),
    total_failures_7d: campaigns.reduce((total, c) => total + c.failures_7d, 0),
  };

  return json({ ok: true, summary, campaigns });
}

function parseJson(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

function computeSignal({ applications, maxPercent, visitors }) {
  if (applications > 0) return "applied";
  if (maxPercent >= 50) return "hot";
  if (visitors > 0) return "visited";
  return "no activity";
}

function signalRank(signal) {
  switch (signal) {
    case "applied": return 3;
    case "hot": return 2;
    case "visited": return 1;
    default: return 0;
  }
}

function latest(values) {
  let best = null;
  for (const value of values) {
    if (!value) continue;
    if (!best || String(value) > String(best)) best = value;
  }
  return best;
}

function toMap(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row && row.client) map.set(row.client, row);
  }
  return map;
}

/** Run a grouped query; on any error (e.g. missing table) degrade to []. */
async function safeAll(env, sql, params = []) {
  try {
    const stmt = params.length ? env.DB.prepare(sql).bind(...params) : env.DB.prepare(sql);
    const result = await stmt.all();
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

export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestOptions = withOperator(handle_onRequestOptions);

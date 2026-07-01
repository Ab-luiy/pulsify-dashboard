/**
 * Portal data API.
 *
 * GET /leads?client=<client-id>
 * Header: x-admin-key: <ADMIN_KEY>
 */

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const access = await resolveAccess(request, env, url);
  if (access.error) return access.error;
  const client = access.client;

  const [leadResult, viewerResult, pageResult, eventResult] = await Promise.all([
    env.DB.prepare(
      `SELECT id,email,name,phone,revenue,situation,applied_at,updated_at,status,source,
              visitor_id,session_id,page_id,response_id,kit_status,answers_json,utm_json
         FROM leads WHERE client=? ORDER BY applied_at DESC`,
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT
         COALESCE(NULLIF(visitor_id,''),NULLIF(email,''),NULLIF(session_id,''),'anonymous-'||id) AS viewer,
         MAX(email) AS email,
         MAX(visitor_id) AS visitor_id,
         MAX(percent) AS watched_percent,
         SUM(COALESCE(watch_seconds,0)) AS watch_seconds,
         MAX(COALESCE(unique_seconds,0)) AS unique_seconds,
         MAX(COALESCE(duration_seconds,0)) AS duration_seconds,
         SUM(CASE WHEN event='play' THEN 1 ELSE 0 END) AS plays,
         SUM(CASE WHEN event='pause' THEN 1 ELSE 0 END) AS pauses,
         SUM(CASE WHEN event IN ('seeked','seeking') THEN 1 ELSE 0 END) AS seeks,
         MAX(at) AS last_watched_at
       FROM watch_events WHERE client=? GROUP BY viewer`,
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT
         COUNT(DISTINCT CASE WHEN event='page_view' THEN COALESCE(visitor_id,session_id) END) AS visitors,
         SUM(CASE WHEN event='page_view' THEN 1 ELSE 0 END) AS page_views,
         SUM(CASE WHEN event='cta_click' THEN 1 ELSE 0 END) AS cta_clicks,
         SUM(CASE WHEN event='form_start' THEN 1 ELSE 0 END) AS form_starts,
         SUM(CASE WHEN event='form_submit' THEN 1 ELSE 0 END) AS form_submits,
         SUM(CASE WHEN event='optin' THEN 1 ELSE 0 END) AS optins
       FROM page_events WHERE client=?`,
    ).bind(client).first(),
    env.DB.prepare(
      `SELECT event, COUNT(*) AS total
         FROM watch_events WHERE client=? GROUP BY event ORDER BY total DESC`,
    ).bind(client).all(),
  ]);

  const leads = leadResult.results || [];
  const viewers = (viewerResult.results || []).map(normalizeViewer);
  const page = pageResult || {};

  const viewerByVisitor = new Map();
  const viewerByEmail = new Map();
  for (const viewer of viewers) {
    if (viewer.visitor_id) viewerByVisitor.set(viewer.visitor_id, viewer);
    if (viewer.email) viewerByEmail.set(viewer.email.toLowerCase(), viewer);
  }

  const rows = leads.map((lead) => {
    const viewer =
      (lead.visitor_id && viewerByVisitor.get(lead.visitor_id)) ||
      (lead.email && viewerByEmail.get(lead.email.toLowerCase())) ||
      null;
    return {
      ...lead,
      watched_percent: viewer?.watched_percent ?? null,
      watch_seconds: viewer?.watch_seconds ?? 0,
      unique_seconds: viewer?.unique_seconds ?? 0,
      plays: viewer?.plays ?? 0,
      pauses: viewer?.pauses ?? 0,
      seeks: viewer?.seeks ?? 0,
      last_watched_at: viewer?.last_watched_at ?? null,
    };
  });

  const watchers = viewers.filter((viewer) => viewer.plays > 0 || viewer.watch_seconds > 0);
  const visitors = Number(page.visitors || 0);
  const applications = rows.filter((lead) => lead.source === "typeform").length;
  const optins = Number(page.optins || 0);
  const capturedLeadKeys = new Set(
    rows.map((lead) => lead.visitor_id || lead.email).filter(Boolean),
  );
  const totalWatchSeconds = sum(watchers, "watch_seconds");
  const averagePercent = watchers.length
    ? watchers.reduce((total, viewer) => total + (viewer.watched_percent || 0), 0) / watchers.length
    : 0;

  return json({
    ok: true,
    client,
    summary: {
      visitors,
      page_views: Number(page.page_views || 0),
      watchers: watchers.length,
      plays: sum(watchers, "plays"),
      play_rate: visitors ? watchers.length / visitors : 0,
      total_watch_seconds: totalWatchSeconds,
      average_watch_seconds: watchers.length ? totalWatchSeconds / watchers.length : 0,
      average_watched_percent: averagePercent,
      reached_25: reached(watchers, 25),
      reached_50: reached(watchers, 50),
      reached_75: reached(watchers, 75),
      completed: reached(watchers, 99),
      cta_clicks: Number(page.cta_clicks || 0),
      form_starts: Number(page.form_starts || 0),
      applications,
      optins,
      lead_conversion_rate: visitors
        ? Math.min(capturedLeadKeys.size / visitors, 1)
        : 0,
      kit_synced: rows.filter((lead) => lead.kit_status === "synced").length,
    },
    watch_event_counts: eventResult.results || [],
    leads: rows,
    viewers,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "x-admin-key, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

/**
 * Two ways in:
 * - x-portal-token: a client's private link. The token itself decides which client's
 *   data is returned; any ?client= param is ignored, so one client can never read
 *   another's data.
 * - x-admin-key: the operator. Sees any client via the ?client= param (dropdown).
 */
async function resolveAccess(request, env, url) {
  const portalToken = request.headers.get("x-portal-token");
  if (portalToken) {
    const hash = await sha256Hex(portalToken.trim());
    const row = await env.DB.prepare(
      "SELECT client FROM client_config WHERE portal_token_hash=?",
    ).bind(hash).first();
    if (!row) {
      return { error: json({ ok: false, error: "invalid or expired portal link" }, 401) };
    }
    return { client: cleanId(row.client), scope: "client" };
  }

  if (!env.ADMIN_KEY) return { error: json({ ok: false, error: "ADMIN_KEY not configured" }, 500) };
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return { error: json({ ok: false, error: "unauthorized" }, 401) };
  }
  return { client: cleanId(url.searchParams.get("client") || "unknown"), scope: "admin" };
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeViewer(row) {
  return {
    ...row,
    watched_percent: Number(row.watched_percent || 0),
    watch_seconds: Number(row.watch_seconds || 0),
    unique_seconds: Number(row.unique_seconds || 0),
    duration_seconds: Number(row.duration_seconds || 0),
    plays: Number(row.plays || 0),
    pauses: Number(row.pauses || 0),
    seeks: Number(row.seeks || 0),
  };
}

function reached(viewers, threshold) {
  return viewers.filter((viewer) => viewer.watched_percent >= threshold).length;
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function cleanId(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "unknown";
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

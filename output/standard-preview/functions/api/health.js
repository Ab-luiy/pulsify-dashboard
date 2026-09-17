import { withOperator } from '../_shared/access.js';
import { hasOperator } from '../_shared/access.js';
/**
 * Operator health snapshot for the funnel pipe.
 *
 * GET /api/health
 * Header: x-admin-key: <ADMIN_KEY>
 *
 * Surfaces what /event has been silently swallowing: last-24h activity
 * counts, last-7d delivery failures grouped by kind, and the most recent
 * failure rows. Every query is fail-soft — a missing table (migration not
 * yet run) returns zeros/empty, never a 500.
 */

async function handle_onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pageEvents24h, watchEvents24h, newLeads24h, failuresByKind7d, recentFailures] =
    await Promise.all([
      safeCount(env, "SELECT COUNT(*) AS n FROM page_events WHERE at >= ?", [since24h]),
      safeCount(env, "SELECT COUNT(*) AS n FROM watch_events WHERE at >= ?", [since24h]),
      safeCount(env, "SELECT COUNT(*) AS n FROM leads WHERE applied_at >= ?", [since24h]),
      safeAll(
        env,
        "SELECT kind, COUNT(*) AS n FROM delivery_failures WHERE at >= ? GROUP BY kind",
        [since7d],
      ),
      safeAll(
        env,
        "SELECT client, kind, detail, at FROM delivery_failures ORDER BY at DESC LIMIT 20",
        [],
      ),
    ]);

  const failures_by_kind = {};
  for (const row of failuresByKind7d) {
    if (row?.kind) failures_by_kind[row.kind] = Number(row.n || 0);
  }

  return json({
    ok: true,
    last_24h: {
      page_events: pageEvents24h,
      watch_events: watchEvents24h,
      new_leads: newLeads24h,
    },
    failures_7d: {
      total: Object.values(failures_by_kind).reduce((sum, n) => sum + n, 0),
      by_kind: failures_by_kind,
    },
    recent_failures: recentFailures.map((row) => ({
      client: row.client,
      kind: row.kind,
      detail: row.detail,
      at: row.at,
    })),
  });
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

/** Run a scalar COUNT query; on any error (e.g. missing table) degrade to 0. */
async function safeCount(env, sql, params) {
  try {
    const row = await env.DB.prepare(sql).bind(...params).first();
    return Number(row?.n || 0);
  } catch {
    return 0;
  }
}

/** Run a grouped/list query; on any error (e.g. missing table) degrade to []. */
async function safeAll(env, sql, params) {
  try {
    const result = await env.DB.prepare(sql).bind(...params).all();
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

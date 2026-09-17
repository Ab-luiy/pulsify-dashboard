import { withOperator } from '../_shared/access.js';
import { hasOperator } from '../_shared/access.js';
/**
 * Operator command center API.
 *
 * GET returns one cross-client rollup from a fixed number of grouped queries.
 * POST records the supported view-client audit event. No query runs per client.
 */

const BRAIN_SECTION_COUNT = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

async function handle_onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  let configs = [];
  try {
    const result = await env.DB.prepare(
      `SELECT client, COALESCE(client_name,client) AS client_name
         FROM client_config ORDER BY client_name COLLATE NOCASE`,
    ).all();
    configs = result.results || [];
  } catch {
    configs = [];
  }

  const since7d = new Date(Date.now() - 7 * DAY_MS).toISOString().slice(0, 10);
  const [payments, snapshots, sequences, studio, brain, pageActivity, operatorEvents] = await Promise.all([
    safeAll(
      env,
      `SELECT client,
              SUM(amount_cents) AS total_collected_cents,
              COUNT(*) AS payment_count,
              MIN(currency) AS currency,
              COUNT(DISTINCT currency) AS currency_count,
              MAX(occurred_at) AS last_payment_at
         FROM payments GROUP BY client`,
    ),
    safeAll(
      env,
      `SELECT client_id, followers, taken_on, position
         FROM (
           SELECT client_id, followers, taken_on,
                  ROW_NUMBER() OVER (
                    PARTITION BY client_id ORDER BY taken_on DESC, id DESC
                  ) AS position
             FROM account_snapshots
         ) ranked
        WHERE position <= 2
        ORDER BY client_id, position`,
    ),
    safeAll(
      env,
      `SELECT client_id,
              SUM(CASE WHEN posted_on >= ? THEN 1 ELSE 0 END) AS posted_7d,
              MAX(posted_on) AS last_posted_on
         FROM sequence_log GROUP BY client_id`,
      [since7d],
    ),
    safeAll(
      env,
      `SELECT client_id, MAX(updated_at) AS last_studio_at
         FROM studio_sequences GROUP BY client_id`,
    ),
    safeAll(
      env,
      `SELECT client_id, COUNT(DISTINCT section) AS sections_complete
         FROM client_brain
        WHERE TRIM(COALESCE(value_json,'')) NOT IN ('','null','""','[]','{}')
        GROUP BY client_id`,
    ),
    safeAll(
      env,
      `SELECT client, MAX(at) AS last_page_activity_at
         FROM page_events GROUP BY client`,
    ),
    safeAll(
      env,
      `SELECT id, actor, action, client, detail, created_at
         FROM operator_events ORDER BY created_at DESC LIMIT 30`,
    ),
  ]);

  const paymentMap = toMap(payments, "client");
  const snapshotMap = toSnapshotMap(snapshots);
  const sequenceMap = toMap(sequences, "client_id");
  const studioMap = toMap(studio, "client_id");
  const brainMap = toMap(brain, "client_id");
  const pageMap = toMap(pageActivity, "client");

  const clients = configs.map((config) => {
    const client = config.client;
    const payment = paymentMap.get(client) || {};
    const snapshot = snapshotMap.get(client) || {};
    const content = sequenceMap.get(client) || {};
    const studioActivity = studioMap.get(client) || {};
    const brainRow = brainMap.get(client) || {};
    const page = pageMap.get(client) || {};

    const totalCollectedCents = Number(payment.total_collected_cents || 0);
    const paymentCount = Number(payment.payment_count || 0);
    const latestFollowers = finiteOrNull(snapshot.latest?.followers);
    const priorFollowers = finiteOrNull(snapshot.prior?.followers);
    const followerDelta = latestFollowers != null && priorFollowers != null
      ? latestFollowers - priorFollowers
      : null;
    const posted7d = Number(content.posted_7d || 0);
    const sectionsComplete = Math.min(BRAIN_SECTION_COUNT, Number(brainRow.sections_complete || 0));
    const brainPercent = Math.round((sectionsComplete / BRAIN_SECTION_COUNT) * 100);
    const lastActivityAt = latest([
      payment.last_payment_at,
      content.last_posted_on,
      studioActivity.last_studio_at,
      page.last_page_activity_at,
    ]);
    const hasAnyData = Boolean(
      paymentCount
      || latestFollowers != null
      || posted7d
      || content.last_posted_on
      || studioActivity.last_studio_at
      || sectionsComplete
      || page.last_page_activity_at
    );

    const health = computeHealth({
      hasAnyData,
      brainPercent,
      posted7d,
      lastPostedOn: content.last_posted_on || null,
      followerDelta,
      hasFollowerSnapshot: latestFollowers != null,
      paymentCount,
      lastActivityAt,
    });

    return {
      client,
      client_name: config.client_name || client,
      health,
      collected: {
        total_cents: totalCollectedCents,
        payment_count: paymentCount,
        currency: Number(payment.currency_count || 0) > 1 ? "mixed" : payment.currency || null,
        last_payment_at: payment.last_payment_at || null,
      },
      followers: {
        latest: latestFollowers,
        prior: priorFollowers,
        delta: followerDelta,
        trend: followerTrend(followerDelta),
        latest_taken_on: snapshot.latest?.taken_on || null,
        prior_taken_on: snapshot.prior?.taken_on || null,
      },
      cadence: {
        posted_7d: posted7d,
        last_posted_on: content.last_posted_on || null,
        target_min: 3,
        target_max: 7,
      },
      brain: {
        sections_complete: sectionsComplete,
        total_sections: BRAIN_SECTION_COUNT,
        completeness_percent: brainPercent,
      },
      last_activity_at: lastActivityAt,
    };
  });

  clients.sort((a, b) => {
    const risk = healthRank(a.health.label) - healthRank(b.health.label);
    if (risk) return risk;
    const score = Number(a.health.score ?? 101) - Number(b.health.score ?? 101);
    if (score) return score;
    return String(b.last_activity_at || "").localeCompare(String(a.last_activity_at || ""));
  });

  const totalsByCurrency = {};
  const configuredClients = new Set(configs.map((config) => config.client));
  for (const row of payments) {
    if (!configuredClients.has(row.client)) continue;
    const currency = Number(row.currency_count || 0) > 1 ? "mixed" : row.currency || "unknown";
    totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + Number(row.total_collected_cents || 0);
  }

  const summary = {
    client_count: clients.length,
    at_risk_count: clients.filter((client) => client.health.label === "at-risk").length,
    total_collected_cents: clients.reduce((total, client) => total + client.collected.total_cents, 0),
    total_collected_by_currency: totalsByCurrency,
  };

  return json({ ok: true, summary, clients, operator_activity: operatorEvents.map(normalizeEvent) });
}

async function handle_onRequestPost({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const client = String(body.client || "").trim();
  if (body.action !== "view-client" || !client) {
    return json({ ok: false, error: "action and client are required" }, 400);
  }

  const createdAt = new Date().toISOString();
  const detail = JSON.stringify({ surface: "command-center" });
  try {
    const result = await env.DB.prepare(
      `INSERT INTO operator_events (actor, action, client, detail, created_at)
       VALUES (?, 'view-client', ?, ?, ?)`,
    ).bind("admin", client, detail, createdAt).run();
    return json({
      ok: true,
      event: normalizeEvent({
        id: result.meta?.last_row_id || null,
        actor: "admin",
        action: "view-client",
        client,
        detail,
        created_at: createdAt,
      }),
    }, 201);
  } catch {
    return json({ ok: false, error: "could not record operator event" }, 500);
  }
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

/**
 * Active-client health weights total 100 points:
 * brain completeness 25, 7-day content cadence 25, follower trend 20,
 * payment history 15, and activity recency 15. Untouched clients receive
 * no numeric score and are labelled new / needs onboarding.
 */
function computeHealth(input) {
  if (!input.hasAnyData) {
    return { score: null, label: "new / needs onboarding" };
  }

  const brainPoints = Math.round(25 * clamp(input.brainPercent / 100, 0, 1));
  const cadencePoints = cadenceScore(input.posted7d, input.lastPostedOn);
  const trendPoints = trendScore(input.followerDelta, input.hasFollowerSnapshot);
  const paymentPoints = input.paymentCount > 0 ? 15 : 0;
  const activityPoints = recencyScore(input.lastActivityAt);
  const score = clamp(brainPoints + cadencePoints + trendPoints + paymentPoints + activityPoints, 0, 100);
  const label = score >= 70 ? "healthy" : score >= 45 ? "watch" : "at-risk";
  return { score, label };
}

function cadenceScore(posted7d, lastPostedOn) {
  if (Number(posted7d || 0) >= 3) return 25;
  if (Number(posted7d || 0) === 2) return 17;
  if (Number(posted7d || 0) === 1) return 8;
  const age = ageInDays(lastPostedOn);
  if (age != null && age <= 14) return 4;
  return 0;
}

function trendScore(delta, hasSnapshot) {
  if (!hasSnapshot) return 0;
  if (delta == null || delta === 0) return 10;
  return delta > 0 ? 20 : 4;
}

function recencyScore(value) {
  const age = ageInDays(value);
  if (age == null) return 0;
  if (age <= 7) return 15;
  if (age <= 14) return 10;
  if (age <= 30) return 5;
  return 0;
}

function ageInDays(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / DAY_MS);
}

function followerTrend(delta) {
  if (delta == null) return "unknown";
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

function healthRank(label) {
  return { "at-risk": 0, watch: 1, "new / needs onboarding": 2, healthy: 3 }[label] ?? 4;
}

function normalizeEvent(event) {
  let detail = event.detail ?? null;
  if (typeof detail === "string" && detail) {
    try { detail = JSON.parse(detail); } catch { /* keep legacy text */ }
  }
  return {
    id: event.id ?? null,
    actor: event.actor || "admin",
    action: event.action || "",
    client: event.client || null,
    detail,
    created_at: event.created_at || null,
  };
}

function toSnapshotMap(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row?.client_id) continue;
    const entry = map.get(row.client_id) || {};
    if (Number(row.position) === 1 || !entry.latest) entry.latest = row;
    else if (Number(row.position) === 2 || !entry.prior) entry.prior = row;
    map.set(row.client_id, entry);
  }
  return map;
}

function toMap(rows, key) {
  const map = new Map();
  for (const row of rows) {
    if (row?.[key]) map.set(row[key], row);
  }
  return map;
}

function latest(values) {
  let best = null;
  for (const value of values) {
    if (!value) continue;
    if (!best || String(value) > String(best)) best = value;
  }
  return best;
}

function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function safeAll(env, sql, params = []) {
  try {
    const statement = params.length ? env.DB.prepare(sql).bind(...params) : env.DB.prepare(sql);
    const result = await statement.all();
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
export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestOptions = withOperator(handle_onRequestOptions);

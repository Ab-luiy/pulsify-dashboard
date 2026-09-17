import { withOperator } from '../_shared/access.js';
import { checkAdmin, cleanId, json, nowIso, strOrNull } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

async function handle_onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveScopedAccess(request, env, "", true);
  if (access.error) return access.error;

  const [snapshotRows, paymentRow] = await Promise.all([
    env.DB.prepare(
      `SELECT id, client_id, taken_on, followers, icp_leads, avg_views, notes, created_at
         FROM account_snapshots
        WHERE client_id=?
        ORDER BY taken_on DESC, id DESC
        LIMIT 2`,
    ).bind(access.client).all(),
    env.DB.prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total_cents
         FROM payments
        WHERE client=?`,
    ).bind(access.client).first(),
  ]);

  const rows = (snapshotRows.results || []).map((row) => ({
    id: Number(row.id || 0),
    client_id: row.client_id,
    taken_on: row.taken_on || "",
    followers: Number(row.followers || 0),
    icp_leads: nullableNumber(row.icp_leads),
    avg_views: nullableNumber(row.avg_views),
    notes: row.notes || "",
    created_at: row.created_at || "",
  }));

  const latest = rows[0] || null;
  const prior = rows[1] || null;
  const paymentsTotalCents = Number(paymentRow?.total_cents || 0);

  return json({
    ok: true,
    client: access.client,
    auth_mode: access.auth_mode,
    latest,
    prior,
    report: buildWeeklyReport(latest, prior, paymentsTotalCents),
  });
}

async function handle_onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const access = await resolveScopedAccess(request, env, body.client);
  if (access.error) return access.error;

  const takenOn = normalizeIsoDate(body.taken_on);
  const followers = normalizeInteger(body.followers, 0, 1000000000);
  const icpLeads = normalizeNullableInteger(body.icp_leads);
  const avgViews = normalizeNullableInteger(body.avg_views);
  const notes = strOrNull(body.notes);

  if (!takenOn) return json({ ok: false, error: "taken_on must be an ISO date (YYYY-MM-DD)" }, 422);
  if (followers == null) return json({ ok: false, error: "followers must be a non-negative integer" }, 422);

  const result = await env.DB.prepare(
    `INSERT INTO account_snapshots (
       client_id, taken_on, followers, icp_leads, avg_views, notes, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    access.client,
    takenOn,
    followers,
    icpLeads,
    avgViews,
    notes,
    nowIso(),
  ).run();

  return json({ ok: true, id: Number(result.meta?.last_row_id || 0), created: true });
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

async function resolveScopedAccess(request, env, bodyClient = "", allowImpersonated = false) {
  const adminError = checkAdmin(request, env);
  if (!adminError) {
    const url = new URL(request.url);
    const client = cleanId(bodyClient || url.searchParams.get("client"), "");
    if (!client) return { error: json({ ok: false, error: "client is required for admin requests" }, 422) };
    return { client, auth_mode: "admin" };
  }
  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: true,
    allowImpersonated,
  });
  if (access.error) return { error: access.error };
  return { client: cleanId(access.client), auth_mode: access.auth_mode };
}

function buildWeeklyReport(latest, prior, paymentsTotalCents) {
  const latestFollowers = Number(latest?.followers || 0);
  return {
    followers: deltaMetric(latest?.followers, prior?.followers, "Log two follower snapshots one week apart."),
    icp_leads: deltaMetric(latest?.icp_leads, prior?.icp_leads, "Log ICP leads on both snapshots to see the weekly change."),
    follower_to_view_ratio: ratioMetric(latest?.avg_views, latest?.followers, "Log average views and followers on the latest snapshot."),
    dollars_per_follower: ratioMetric(paymentsTotalCents, latestFollowers, "Record at least one follower snapshot before reading dollars per follower.", 100),
    payments_total_cents: paymentsTotalCents,
    latest_taken_on: latest?.taken_on || null,
    prior_taken_on: prior?.taken_on || null,
  };
}

function deltaMetric(latestValue, priorValue, hint) {
  if (latestValue == null) {
    return { value: null, delta: null, hint };
  }
  if (priorValue == null) {
    return { value: Number(latestValue), delta: null, hint };
  }
  return {
    value: Number(latestValue),
    delta: Number(latestValue) - Number(priorValue),
    hint: null,
  };
}

function ratioMetric(numerator, denominator, hint, divisor = 1) {
  if (numerator == null || denominator == null || Number(denominator) <= 0) {
    return { value: null, hint };
  }
  return {
    value: round2(Number(numerator) / Number(denominator) / divisor),
    hint: null,
  };
}

function normalizeIsoDate(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function normalizeInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function normalizeNullableInteger(value) {
  if (value == null || value === "") return null;
  return normalizeInteger(value, 0, 1000000000);
}

function nullableNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestOptions = withOperator(handle_onRequestOptions);

import { withOperator } from '../_shared/access.js';
import { checkAdmin, cleanId, json, nowIso, strOrNull } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const ALLOWED_TYPES = new Set([
  "value-driven",
  "credibility",
  "q&a",
  "day-in-the-life",
  "breakdown",
  "lifestyle",
  "cta",
  "start-here",
  "story launch",
]);

const CADENCE_FLOOR = 3;
const CADENCE_TARGET_MIN = 5;
const CADENCE_TARGET_MAX = 7;

async function handle_onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveScopedAccess(request, env, "", true);
  if (access.error) return access.error;

  const url = new URL(request.url);
  const days = clampDays(url.searchParams.get("days"));
  const since = isoDateDaysAgo(days - 1);
  const rows = await env.DB.prepare(
    `SELECT id, client_id, posted_on, type, topic, slide_count, slide_views_json,
            dms, profile_visits, notes, created_at, updated_at
       FROM sequence_log
      WHERE client_id=? AND posted_on>=?
      ORDER BY posted_on DESC, id DESC`,
  ).bind(access.client, since).all();

  const serializedRows = (rows.results || []).map(serializeSequenceRow);
  const weekSummary = buildWeekSummary(serializedRows);

  return json({
    ok: true,
    client: access.client,
    auth_mode: access.auth_mode,
    days,
    rows: serializedRows,
    week_summary: weekSummary,
  });
}

async function handle_onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const access = await resolveScopedAccess(request, env, body.client);
  if (access.error) return access.error;

  const id = Number(body.id || 0) || null;
  const postedOn = normalizeIsoDate(body.posted_on);
  const type = normalizeType(body.type);
  const topic = String(body.topic || "").trim();
  const slideCount = normalizePositiveInteger(body.slide_count, 1, 30);
  const slideViews = normalizeSlideViews(body.slide_views, slideCount);
  const dms = normalizeNullableInteger(body.dms);
  const profileVisits = normalizeNullableInteger(body.profile_visits);
  const notes = strOrNull(body.notes);

  if (!postedOn) return json({ ok: false, error: "posted_on must be an ISO date (YYYY-MM-DD)" }, 422);
  if (!type) return json({ ok: false, error: "valid sequence type is required" }, 422);
  if (!topic) return json({ ok: false, error: "topic is required" }, 422);
  if (slideCount == null) return json({ ok: false, error: "slide_count must be between 1 and 30" }, 422);
  if (!slideViews) {
    return json({ ok: false, error: "slide_views must be an array of non-negative integers, and its length cannot exceed slide_count" }, 422);
  }

  const timestamp = nowIso();
  if (id) {
    const existing = await env.DB.prepare(
      "SELECT id, client_id FROM sequence_log WHERE id=?",
    ).bind(id).first();
    if (!existing || cleanId(existing.client_id) !== access.client) {
      return json({ ok: false, error: "sequence log not found" }, 404);
    }
    await env.DB.prepare(
      `UPDATE sequence_log
          SET posted_on=?, type=?, topic=?, slide_count=?, slide_views_json=?,
              dms=?, profile_visits=?, notes=?, updated_at=?
        WHERE id=?`,
    ).bind(
      postedOn,
      type,
      topic,
      slideCount,
      JSON.stringify(slideViews),
      dms,
      profileVisits,
      notes,
      timestamp,
      id,
    ).run();
    return json({ ok: true, id, updated: true });
  }

  const result = await env.DB.prepare(
    `INSERT INTO sequence_log (
       client_id, posted_on, type, topic, slide_count, slide_views_json,
       dms, profile_visits, notes, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    access.client,
    postedOn,
    type,
    topic,
    slideCount,
    JSON.stringify(slideViews),
    dms,
    profileVisits,
    notes,
    timestamp,
    timestamp,
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

function serializeSequenceRow(row) {
  const slideViews = parseSlideViews(row.slide_views_json, Number(row.slide_count || 0));
  const metrics = computeSequenceMetrics(slideViews);
  return {
    id: Number(row.id || 0),
    client_id: row.client_id,
    posted_on: row.posted_on || "",
    type: row.type || "",
    topic: row.topic || "",
    slide_count: Number(row.slide_count || slideViews.length || 0),
    slide_views: slideViews,
    dms: normalizeNullableInteger(row.dms),
    profile_visits: normalizeNullableInteger(row.profile_visits),
    notes: row.notes || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
    completion_pct: metrics.completionPct,
    dropoff_pct: metrics.dropoffPct,
    biggest_drop_slide: metrics.biggestDropSlide,
    diagnostic: metrics.diagnostic,
  };
}

function computeSequenceMetrics(slideViews) {
  const views = Array.isArray(slideViews) ? slideViews.filter((value) => Number.isFinite(value)) : [];
  const first = Number(views[0] || 0);
  const last = Number(views[views.length - 1] || 0);
  const completionPct = first > 0 ? round1((last / first) * 100) : null;
  const dropoffPct = completionPct == null ? null : round1(Math.max(0, 100 - completionPct));

  let biggestDrop = 0;
  let biggestDropSlide = null;
  for (let index = 1; index < views.length; index += 1) {
    const prior = Number(views[index - 1] || 0);
    const current = Number(views[index] || 0);
    const drop = prior - current;
    if (drop > biggestDrop) {
      biggestDrop = drop;
      biggestDropSlide = index + 1;
    }
  }

  let diagnostic = "monitor";
  if (completionPct != null && completionPct >= 70) diagnostic = "healthy";
  else if (biggestDropSlide === 2) diagnostic = "hook failed";
  else if (biggestDropSlide != null && biggestDropSlide >= 6 && biggestDropSlide <= 8) diagnostic = "body failed before the ask";

  return { completionPct, dropoffPct, biggestDropSlide, diagnostic };
}

function buildWeekSummary(rows) {
  const now = new Date();
  const currentWeekStart = startOfUtcWeek(now);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const priorWeekStart = addDays(currentWeekStart, -7);
  const priorWeekEnd = currentWeekStart;

  const currentWeekRows = rows.filter((row) => row.posted_on >= currentWeekStart && row.posted_on < nextWeekStart);
  const priorWeekRows = rows.filter((row) => row.posted_on >= priorWeekStart && row.posted_on < priorWeekEnd);

  return {
    current_week_start: currentWeekStart,
    prior_week_start: priorWeekStart,
    sequences_this_week: currentWeekRows.length,
    sequences_last_week: priorWeekRows.length,
    cadence_floor: CADENCE_FLOOR,
    cadence_target_min: CADENCE_TARGET_MIN,
    cadence_target_max: CADENCE_TARGET_MAX,
    cadence_status: cadenceStatus(currentWeekRows.length),
    type_mix_current_week: countTypeMix(currentWeekRows),
    type_mix_prior_week: countTypeMix(priorWeekRows),
  };
}

function cadenceStatus(count) {
  if (count >= CADENCE_TARGET_MIN && count <= CADENCE_TARGET_MAX) return "target hit";
  if (count > CADENCE_TARGET_MAX) return "above target";
  if (count >= CADENCE_FLOOR) return "floor hit";
  return "below floor";
}

function countTypeMix(rows) {
  const counts = {};
  for (const row of rows) {
    const key = normalizeType(row.type) || "unknown";
    counts[key] = Number(counts[key] || 0) + 1;
  }
  return counts;
}

function parseSlideViews(value, slideCount) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeNullableInteger(item))
      .filter((item) => item != null)
      .slice(0, Math.max(0, slideCount || parsed.length));
  } catch {
    return [];
  }
}

function normalizeSlideViews(value, slideCount) {
  if (!Array.isArray(value) || !slideCount) return null;
  if (value.length === 0 || value.length > slideCount) return null;
  const normalized = [];
  for (const item of value) {
    const number = normalizePositiveInteger(item, 0, 1000000000);
    if (number == null) return null;
    normalized.push(number);
  }
  return normalized;
}

function normalizeType(value) {
  const type = String(value || "").trim().toLowerCase();
  return ALLOWED_TYPES.has(type) ? type : "";
}

function normalizeIsoDate(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function normalizeNullableInteger(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number);
}

function normalizePositiveInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function clampDays(value) {
  // No ?days= means the default window. Number(null) is 0, which used to clamp to one day, so every screen
  // (none pass days) only ever saw today's sequences.
  if (value == null || value === "") return 60;
  const number = Number(value);
  if (!Number.isFinite(number)) return 60;
  return Math.max(1, Math.min(365, Math.round(number)));
}

function isoDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - Math.max(0, daysAgo));
  return date.toISOString().slice(0, 10);
}

function startOfUtcWeek(date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy.toISOString().slice(0, 10);
}

function addDays(isoDate, deltaDays) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestOptions = withOperator(handle_onRequestOptions);

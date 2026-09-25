import { composioExecute, findRows } from "../composio.js";
import { insertMetric, upsertSnapshot } from "../db.js";
import { zernioConfigured, zernioConnection, zernioFetch } from "../../../../functions/_shared/zernio.js";

const ACCOUNT_METRICS = ["reach", "views", "follower_count", "accounts_engaged", "total_interactions", "profile_links_taps"];

export async function syncInstagram(env) {
  const capturedAt = new Date().toISOString();
  const rawProfile = await composioExecute(env, "INSTAGRAM_GET_USER_INFO", { ig_user_id: "me" });
  const profile = normalizeProfile(rawProfile);
  const insightsPayload = await composioExecute(env, "INSTAGRAM_GET_USER_INSIGHTS", {
    metric: ACCOUNT_METRICS,
    period: "day",
    metric_type: "time_series",
    since: Math.floor((Date.now() - 30 * 86400000) / 1000),
    until: Math.floor(Date.now() / 1000),
  }).catch(() => ({}));
  const account = normalizeInsights(insightsPayload);
  // The posts call failed every day from 2026-09-19 (404) and, being first to
  // throw, stopped the profile, follower and insight saves too. It is now
  // non-fatal: everything else saves, the last good media snapshot is kept, and
  // the run is still marked failed with the real reason.
  let mediaError = null;
  const mediaPayload = await composioExecute(env, "INSTAGRAM_GET_IG_USER_MEDIA", {
    ig_user_id: "me",
    fields: "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp",
    since: Math.floor((Date.now() - 90 * 86400000) / 1000),
    limit: 100,
  }).catch((error) => {
    mediaError = error;
    return null;
  });
  const media = mediaPayload ? findRows(mediaPayload) : [];
  const storiesPayload = await composioExecute(env, "INSTAGRAM_GET_IG_USER_STORIES", {
    ig_user_id: "me",
  }).catch(() => ({}));
  const stories = findRows(storiesPayload);

  await Promise.all([
    upsertSnapshot(env, { source: "instagram", kind: "profile", capturedAt, payload: profile }),
    upsertSnapshot(env, { source: "instagram", kind: "account", capturedAt, payload: account }),
    ...(mediaError ? [] : [upsertSnapshot(env, { source: "instagram", kind: "media", capturedAt, payload: media })]),
    insertMetric(env, { source: "instagram", metric: "followers", ts: capturedAt, value: profile.followers }),
    insertMetric(env, { source: "instagram", metric: "media_count", ts: capturedAt, value: profile.mediaCount }),
  ]);
  for (const [metric, data] of Object.entries(account)) {
    if (!data || typeof data !== "object" || !Array.isArray(data.points)) continue;
    for (const point of data.points) {
      await insertMetric(env, {
        source: "instagram",
        metric,
        ts: point.end_time || capturedAt,
        value: Number(point.value || 0),
      });
    }
  }
  // 30-day account totals. Instagram only reports views as a total, so the
  // time-series call above returns nothing for it; Zernio's insights do.
  if (zernioConfigured(env)) {
    try {
      const connection = await zernioConnection(env);
      if (connection.connected && connection.account_id) {
        const insights = await zernioFetch(env, `/v1/analytics/instagram/account-insights?accountId=${encodeURIComponent(connection.account_id)}`);
        const totals = insights?.metrics || {};
        for (const [name, metric] of [["reach", "reach_30d"], ["views", "views_30d"], ["accounts_engaged", "accounts_engaged_30d"], ["total_interactions", "interactions_30d"]]) {
          const value = Number(totals[name]?.total);
          if (Number.isFinite(value)) await insertMetric(env, { source: "instagram", metric, ts: capturedAt, value });
        }
      }
    } catch { /* insights are an extra; the rest of the sync stands */ }
  }
  for (const story of stories) {
    const id = String(story.id || "");
    if (!id) continue;
    await env.DB.prepare(
      `INSERT INTO stories(scope,client_id,media_id,captured_at,payload_json)
       VALUES('operator','',?,?,?)
       ON CONFLICT(media_id) DO UPDATE SET
         captured_at=excluded.captured_at,payload_json=excluded.payload_json`,
    ).bind(id, capturedAt, JSON.stringify({ ...story, capturedAt })).run();
  }
  if (mediaError) throw new Error(`Profile, followers and insights saved; posts failed: ${mediaError.message}`);
  return 3 + stories.length;
}

function normalizeProfile(value) {
  const data = value?.data && !Array.isArray(value.data) ? value.data : value;
  return {
    id: String(data?.id || ""),
    username: String(data?.username || ""),
    name: String(data?.name || data?.username || ""),
    biography: String(data?.biography || ""),
    website: String(data?.website || ""),
    accountType: String(data?.account_type || ""),
    followers: Number(data?.followers_count || 0),
    following: Number(data?.follows_count || 0),
    mediaCount: Number(data?.media_count || 0),
    profilePicture: String(data?.profile_picture_url || ""),
  };
}

function normalizeInsights(value) {
  const result = {};
  for (const row of findRows(value)) {
    const name = String(row.name || "");
    if (!name) continue;
    const points = Array.isArray(row.values) ? row.values : [];
    result[name] = {
      points,
      total: points.reduce((sum, point) => sum + Number(point?.value || 0), 0),
    };
  }
  return result;
}

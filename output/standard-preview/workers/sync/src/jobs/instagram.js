import { insertMetric, upsertSnapshot } from "../db.js";
import { zernioConfigured, zernioConnection, zernioFetch } from "../../../../functions/_shared/zernio.js";

// Daily Instagram sync, served by Zernio (the account that already runs the
// inbox). The Composio connection for user "owner" is gone ("No connected
// account found", 404, every run since 2026-10-04), and before that its posts
// tool slug had been removed and the Meta token had expired, so the job could
// not be repaired on Composio without the founder re-doing the Meta login.
export async function syncInstagram(env) {
  const capturedAt = new Date().toISOString();
  if (!zernioConfigured(env)) throw new Error("ZERNIO_API_KEY is not set");
  const connection = await zernioConnection(env);
  if (!connection.connected || !connection.account_id) throw new Error("Instagram is not connected in Zernio (Integrations)");
  const accountId = connection.account_id;
  const id = encodeURIComponent(accountId);

  const accounts = await zernioFetch(env, "/v1/accounts?platform=instagram&page=1&limit=50");
  const account = (accounts.accounts || []).find((a) => a._id === accountId);
  if (!account) throw new Error(`Zernio has no Instagram account ${accountId}`);
  if (account.needsReconnection) throw new Error("Zernio says Instagram needs reconnecting (token expired)");

  const posts = await fetchPosts(env, accountId);
  const feed = posts.filter((post) => post.mediaProductType !== "STORY").map(toMedia);
  const stories = posts.filter((post) => post.mediaProductType === "STORY").map(toMedia);
  const profile = {
    id: String(accountId),
    username: String(account.username || ""),
    name: String(account.displayName || account.username || ""),
    biography: "",
    website: "",
    accountType: "",
    followers: Number(account.followersCount || 0),
    following: 0,
    mediaCount: feed.length,
    profilePicture: String(account.profilePicture || ""),
  };

  // Account insights: reach as a daily series, the rest as 30-day totals (the
  // only form Instagram serves them in). The old shape {metric:{points,total}}
  // is kept so readers of the account snapshot do not change.
  let insightsError = null;
  const insights = {};
  const series = await zernioFetch(env, `/v1/analytics/instagram/account-insights?accountId=${id}&metrics=reach&metricType=time_series`).catch((error) => { insightsError = error; return null; });
  for (const [name, data] of Object.entries(series?.metrics || {})) {
    insights[name] = { points: (data.values || []).map((v) => ({ end_time: v.date, value: Number(v.value || 0) })), total: Number(data.total || 0) };
  }
  const totals = await zernioFetch(env, `/v1/analytics/instagram/account-insights?accountId=${id}&metrics=views,accounts_engaged,total_interactions,profile_links_taps`).catch((error) => { insightsError = insightsError || error; return null; });
  for (const [name, data] of Object.entries(totals?.metrics || {})) insights[name] = { points: [], total: Number(data.total || 0) };

  await Promise.all([
    upsertSnapshot(env, { source: "instagram", kind: "profile", capturedAt, payload: profile }),
    upsertSnapshot(env, { source: "instagram", kind: "account", capturedAt, payload: insights }),
    upsertSnapshot(env, { source: "instagram", kind: "media", capturedAt, payload: feed }),
    insertMetric(env, { source: "instagram", metric: "followers", ts: capturedAt, value: profile.followers }),
    insertMetric(env, { source: "instagram", metric: "media_count", ts: capturedAt, value: profile.mediaCount }),
  ]);
  for (const point of insights.reach?.points || []) {
    await insertMetric(env, { source: "instagram", metric: "reach", ts: point.end_time || capturedAt, value: point.value });
  }
  for (const [name, metric] of [["reach", "reach_30d"], ["views", "views_30d"], ["accounts_engaged", "accounts_engaged_30d"], ["total_interactions", "interactions_30d"]]) {
    const value = insights[name]?.total;
    if (Number.isFinite(value) && insights[name]) await insertMetric(env, { source: "instagram", metric, ts: capturedAt, value });
  }
  for (const story of stories) {
    if (!story.id) continue;
    await env.DB.prepare(
      `INSERT INTO stories(scope,client_id,media_id,captured_at,payload_json)
       VALUES('operator','',?,?,?)
       ON CONFLICT(media_id) DO UPDATE SET
         captured_at=excluded.captured_at,payload_json=excluded.payload_json`,
    ).bind(story.id, capturedAt, JSON.stringify({ ...story, capturedAt })).run();
  }
  if (insightsError) throw new Error(`Profile, followers and posts saved; insights failed: ${insightsError.message}`);
  return 3 + stories.length;
}

// Last 90 days of posts with their metrics, newest first. Zernio pages at 50.
async function fetchPosts(env, accountId) {
  const rows = [];
  for (let page = 1; page <= 4; page += 1) {
    const result = await zernioFetch(env, `/v1/analytics?platform=instagram&accountId=${encodeURIComponent(accountId)}&limit=50&page=${page}&sortBy=date&order=desc`);
    const batch = Array.isArray(result.posts) ? result.posts : [];
    rows.push(...batch);
    if (batch.length < 50) break;
  }
  return rows;
}

// Zernio post -> the Graph-style row the readers (instagram-image.js, the
// Instagram tab) already expect, plus the metrics Zernio returns.
function toMedia(post) {
  const type = String(post.mediaType || "").toLowerCase();
  const a = post.analytics || {};
  return {
    id: String(post.platformPostId || post.postId || ""),
    caption: String(post.content || ""),
    media_type: type === "video" ? "VIDEO" : type === "carousel" ? "CAROUSEL_ALBUM" : "IMAGE",
    media_product_type: String(post.mediaProductType || ""),
    permalink: String(post.platformPostUrl || ""),
    thumbnail_url: String(post.thumbnailUrl || ""),
    timestamp: String(post.publishedAt || ""),
    metrics: {
      views: Number(a.views || 0), reach: Number(a.reach || 0), likes: Number(a.likes || 0), comments: Number(a.comments || 0),
      shares: Number(a.shares || 0), saves: Number(a.saves || 0), follows: Number(a.follows || 0), engagementRate: Number(a.engagementRate || 0),
    },
  };
}


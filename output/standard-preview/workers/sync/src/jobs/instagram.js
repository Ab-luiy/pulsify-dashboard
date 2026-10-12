import { insertMetricStatement, upsertSnapshotStatement } from "../db.js";
import { zernioConfigured, zernioConnection, zernioFetch } from "../../../../functions/_shared/zernio.js";

// Daily Instagram sync, served by Zernio (the account that already runs the
// inbox). The Composio connection for user "owner" is gone ("No connected
// account found", 404, every run since 2026-10-04), and before that its posts
// tool slug had been removed and the Meta token had expired, so the job could
// not be repaired on Composio without the founder re-doing the Meta login.
export async function syncInstagram(env) {
  if (!zernioConfigured(env)) throw new Error("ZERNIO_API_KEY is not set");
  const connection = await zernioConnection(env);
  if (!connection.connected || !connection.account_id) throw new Error("Instagram is not connected in Zernio (Integrations)");
  return syncInstagramAccount(env, { scope: "operator", clientId: "", accountId: connection.account_id });
}

// Clients who connected their own Instagram (api/client-connect.js): one client per run, the one whose
// numbers are oldest, each at most every 20 hours. Runs on the 30-minute cron.
const CLIENT_RESYNC_MS = 20 * 3600000;
export async function syncClientInstagram(env, now = Date.now()) {
  if (!zernioConfigured(env)) return 0;
  const due = await env.DB.prepare(
    `SELECT i.client_id AS client_id, json_extract(i.config_json, '$.account_id') AS account_id,
            (SELECT s.captured_at FROM snapshots s WHERE s.scope='client' AND s.client_id=i.client_id AND s.source='instagram' AND s.kind='profile') AS last
       FROM integrations i
       LEFT JOIN client_config c ON c.client = i.client_id
      WHERE i.scope='client' AND i.provider='instagram'
        AND COALESCE(json_extract(i.config_json, '$.account_id'), '') <> ''
        AND COALESCE(c.status, '') NOT IN ('archived')
      ORDER BY COALESCE(last, '') LIMIT 1`,
  ).first();
  if (!due || (due.last && now - Date.parse(due.last) < CLIENT_RESYNC_MS)) return 0;
  return syncInstagramAccount(env, { scope: "client", clientId: due.client_id, accountId: due.account_id });
}

export async function syncInstagramAccount(env, { scope, clientId, accountId }) {
  const capturedAt = new Date().toISOString();
  const id = encodeURIComponent(accountId);

  const accounts = await zernioFetch(env, `/v1/accounts?platform=instagram&search=${id}`);
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

  // Who follows: top countries and age bands (Meta needs 100+ followers; empty otherwise).
  const audience = await fetchAudience(env, id).catch(() => null);
  // Stories live for 24 hours and the daily run sees the ones still up. Stories from
  // the last 3 days are checked again: once expired, insights return final numbers.
  const active = await zernioFetch(env, `/v1/accounts/${id}/instagram/stories`).catch(() => null);
  for (const row of Array.isArray(active?.data) ? active.data : []) {
    if (!row.id || stories.some((story) => story.id === String(row.id))) continue;
    stories.push({
      id: String(row.id), caption: "", media_type: String(row.mediaType || "IMAGE"), media_product_type: "STORY",
      permalink: String(row.permalink || ""), thumbnail_url: String(row.thumbnailUrl || row.mediaUrl || ""), timestamp: String(row.timestamp || ""),
    });
  }
  const recent = await env.DB.prepare(
    "SELECT payload_json FROM stories WHERE scope=? AND client_id=? AND captured_at >= ? ORDER BY captured_at DESC LIMIT 20",
  ).bind(scope, clientId, new Date(Date.parse(capturedAt) - 3 * DAY_MS).toISOString()).all();
  for (const row of recent.results || []) {
    let saved = null;
    try { saved = JSON.parse(row.payload_json); } catch { /* skip a bad row */ }
    if (saved?.id && !stories.some((story) => story.id === saved.id)) stories.push(saved);
  }
  for (const story of stories.slice(0, MAX_STORY_INSIGHTS)) {
    const result = await zernioFetch(env, `/v1/accounts/${id}/instagram/stories/${encodeURIComponent(story.id)}/insights`).catch(() => null);
    const metrics = result?.data?.source !== "unavailable" ? result?.data?.metrics : null;
    if (metrics) {
      story.insights = {
        reach: num(metrics.reach), views: num(metrics.views), replies: num(metrics.replies), navigation: num(metrics.navigation),
        profileVisits: num(metrics.profileVisits), follows: num(metrics.follows),
      };
    }
  }

  // Every write goes in one batch: the free plan allows 50 database calls per run.
  const snapshot = (kind, payload) => upsertSnapshotStatement(env, { scope, clientId, source: "instagram", kind, capturedAt, payload });
  const metric = (name, ts, value) => insertMetricStatement(env, { scope, clientId, source: "instagram", metric: name, ts, value });
  const statements = [
    snapshot("profile", profile),
    snapshot("account", insights),
    snapshot("media", feed),
    metric("followers", capturedAt, profile.followers),
    metric("media_count", capturedAt, profile.mediaCount),
    ...(insights.reach?.points || []).map((point) => metric("reach", point.end_time || capturedAt, point.value)),
  ];
  for (const [name, key] of [["reach", "reach_30d"], ["views", "views_30d"], ["accounts_engaged", "accounts_engaged_30d"], ["total_interactions", "interactions_30d"]]) {
    const value = insights[name]?.total;
    if (Number.isFinite(value) && insights[name]) statements.push(metric(key, capturedAt, value));
  }
  for (const story of stories) {
    if (!story.id) continue;
    statements.push(env.DB.prepare(
      `INSERT INTO stories(scope,client_id,media_id,captured_at,payload_json)
       VALUES(?,?,?,?,?)
       ON CONFLICT(media_id) DO UPDATE SET
         captured_at=excluded.captured_at,payload_json=excluded.payload_json`,
    ).bind(scope, clientId, story.id, story.capturedAt || capturedAt, JSON.stringify({ ...story, capturedAt: story.capturedAt || capturedAt })));
  }
  await env.DB.batch(statements);

  // The breakdowns the Instagram tab shows, rebuilt from this pull on every run.
  const storyRows = await env.DB.prepare(
    "SELECT payload_json FROM stories WHERE scope=? AND client_id=? ORDER BY captured_at DESC LIMIT 60",
  ).bind(scope, clientId).all();
  const savedStories = (storyRows.results || []).map((r) => { try { return JSON.parse(r.payload_json); } catch { return null; } }).filter(Boolean);
  const views = summarize(feed, savedStories, Date.parse(capturedAt));
  await env.DB.batch([
    snapshot("reels", views.reels),
    snapshot("posts", views.posts),
    snapshot("stories", views.stories),
    snapshot("content", views.content),
    snapshot("reels-summary", views.reelsSummary),
    snapshot("posts-summary", views.postsSummary),
    snapshot("stories-summary", views.storiesSummary),
    snapshot("cadence", views.cadence),
    ...(audience ? [snapshot("audience", audience)] : []),
  ]);
  if (insightsError) throw new Error(`Profile, followers and posts saved; insights failed: ${insightsError.message}`);
  return 3 + stories.length;
}

const MAX_STORY_INSIGHTS = 10;
const DAY_MS = 86400000;
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

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
    // The list rows carry no platform id, so the permalink shortcode (stable, unique) is the fallback.
    id: String(post.platformPostId || post.postId || post._id || post.id || /instagram\.com\/(?:p|reel|reels|tv)\/([^/?#]+)/.exec(post.platformPostUrl || "")?.[1] || ""),
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
    // The names the Instagram tab reads (the Graph API shape it was built on).
    insights: {
      reach: num(a.reach), views: num(a.views), likes: num(a.likes), comments: num(a.comments), shares: num(a.shares), saved: num(a.saves),
      totalInteractions: num(a.likes) + num(a.comments) + num(a.shares) + num(a.saves),
      avgWatchTimeMs: num(a.igReelsAvgWatchTime), profileVisits: num(a.profileViews), follows: num(a.follows),
    },
  };
}

const isReel = (item) => item.media_product_type === "REELS" || item.media_type === "VIDEO";
const rate = (part, whole) => (whole > 0 ? part / whole : 0);
const sumOf = (rows, pick) => rows.reduce((total, row) => total + pick(row), 0);
const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const normalizer = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (value) => (max > min ? (value - min) / (max - min) : 0);
};

// Hook score ranks each reel against your own last 90 days; it is not an absolute
// grade. Watch time 40%, save rate 25%, share rate 20%, engagement rate 15%, each
// scaled across the set (the same blend the old ig-report tool used).
export function scoreReels(reels) {
  if (!reels.length) return [];
  const watch = normalizer(reels.map((r) => r.insights.avgWatchTimeMs));
  const save = normalizer(reels.map((r) => rate(r.insights.saved, r.insights.reach)));
  const share = normalizer(reels.map((r) => rate(r.insights.shares, r.insights.reach)));
  const engage = normalizer(reels.map((r) => rate(r.insights.totalInteractions, r.insights.reach)));
  const medianReach = median(reels.map((r) => r.insights.reach));
  const scored = reels.map((reel) => {
    const { reach, saved, shares, totalInteractions, avgWatchTimeMs } = reel.insights;
    const hookScore = Math.round(100 * (0.4 * watch(avgWatchTimeMs) + 0.25 * save(rate(saved, reach)) + 0.2 * share(rate(shares, reach)) + 0.15 * engage(rate(totalInteractions, reach))));
    return {
      ...reel, saveRate: rate(saved, reach), shareRate: rate(shares, reach), engagementRate: rate(totalInteractions, reach),
      hookScore, diagnosis: diagnose(reel, hookScore, medianReach),
    };
  });
  scored.sort((x, y) => y.hookScore - x.hookScore);
  return scored.map((reel, index) => ({ ...reel, rank: index + 1 }));
}

function diagnose(reel, hookScore, medianReach) {
  const { reach, shares, saved } = reel.insights;
  const lowReach = reach < medianReach;
  if (hookScore >= 70 && lowReach) return "Strong hook, but Instagram didn't push it. Repost or remix it.";
  if (hookScore < 40 && !lowReach) return "Instagram pushed it, but people didn't stay. Sharpen the first 3 seconds.";
  if (rate(saved, reach) >= 0.02) return "High save rate. Make a follow-up or turn it into a series.";
  if (rate(shares, reach) >= 0.01) return "People share this one. Use the format or topic again.";
  if (hookScore >= 70) return "Top performer. Repeat what worked.";
  return "Middle of the pack. Test a different hook or opening visual.";
}

// Reels, posts and stories with their totals, plus the last 7 days' posting cadence.
export function summarize(feed, stories, now) {
  const at = (item) => Date.parse(item.timestamp || "") || 0;
  const since90 = now - 90 * DAY_MS;
  const since7 = now - 7 * DAY_MS;
  const reels = scoreReels(feed.filter((item) => isReel(item) && at(item) >= since90));
  const posts = feed.filter((item) => !isReel(item) && at(item) >= since90);
  const recentStories = stories.filter((story) => at(story) >= now - 30 * DAY_MS);
  const ri = (pick) => sumOf(reels, (r) => pick(r.insights));
  const pi = (pick) => sumOf(posts, (r) => pick(r.insights));
  const si = (key) => sumOf(recentStories, (r) => num(r.insights?.[key]));
  const n = reels.length;
  const watched = reels.filter((r) => r.insights.avgWatchTimeMs > 0);
  const content = {
    reelsCount: n,
    totalReach: ri((x) => x.reach), totalViews: ri((x) => x.views), totalInteractions: ri((x) => x.totalInteractions),
    totalSaves: ri((x) => x.saved), totalShares: ri((x) => x.shares),
    avgReach: n ? Math.round(ri((x) => x.reach) / n) : 0,
    avgViews: n ? Math.round(ri((x) => x.views) / n) : 0,
    avgWatchMs: watched.length ? Math.round(sumOf(watched, (r) => r.insights.avgWatchTimeMs) / watched.length) : null,
    avgHook: n ? Math.round(sumOf(reels, (r) => r.hookScore) / n) : null,
    reachByPost: [...reels].sort((x, y) => at(x) - at(y)).map((r) => ({ date: r.timestamp, reach: r.insights.reach, views: r.insights.views, hook: r.hookScore, caption: String(r.caption || "").slice(0, 80) })),
  };
  return {
    reels, posts, stories: recentStories, content,
    reelsSummary: { count: n, avgHook: content.avgHook, topReelId: reels[0]?.id || null },
    postsSummary: {
      count: posts.length, totalReach: pi((x) => x.reach), totalSaves: pi((x) => x.saved), totalShares: pi((x) => x.shares),
      totalInteractions: pi((x) => x.totalInteractions), avgReach: posts.length ? Math.round(pi((x) => x.reach) / posts.length) : 0,
      avgSaveRate: rate(pi((x) => x.saved), pi((x) => x.reach)),
    },
    storiesSummary: {
      count: recentStories.length, totalReach: si("reach"), totalReplies: si("replies"), totalProfileVisits: si("profileVisits"),
      totalNavigation: si("navigation"), avgReach: recentStories.length ? Math.round(si("reach") / recentStories.length) : 0,
    },
    cadence: {
      reels7d: feed.filter((item) => isReel(item) && at(item) >= since7).length,
      posts7d: feed.filter((item) => !isReel(item) && at(item) >= since7).length,
      stories7d: stories.filter((story) => at(story) >= since7).length,
    },
  };
}

// Top countries and age bands of followers, in the {name, value} rows the tab reads.
async function fetchAudience(env, id) {
  const result = await zernioFetch(env, `/v1/analytics/instagram/demographics?accountId=${id}&metric=follower_demographics&breakdown=age,country`);
  const rows = (items) => (Array.isArray(items) ? items : []).map((x) => ({ name: String(x.dimension || ""), value: num(x.value) })).filter((x) => x.name);
  const audience = { countries: rows(result?.demographics?.country), age: rows(result?.demographics?.age) };
  return audience.countries.length || audience.age.length ? audience : null;
}



// The 7-fig packaging library's videos (founder 2026-10-13/15: "videos with 100x outliers from specific niches, from a
// variety of niches", measured the way vidIQ does: how far a video beats its own channel's normal).
//
// Outlier score = the video's views divided by the MEDIAN views of its channel's last 30 long-form uploads
// (the median, not the average, so one viral video cannot set the bar). Shown from 10x, badged at 100x.
// vidIQ does not publish its exact formula; this is the documented idea in plain arithmetic.
//
// How the data is gathered, cheaply (the free YouTube quota is 10,000 units a day; a search costs 100, a list costs 1):
//   - once a week per niche, up to three searches find channels that make big videos in it (outlier_channels);
//   - every run, the channels checked longest ago are read through their uploads playlist (about 2 units each);
//   - their outliers are kept in outlier_videos; anything not refreshed for 30 days is deleted, which is the
//     YouTube API policy for data we do not own. The library always links to the video on YouTube.
import { NICHES } from "./niches.js";
import { durationSeconds, youtubeApi } from "./video-cash.js";

export const MIN_MULTIPLIER = 10;
export const BADGE_MULTIPLIER = 100;
export const MIN_VIEWS = 20_000;
export const SAMPLE = 30;
export const MIN_SAMPLE = 12;
const DAY = 86_400_000;
const MIN_AGE_DAYS = 3;
const MAX_AGE_DAYS = 540;
const RECHECK_DAYS = 3;
const DISCOVER_EVERY_DAYS = 7;
const CHANNELS_PER_RUN = 12;
const KEEP_DAYS = 30;
const MAX_CHANNELS_PER_NICHE = 60;

export function median(numbers) {
  const sorted = numbers.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * The outliers among a channel's recent long-form uploads. `videos`: [{id, title, views, publishedAt, seconds, ...}].
 * Returns [] when the sample is too small to say what "normal" is for the channel.
 */
export function findOutliers(videos, now = Date.now()) {
  const settled = videos.filter((video) => video.seconds > 75 && now - Date.parse(video.publishedAt) >= MIN_AGE_DAYS * DAY).slice(0, SAMPLE);
  if (settled.length < MIN_SAMPLE) return [];
  const normal = median(settled.map((video) => video.views));
  if (normal <= 0) return [];
  return settled
    .filter((video) => now - Date.parse(video.publishedAt) <= MAX_AGE_DAYS * DAY && video.views >= MIN_VIEWS)
    .map((video) => ({ ...video, normal: Math.round(normal), multiplier: Math.round((video.views / normal) * 10) / 10 }))
    .filter((video) => video.multiplier >= MIN_MULTIPLIER)
    .sort((a, b) => b.multiplier - a.multiplier);
}

const thumbnailOf = (snippet) => snippet?.thumbnails?.maxres?.url || snippet?.thumbnails?.high?.url || snippet?.thumbnails?.medium?.url || "";

/** The last uploads of one channel, with their numbers (2 API units). */
export async function readChannelVideos(env, uploadsPlaylist, fetcher = fetch) {
  const items = await youtubeApi(env, "playlistItems", { part: "contentDetails", playlistId: uploadsPlaylist, maxResults: 50 }, fetcher);
  const ids = (items.items || []).map((item) => item.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return [];
  const details = await youtubeApi(env, "videos", { part: "snippet,statistics,contentDetails", id: ids.join(","), maxResults: 50 }, fetcher);
  return (details.items || [])
    .map((item) => ({
      id: item.id,
      title: String(item.snippet?.title || "").slice(0, 200),
      views: Number(item.statistics?.viewCount || 0),
      publishedAt: String(item.snippet?.publishedAt || ""),
      seconds: durationSeconds(item.contentDetails?.duration) ?? 0,
      thumbnail: thumbnailOf(item.snippet),
      channelId: String(item.snippet?.channelId || ""),
      channelTitle: String(item.snippet?.channelTitle || "").slice(0, 120),
    }))
    .filter((video) => video.id && video.publishedAt)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/** Channels that make big videos in a niche, found with a few searches (100 units each). */
export async function discoverChannels(env, niche, fetcher = fetch, now = Date.now()) {
  const found = new Map();
  const since = new Date(now - 365 * DAY).toISOString();
  for (const query of niche.queries.slice(0, 3)) {
    const result = await youtubeApi(env, "search", { part: "snippet", type: "video", q: query, order: "viewCount", publishedAfter: since, maxResults: 25, relevanceLanguage: "en", videoDuration: "medium" }, fetcher);
    for (const item of result.items || []) {
      const id = item.snippet?.channelId;
      if (id && !found.has(id)) found.set(id, String(item.snippet?.channelTitle || "").slice(0, 120));
    }
  }
  return [...found].map(([id, title]) => ({ id, title }));
}

/** One run of the job: discover for one niche that is due, refresh the channels checked longest ago. Returns rows touched. */
export async function syncOutliers(env, fetcher = fetch, now = Date.now()) {
  if (!env.YT_API_KEY) throw new Error("YT_API_KEY is not configured");
  const stamp = new Date(now).toISOString();
  let touched = 0;

  // 1. Discovery: the niche last discovered longest ago, when it is due.
  const state = await env.DB.prepare("SELECT niche, discovered_at FROM outlier_niches").all();
  const last = new Map((state.results || []).map((row) => [row.niche, Date.parse(row.discovered_at)]));
  const due = NICHES.map((niche) => ({ niche, at: last.get(niche.id) ?? 0 }))
    .filter((entry) => now - entry.at >= DISCOVER_EVERY_DAYS * DAY)
    .sort((a, b) => a.at - b.at)[0];
  if (due) {
    const channels = await discoverChannels(env, due.niche, fetcher, now);
    const existing = await env.DB.prepare("SELECT COUNT(*) AS n FROM outlier_channels WHERE niche=?").bind(due.niche.id).first();
    const room = Math.max(0, MAX_CHANNELS_PER_NICHE - Number(existing?.n || 0));
    const statements = channels.slice(0, room).map((channel) =>
      env.DB.prepare("INSERT OR IGNORE INTO outlier_channels(channel_id, niche, title, uploads_playlist, found_at, checked_at) VALUES(?,?,?,?,?,NULL)").bind(channel.id, due.niche.id, channel.title, "", stamp),
    );
    statements.push(env.DB.prepare("INSERT INTO outlier_niches(niche, discovered_at) VALUES(?,?) ON CONFLICT(niche) DO UPDATE SET discovered_at=excluded.discovered_at").bind(due.niche.id, stamp));
    await env.DB.batch(statements);
    touched += channels.length;
  }

  // 2. Refresh: the channels checked longest ago (never checked first).
  const cutoff = new Date(now - RECHECK_DAYS * DAY).toISOString();
  const stale = await env.DB.prepare(
    "SELECT channel_id, niche, uploads_playlist FROM outlier_channels WHERE checked_at IS NULL OR checked_at < ? ORDER BY checked_at IS NOT NULL, checked_at LIMIT ?",
  ).bind(cutoff, CHANNELS_PER_RUN).all();
  const rows = stale.results || [];
  const missing = rows.filter((row) => !row.uploads_playlist).map((row) => row.channel_id);
  const playlists = new Map(rows.filter((row) => row.uploads_playlist).map((row) => [row.channel_id, row.uploads_playlist]));
  if (missing.length) {
    const result = await youtubeApi(env, "channels", { part: "contentDetails", id: missing.join(","), maxResults: 50 }, fetcher);
    for (const item of result.items || []) {
      const uploads = item.contentDetails?.relatedPlaylists?.uploads;
      if (uploads) playlists.set(item.id, uploads);
    }
  }
  for (const row of rows) {
    const uploads = playlists.get(row.channel_id);
    const statements = [];
    if (uploads) {
      const videos = await readChannelVideos(env, uploads, fetcher).catch(() => null);
      if (videos) {
        const outliers = findOutliers(videos, now);
        statements.push(env.DB.prepare("DELETE FROM outlier_videos WHERE channel_id=?").bind(row.channel_id));
        for (const video of outliers.slice(0, 5)) {
          statements.push(
            env.DB.prepare(
              "INSERT INTO outlier_videos(video_id, niche, channel_id, channel_title, title, thumbnail_url, published_at, views, channel_median, multiplier, duration_s, refreshed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            ).bind(video.id, row.niche, row.channel_id, video.channelTitle, video.title, video.thumbnail, video.publishedAt, video.views, video.normal, video.multiplier, video.seconds, stamp),
          );
        }
        touched += outliers.length;
      }
    }
    // A channel we could not read is looked at again after the usual wait, not on every run.
    statements.push(env.DB.prepare("UPDATE outlier_channels SET uploads_playlist=COALESCE(NULLIF(?, ''), uploads_playlist), checked_at=? WHERE channel_id=?").bind(uploads || "", stamp, row.channel_id));
    await env.DB.batch(statements);
  }

  // 3. The YouTube API policy: data we do not own is refreshed or deleted within 30 days.
  await env.DB.prepare("DELETE FROM outlier_videos WHERE refreshed_at < ?").bind(new Date(now - KEEP_DAYS * DAY).toISOString()).run();
  return touched;
}

/** The library for a client: their niche first, then the other niches, each with its best videos. */
export async function outlierGroups(env, clientNicheId, { perClientNiche = 24, perOther = 12 } = {}) {
  const groups = [];
  const order = [...NICHES].sort((a, b) => (a.id === clientNicheId ? -1 : b.id === clientNicheId ? 1 : 0));
  for (const niche of order) {
    const limit = niche.id === clientNicheId ? perClientNiche : perOther;
    const result = await env.DB.prepare(
      "SELECT video_id, channel_title, title, thumbnail_url, published_at, views, channel_median, multiplier FROM outlier_videos WHERE niche=? ORDER BY multiplier DESC LIMIT ?",
    ).bind(niche.id, limit).all();
    const videos = (result.results || []).map((row) => ({
      id: row.video_id,
      channel: row.channel_title,
      title: row.title,
      thumbnail: row.thumbnail_url,
      publishedAt: row.published_at,
      views: row.views,
      channelMedian: row.channel_median,
      multiplier: row.multiplier,
      badge: row.multiplier >= BADGE_MULTIPLIER,
      url: `https://www.youtube.com/watch?v=${row.video_id}`,
    }));
    groups.push({ niche: niche.id, label: niche.label, yours: niche.id === clientNicheId, videos });
  }
  return groups;
}

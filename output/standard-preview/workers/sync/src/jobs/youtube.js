import { insertMetric, upsertSnapshot } from "../db.js";

const API = "https://www.googleapis.com/youtube/v3";

export async function syncYouTube(env) {
  if (!env.YT_API_KEY) throw new Error("YT_API_KEY is not configured");
  const channels = await youtube(env, "channels", {
    part: "snippet,statistics,contentDetails",
    id: env.YOUTUBE_CHANNEL_ID || undefined,
    forHandle: env.YOUTUBE_CHANNEL_ID ? undefined : (env.YOUTUBE_HANDLE || "abluiy"),
  });
  const channel = channels.items?.[0];
  if (!channel) throw new Error("YouTube channel not found");
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  const playlist = await youtube(env, "playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploads,
    maxResults: 1,
  });
  const videoId = playlist.items?.[0]?.contentDetails?.videoId;
  if (!videoId) throw new Error("Latest YouTube upload not found");
  const videos = await youtube(env, "videos", {
    part: "snippet,statistics,contentDetails",
    id: videoId,
  });
  const video = videos.items?.[0];
  if (!video) throw new Error("Latest YouTube video details not found");

  const capturedAt = new Date().toISOString();
  const channelSnapshot = {
    name: channel.snippet?.title || "",
    handle: channel.snippet?.customUrl || "@ABLuiy",
    url: "https://www.youtube.com/@abluiy",
    subscribers: number(channel.statistics?.subscriberCount),
    videos: number(channel.statistics?.videoCount),
    views: number(channel.statistics?.viewCount),
    source: "youtube-data-api",
  };
  const latestVideo = {
    id: videoId,
    title: video.snippet?.title || "",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    durationIso: video.contentDetails?.duration || "",
    views: number(video.statistics?.viewCount),
    likes: number(video.statistics?.likeCount),
    comments: number(video.statistics?.commentCount),
    publishedAt: video.snippet?.publishedAt || capturedAt,
    publishedLabel: "latest upload",
    source: "youtube-data-api",
  };
  const analytics = {
    connected: false,
    retentionAvailable: false,
    watchTimeAvailable: false,
    ctrAvailable: false,
    note: "YouTube Analytics OAuth is required for retention, watch time, and CTR.",
  };
  await Promise.all([
    upsertSnapshot(env, { source: "youtube", kind: "channel", capturedAt, payload: channelSnapshot }),
    upsertSnapshot(env, { source: "youtube", kind: "latest-video", capturedAt, payload: latestVideo }),
    upsertSnapshot(env, { source: "youtube", kind: "analytics", capturedAt, payload: analytics }),
    insertMetric(env, { source: "youtube", metric: "subscribers", ts: capturedAt, value: channelSnapshot.subscribers }),
    insertMetric(env, { source: "youtube", metric: "channel_views", ts: capturedAt, value: channelSnapshot.views }),
    insertMetric(env, { source: "youtube", metric: "video_count", ts: capturedAt, value: channelSnapshot.videos }),
    insertMetric(env, { source: "youtube", metric: "latest_video_views", ts: capturedAt, value: latestVideo.views, dims: { video_id: videoId } }),
  ]);
  return 3;
}

export async function youtube(env, path, params) {
  const url = new URL(`${API}/${path}`);
  for (const [key, value] of Object.entries({ ...params, key: env.YT_API_KEY })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { "user-agent": "Pulsify-Sync/1.0" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(`YouTube ${path} failed (${response.status}): ${body.error?.message || "unknown error"}`);
  return body;
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Cash by video (pulsify-saas #36).
//
// Three jobs live here so the Pages API and the sync Worker share one copy:
//   1. syncClientVideos  - pull each client's public YouTube uploads (API key only)
//   2. ensureVideoLinks  - one tracked /a/ link per video placement, plus a channel link
//   3. videoCashReport   - rank the videos by cash collected, not views
//
// Credit rule: one person, one video. A person (contact email) is credited to the
// first video tag ever seen on any visitor id tied to their email. Cash follows
// the person through confirmed payment matches, net of refunds, so the totals
// agree with the client's Payments page.

import { cleanId, normalizeEmail } from "./common.js";

const API = "https://www.googleapis.com/youtube/v3";
export const VIDEO_PLACEMENTS = ["description", "pinned-comment"];
export const CHANNEL_KEY = "channel";
const RESYNC_MS = 6 * 60 * 60 * 1000;
const MAX_VIDEOS = 200;
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const RANGE_DAYS = { "30d": 30, "90d": 90 };

// ---------- YouTube sync ----------

export async function youtubeApi(env, path, params, fetcher = fetch) {
  const url = new URL(`${API}/${path}`);
  for (const [key, value] of Object.entries({ ...params, key: env.YT_API_KEY })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetcher(url.toString(), { headers: { "user-agent": "Pulsify-Sync/1.0" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(`YouTube ${path} failed (${response.status}): ${body.error?.message || "unknown error"}`);
  }
  return body;
}

// "@name", "name", a channel URL or a UC... channel id -> the lookup to use.
export function channelLookup(raw) {
  let value = String(raw || "").trim();
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "channel" && parts[1]) return { id: parts[1] };
      value = parts.find((part) => part.startsWith("@")) || parts[0] || "";
    }
  } catch {
    return null;
  }
  value = value.replace(/^@/, "").trim();
  if (/^UC[\w-]{22}$/.test(value)) return { id: value };
  if (!/^[\w.-]{3,100}$/.test(value)) return null;
  return { forHandle: value };
}

export function durationSeconds(iso) {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ""));
  if (!match) return null;
  const [, d, h, m, s] = match.map((part) => Number(part || 0));
  return d * 86400 + h * 3600 + m * 60 + s;
}

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Clients with a saved YouTube handle whose videos are missing or older than 6 hours.
export async function dueVideoClients(env, { now = Date.now(), clientId = null, force = false } = {}) {
  const rows = await env.DB.prepare(
    `SELECT i.client_id AS client_id,
            json_extract(i.config_json, '$.handle') AS handle,
            (SELECT MAX(v.synced_at) FROM yt_videos v WHERE v.client_id = i.client_id) AS last_sync,
            (SELECT s.captured_at FROM snapshots s
              WHERE s.scope = 'client' AND s.client_id = i.client_id AND s.source = 'youtube' AND s.kind = 'videos-error') AS last_error,
            (SELECT json_extract(s.payload_json, '$.handle') FROM snapshots s
              WHERE s.scope = 'client' AND s.client_id = i.client_id AND s.source = 'youtube' AND s.kind = 'videos-error') AS error_handle
       FROM integrations i
       LEFT JOIN client_config c ON c.client = i.client_id
      WHERE i.scope = 'client' AND i.provider = 'youtube'
        AND COALESCE(json_extract(i.config_json, '$.handle'), '') <> ''
        AND COALESCE(c.status, '') NOT IN ('archived', 'demo')
        AND (? IS NULL OR i.client_id = ?)`,
  ).bind(clientId, clientId).all();
  return (rows.results || []).filter((row) => {
    if (force) return true;
    // A failed channel lookup waits 6 hours before the next try, unless the handle changed since.
    if (row.last_error && row.error_handle === row.handle && now - Date.parse(row.last_error) < RESYNC_MS) return false;
    if (!row.last_sync) return true;
    return now - Date.parse(row.last_sync) >= RESYNC_MS;
  });
}

export async function syncClientVideos(env, { fetcher = fetch, now = Date.now(), clientId = null, force = false } = {}) {
  if (!env.YT_API_KEY) throw new Error("YT_API_KEY is not configured");
  const due = await dueVideoClients(env, { now, clientId, force });
  let items = 0;
  const failures = [];
  for (const row of due) {
    try {
      items += await syncOneClient(env, row.client_id, row.handle, { fetcher, now });
      await env.DB.prepare(
        "DELETE FROM snapshots WHERE scope='client' AND client_id=? AND source='youtube' AND kind='videos-error'",
      ).bind(row.client_id).run();
    } catch (error) {
      const message = String(error?.message || error).slice(0, 200);
      await env.DB.prepare(
        `INSERT INTO snapshots(scope,client_id,source,kind,captured_at,payload_json)
         VALUES('client',?,'youtube','videos-error',?,?)
         ON CONFLICT(scope,client_id,source,kind) DO UPDATE SET captured_at=excluded.captured_at, payload_json=excluded.payload_json`,
      ).bind(row.client_id, new Date(now).toISOString(), JSON.stringify({ error: message, handle: row.handle, client_fixable: Boolean(error?.clientFixable) })).run();
      // A wrong handle is the client's to fix and is shown on their screen; only service errors fail the job.
      if (!error?.clientFixable) failures.push(`${row.client_id}: ${message}`);
    }
  }
  if (failures.length) throw new Error(`client videos failed for ${failures.join("; ")}`);
  return items;
}

function clientFixable(message) {
  const error = new Error(message);
  error.clientFixable = true;
  return error;
}

async function syncOneClient(env, clientId, handle, { fetcher, now }) {
  const lookup = channelLookup(handle);
  if (!lookup) throw clientFixable(`"${String(handle).slice(0, 60)}" is not a YouTube handle`);
  const channels = await youtubeApi(env, "channels", { part: "snippet,contentDetails", ...lookup }, fetcher);
  const channel = channels.items?.[0];
  if (!channel) throw clientFixable(`No YouTube channel found for ${lookup.forHandle ? `@${lookup.forHandle}` : lookup.id}`);
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("channel has no uploads playlist");

  const ids = [];
  let pageToken;
  do {
    const page = await youtubeApi(env, "playlistItems", {
      part: "contentDetails",
      playlistId: uploads,
      maxResults: 50,
      pageToken,
    }, fetcher);
    for (const item of page.items || []) {
      const id = item.contentDetails?.videoId;
      if (id && !ids.includes(id)) ids.push(id);
    }
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < MAX_VIDEOS);
  ids.splice(MAX_VIDEOS);

  const syncedAt = new Date(now).toISOString();
  const titles = new Map();
  const statements = [];
  for (let index = 0; index < ids.length; index += 50) {
    const batch = await youtubeApi(env, "videos", {
      part: "snippet,statistics,contentDetails",
      id: ids.slice(index, index + 50).join(","),
    }, fetcher);
    for (const video of batch.items || []) {
      const thumbs = video.snippet?.thumbnails || {};
      const thumbnail = (thumbs.high || thumbs.medium || thumbs.default || {}).url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
      titles.set(video.id, video.snippet?.title || "");
      statements.push(env.DB.prepare(
        `INSERT INTO yt_videos (client_id, video_id, channel_id, title, published_at, thumbnail_url, duration_seconds, views, likes, comments, synced_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(client_id, video_id) DO UPDATE SET
           channel_id=excluded.channel_id, title=excluded.title, published_at=excluded.published_at,
           thumbnail_url=excluded.thumbnail_url, duration_seconds=excluded.duration_seconds,
           views=excluded.views, likes=excluded.likes, comments=excluded.comments, synced_at=excluded.synced_at`,
      ).bind(
        clientId, video.id, channel.id, video.snippet?.title || "", video.snippet?.publishedAt || null,
        thumbnail, durationSeconds(video.contentDetails?.duration), count(video.statistics?.viewCount),
        count(video.statistics?.likeCount), count(video.statistics?.commentCount), syncedAt,
      ));
    }
  }
  // A changed handle means a different channel: its old videos no longer belong here.
  statements.push(env.DB.prepare(
    "DELETE FROM yt_videos WHERE client_id=? AND channel_id IS NOT NULL AND channel_id<>?",
  ).bind(clientId, channel.id));
  if (statements.length) await env.DB.batch(statements);
  await ensureVideoLinks(env, clientId, [...titles.keys()], { titles, now });
  return titles.size;
}

// ---------- Tracked links ----------

export function newToken(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("");
}

export async function ensureVideoLinks(env, clientId, videoIds, { titles = new Map(), now = Date.now() } = {}) {
  const client = cleanId(clientId, "");
  if (!client) return 0;
  const existing = await env.DB.prepare(
    "SELECT video_id, placement FROM asset_links WHERE client=? AND kind='video'",
  ).bind(client).all();
  const have = new Set((existing.results || []).map((row) => `${row.video_id}|${row.placement}`));
  const wanted = [[CHANNEL_KEY, CHANNEL_KEY, "YouTube channel link"]];
  for (const id of videoIds) {
    for (const placement of VIDEO_PLACEMENTS) wanted.push([id, placement, titles.get(id) || id]);
  }
  const createdAt = new Date(now).toISOString();
  let minted = 0;
  for (const [videoId, placement, label] of wanted) {
    if (have.has(`${videoId}|${placement}`)) continue;
    // INSERT OR IGNORE: a concurrent run or a token collision never double-mints.
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO asset_links (token, client, label, target_url, lead_email, created_at, archived, kind, video_id, placement)
       VALUES (?,?,?,?,NULL,?,0,'video',?,?)`,
    ).bind(newToken(), client, String(label).slice(0, 200), "", createdAt, videoId, placement).run();
    minted += Number(result.meta?.changes || 0);
  }
  return minted;
}

// ---------- The report ----------

export function rangeStart(range, now = Date.now()) {
  const days = RANGE_DAYS[range];
  return days ? new Date(now - days * 86400000).toISOString() : null;
}

function isYouTubeReferrer(value) {
  return /(^|\.|\/\/)(youtube\.com|youtu\.be)(\/|$)/i.test(String(value || ""));
}

function emptyStats() {
  return { clicks: 0, visits: 0, applications: 0, calls: 0, buyers: 0, cash_cents: 0 };
}

export async function videoCashReport(env, clientId, { range = "all", now = Date.now(), origin = "" } = {}) {
  const client = cleanId(clientId, "");
  const from = rangeStart(range, now);
  const db = env.DB;
  const [
    handleRow, videoRows, linkRows, clickRows, taggedRows, refRows, identityRows, touchRows, paymentRows, unmatchedRow, errorRow,
  ] = await Promise.all([
    db.prepare(
      "SELECT json_extract(config_json, '$.handle') AS handle FROM integrations WHERE scope='client' AND client_id=? AND provider='youtube'",
    ).bind(client).first(),
    db.prepare(
      `SELECT video_id, title, published_at, thumbnail_url, duration_seconds, views, synced_at
         FROM yt_videos WHERE client_id=? ORDER BY published_at DESC`,
    ).bind(client).all(),
    db.prepare(
      "SELECT token, video_id, placement FROM asset_links WHERE client=? AND kind='video' AND archived=0",
    ).bind(client).all(),
    db.prepare(
      `SELECT e.token AS token, COUNT(*) AS n
         FROM asset_events e JOIN asset_links l ON l.token = e.token
        WHERE l.client=? AND l.kind='video' AND (? IS NULL OR e.at >= ?)
        GROUP BY e.token`,
    ).bind(client, from, from).all(),
    db.prepare(
      `SELECT visitor_id, utm_content, MIN(at) AS first_at
         FROM page_events
        WHERE client=? AND utm_source='youtube' AND COALESCE(utm_content,'') <> '' AND visitor_id IS NOT NULL
        GROUP BY visitor_id, utm_content`,
    ).bind(client).all(),
    db.prepare(
      `SELECT DISTINCT visitor_id, referrer
         FROM page_events
        WHERE client=? AND visitor_id IS NOT NULL AND COALESCE(utm_content,'') = ''
          AND (referrer LIKE '%youtube.com%' OR referrer LIKE '%youtu.be%')`,
    ).bind(client).all(),
    db.prepare(
      `SELECT visitor_id, lower(email) AS email FROM leads
        WHERE client=? AND visitor_id IS NOT NULL AND COALESCE(email,'') <> ''
       UNION
       SELECT visitor_id, lower(email) AS email FROM page_events
        WHERE client=? AND visitor_id IS NOT NULL AND COALESCE(email,'') <> ''`,
    ).bind(client, client).all(),
    db.prepare(
      `SELECT lower(contact_email) AS email, kind
         FROM pipeline_touches
        WHERE client_id=? AND kind IN ('optin','application','booking') AND (? IS NULL OR ts >= ?)
        GROUP BY lower(contact_email), kind`,
    ).bind(client, from, from).all(),
    db.prepare(
      `SELECT p.id, p.amount_cents, p.refunded_cents, p.currency, p.customer_email, m.target_kind, m.target_id,
              json_extract(w.data_json, '$.email') AS record_email
         FROM payment_matches m
         JOIN payments p ON p.id = m.payment_id
         LEFT JOIN workspace_records w ON m.target_kind = 'workspace_record' AND w.id = m.target_id
        WHERE m.client_id=? AND m.status='confirmed' AND p.kind='charge'
          AND (? IS NULL OR p.occurred_at >= ?)`,
    ).bind(client, from, from).all(),
    db.prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(p.amount_cents - p.refunded_cents), 0) AS cents
         FROM payments p
        WHERE p.client=? AND p.kind='charge' AND (? IS NULL OR p.occurred_at >= ?)
          AND NOT EXISTS (SELECT 1 FROM payment_matches m WHERE m.payment_id = p.id AND m.status='confirmed')`,
    ).bind(client, from, from).first(),
    db.prepare(
      "SELECT captured_at, payload_json FROM snapshots WHERE scope='client' AND client_id=? AND source='youtube' AND kind='videos-error'",
    ).bind(client).first(),
  ]);

  const videos = videoRows.results || [];
  const videoIds = new Set(videos.map((video) => video.video_id));
  const keyFor = (content) => {
    if (videoIds.has(content)) return content;
    if (content === CHANNEL_KEY) return CHANNEL_KEY;
    return "youtube-untagged";
  };

  // First video tag per visitor, over all time (credit never moves).
  const firstTag = new Map();
  for (const row of taggedRows.results || []) {
    const current = firstTag.get(row.visitor_id);
    if (!current || row.first_at < current.at) firstTag.set(row.visitor_id, { key: keyFor(row.utm_content), at: row.first_at });
  }
  const youtubeVisitors = new Set(
    (refRows.results || []).filter((row) => isYouTubeReferrer(row.referrer)).map((row) => row.visitor_id),
  );
  const visitorsByEmail = new Map();
  for (const row of identityRows.results || []) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    if (!visitorsByEmail.has(email)) visitorsByEmail.set(email, new Set());
    visitorsByEmail.get(email).add(row.visitor_id);
  }
  const creditFor = (email) => {
    const visitors = visitorsByEmail.get(email);
    if (!visitors) return "other";
    let best = null;
    for (const visitor of visitors) {
      const tag = firstTag.get(visitor);
      if (tag && (!best || tag.at < best.at)) best = tag;
    }
    if (best) return best.key;
    for (const visitor of visitors) if (youtubeVisitors.has(visitor)) return "youtube-untagged";
    return "other";
  };

  const stats = new Map();
  const statFor = (key) => {
    if (!stats.has(key)) stats.set(key, emptyStats());
    return stats.get(key);
  };

  // Clicks and links per video.
  const linksByVideo = new Map();
  const clicksByToken = new Map((clickRows.results || []).map((row) => [row.token, Number(row.n || 0)]));
  for (const link of linkRows.results || []) {
    const key = link.video_id === CHANNEL_KEY ? CHANNEL_KEY : link.video_id;
    if (!linksByVideo.has(key)) linksByVideo.set(key, {});
    const placement = link.placement || "description";
    const clicks = clicksByToken.get(link.token) || 0;
    linksByVideo.get(key)[placement] = { url: `${origin}/a/${link.token}`, clicks };
    statFor(key).clicks += clicks;
  }

  // Visits: visitors whose first tagged visit falls in the range.
  for (const tag of firstTag.values()) {
    if (!from || tag.at >= from) statFor(tag.key).visits += 1;
  }

  // People: touches and cash in the range, each credited once.
  const people = new Map();
  const person = (email) => {
    if (!people.has(email)) people.set(email, { applied: false, booked: false, cash: 0 });
    return people.get(email);
  };
  for (const row of touchRows.results || []) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    if (row.kind === "booking") person(email).booked = true;
    else person(email).applied = true;
  }
  const currencies = new Set();
  for (const row of paymentRows.results || []) {
    if (row.currency) currencies.add(String(row.currency).toUpperCase());
    const email = normalizeEmail(
      row.target_kind === "contact_email" ? row.target_id
        : row.target_kind === "workspace_record" ? row.record_email || row.customer_email
          : row.customer_email,
    );
    const net = Math.max(0, Number(row.amount_cents || 0) - Number(row.refunded_cents || 0));
    person(email || `payment:${row.id}`).cash += net;
  }
  const peopleByKey = new Map();
  for (const [email, p] of people) {
    const key = email.startsWith("payment:") ? "other" : creditFor(email);
    const s = statFor(key);
    if (!email.startsWith("payment:")) {
      if (!peopleByKey.has(key)) peopleByKey.set(key, []);
      peopleByKey.get(key).push({ email, applied: p.applied, booked: p.booked, cash_cents: p.cash });
    }
    if (p.applied) s.applications += 1;
    if (p.booked) s.calls += 1;
    if (p.cash > 0) s.buyers += 1;
    s.cash_cents += p.cash;
  }

  const perThousand = (cents, views) => (views > 0 ? Math.round((cents / views) * 1000) : null);
  const rows = videos.map((video) => {
    const s = stats.get(video.video_id) || emptyStats();
    const links = linksByVideo.get(video.video_id) || {};
    return {
      video_id: video.video_id,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.video_id}`,
      thumbnail_url: video.thumbnail_url,
      published_at: video.published_at,
      duration_seconds: video.duration_seconds,
      views: video.views,
      ...s,
      cash_per_1k_views_cents: perThousand(s.cash_cents, Number(video.views || 0)),
      // The people credited to this video, most valuable first (the client's own leads).
      people: (peopleByKey.get(video.video_id) || [])
        .sort((a, b) => b.cash_cents - a.cash_cents || Number(b.booked) - Number(a.booked) || a.email.localeCompare(b.email))
        .slice(0, 25),
      links: {
        description: links.description || null,
        pinned_comment: links["pinned-comment"] || null,
      },
    };
  });
  rows.sort((a, b) => b.cash_cents - a.cash_cents || b.calls - a.calls || b.applications - a.applications
    || String(b.published_at || "").localeCompare(String(a.published_at || "")));

  const bucket = (key) => ({ ...(stats.get(key) || emptyStats()) });
  const channel = { ...bucket(CHANNEL_KEY), link: linksByVideo.get(CHANNEL_KEY)?.channel || null };
  const untagged = bucket("youtube-untagged");
  const other = bucket("other");
  const youtubeCash = rows.reduce((sum, row) => sum + row.cash_cents, 0) + channel.cash_cents + untagged.cash_cents;
  const youtubeCalls = rows.reduce((sum, row) => sum + row.calls, 0) + channel.calls + untagged.calls;
  const best = rows.find((row) => row.cash_cents > 0) || null;
  const lastSync = videos.reduce((latest, video) => (video.synced_at > latest ? video.synced_at : latest), "");

  return {
    ok: true,
    client,
    range: RANGE_DAYS[range] ? range : "all",
    // One currency across the counted payments, "mixed" when they differ.
    currency: currencies.size > 1 ? "mixed" : [...currencies][0] || "USD",
    from,
    generated_at: new Date(now).toISOString(),
    handle: handleRow?.handle || null,
    last_synced_at: lastSync || null,
    sync_error: syncError(errorRow),
    totals: {
      youtube_cash_cents: youtubeCash,
      youtube_calls: youtubeCalls,
      best_video: best ? { video_id: best.video_id, title: best.title, thumbnail_url: best.thumbnail_url, cash_cents: best.cash_cents } : null,
      any_clicks: rows.some((row) => row.clicks > 0) || channel.clicks > 0,
    },
    videos: rows,
    buckets: { channel, youtube_untagged: untagged, other },
    unmatched_payments: { count: Number(unmatchedRow?.n || 0), cash_cents: Number(unmatchedRow?.cents || 0) },
  };
}

// Only a handle problem is worth showing the client; service errors stay internal.
function syncError(row) {
  if (!row) return null;
  try {
    const payload = JSON.parse(row.payload_json || "{}");
    return payload.client_fixable ? { message: String(payload.error || ""), at: row.captured_at } : null;
  } catch {
    return null;
  }
}

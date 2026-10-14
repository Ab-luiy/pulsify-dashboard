// The 7-fig packaging library: the outlier score, the weekly gathering, the 30-day clean-up and the client's view.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { findOutliers, median, outlierGroups, syncOutliers } from "../functions/_shared/outliers.js";
import { onRequestGet } from "../functions/api/outlier-videos.js";
import { sha256Hex } from "../functions/_shared/common.js";

const NOW = Date.parse("2026-10-15T12:00:00Z");
const DAY = 86_400_000;
const video = (n, views, extra = {}) => ({ id: `v${n}`, title: `Video ${n}`, views, publishedAt: new Date(NOW - (n + 5) * DAY).toISOString(), seconds: 900, thumbnail: `https://i.ytimg.com/vi/v${n}/hq.jpg`, channelId: "UC1", channelTitle: "Chan", ...extra });
const normalChannel = (outlierViews) => [...Array.from({ length: 20 }, (_, n) => video(n + 1, 8_000 + n * 100)), video(30, outlierViews)];

test("the median is the channel's normal, not skewed by one hit", () => {
  assert.equal(median([1, 2, 3]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([8000, 8100, 8200, 9_000_000]), 8150);
  assert.equal(median([]), 0);
});

test("a video is an outlier at 10x its channel's median, shorts and fresh uploads are left out", () => {
  const found = findOutliers(normalChannel(1_200_000), NOW);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, "v30");
  assert.ok(found[0].multiplier >= 100, "about 130x");
  assert.equal(found[0].normal > 8000 && found[0].normal < 10_000, true);
  // 9x is not enough; a short is never the packaging example; a three-day rule keeps views settled.
  assert.deepEqual(findOutliers(normalChannel(80_000), NOW), []);
  assert.deepEqual(findOutliers([...normalChannel(1_200_000).slice(0, 20), video(30, 1_200_000, { seconds: 40 })], NOW), []);
  assert.deepEqual(findOutliers([...normalChannel(1_200_000).slice(0, 20), video(30, 1_200_000, { publishedAt: new Date(NOW - DAY).toISOString() })], NOW), []);
  // Too few uploads to know what normal is.
  assert.deepEqual(findOutliers(normalChannel(1_200_000).slice(0, 8), NOW), []);
  // Under 20,000 views is noise however big the multiple.
  assert.deepEqual(findOutliers([...Array.from({ length: 20 }, (_, n) => video(n + 1, 100)), video(30, 5_000)], NOW), []);
});

test("the library is English and real titles: other languages and hashtag lists are left out, two per channel at most", async () => {
  const base = Array.from({ length: 20 }, (_, n) => video(n + 1, 8_000 + n * 100));
  const hit = (n, extra) => video(n, 900_000, extra);
  assert.equal(findOutliers([...base, hit(30, { language: "hi" })], NOW).length, 0, "a Hindi video is left out");
  assert.equal(findOutliers([...base, hit(30, { language: "en-US" })], NOW).length, 1);
  assert.equal(findOutliers([...base, hit(30, { language: "" })], NOW).length, 1, "unknown language is allowed");
  assert.equal(findOutliers([...base, hit(30, { title: "Gold trading #stockmarket #trading #forex" })], NOW).length, 0);
  assert.equal(findOutliers([...base, hit(30, { title: "My #1 rule for trading" })], NOW).length, 1, "one hash is fine");
});

test("one channel cannot fill a niche", async () => {
  const t = db();
  const env = { DB: t.DB, YT_API_KEY: "key" };
  const sample = [...Array.from({ length: 20 }, (_, n) => video(n + 1, 8_000 + n * 100)), video(30, 900_000), video(31, 800_000), video(32, 700_000), video(33, 650_000)];
  const fetcher = async (url) => {
    const path = new URL(url).pathname.split("/").pop();
    if (path === "search") return Response.json({ items: [{ snippet: { channelId: "UC1", channelTitle: "Chan" } }] });
    if (path === "channels") return Response.json({ items: [{ id: "UC1", contentDetails: { relatedPlaylists: { uploads: "UU1" } } }] });
    if (path === "playlistItems") return Response.json({ items: sample.map((v) => ({ contentDetails: { videoId: v.id } })) });
    return Response.json({ items: sample.map((v) => ({ id: v.id, snippet: { title: v.title, publishedAt: v.publishedAt, channelId: "UC1", channelTitle: "Chan", thumbnails: { high: { url: v.thumbnail } } }, statistics: { viewCount: String(v.views) }, contentDetails: { duration: "PT15M" } })) });
  };
  await syncOutliers(env, fetcher, NOW);
  assert.equal(t.sql.prepare("SELECT COUNT(*) AS n FROM outlier_videos").get().n, 2);
});

function db() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../migrations/0060_outlier_videos.sql", import.meta.url), "utf8"));
  sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, portal_token_hash TEXT, page_content_json TEXT, status TEXT DEFAULT 'active'); CREATE TABLE client_brain(id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT, section TEXT, field TEXT, value_json TEXT, source TEXT, updated_at TEXT); CREATE TABLE proof_items(id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT, kind TEXT, url TEXT, claim TEXT, permission TEXT, created_at TEXT);");
  const stmt = (q, a = []) => ({ bind(...v) { return stmt(q, v); }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } });
  return { sql, DB: { prepare: (q) => stmt(q), async batch(list) { for (const s of list) await s.run(); } } };
}

/** A fake YouTube: searches find one channel, the channel has the sample above. */
function youtube(outlierViews = 1_200_000) {
  const calls = [];
  const videos = normalChannel(outlierViews);
  const fetcher = async (url) => {
    const u = new URL(url);
    const path = u.pathname.split("/").pop();
    calls.push(path);
    if (path === "search") return Response.json({ items: [{ snippet: { channelId: "UC1", channelTitle: "Chan" } }, { snippet: { channelId: "UC1", channelTitle: "Chan" } }] });
    if (path === "channels") return Response.json({ items: [{ id: "UC1", contentDetails: { relatedPlaylists: { uploads: "UU1" } } }] });
    if (path === "playlistItems") return Response.json({ items: videos.map((v) => ({ contentDetails: { videoId: v.id } })) });
    if (path === "videos") {
      return Response.json({ items: videos.map((v) => ({ id: v.id, snippet: { title: v.title, publishedAt: v.publishedAt, channelId: "UC1", channelTitle: "Chan", thumbnails: { high: { url: v.thumbnail } } }, statistics: { viewCount: String(v.views) }, contentDetails: { duration: "PT15M" } })) });
    }
    return Response.json({}, { status: 404 });
  };
  return { fetcher, calls };
}

test("the job finds channels once a week per niche, reads a few each run, and keeps only real outliers", async () => {
  const t = db();
  const env = { DB: t.DB, YT_API_KEY: "key" };
  const yt = youtube();
  await syncOutliers(env, yt.fetcher, NOW);
  // Discovery: three searches for one niche, then the channel is read through its uploads.
  assert.equal(yt.calls.filter((c) => c === "search").length, 3);
  assert.equal(t.sql.prepare("SELECT COUNT(*) AS n FROM outlier_niches").get().n, 1);
  assert.equal(t.sql.prepare("SELECT COUNT(*) AS n FROM outlier_channels").get().n, 1);
  const row = t.sql.prepare("SELECT * FROM outlier_videos").get();
  assert.equal(row.video_id, "v30");
  assert.ok(row.multiplier >= 100);
  assert.equal(t.sql.prepare("SELECT uploads_playlist FROM outlier_channels").get().uploads_playlist, "UU1");

  // An hour later: nothing is due, so no searches and no channel is read again.
  const before = yt.calls.length;
  await syncOutliers(env, yt.fetcher, NOW + 3600_000);
  assert.equal(yt.calls.slice(before).filter((c) => c === "search").length, 3, "the next niche is discovered: one niche, three searches, per run");
  assert.equal(yt.calls.slice(before).filter((c) => c === "playlistItems").length, 0, "the channel is checked again only after three days");

  // Three days later it is read again, and a video that fell under 10x leaves the library.
  const flat = youtube(60_000);
  await syncOutliers(env, flat.fetcher, NOW + 4 * DAY);
  assert.equal(t.sql.prepare("SELECT COUNT(*) AS n FROM outlier_videos").get().n, 0);
});

test("anything not refreshed for 30 days is deleted (YouTube's rule for data we do not own)", async () => {
  const t = db();
  t.sql.prepare("INSERT INTO outlier_videos(video_id,niche,channel_id,title,published_at,views,channel_median,multiplier,refreshed_at) VALUES('old','trading','UC9','Old','2026-01-01T00:00:00Z',900000,9000,100,'2026-09-01T00:00:00Z')").run();
  await syncOutliers({ DB: t.DB, YT_API_KEY: "key" }, youtube().fetcher, NOW);
  assert.equal(t.sql.prepare("SELECT COUNT(*) AS n FROM outlier_videos WHERE video_id='old'").get().n, 0);
});

test("the client sees their niche first, with the 100x badge, and nothing without a sign-in", async () => {
  const t = db();
  t.sql.prepare("INSERT INTO client_config(client, client_name, portal_token_hash, page_content_json) VALUES ('rio','Rio',?, '{}')").run(await sha256Hex("rio-token"));
  t.sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('rio','identity','niche','\"ecommerce\"','client-form','x')").run();
  const add = (id, niche, multiplier) => t.sql.prepare("INSERT INTO outlier_videos(video_id,niche,channel_id,channel_title,title,thumbnail_url,published_at,views,channel_median,multiplier,refreshed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(id, niche, "UC" + id, "Chan " + id, "Title " + id, "https://i.ytimg.com/vi/" + id + "/hq.jpg", "2026-08-01T00:00:00Z", 500000, 5000, multiplier, "2026-10-14T00:00:00Z");
  add("a", "trading", 40); add("b", "ecommerce", 150); add("c", "ecommerce", 12);
  const res = await onRequestGet({ env: { DB: t.DB }, request: new Request("https://pulsify-ai.com/api/outlier-videos", { headers: { "x-portal-token": "rio-token" } }) });
  const body = await res.json();
  assert.equal(body.niche, "ecommerce");
  assert.deepEqual(body.groups.map((g) => g.niche), ["ecommerce", "trading", "tiktok-shop", "amazon-fba", "ht-sales"]);
  assert.equal(body.groups[0].yours, true);
  assert.deepEqual(body.groups[0].videos.map((v) => [v.id, v.badge]), [["b", true], ["c", false]]);
  assert.equal(body.groups[0].videos[0].url, "https://www.youtube.com/watch?v=b");
  assert.equal((await onRequestGet({ env: { DB: t.DB }, request: new Request("https://pulsify-ai.com/api/outlier-videos") })).status, 401);
  assert.equal((await outlierGroups({ DB: t.DB }, "")).length, 5);
});

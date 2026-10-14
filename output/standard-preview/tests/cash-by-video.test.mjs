// Cash by video (pulsify-saas #36). Real SQLite, real migrations.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import * as eventApi from "../functions/event.js";
import * as redirectApi from "../functions/a/[token].js";
import { onRequestGet as videoCashGet } from "../functions/api/video-cash.js";
import { onRequestGet as assetsGet } from "../functions/api/assets.js";
import {
  channelLookup, durationSeconds, ensureVideoLinks, syncClientVideos, videoCashReport,
} from "../functions/_shared/video-cash.js";
import { scheduledJobs } from "../workers/sync/src/index.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

// Base tables as they exist live (0001_bootstrap is not in the repo).
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, portal_token_hash TEXT,
  wistia_media_id TEXT, typeform_url TEXT, typeform_webhook_secret TEXT, kit_api_key TEXT, kit_tag_id TEXT,
  allowed_origin TEXT, prospect_email TEXT, acquisition_token TEXT, updated_at TEXT)`);
sql.exec("CREATE TABLE client_sessions(token_hash TEXT, client_id TEXT, expires_at TEXT, created_at TEXT)");
sql.exec(`CREATE TABLE leads(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, name TEXT, revenue TEXT,
  situation TEXT, applied_at TEXT, status TEXT DEFAULT 'new', visitor_id TEXT, session_id TEXT, page_id TEXT,
  source TEXT DEFAULT 'typeform', response_id TEXT, phone TEXT, answers_json TEXT, kit_status TEXT, utm_json TEXT, updated_at TEXT)`);
sql.exec(`CREATE TABLE watch_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, media_id TEXT,
  event TEXT, percent INTEGER, at TEXT)`);
sql.exec(`CREATE TABLE page_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, visitor_id TEXT, session_id TEXT,
  page_id TEXT, event TEXT NOT NULL, email TEXT, path TEXT, referrer TEXT, utm_json TEXT, metadata_json TEXT, at TEXT NOT NULL)`);
sql.exec(mig("0008_integrations_hub.sql").replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/, ""));
sql.exec(mig("0010_view_tracking.sql"));
sql.exec(mig("0021_workspace_records.sql"));
sql.exec(mig("0025_data_spine.sql"));
sql.exec(mig("0027_revenue_automation.sql"));
sql.exec(mig("0028_onboarding.sql"));

// Rows that exist before the migration: the backfill must fill the new columns.
sql.prepare("INSERT INTO page_events(client,visitor_id,event,utm_json,at) VALUES(?,?,?,?,?)")
  .run("acme", "old-visitor", "page_view", JSON.stringify({ utm_source: "YouTube", utm_content: "oldvideo001" }), "2026-01-01T00:00:00.000Z");
sql.prepare("INSERT INTO page_events(client,visitor_id,event,utm_json,at) VALUES(?,?,?,?,?)")
  .run("acme", "plain-visitor", "page_view", "{}", "2026-01-01T00:00:00.000Z");
sql.prepare("INSERT INTO asset_links(token,client,label,target_url,created_at) VALUES(?,?,?,?,?)")
  .run("oldasset", "acme", "Prospect doc", "https://docs.example.com/x", "2026-01-01T00:00:00.000Z");
sql.exec(mig("0043_cash_by_video.sql"));
sql.exec("ALTER TABLE page_events ADD COLUMN lat REAL; ALTER TABLE page_events ADD COLUMN lng REAL;"); // 0045 (its other tables need columns this test does not create)

let row = sql.prepare("SELECT utm_source, utm_content, utm_json FROM page_events WHERE visitor_id='old-visitor'").get();
assert.equal(row.utm_source, "youtube", "backfill lowercases the source");
assert.equal(row.utm_content, "oldvideo001");
assert.equal(row.utm_json, JSON.stringify({ utm_source: "YouTube", utm_content: "oldvideo001" }), "utm_json untouched");
row = sql.prepare("SELECT utm_source, utm_content FROM page_events WHERE visitor_id='plain-visitor'").get();
assert.equal(row.utm_source, null);
assert.equal(sql.prepare("SELECT kind FROM asset_links WHERE token='oldasset'").get().kind, "asset", "existing links stay assets");
sql.exec("DELETE FROM page_events");

const env = {
  YT_API_KEY: "yt-test",
  DB: {
    prepare(query) {
      let args = [];
      const p = {
        bind(...values) { args = values; return p; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args) }; },
        async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
      };
      return p;
    },
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
  },
};

const addClient = async (id, token) => sql.prepare("INSERT INTO client_config(client,client_name,status,portal_token_hash) VALUES(?,?,?,?)")
  .run(id, id, "client", token ? await sha256Hex(token) : null);
await addClient("acme", "token-acme");
await addClient("other", "token-other");
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,created_at,updated_at) VALUES('client','acme','youtube',?,?,?)")
  .run(JSON.stringify({ handle: "acmetrading" }), "2026-09-01", "2026-09-01");

// ---------- helpers ----------
assert.deepEqual(channelLookup("@acmetrading"), { forHandle: "acmetrading" });
assert.deepEqual(channelLookup("https://www.youtube.com/@acmetrading/videos"), { forHandle: "acmetrading" });
assert.deepEqual(channelLookup("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"), { id: "UCabcdefghijklmnopqrstuv" });
assert.equal(channelLookup("no spaces allowed"), null);
assert.equal(durationSeconds("PT1H2M3S"), 3723);
assert.equal(durationSeconds("PT45S"), 45);

// ---------- event.js stores the two tags ----------
const post = (body) => eventApi.onRequestPost({
  request: new Request("https://pulsify-ai.com/event?client=acme", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  env,
});
let res = await post({ kind: "page", event: "page_view", visitor_id: "probe", session_id: "s", page_id: "main", utm: { utm_source: "YouTube", utm_content: "vid00000001", utm_medium: "description" } });
assert.equal(res.status, 200);
row = sql.prepare("SELECT utm_source, utm_content FROM page_events WHERE visitor_id='probe'").get();
assert.deepEqual({ ...row }, { utm_source: "youtube", utm_content: "vid00000001" });
res = await post({ kind: "page", event: "page_view", visitor_id: "probe2", session_id: "s", page_id: "main" });
row = sql.prepare("SELECT utm_source, utm_content FROM page_events WHERE visitor_id='probe2'").get();
assert.deepEqual({ ...row }, { utm_source: null, utm_content: null });
sql.exec("DELETE FROM page_events");

// ---------- YouTube sync (mocked API) ----------
const calls = [];
let channelId = "UCchannelA0000000000000a";
const videosFor = (ids) => ids.map((id, i) => ({
  id,
  snippet: { title: `Video ${id}`, publishedAt: `2026-0${(i % 8) + 1}-10T00:00:00Z`, thumbnails: { high: { url: `https://img/${id}.jpg` } } },
  statistics: { viewCount: String(1000 * (i + 1)), likeCount: "5", commentCount: "2" },
  contentDetails: { duration: "PT12M5S" },
}));
const allIds = Array.from({ length: 60 }, (_, i) => `vid${String(i).padStart(8, "0")}`);
const fetcher = async (url) => {
  const u = new URL(url);
  calls.push(u.pathname.split("/").pop());
  assert.equal(u.searchParams.get("key"), "yt-test");
  const path = u.pathname.split("/").pop();
  let body;
  if (path === "channels") body = { items: [{ id: channelId, contentDetails: { relatedPlaylists: { uploads: "UU-list" } } }] };
  if (path === "playlistItems") {
    const page = u.searchParams.get("pageToken") === "p2" ? 1 : 0;
    const slice = allIds.slice(page * 50, page * 50 + 50);
    body = { items: slice.map((videoId) => ({ contentDetails: { videoId } })), ...(page === 0 ? { nextPageToken: "p2" } : {}) };
  }
  if (path === "videos") body = { items: videosFor(u.searchParams.get("id").split(",")) };
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
};
const now = Date.parse("2026-09-29T12:00:00.000Z");
let items = await syncClientVideos(env, { fetcher, now });
assert.equal(items, 60);
assert.deepEqual(calls, ["channels", "playlistItems", "playlistItems", "videos", "videos"], "pages through uploads and batches details by 50");
assert.equal(sql.prepare("SELECT COUNT(*) n FROM yt_videos WHERE client_id='acme'").get().n, 60);
assert.equal(sql.prepare("SELECT COUNT(*) n FROM asset_links WHERE client='acme' AND kind='video'").get().n, 121, "two links per video plus the channel link");
const firstVideo = sql.prepare("SELECT * FROM yt_videos WHERE video_id='vid00000000'").get();
assert.equal(firstVideo.duration_seconds, 725);
assert.equal(firstVideo.views, 1000);

calls.length = 0;
items = await syncClientVideos(env, { fetcher, now: now + 60 * 60 * 1000 });
assert.equal(items, 0);
assert.deepEqual(calls, [], "not due again within 6 hours");
items = await syncClientVideos(env, { fetcher, now: now + 7 * 60 * 60 * 1000 });
assert.equal(items, 60);
assert.equal(sql.prepare("SELECT COUNT(*) n FROM asset_links WHERE client='acme' AND kind='video'").get().n, 121, "no duplicate links on resync");
assert.equal(await ensureVideoLinks(env, "acme", ["vid00000000"]), 0);

// A changed handle means a new channel: the old channel's videos go.
channelId = "UCchannelB0000000000000b";
allIds.splice(2);
await syncClientVideos(env, { fetcher, now: now + 14 * 60 * 60 * 1000 });
assert.equal(sql.prepare("SELECT COUNT(*) n FROM yt_videos WHERE client_id='acme'").get().n, 2);
channelId = "UCchannelA0000000000000a";
sql.exec("DELETE FROM yt_videos");
sql.exec("DELETE FROM asset_links WHERE kind='video'");
await assert.rejects(syncClientVideos({ ...env, YT_API_KEY: "" }), /YT_API_KEY/);

// A wrong handle is the client's to fix: recorded, shown, backed off, never fails the job.
sql.exec("UPDATE integrations SET config_json='{\"handle\":\"no spaces allowed\"}' WHERE client_id='acme' AND provider='youtube'");
calls.length = 0;
assert.equal(await syncClientVideos(env, { fetcher, now }), 0);
assert.deepEqual(calls, [], "an impossible handle never reaches YouTube");
let report0 = await videoCashReport(env, "acme", { now });
assert.match(report0.sync_error.message, /not a YouTube handle/);
assert.equal(await syncClientVideos(env, { fetcher, now: now + 60 * 1000 }), 0);
assert.equal(sql.prepare("SELECT COUNT(*) n FROM sync_runs").get().n, 0, "the shared module never writes run rows itself");
// Fixing the handle retries at once, and success clears the error.
sql.exec("UPDATE integrations SET config_json='{\"handle\":\"@acmetrading\"}' WHERE client_id='acme' AND provider='youtube'");
assert.equal(await syncClientVideos(env, { fetcher, now: now + 2 * 60 * 1000 }), 2);
report0 = await videoCashReport(env, "acme", { now });
assert.equal(report0.sync_error, null);
// A channel that does not exist is also client-fixable.
const noChannel = async (url) => new Response(JSON.stringify(new URL(url).pathname.endsWith("channels") ? { items: [] } : {}), { status: 200 });
assert.equal(await syncClientVideos(env, { fetcher: noChannel, now: now + 3 * 60 * 1000, force: true }), 0);
assert.match((await videoCashReport(env, "acme", { now })).sync_error.message, /No YouTube channel found for @acmetrading/);
// A YouTube outage fails the job (so sync_runs shows it) and stays off the client's screen.
const outage = async () => new Response(JSON.stringify({ error: { message: "quotaExceeded" } }), { status: 403 });
await assert.rejects(syncClientVideos(env, { fetcher: outage, now: now + 4 * 60 * 1000, force: true }), /quotaExceeded/);
assert.equal((await videoCashReport(env, "acme", { now })).sync_error, null);
sql.exec("UPDATE integrations SET config_json='{\"handle\":\"acmetrading\"}' WHERE client_id='acme' AND provider='youtube'");
sql.exec("DELETE FROM snapshots");
sql.exec("DELETE FROM yt_videos");
sql.exec("DELETE FROM asset_links WHERE kind='video'");

// ---------- redirect ----------
sql.prepare("INSERT INTO yt_videos(client_id,video_id,channel_id,title,published_at,views,synced_at) VALUES(?,?,?,?,?,?,?)")
  .run("acme", "videoAAAAAA", "UCx", "The breakout setup", "2026-08-01T00:00:00Z", 500, "2026-09-29T00:00:00Z");
sql.prepare("INSERT INTO yt_videos(client_id,video_id,channel_id,title,published_at,views,synced_at) VALUES(?,?,?,?,?,?,?)")
  .run("acme", "videoBBBBBB", "UCx", "Why most traders fail", "2026-09-01T00:00:00Z", 20000, "2026-09-29T00:00:00Z");
await ensureVideoLinks(env, "acme", ["videoAAAAAA", "videoBBBBBB"], { now });
const linkFor = (video, placement) => sql.prepare("SELECT token FROM asset_links WHERE client='acme' AND video_id=? AND placement=?").get(video, placement).token;
const tokenA = linkFor("videoAAAAAA", "description");
let discordCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { discordCalls += 1; return new Response("{}"); };
try {
  res = await redirectApi.onRequestGet({ request: new Request(`https://pulsify-ai.com/a/${tokenA}`, { headers: { referer: "https://www.youtube.com/" } }), env, params: { token: tokenA } });
  assert.equal(res.status, 302);
  const location = new URL(res.headers.get("location"));
  assert.equal(location.origin + location.pathname, "https://pulsify-ai.com/acme");
  assert.equal(location.searchParams.get("utm_source"), "youtube");
  assert.equal(location.searchParams.get("utm_medium"), "description");
  assert.equal(location.searchParams.get("utm_campaign"), "acme");
  assert.equal(location.searchParams.get("utm_content"), "videoAAAAAA");
  const pinned = linkFor("videoAAAAAA", "pinned-comment");
  sql.prepare("UPDATE asset_links SET target_url=? WHERE token=?").run("https://acme.example.com/apply?ref=yt", pinned);
  res = await redirectApi.onRequestGet({ request: new Request(`https://pulsify-ai.com/a/${pinned}`), env, params: { token: pinned } });
  const custom = new URL(res.headers.get("location"));
  assert.equal(custom.origin + custom.pathname, "https://acme.example.com/apply");
  assert.equal(custom.searchParams.get("ref"), "yt", "existing query kept");
  assert.equal(custom.searchParams.get("utm_medium"), "pinned-comment");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM asset_events WHERE token IN (?,?)").get(tokenA, pinned).n, 2);
  res = await redirectApi.onRequestGet({ request: new Request("https://pulsify-ai.com/a/oldasset"), env, params: { token: "oldasset" } });
  assert.equal(res.headers.get("location"), "https://docs.example.com/x", "prospect asset links unchanged");
  assert.equal(discordCalls, 0, "no Discord webhook configured, and video links never try");
} finally {
  globalThis.fetch = realFetch;
}
// Operator asset list never shows video links.
const assetsRes = await assetsGet({ request: new Request("https://pulsify-ai.com/api/assets?client=acme", { headers: { "x-admin-key": "k" } }), env: { ...env, ADMIN_KEY: "k" } });
const assetsJson = await assetsRes.json();
assert.deepEqual(assetsJson.assets.map((a) => a.token), ["oldasset"]);

// ---------- the report ----------
const pe = sql.prepare("INSERT INTO page_events(client,visitor_id,event,email,referrer,utm_json,utm_source,utm_content,at) VALUES(?,?,?,?,?,?,?,?,?)");
const tagged = (visitor, video, at, email = null) => pe.run("acme", visitor, "page_view", email, "https://www.youtube.com/", "{}", "youtube", video, at);
// Alice: first click from video A, later from video B. Credit stays with A.
tagged("v-alice", "videoAAAAAA", "2026-09-20T10:00:00.000Z");
tagged("v-alice", "videoBBBBBB", "2026-09-22T10:00:00.000Z");
sql.prepare("INSERT INTO leads(client,email,visitor_id,applied_at) VALUES(?,?,?,?)").run("acme", "alice@example.com", "v-alice", "2026-09-20T10:05:00.000Z");
// Bob: phone clicked B later, laptop clicked A first. Earliest wins: A.
tagged("v-bob-phone", "videoBBBBBB", "2026-09-21T09:00:00.000Z", "bob@example.com");
tagged("v-bob-laptop", "videoAAAAAA", "2026-09-19T09:00:00.000Z", "bob@example.com");
// Carol: came from youtube.com without a tag.
pe.run("acme", "v-carol", "page_view", "carol@example.com", "https://www.youtube.com/", "{}", null, null, "2026-09-23T00:00:00.000Z");
// Erin: tagged with a label that isn't one of the client's videos.
tagged("v-erin", "ep-042-cold-email", "2026-09-24T00:00:00.000Z", "erin@example.com");
// Another client's visit never leaks in.
pe.run("other", "v-alice", "page_view", "alice@example.com", null, "{}", "youtube", "videoAAAAAA", "2026-09-20T00:00:00.000Z");

const touch = sql.prepare("INSERT INTO pipeline_touches(client_id,contact_email,kind,ts,source,external_id) VALUES(?,?,?,?,?,?)");
touch.run("acme", "alice@example.com", "application", "2026-09-20T10:05:00.000Z", "typeform", "t1");
touch.run("acme", "alice@example.com", "booking", "2026-09-21T10:00:00.000Z", "calendly", "t2");
touch.run("acme", "carol@example.com", "optin", "2026-09-23T00:01:00.000Z", "landing", "t3");
touch.run("acme", "erin@example.com", "application", "2026-09-24T00:01:00.000Z", "typeform", "t4");
touch.run("acme", "old@example.com", "application", "2026-01-05T00:00:00.000Z", "typeform", "t5");

const pay = (reference, amount, refunded, email, at) => {
  sql.prepare("INSERT INTO payments(client,amount_cents,currency,rail,reference,occurred_at,recorded_by,created_at,customer_email,refunded_cents) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .run("acme", amount, "usd", "stripe", reference, at, "stripe", at, email, refunded);
  return sql.prepare("SELECT id FROM payments WHERE reference=?").get(reference).id;
};
const match = (paymentId, kind, target) => sql.prepare(
  "INSERT INTO payment_matches(payment_id,client_id,target_kind,target_id,confidence,status,decided_by,created_at,updated_at) VALUES(?,?,?,?,1,'confirmed','auto',?,?)",
).run(paymentId, "acme", kind, target, "2026-09-25", "2026-09-25");
// Alice pays twice (one partly refunded) from a different card email.
match(pay("ch_a1", 500000, 100000, "alice.card@example.com", "2026-09-25T00:00:00.000Z"), "contact_email", "alice@example.com");
match(pay("ch_a2", 300000, 0, "alice.card@example.com", "2026-09-26T00:00:00.000Z"), "contact_email", "alice@example.com");
// Bob's payment is matched to a portal lead record carrying his email.
sql.prepare("INSERT INTO workspace_records(id,client_id,kind,title,data_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
  .run("rec-bob", "acme", "lead", "Bob", JSON.stringify({ email: "Bob@Example.com" }), "2026-09-01", "2026-09-01");
match(pay("ch_b1", 200000, 0, null, "2026-09-27T00:00:00.000Z"), "workspace_record", "rec-bob");
// Dave never visited: cash lands in "other".
match(pay("ch_d1", 150000, 0, "dave@example.com", "2026-09-27T00:00:00.000Z"), "contact_email", "dave@example.com");
// An old payment outside 30 days.
match(pay("ch_old", 90000, 0, "alice@example.com", "2026-06-01T00:00:00.000Z"), "contact_email", "alice@example.com");
// A payment nobody matched yet.
pay("ch_x", 77000, 0, "stranger@example.com", "2026-09-28T00:00:00.000Z");
// Clicks.
const click = sql.prepare("INSERT INTO asset_events(token,client,at) VALUES(?,?,?)");
click.run(tokenA, "acme", "2026-09-20T09:59:00.000Z");
click.run(linkFor("videoBBBBBB", "description"), "acme", "2026-09-21T08:59:00.000Z");
click.run(linkFor("videoBBBBBB", "pinned-comment"), "acme", "2026-09-22T09:59:00.000Z");

let report = await videoCashReport(env, "acme", { range: "all", now, origin: "https://pulsify-ai.com" });
const [first, second] = report.videos;
assert.equal(first.video_id, "videoAAAAAA", "the small video that sold ranks first");
assert.equal(first.cash_cents, 400000 + 300000 + 90000 + 200000, "Alice net of refund, plus Bob via his lead record");
assert.equal(first.buyers, 2, "Alice's three payments still make one buyer");
assert.equal(first.calls, 1);
assert.equal(first.applications, 1);
assert.equal(first.visits, 2, "Alice and Bob's laptop");
assert.equal(first.clicks, 3, "two description opens plus the pinned-comment open from the redirect checks");
assert.equal(first.links.description.clicks, 2);
assert.equal(first.links.pinned_comment.clicks, 1);
assert.equal(first.cash_per_1k_views_cents, Math.round((990000 / 500) * 1000));
assert.match(first.links.description.url, /^https:\/\/pulsify-ai\.com\/a\/[A-Za-z0-9]{8}$/);
assert.deepEqual(first.people.map((p) => [p.email, p.cash_cents, p.booked]), [["alice@example.com", 790000, true], ["bob@example.com", 200000, false]]);
assert.equal(second.video_id, "videoBBBBBB");
assert.equal(second.cash_cents, 0);
assert.equal(second.visits, 1, "Bob's phone was a first tag for that visitor");
assert.equal(second.clicks, 2);
assert.equal(report.buckets.youtube_untagged.applications, 2, "Carol untagged, Erin with an unknown tag");
assert.equal(report.buckets.other.cash_cents, 150000);
assert.equal(report.buckets.other.buyers, 1);
assert.equal(report.totals.youtube_cash_cents, 990000);
assert.equal(report.totals.best_video.video_id, "videoAAAAAA");
assert.deepEqual(report.unmatched_payments, { count: 1, cash_cents: 77000 });
assert.equal(report.handle, "acmetrading");
assert.equal(report.currency, "USD");

report = await videoCashReport(env, "acme", { range: "30d", now, origin: "https://pulsify-ai.com" });
assert.equal(report.videos[0].cash_cents, 400000 + 300000 + 200000, "old payment falls outside 30 days");
assert.equal(report.buckets.youtube_untagged.applications, 2);
assert.equal(report.buckets.other.applications, 0, "January application excluded");

const empty = await videoCashReport(env, "other", { now });
assert.equal(empty.videos.length, 0);
assert.equal(empty.handle, null);
assert.equal(empty.totals.youtube_cash_cents, 0);

// ---------- API auth ----------
res = await videoCashGet({ request: new Request("https://pulsify-ai.com/api/video-cash"), env });
assert.equal(res.status, 401);
res = await videoCashGet({ request: new Request("https://pulsify-ai.com/api/video-cash?client=acme", { headers: { "x-portal-token": "token-other" } }), env });
assert.equal(res.status, 403, "a token for one client cannot read another");
res = await videoCashGet({ request: new Request("https://pulsify-ai.com/api/video-cash?range=30d", { headers: { "x-portal-token": "token-acme" } }), env });
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.client, "acme");
assert.equal(body.range, "30d");
assert.equal(body.videos[0].video_id, "videoAAAAAA");

// Operators read any client's videos by name (operator console, ticket #36 follow-up).
env.ADMIN_KEY = "admin-test-key";
res = await videoCashGet({ request: new Request("https://pulsify-ai.com/api/video-cash?client=acme&range=30d", { headers: { "x-admin-key": "admin-test-key" } }), env });
assert.equal(res.status, 200);
assert.deepEqual((await res.json()).videos.map((row) => row.video_id), body.videos.map((row) => row.video_id), "operator sees the client's own ranking");
res = await videoCashGet({ request: new Request("https://pulsify-ai.com/api/video-cash", { headers: { "x-admin-key": "admin-test-key" } }), env });
assert.equal(res.status, 422, "operator must name a client");
delete env.ADMIN_KEY;

// ---------- worker schedule ----------
assert.deepEqual(scheduledJobs("*/30 * * * *"), ["payment-rematch", "client-videos", "client-instagram", "outliers"]);
assert.deepEqual(scheduledJobs("15 */6 * * *"), ["youtube"]);

console.log("cash-by-video: all checks passed");

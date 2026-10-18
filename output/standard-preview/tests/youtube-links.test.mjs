// Tracked links made from a YouTube address, and the ones the sync makes on its own (pulsify-saas #72).
import assert from "node:assert/strict";
import { sql, env, call } from "./_links-env.mjs";
import { onRequestGet as linksGet, onRequestPost as linksPost, onRequestPatch as linksPatch, onRequestDelete as linksDelete } from "../functions/api/tracked-links.js";
import { onRequestGet as redirectGet } from "../functions/a/[token].js";
import { AUTO_LINK_LATEST, ensureYouTubeLinks, syncClientVideos } from "../functions/_shared/video-cash.js";

const VIDEO = "dQw4w9WgXcQ";

// YouTube's public embed lookup is the only outside call the endpoint makes.
const realFetch = globalThis.fetch;
const lookups = [];
let oembed = (url) => ({ title: "Trading EP12: how I size a position", author_name: "Acme" });
globalThis.fetch = async (url, init) => {
  const u = new URL(String(url));
  if (u.hostname === "www.youtube.com" && u.pathname === "/oembed") {
    lookups.push(u.searchParams.get("url"));
    const body = oembed(u.searchParams.get("url"));
    return body ? new Response(JSON.stringify(body), { status: 200 }) : new Response("nope", { status: 404 });
  }
  return realFetch(url, init);
};

const post = (body, token = "token-acme") => call(linksPost, "POST", "/api/tracked-links", { body, token });
const list = (token = "token-acme") => call(linksGet, "GET", "/api/tracked-links", { token }).then((r) => r.body);
const open = (url) => redirectGet({
  request: new Request(url, { headers: { "cf-connecting-ip": "203.0.113.7", "user-agent": "test" } }),
  env,
  params: { token: new URL(url).pathname.split("/").pop() },
});

// ---------- a video address: straight to YouTube ----------
let res = await post({ youtube_url: `https://youtu.be/${VIDEO}?si=junk`, source: "instagram", placement: "bio" });
assert.equal(res.status, 201);
assert.equal(res.body.label, "Trading EP12: how I size a position", "the name comes from the video title");
assert.equal(res.body.slug, "trading-ep12-how-i-size-a-position");
assert.equal(res.body.url, "https://pulsify-ai.com/a/trading-ep12-how-i-size-a-position", "a readable link, not a random code");
assert.equal(res.body.tracks_people, false, "a plain YouTube link cannot follow the person");
assert.deepEqual(lookups, [`https://www.youtube.com/watch?v=${VIDEO}`], "looked up the clean address, not the one with tracking bits");
const direct = res.body;

let row = sql.prepare("SELECT * FROM asset_links WHERE token=?").get(direct.token);
assert.equal(row.kind, "link");
assert.equal(row.target_url, `https://www.youtube.com/watch?v=${VIDEO}`);
assert.equal(row.video_id, VIDEO);
assert.equal(row.origin, null, "a link a person made is not marked automatic");

// The redirect counts the click and leaves the YouTube address clean (no tags YouTube would drop).
let hop = await open(direct.url);
assert.equal(hop.status, 302);
assert.equal(hop.headers.get("location"), `https://www.youtube.com/watch?v=${VIDEO}`);
assert.equal(sql.prepare("SELECT COUNT(*) n FROM asset_events WHERE token=?").get(direct.token).n, 1, "the click is counted");

let links = await list();
let shown = links.links.find((l) => l.token === direct.token);
assert.equal(shown.from_youtube, true);
assert.equal(shown.tracks_people, false);
assert.equal(shown.clicks, 1);
assert.equal(shown.video_url, `https://www.youtube.com/watch?v=${VIDEO}`);
assert.equal(shown.is_new, false, "only the links the sync makes are marked new");

// ---------- the same video through the client's own page (case studies) ----------
res = await post({ youtube_url: `https://www.youtube.com/watch?v=${VIDEO}`, mode: "page", source: "email", placement: "newsletter", label: "Case study: Sam" });
assert.equal(res.status, 201);
assert.equal(res.body.url, "https://pulsify-ai.com/a/case-study-sam");
assert.equal(res.body.tracks_people, true);
row = sql.prepare("SELECT * FROM asset_links WHERE token=?").get(res.body.token);
assert.equal(row.target_url, "https://pulsify-ai.com/acme", "defaults to the client's Pulsify page");
assert.equal(row.video_url, `https://www.youtube.com/watch?v=${VIDEO}`, "the video is remembered");
hop = await open(res.body.url);
let landed = new URL(hop.headers.get("location"));
assert.equal(landed.pathname, "/acme");
assert.equal(landed.searchParams.get("utm_source"), "email");
assert.equal(landed.searchParams.get("utm_content"), `l-${res.body.token}`, "the visit is tied to this link, so the person can be followed");

res = await post({ youtube_url: `https://youtu.be/${VIDEO}`, mode: "page", page_url: "https://acme.com/case-studies/sam", label: "Sam on my site" });
assert.equal(res.status, 201);
hop = await open(res.body.url);
landed = new URL(hop.headers.get("location"));
assert.equal(`${landed.origin}${landed.pathname}`, "https://acme.com/case-studies/sam", "or the client's own page");
assert.equal(landed.searchParams.get("utm_content"), `l-${res.body.token}`);

res = await post({ youtube_url: `https://youtu.be/${VIDEO}`, mode: "page", page_url: "https://youtu.be/other" });
assert.equal(res.status, 422);
assert.match(res.body.error, /your own page/);
res = await post({ youtube_url: `https://youtu.be/${VIDEO}`, mode: "page", page_url: "javascript:alert(1)" });
assert.equal(res.status, 422);
res = await post({ youtube_url: "https://www.youtube.com/@acmetrading", mode: "page" });
assert.equal(res.status, 422);
assert.match(res.body.error, /one video/, "a page with the video on it needs a video, not a channel");

// ---------- a channel address ----------
oembed = () => null;
res = await post({ youtube_url: "https://www.youtube.com/@acmetrading/videos", source: "instagram", placement: "story" });
assert.equal(res.status, 201);
assert.equal(res.body.label, "YouTube channel @acmetrading");
assert.equal(res.body.slug, "youtube-channel-acmetrading");
row = sql.prepare("SELECT target_url, video_id FROM asset_links WHERE token=?").get(res.body.token);
assert.equal(row.target_url, "https://www.youtube.com/@acmetrading");
assert.equal(row.video_id, null);

// When YouTube's lookup is down the link still gets made, named by its address.
res = await post({ youtube_url: "https://youtu.be/AAAAAAAAAAA" });
assert.equal(res.status, 201);
assert.equal(res.body.label, "YouTube video AAAAAAAAAAA");

res = await post({ youtube_url: "https://www.youtube.com/" });
assert.equal(res.status, 422);
assert.match(res.body.error, /one video or one channel/);

// A plain address still works as before, and now also gets a readable ending.
res = await post({ label: "Instagram bio", source: "instagram", placement: "bio" });
assert.equal(res.status, 201);
assert.equal(res.body.url, "https://pulsify-ai.com/a/instagram-bio");
res = await post({ label: "Instagram bio", source: "instagram", placement: "bio" });
assert.equal(res.body.slug, "instagram-bio-2", "the same name twice gets a number");
res = await post({ label: "Instagram bio", slug: "instagram-bio" });
assert.equal(res.status, 409, "a typed ending that is taken is refused, not changed");
assert.match(res.body.error, /instagram-bio-2|already used/);
res = await post({ label: "Pricing page", slug: "Bad Ending!" });
assert.equal(res.status, 422, "a broken ending is a wrong entry, not a clash");
assert.match(res.body.error, /lowercase letters, numbers and hyphens/);
res = await post({ label: "Pricing page", slug: "admin" });
assert.match(res.body.error, /kept for the site/);
res = await post({ label: "Pricing page", slug: "pricing", target_url: "https://acme.com/pricing" });
assert.equal(res.status, 201);
assert.equal(res.body.url, "https://pulsify-ai.com/a/pricing");
const renameTarget = res.body.token;
res = await post({ label: "Bad", target_url: "ftp://acme.com" });
assert.equal(res.status, 422);
res = await post({ label: "" });
assert.equal(res.status, 422);
assert.equal((await post({ label: "x", youtube_url: `https://youtu.be/${VIDEO}` }, "wrong-token")).status >= 400, true, "needs a signed-in client");

// ---------- renaming the ending ----------
res = await call(linksPatch, "PATCH", `/api/tracked-links?token=${renameTarget}`, { body: { slug: "prices" } });
assert.equal(res.status, 200);
assert.equal(res.body.url, "https://pulsify-ai.com/a/prices");
res = await call(linksPatch, "PATCH", `/api/tracked-links?token=${renameTarget}`, { body: { slug: "instagram-bio" } });
assert.equal(res.status, 409);
res = await call(linksPatch, "PATCH", `/api/tracked-links?token=${renameTarget}`, { body: { slug: "prices" }, token: "token-other" });
assert.equal(res.status, 404, "another workspace cannot rename it");
// The old ending stops working, the new one and the token both work.
hop = await open("https://pulsify-ai.com/a/pricing");
assert.equal(hop.headers.get("location"), "https://pulsify-ai.com/", "an ending nobody holds goes to the home page");
hop = await open("https://pulsify-ai.com/a/prices");
assert.equal(new URL(hop.headers.get("location")).hostname, "acme.com");
hop = await open(`https://pulsify-ai.com/a/${renameTarget}`);
assert.equal(new URL(hop.headers.get("location")).hostname, "acme.com", "the token keeps working");

// ---------- another client does not see or collide with these ----------
assert.equal((await list("token-other")).links.length, 0);
res = await post({ label: "Instagram bio" }, "token-other");
assert.equal(res.body.slug, "instagram-bio-3", "on the shared domain, endings are unique across clients");
hop = await open("https://pulsify-ai.com/a/instagram-bio");
assert.equal(sql.prepare("SELECT client FROM asset_events WHERE token=(SELECT token FROM asset_links WHERE slug='instagram-bio')").get().client, "acme", "an ending always reaches its owner");

// ---------- archive ----------
res = await call(linksDelete, "DELETE", `/api/tracked-links?token=${direct.token}`);
assert.equal(res.status, 200);
hop = await open(direct.url);
assert.equal(hop.headers.get("location"), "https://pulsify-ai.com/", "an archived link stops redirecting");

// ---------- the sync makes a link for each new video ----------
sql.exec("DELETE FROM asset_links WHERE client='acme'");
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,created_at,updated_at) VALUES('client','acme','youtube',?,?,?)")
  .run(JSON.stringify({ handle: "acmetrading" }), "2026-09-01", "2026-09-01");

let uploads = ["vid00000008", "vid00000007", "vid00000006", "vid00000005", "vid00000004", "vid00000003", "vid00000002", "vid00000001"]; // newest first
const syncFetcher = async (url) => {
  const u = new URL(url);
  const path = u.pathname.split("/").pop();
  let body;
  if (path === "channels") body = { items: [{ id: "UCchannelA0000000000000a", contentDetails: { relatedPlaylists: { uploads: "UU-list" } } }] };
  if (path === "playlistItems") body = { items: uploads.map((videoId) => ({ contentDetails: { videoId } })) };
  if (path === "videos") {
    body = {
      items: u.searchParams.get("id").split(",").map((id) => ({
        id,
        snippet: { title: `Video ${id.slice(-1)}: the ${id.slice(-1)}th lesson`, publishedAt: "2026-09-01T00:00:00Z", thumbnails: {} },
        statistics: { viewCount: "10", likeCount: "1", commentCount: "0" },
        contentDetails: { duration: "PT10M" },
      })),
    };
  }
  return new Response(JSON.stringify(body), { status: 200 });
};
const T0 = Date.now() - 3600_000; // an hour ago, so the links count as new
await syncClientVideos(env, { fetcher: syncFetcher, now: T0 });
const auto = () => sql.prepare("SELECT * FROM asset_links WHERE client='acme' AND origin='youtube-sync' ORDER BY created_at DESC, id DESC").all();
assert.equal(auto().length, AUTO_LINK_LATEST, "the first sync makes links for the newest few, not all 8");
assert.deepEqual(auto().map((l) => l.video_id), uploads.slice(0, AUTO_LINK_LATEST), "newest on top");
const newest = auto()[0];
assert.equal(newest.label, "Video 8: the 8th lesson");
assert.equal(newest.slug, "video-8-the-8th-lesson");
assert.equal(newest.target_url, "https://www.youtube.com/watch?v=vid00000008");
assert.equal(newest.kind, "link");
assert.equal(newest.archived, 0);

links = await list();
const readyToCopy = links.links.filter((l) => l.automatic);
assert.equal(readyToCopy.length, AUTO_LINK_LATEST);
assert.ok(readyToCopy.every((l) => l.is_new && l.url.startsWith("https://pulsify-ai.com/a/video-")), "shown as new, with a readable address ready to copy");

// Nothing is made twice.
await syncClientVideos(env, { fetcher: syncFetcher, now: T0 + 7 * 3600_000 });
assert.equal(auto().length, AUTO_LINK_LATEST);

// A new upload gets its link on the next sync, and the client's archived one does not come back.
sql.prepare("UPDATE asset_links SET archived=1 WHERE token=?").run(newest.token);
uploads = ["vid00000009", ...uploads];
await syncClientVideos(env, { fetcher: syncFetcher, now: T0 + 14 * 3600_000 });
const after = auto();
assert.equal(after.length, AUTO_LINK_LATEST + 1, "one new link for the new video");
assert.equal(after[0].video_id, "vid00000009");
assert.equal(after.filter((l) => l.video_id === "vid00000008").length, 1, "the archived one stays archived");
assert.equal(after.find((l) => l.video_id === "vid00000008").archived, 1);

// A video that already has a link someone made by hand does not get a second one.
sql.exec("DELETE FROM asset_links WHERE client='acme'");
await post({ youtube_url: "https://youtu.be/vid00000008", label: "My own name for it" });
assert.equal(await ensureYouTubeLinks(env, "acme", [{ id: "vid00000008", title: "Video 8" }, { id: "vid00000007", title: "Video 7" }]), 1);
assert.equal(auto().length, 1);
assert.equal(auto()[0].video_id, "vid00000007");

// A second run racing the first cannot double-make a link (the database refuses it).
sql.prepare("DELETE FROM asset_links WHERE origin='youtube-sync'").run();
const racing = await Promise.all([
  ensureYouTubeLinks(env, "acme", [{ id: "vid00000099", title: "Race" }]),
  ensureYouTubeLinks(env, "acme", [{ id: "vid00000099", title: "Race" }]),
]);
assert.equal(racing.reduce((a, b) => a + b, 0) >= 1, true);
assert.equal(auto().filter((l) => l.video_id === "vid00000099").length, 1);

globalThis.fetch = realFetch;
console.log("youtube-links: all checks passed");

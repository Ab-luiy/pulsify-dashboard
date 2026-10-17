// Region setting, the main and flagged trackers, and the follower places panel (pulsify-saas #77).
// Zernio is mocked: nothing here makes a live call.
import assert from "node:assert/strict";
import { loadVisitors } from "../functions/_shared/lead-people.js";
import { DEFAULT_REGIONS, cleanRegions, likelyBot, regionOf } from "../functions/_shared/visitor-regions.js";
import { parseBreakdown, refreshFollowerPlaces } from "../functions/_shared/follower-places.js";
import { onRequestGet as regionsGet, onRequestPut as regionsPut } from "../functions/api/visitor-regions.js";
import { onRequestGet as visitorsGet } from "../functions/api/lead-visitors.js";
import { onRequestGet as placesGet } from "../functions/api/follower-places.js";
import { syncFollowerPlaces } from "../workers/sync/src/jobs/follower-places.js";
import { makeLeadDb } from "./lead-test-db.mjs";

// ---------- the rules ----------
assert.equal(regionOf("US"), "na");
assert.equal(regionOf("ca"), "na");
assert.equal(regionOf("DE"), "eu");
assert.equal(regionOf("GB"), "eu", "the UK is Europe");
assert.equal(regionOf("CH"), "eu");
assert.equal(regionOf("MX"), "latam", "Mexico is not in the default North America and Europe");
assert.equal(regionOf("IN"), "asia");
assert.equal(regionOf("ZZ"), "other");
assert.equal(regionOf(null), null);
assert.equal(regionOf("XX"), null, "Cloudflare's unknown");
assert.deepEqual(DEFAULT_REGIONS, ["na", "eu"]);
assert.deepEqual(cleanRegions(undefined), ["na", "eu"]);
assert.deepEqual(cleanRegions(["na", "mars", "na"]), ["na"]);
assert.deepEqual(cleanRegions(["mars"]), ["na", "eu"], "nothing valid falls back to the default");

const now = Date.now();
const old = new Date(now - 3600000).toISOString();
assert.equal(likelyBot({ signals: { active_seconds: 0, max_scroll: 0 }, last_at: old, stages: {} }, now), true, "no time and no scroll");
assert.equal(likelyBot({ signals: { active_seconds: 40, max_scroll: 0 }, last_at: old, stages: {} }, now), false, "time on the page is a person");
assert.equal(likelyBot({ signals: { active_seconds: 0, max_scroll: 20 }, last_at: old, stages: {} }, now), false, "scrolling is a person");
assert.equal(likelyBot({ signals: { active_seconds: 0, max_scroll: 0, plays: 1 }, last_at: old, stages: {} }, now), false, "pressing play is a person");
assert.equal(likelyBot({ signals: { active_seconds: 0, max_scroll: 0 }, last_at: new Date(now - 20000).toISOString(), stages: {} }, now), false, "a visit this young has not had time yet");
assert.equal(likelyBot({ signals: { active_seconds: 50, max_scroll: 50 }, user_agent: "Mozilla/5.0 (compatible; Googlebot/2.1)", last_at: old, stages: {} }, now), true, "a robot says so");
assert.equal(likelyBot({ email: "a@b.com", signals: { active_seconds: 0, max_scroll: 0 }, last_at: old, stages: {} }, now), false, "a known person is never a bot");

// ---------- the two trackers ----------
const db = makeLeadDb();
const { sql, env, NOW, ago, addClient, page, engage, lead } = db;
await addClient("acme", "token-acme");
await addClient("other", "token-other");
const real = { active_seconds: 90, max_scroll: 70, load_id: "x" };
const visit = (id, country, extra = {}) => {
  page("acme", id, "page_view", extra.at || ago(0, 2), { country, city: country ? "Somewhere" : null, ua: extra.ua });
  if (extra.engaged !== false) engage("acme", id, extra.at || ago(0, 2), { ...real, load_id: id }, { country });
};
visit("us-1", "US");
visit("de-1", "DE");
visit("gb-1", "GB");
visit("in-1", "IN");
visit("br-1", "BR");
visit("nocountry-1", null);
visit("bot-us", "US", { engaged: false });
visit("bot-de", "DE", { engaged: false, ua: "Mozilla/5.0 (compatible; bingbot/2.0)" });
visit("bot-in", "IN", { engaged: false });
page("acme", "fresh-us", "page_view", new Date(NOW - 30000).toISOString(), { country: "US" });
// A known person from India (applied) and a known person from the US who barely moved.
page("acme", "known-in", "page_view", ago(0, 3), { country: "IN", email: "ravi@example.com" });
lead("acme", "ravi@example.com", ago(0, 3), { name: "Ravi Rao", visitor: "known-in" });
page("acme", "known-us", "page_view", ago(0, 3), { country: "US", email: "kay@example.com" });
lead("acme", "kay@example.com", ago(0, 3), { name: "Kay Cole", visitor: "known-us" });
// Another client's visitor from India does not touch acme's trackers.
page("other", "o-in", "page_view", ago(0, 2), { country: "IN" });

const bucketOf = (list, id) => list.find((p) => p.key === `v:${id}` || p.key === id)?.bucket;
const flagOf = (list, id) => list.find((p) => p.key === `v:${id}` || p.key === id)?.flag;
let feed = await loadVisitors(env, "acme", { since: ago(2), now: NOW });
assert.deepEqual(feed.regions, ["na", "eu"], "default regions");
for (const id of ["us-1", "de-1", "gb-1", "nocountry-1", "fresh-us"]) assert.equal(bucketOf(feed.people, id), "main", `${id} is main`);
for (const id of ["in-1", "br-1"]) {
  assert.equal(bucketOf(feed.people, id), "flagged", `${id} is flagged`);
  assert.equal(flagOf(feed.people, id), "outside_region");
}
assert.equal(flagOf(feed.people, "bot-us"), "likely_bot");
assert.equal(flagOf(feed.people, "bot-de"), "likely_bot");
assert.equal(flagOf(feed.people, "bot-in"), "outside_region", "outside the regions comes first");
assert.equal(bucketOf(feed.people, "ravi@example.com"), "flagged", "a known person from India sits in the flagged tracker");
assert.equal(flagOf(feed.people, "ravi@example.com"), "outside_region", "and is not called a bot");
assert.equal(bucketOf(feed.people, "kay@example.com"), "main");
assert.equal(feed.people.some((p) => p.key === "v:o-in"), false, "no other client's visitors");

// The setting, through the API.
const get = (handler, path, headers = { "x-portal-token": "token-acme" }) => handler({ request: new Request(`https://pulsify-ai.com${path}`, { headers }), env });
const put = (body, headers = { "x-portal-token": "token-acme" }) => regionsPut({
  request: new Request("https://pulsify-ai.com/api/visitor-regions", { method: "PUT", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }),
  env,
});
let res = await get(regionsGet, "/api/visitor-regions");
let body = await res.json();
assert.deepEqual(body.regions, ["na", "eu"]);
assert.ok(body.groups.find((g) => g.id === "latam"));
assert.equal((await put({ regions: [] })).status, 422, "at least one region");
assert.equal((await put({ regions: ["na"] }, {})).status, 401);
assert.equal((await put({ regions: ["na"], client: "other" })).status, 403, "not for another client");
assert.equal((await put({ regions: ["na"] })).status, 200);
feed = await loadVisitors(env, "acme", { since: ago(2), now: NOW });
assert.equal(bucketOf(feed.people, "de-1"), "flagged", "Europe no longer counts once the client picks North America only");
assert.equal(bucketOf(feed.people, "us-1"), "main");
assert.deepEqual((await (await get(regionsGet, "/api/visitor-regions?client=other", { "x-admin-key": "admin-test-key" })).json()).regions, ["na", "eu"], "another client keeps the default");
assert.equal((await put({ regions: ["na", "eu", "asia"] })).status, 200);
feed = await loadVisitors(env, "acme", { since: ago(2), now: NOW });
assert.equal(bucketOf(feed.people, "in-1"), "main", "Asia added: India is main");
await put({ regions: ["na", "eu"] });

res = await get(visitorsGet, "/api/lead-visitors?range=24h");
body = await res.json();
assert.equal(body.totals.main + body.totals.flagged, body.people.length, "every visitor is in one tracker");
assert.ok(body.totals.flagged >= 6 && body.totals.main >= 5);
assert.deepEqual(body.regions, ["na", "eu"]);

// ---------- where followers are from ----------
assert.deepEqual(parseBreakdown({ US: 500, DE: "120", FR: 0, "": 4 }), [{ place: "US", followers: 500 }, { place: "DE", followers: 120 }], "a map of name to count");
assert.deepEqual(parseBreakdown([{ name: "GB", value: 90 }, { name: "US", value: 300 }]), [{ place: "US", followers: 300 }, { place: "GB", followers: 90 }], "a list");
assert.deepEqual(parseBreakdown({ total_value: { breakdowns: [{ dimension_keys: ["country"], results: [{ dimension_values: ["CA"], value: 70 }, { dimension_values: ["US"], value: 80 }] }] } }), [{ place: "US", followers: 80 }, { place: "CA", followers: 70 }], "Meta's own shape");
assert.equal(parseBreakdown(Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`C${i}`, 100 - i]))).length, 45, "top 45");
assert.deepEqual(parseBreakdown(null), []);

// Not connected: the panel says so, and nothing is requested.
let calls = 0;
const fetcher = async (url) => { calls += 1; return { ok: true, json: async () => demographics, url }; };
let demographics = { success: true, demographics: { country: { US: 600, DE: 250, IN: 100, BR: 50 }, city: { "Austin, Texas": 120, "Berlin, Berlin": 90 } } };
env.ZERNIO_API_KEY = "test-key-never-sent";
assert.deepEqual(await refreshFollowerPlaces(env, "acme", { fetcher }), { connected: false, saved: 0 });
assert.equal(await syncFollowerPlaces(env, { fetcher }), 0);
assert.equal(calls, 0, "no connected Instagram, no request");
res = await get(placesGet, "/api/follower-places");
body = await res.json();
assert.equal(body.connected, false);
assert.deepEqual(body.countries, []);
assert.match(body.note, /Connect Instagram/);
assert.equal((await get(placesGet, "/api/follower-places", {})).status, 401);

// Connected (a mocked account): totals are saved and read back with the share inside the regions.
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,created_at,updated_at) VALUES('client','acme','instagram',?,?,?)").run(JSON.stringify({ account_id: "acc-1", username: "acme" }), ago(1), ago(1));
const seen = [];
const mocked = async (url, init) => { seen.push({ url: String(url), method: init?.method || "GET" }); calls += 1; return { ok: true, json: async () => demographics }; };
assert.deepEqual(await refreshFollowerPlaces(env, "acme", { fetcher: mocked }), { connected: true, saved: 6 });
assert.match(seen[0].url, /\/v1\/analytics\/instagram\/demographics\?accountId=acc-1&metric=follower_demographics&breakdown=country%2Ccity&timeframe=this_month$/);
assert.equal(seen[0].method, "GET");
body = await (await get(placesGet, "/api/follower-places")).json();
assert.equal(body.connected, true);
assert.equal(body.total, 1000);
assert.equal(body.inside_regions, 0.85, "600 US + 250 DE of 1000 sit in North America and Europe");
assert.deepEqual(body.regions.map((r) => [r.id, r.followers]), [["na", 600], ["eu", 250], ["latam", 50], ["asia", 100]].sort((a, b) => ["na", "eu", "latam", "oceania", "asia", "mea"].indexOf(a[0]) - ["na", "eu", "latam", "oceania", "asia", "mea"].indexOf(b[0])));
assert.deepEqual(body.cities[0], { place: "Austin, Texas", followers: 120 });
assert.ok(body.as_of);
// With the client on North America only, the share moves.
await put({ regions: ["na"] });
assert.equal((await (await get(placesGet, "/api/follower-places")).json()).inside_regions, 0.6);
// Under 100 followers Meta returns nothing: the saved numbers stay, with a plain note.
demographics = { success: true, demographics: { country: {}, city: {} }, note: "Not enough followers" };
const kept = await refreshFollowerPlaces(env, "acme", { fetcher: mocked });
assert.equal(kept.saved, 0);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM follower_places WHERE client_id='acme'").get().n, 6);
// Another client sees none of it.
assert.equal((await (await get(placesGet, "/api/follower-places", { "x-portal-token": "token-other" })).json()).total, 0);
// An error from Zernio is an error, not an empty panel.
const failing = async () => ({ ok: false, status: 402, json: async () => ({ error: "payment method required" }) });
await assert.rejects(refreshFollowerPlaces(env, "acme", { fetcher: failing }), /402/);
// The daily job reaches only clients with a connected Instagram.
demographics = { success: true, demographics: { country: { US: 10 }, city: {} } };
assert.equal(await syncFollowerPlaces(env, { fetcher: mocked }), 1);
delete env.ZERNIO_API_KEY;
assert.equal(await syncFollowerPlaces(env, { fetcher: mocked }), 0, "no key, no request");

console.log("visitor-regions: all checks passed");

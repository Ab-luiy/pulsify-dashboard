// Tracked links on the client's own domain (pulsify-saas #73): host rules, the setup API, the check,
// and the redirect that answers on go.clientname.com through the real middleware.
import assert from "node:assert/strict";
import { sql, env, call } from "./_links-env.mjs";
import { pulsifyMiddleware } from "../functions/_middleware.js";
import { onRequestGet as linksGet, onRequestPost as linksPost } from "../functions/api/tracked-links.js";
import {
  onRequestGet as domainGet, onRequestPost as domainPost, onRequestDelete as domainDelete,
} from "../functions/api/link-domain.js";
import { MAX_LINK_DOMAINS, dnsSetup, handleLinkHostRequest, isOwnHost, normalizeLinkHost } from "../functions/_shared/link-domains.js";

// ---------- what a person can type ----------
const ok = (raw) => normalizeLinkHost(raw).host;
assert.equal(ok("go.acme-test.com"), "go.acme-test.com");
assert.equal(ok("  GO.Acme-Test.com  "), "go.acme-test.com");
assert.equal(ok("https://go.acme-test.com/case-study"), "go.acme-test.com", "a pasted address is trimmed to the host");
assert.equal(ok("go.acme-test.com:443"), "go.acme-test.com");
assert.equal(ok("links.shop.acme-test.co.uk"), "links.shop.acme-test.co.uk");
assert.equal(ok("go.acme-test.co.uk"), "go.acme-test.co.uk");
for (const [raw, pattern] of [
  ["", /Type the address/],
  ["acme-test.com", /Use a subdomain such as go\.acme-test\.com/],
  ["www.acme-test.com".replace("www.", ""), /subdomain/],
  ["acme-test.co.uk", /subdomain/],
  ["pulsify-ai.com", /belongs to Pulsify/],
  ["go.pulsify-ai.com", /belongs to Pulsify/],
  ["acme.pages.dev", /belongs to Pulsify/],
  ["localhost", /web address|Pulsify/],
  ["192.168.1.10", /not a number/],
  ["go.acme_test.com", /web address/],
  ["go..acme-test.com", /web address/],
  ["not an address", /web address/],
  ["go.acme-test.123", /web address/],
]) {
  const result = normalizeLinkHost(raw);
  assert.ok(result.error && pattern.test(result.error), `${raw} -> ${JSON.stringify(result)}`);
}
assert.deepEqual(dnsSetup("go.acme-test.com", env), { type: "CNAME", name: "go", full_name: "go.acme-test.com", target: "pulsify-funnels.pages.dev" });
assert.equal(dnsSetup("links.shop.acme-test.com", env).name, "links.shop");
assert.equal(dnsSetup("go.acme-test.co.uk", env).name, "go");
assert.equal(isOwnHost("pulsify-ai.com"), true);
assert.equal(isOwnHost("evilpulsify-ai.com"), false, "only real subdomains are ours");
assert.equal(isOwnHost("pulsify-funnels.pages.dev"), true);

const setDomain = (host, token = "token-acme") => call(domainPost, "POST", "/api/link-domain", { body: { host }, token });
const check = (fetcher, token = "token-acme") => {
  env.LINK_CHECK_FETCH = fetcher;
  sql.exec("UPDATE link_domains SET checked_at=NULL"); // skip the 10-second pause between checks
  return call(domainPost, "POST", "/api/link-domain", { body: { action: "check" }, token });
};

// ---------- setting it up ----------
let res = await call(domainGet, "GET", "/api/link-domain");
assert.equal(res.body.domain, null, "nothing set yet");
res = await setDomain("acme-test.com");
assert.equal(res.status, 422);
assert.match(res.body.error, /subdomain/);
res = await setDomain("https://go.acme-test.com/");
assert.equal(res.status, 201);
assert.equal(res.body.domain.host, "go.acme-test.com");
assert.equal(res.body.domain.status, "waiting");
assert.deepEqual(res.body.domain.setup, { type: "CNAME", name: "go", full_name: "go.acme-test.com", target: "pulsify-funnels.pages.dev" });
assert.equal((await setDomain("go.acme-test.com")).status, 200, "setting the same address again changes nothing");
res = await setDomain("go.acme-test.com", "token-other");
assert.equal(res.status, 409, "one address belongs to one client");
assert.match(res.body.error, /already used by another account/);
assert.equal((await call(domainGet, "GET", "/api/link-domain", { token: "token-other" })).body.domain, null, "workspaces stay apart");
assert.equal((await call(domainPost, "POST", "/api/link-domain", { body: { host: "go.x.com" }, token: "nope" })).status >= 400, true);

// Until it is switched on, links keep the shared address.
res = await call(linksPost, "POST", "/api/tracked-links", { body: { label: "Case study", target_url: "https://acme.com/case", source: "instagram", placement: "bio" } });
assert.equal(res.body.url, "https://pulsify-ai.com/a/case-study");
const caseStudy = res.body;

// ---------- the check ----------
const dnsAnswer = (data) => new Response(JSON.stringify({ Answer: data ? [{ type: 5, data }] : [] }), { status: 200 });
const siteAnswer = (host) => new Response(JSON.stringify({ pulsify: "link-domain", host, active: false }), { status: 200 });
const calls = [];
const world = ({ cname = null, live = false }) => async (url) => {
  const u = new URL(url);
  calls.push(`${u.hostname}${u.pathname}`);
  if (u.hostname === "cloudflare-dns.com") return dnsAnswer(cname);
  if (live && u.pathname === "/__link-check") return siteAnswer(u.hostname);
  throw new Error("could not connect");
};

res = await check(world({}));
assert.equal(res.body.domain.status, "waiting");
assert.equal(res.body.domain.dns_ok, false);
assert.match(res.body.domain.message, /can't see the record yet/);
assert.match(res.body.domain.message, /up to an hour/);

res = await check(world({ cname: "pulsify-funnels.pages.dev." }));
assert.equal(res.body.domain.status, "waiting");
assert.equal(res.body.domain.dns_ok, true);
assert.match(res.body.domain.message, /DNS record is right/);
assert.match(res.body.domain.message, /Nothing more for you to do/);

res = await call(domainPost, "POST", "/api/link-domain", { body: { action: "check" } });
assert.equal(res.status, 200, "pressing check twice in a row does not hammer the lookup");

res = await check(world({ cname: "someone-else.example." }));
assert.equal(res.body.domain.dns_ok, false, "a record that points elsewhere is not ours");

assert.equal((await check(world({}), "token-other")).status, 404, "the other client has no domain to check");

// ---------- while it waits, the domain already redirects once attached ----------
const hit = (url, init = {}) => pulsifyMiddleware({
  request: new Request(url, { headers: { "cf-connecting-ip": "198.51.100.4", "user-agent": "visitor", ...(init.headers || {}) }, method: init.method || "GET" }),
  env,
  next: async () => new Response("the site", { status: 200 }),
  data: {},
  waitUntil: () => {},
});
const clicks = (token) => sql.prepare("SELECT COUNT(*) n FROM asset_events WHERE token=?").get(token).n;

let r = await hit("https://go.acme-test.com/case-study");
assert.equal(r.status, 302);
let landed = new URL(r.headers.get("location"));
assert.equal(`${landed.origin}${landed.pathname}`, "https://acme.com/case", "the ending leads to the link's destination");
assert.equal(landed.searchParams.get("utm_source"), "instagram");
assert.equal(landed.searchParams.get("utm_medium"), "bio");
assert.equal(landed.searchParams.get("utm_campaign"), "acme");
assert.equal(landed.searchParams.get("utm_content"), `l-${caseStudy.token}`, "same tags as the shared link, so visits and sales trace back");
assert.equal(clicks(caseStudy.token), 1, "the click is counted");
const event = sql.prepare("SELECT client, ip, user_agent FROM asset_events WHERE token=?").get(caseStudy.token);
assert.deepEqual({ ...event }, { client: "acme", ip: "198.51.100.4", user_agent: "visitor" });

r = await hit(`https://go.acme-test.com/${caseStudy.token}`);
assert.equal(r.status, 302, "the token works on the client's domain too");
assert.equal(clicks(caseStudy.token), 2);
r = await hit("https://GO.Acme-Test.com/Case-Study/");
assert.equal(r.status, 302, "capitals and a closing slash don't matter");
assert.equal(clicks(caseStudy.token), 3);
r = await hit("https://go.acme-test.com/case-study", { method: "HEAD" });
assert.equal(r.status, 302);
assert.equal(clicks(caseStudy.token), 3, "a HEAD check is not a click");

// Wrong ending, the home page and other paths go to the client's own page; nothing else of ours answers here.
const fallback = "https://pulsify-ai.com/acme";
for (const path of ["/", "/nope", "/case-study/extra", "/api/tracked-links", "/app", "/portal", "/admin", "/login", "/favicon.ico", "/%E0%A4%A"]) {
  r = await hit(`https://go.acme-test.com${path}`);
  assert.equal(r.status, 302, path);
  assert.equal(r.headers.get("location"), fallback, `${path} must not serve the site on a client's domain`);
}
r = await hit("https://go.acme-test.com/robots.txt");
assert.equal(r.status, 200);
assert.match(await r.text(), /Disallow: \//);
r = await hit("https://go.acme-test.com/__link-check");
assert.deepEqual(await r.json(), { pulsify: "link-domain", host: "go.acme-test.com", active: false });
r = await hit("https://go.acme-test.com/case-study", { method: "POST" });
assert.equal(r.status, 405);
assert.equal(r.headers.get("allow"), "GET, HEAD");

// Another client's link does not answer on this domain.
await call(linksPost, "POST", "/api/tracked-links", { token: "token-other", body: { label: "Secret offer", target_url: "https://other.com/offer" } });
r = await hit("https://go.acme-test.com/secret-offer");
assert.equal(r.headers.get("location"), fallback, "acme's domain only answers acme's links");
const otherToken = sql.prepare("SELECT token FROM asset_links WHERE client='other'").get().token;
r = await hit(`https://go.acme-test.com/${otherToken}`);
assert.equal(r.headers.get("location"), fallback);
// An archived link stops answering.
await call(linksGet, "GET", "/api/tracked-links"); // (read path still works with a domain set)
sql.prepare("UPDATE asset_links SET archived=1 WHERE token=?").run(caseStudy.token);
r = await hit("https://go.acme-test.com/case-study");
assert.equal(r.headers.get("location"), fallback);
sql.prepare("UPDATE asset_links SET archived=0 WHERE token=?").run(caseStudy.token);

// Hosts that are not a client's domain are untouched: the site answers as it always did.
r = await hit("https://pulsify-ai.com/case-study");
assert.equal(await r.text(), "the site", "our own domain is not affected");
r = await hit("https://unknown-domain.example/case-study");
assert.equal(await r.text(), "the site", "an unregistered host falls through");
assert.equal(await handleLinkHostRequest({ request: new Request("https://pulsify-ai.com/x"), env }), null);
assert.equal(await handleLinkHostRequest({ request: new Request("https://go.acme-test.com/x"), env: {} }), null, "no database: step aside");

// And the shared address keeps working next to it.
r = await hit(`https://pulsify-ai.com/a/case-study`);
assert.equal(r.status, 200, "(the /a/ route is a Pages function behind the middleware, not part of it)");

// ---------- switching it on ----------
res = await check(world({ cname: "pulsify-funnels.pages.dev.", live: true }));
assert.equal(res.body.domain.status, "active");
assert.match(res.body.domain.message, /Working/);
assert.ok(res.body.domain.activated_at);
assert.ok(calls.includes("go.acme-test.com/__link-check"), "the check really asked the domain");

res = await call(linksGet, "GET", "/api/tracked-links");
assert.deepEqual(res.body.link_domain, { host: "go.acme-test.com", status: "active" });
assert.equal(res.body.links.find((l) => l.token === caseStudy.token).url, "https://go.acme-test.com/case-study", "links now show the client's own domain");
res = await call(linksPost, "POST", "/api/tracked-links", { body: { youtube_url: "https://youtu.be/AAAAAAAAAAA", label: "Trading EP13", mode: "page" } });
assert.equal(res.body.url, "https://go.acme-test.com/trading-ep13");
r = await hit("https://go.acme-test.com/trading-ep13");
landed = new URL(r.headers.get("location"));
assert.equal(`${landed.origin}${landed.pathname}`, "https://pulsify-ai.com/acme", "a link with no destination of its own lands on the client's page");
assert.equal(landed.searchParams.get("utm_content"), `l-${res.body.token}`);

// A client on its own domain can reuse an ending another client holds.
res = await call(linksPost, "POST", "/api/tracked-links", { token: "token-other", body: { label: "Trading EP13" } });
assert.equal(res.body.slug, "trading-ep13-2", "a shared-domain client never takes an ending someone already holds");
res = await call(linksPost, "POST", "/api/tracked-links", { body: { label: "Other offer", slug: "secret-offer", target_url: "https://acme.com/o" } });
assert.equal(res.status, 201, "acme is on its own domain, so it may reuse an ending another client uses");
assert.equal(res.body.url, "https://go.acme-test.com/secret-offer");
res = await call(linksPost, "POST", "/api/tracked-links", { token: "token-other", body: { label: "Another", slug: "secret-offer" } });
assert.equal(res.status, 409, "the shared-domain client cannot take an ending that is already used");

// ---------- every domain, for the operator ----------
res = await call(domainGet, "GET", "/api/link-domain?all=1");
assert.equal(res.status, 401, "clients cannot list everyone's domains");
env.ADMIN_KEY = "admin-test-key";
res = await call(domainGet, "GET", "/api/link-domain?all=1", { token: null, headers: { "x-admin-key": "admin-test-key" } });
assert.equal(res.status, 200);
assert.equal(res.body.limit, MAX_LINK_DOMAINS);
assert.deepEqual(res.body.domains.map((d) => [d.host, d.status]), [["go.acme-test.com", "active"]]);
assert.deepEqual(res.body.to_attach, [], "nothing waits to be attached");

// ---------- removing it ----------
// acme's "secret-offer" ending clashes with other's on the shared domain once acme's domain is gone.
await call(linksPost, "POST", "/api/tracked-links", { token: "token-other", body: { label: "Secret offer" } });
res = await call(domainDelete, "DELETE", "/api/link-domain");
assert.equal(res.status, 200);
assert.equal((await call(domainGet, "GET", "/api/link-domain")).body.domain, null);
const endings = sql.prepare("SELECT client, slug FROM asset_links WHERE slug LIKE 'secret-offer%' ORDER BY client, slug").all().map((x) => `${x.client}:${x.slug}`);
assert.equal(new Set(sql.prepare("SELECT slug FROM asset_links WHERE slug IS NOT NULL").all().map((x) => x.slug)).size, sql.prepare("SELECT COUNT(slug) n FROM asset_links").get().n,
  `no two links share an ending on the shared domain once the domain is gone: ${endings}`);
res = await call(linksGet, "GET", "/api/tracked-links");
assert.ok(res.body.links.every((l) => l.url.startsWith("https://pulsify-ai.com/a/")), "links go back to the shared address");
r = await hit("https://go.acme-test.com/case-study");
assert.equal(await r.text(), "the site", "a removed domain is not answered any more");

// ---------- changing it, and the limit ----------
await setDomain("go.acme-test.com");
res = await setDomain("links.acme-test.com");
assert.equal(res.body.domain.host, "links.acme-test.com");
assert.equal(res.body.domain.status, "waiting", "a new address starts again");
assert.equal(sql.prepare("SELECT COUNT(*) n FROM link_domains WHERE client='acme'").get().n, 1, "one domain per client");
for (let i = 0; i < MAX_LINK_DOMAINS; i += 1) {
  sql.prepare("INSERT OR IGNORE INTO link_domains(host, client, status, created_at) VALUES (?,?, 'waiting', ?)").run(`go.filler${i}.com`, `filler-${i}`, "2026-10-17T00:00:00.000Z");
}
res = await setDomain("go.other-test.com", "token-other");
assert.equal(res.status, 409);
assert.match(res.body.error, /can't add more custom addresses/);
res = await setDomain("links2.acme-test.com");
assert.equal(res.status, 201, "a client who already has one can still change it when we are full");

console.log("link-domains: all checks passed");

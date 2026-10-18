// Tracked links on the client's own domain (pulsify-saas #73): go.clientname.com/case-study.
//
// How it works. The client points a subdomain (CNAME) at the Pages project. Pulsify attaches that
// domain to the project once (Cloudflare dashboard, Custom domains, or its API), and Cloudflare issues
// the certificate. From then on every request for that host reaches functions/_middleware.js, which
// calls handleLinkHostRequest() first. On a link domain the site answers ONLY tracked links:
//   /<ending or token>  counts the click and redirects (same code as pulsify-ai.com/a/...)
//   /__link-check       says "this host is wired up" (the Check button reads it)
//   /robots.txt         keeps search engines out
//   anything else       goes to the client's own page. The portal, the API and the console never answer here.
//
// Cloudflare Pages limits (checked 2026-10-17, developers.cloudflare.com/pages/platform/limits):
// custom domains per project 100 Free, 250 Pro, 500 Business and Enterprise; 100 projects per account.
// Our own hostnames use some, so MAX_LINK_DOMAINS keeps a margin on the Free plan.

import { findClientLink, followLink, redirect } from "./link-redirect.js";
import { domainForHost } from "./link-domain-store.js";

export { domainForClient, domainForHost } from "./link-domain-store.js";

export const MAX_LINK_DOMAINS = 90;
const DEFAULT_TARGET = "pulsify-funnels.pages.dev";
const SHARED_ORIGIN = "https://pulsify-ai.com";
const CHECK_PATH = "/__link-check";
const CHECK_COOLDOWN_MS = 10_000;

// Two-part endings where "name.co.uk" is already the bare domain.
const TWO_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "me.uk", "ltd.uk", "com.au", "net.au", "org.au", "co.nz", "co.za", "co.in",
  "com.br", "com.mx", "com.tr", "com.sg", "com.hk", "co.jp", "co.il", "com.ar", "com.co", "com.ng",
]);

// How many labels the bare domain has: clientname.com is 2, clientname.co.uk is 3.
function registeredLabels(labels) {
  return TWO_PART_SUFFIXES.has(labels.slice(-2).join(".")) ? 3 : 2;
}

export function linkDomainTarget(env) {
  return String(env?.LINK_DOMAIN_TARGET || DEFAULT_TARGET).toLowerCase();
}

// Hosts that are ours already. Requests for them never look up the table.
export function isOwnHost(host) {
  const h = String(host || "").toLowerCase();
  return h === "pulsify-ai.com" || h.endsWith(".pulsify-ai.com")
    || h.endsWith(".pages.dev") || h.endsWith(".workers.dev")
    || h === "localhost" || h.endsWith(".localhost") || h === "127.0.0.1" || h === "[::1]";
}

/**
 * What the person typed -> { host } or { error } (one plain sentence).
 * Accepts "go.clientname.com", "https://go.clientname.com/", "GO.ClientName.com:443".
 */
export function normalizeLinkHost(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return { error: "Type the address you want your links on, for example go.yourname.com." };
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { error: "That doesn't look like a web address. Try go.yourname.com." };
  }
  if (!/^https?:$/.test(url.protocol)) return { error: "Type just the address, for example go.yourname.com." };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host.length > 253 || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) {
    return { error: "Use a name like go.yourname.com, not a number." };
  }
  const labels = host.split(".");
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    return { error: "That doesn't look like a web address. Try go.yourname.com." };
  }
  if (!/^([a-z]{2,}|xn--[a-z0-9-]+)$/.test(labels[labels.length - 1])) {
    return { error: "That doesn't look like a web address. Try go.yourname.com." };
  }
  if (isOwnHost(host)) return { error: "That address belongs to Pulsify. Use your own, like go.yourname.com." };
  if (labels.length <= registeredLabels(labels)) {
    return { error: `Use a subdomain such as go.${host}. The plain address ${host} would have to move your whole website to us.` };
  }
  return { host };
}

// The one record the client adds at their DNS provider.
export function dnsSetup(host, env) {
  const labels = host.split(".");
  const name = labels.slice(0, Math.max(1, labels.length - registeredLabels(labels))).join(".");
  return { type: "CNAME", name, full_name: host, target: linkDomainTarget(env) };
}

// ---------- the check ----------

/**
 * Looks at the host from outside, the way a visitor would.
 *  dns_ok    the CNAME points at the Pages project (read over Cloudflare's public DNS lookup)
 *  live      https://<host>/__link-check answers as Pulsify (the domain is attached and has its certificate)
 * -> { status, dns_ok, live, message }
 */
export async function checkLinkDomain(env, host, { fetcher = fetch } = {}) {
  const target = linkDomainTarget(env);
  let dnsOk = false;
  try {
    const response = await fetcher(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=CNAME`,
      { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) },
    );
    const body = await response.json();
    dnsOk = (body?.Answer || []).some((row) => row.type === 5
      && String(row.data || "").toLowerCase().replace(/\.$/, "").endsWith(target));
  } catch {
    dnsOk = false;
  }
  let live = false;
  try {
    const response = await fetcher(`https://${host}${CHECK_PATH}`, { redirect: "manual", signal: AbortSignal.timeout(6000) });
    const body = response.ok ? await response.json() : null;
    live = body?.pulsify === "link-domain" && body?.host === host;
  } catch {
    live = false;
  }
  if (live) return { status: "active", dns_ok: dnsOk, live, message: `Working. Your links now use ${host}.` };
  if (dnsOk) {
    return {
      status: "waiting", dns_ok: true, live: false,
      message: "Your DNS record is right. We still have to switch the address on at our end, usually within one working day. Nothing more for you to do.",
    };
  }
  return {
    status: "waiting", dns_ok: false, live: false,
    message: "We can't see the record yet. DNS changes can take up to an hour to show. Check that the name and the target match the steps below, then check again.",
  };
}

// ---------- answering on the client's domain ----------

function plain(status, body, headers = {}) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...headers } });
}

/**
 * First thing functions/_middleware.js runs. Returns a Response when the request came in on a client's
 * link domain, otherwise null and the site carries on as before.
 */
export async function handleLinkHostRequest(context) {
  const { request, env } = context;
  if (!env?.DB) return null;
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  if (isOwnHost(host)) return null;
  const domain = await domainForHost(env, host);
  if (!domain) return null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return plain(405, "Method not allowed", { allow: "GET, HEAD" });
  }
  if (url.pathname === CHECK_PATH) {
    return new Response(JSON.stringify({ pulsify: "link-domain", host, active: domain.status === "active" }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  if (url.pathname === "/robots.txt") return plain(200, "User-agent: *\nDisallow: /\n");

  const parts = url.pathname.split("/").filter(Boolean);
  const key = parts.length === 1 ? parts[0] : "";
  const fallback = `${SHARED_ORIGIN}/${encodeURIComponent(domain.client)}`;
  if (!key || !/^[A-Za-z0-9_-]{1,64}$/.test(key)) return redirect(fallback);
  const link = await findClientLink(env, domain.client, key);
  if (!link) return redirect(fallback);
  return followLink(context, link, { pageOrigin: SHARED_ORIGIN, count: request.method === "GET" });
}

export { CHECK_COOLDOWN_MS };

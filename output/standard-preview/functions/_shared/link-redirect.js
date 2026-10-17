// The redirect behind every tracked link: finding the link, counting the click, choosing where it lands.
// Two doors lead here: functions/a/[token].js (pulsify-ai.com/a/<token or ending>) and the client's own
// domain (_shared/link-domains.js, go.clientname.com/<ending or token>).

import { sendDiscordAlert } from "./integrations.js";
import { isYouTubeHost } from "./youtube-url.js";

export const FALLBACK_URL = "https://pulsify-ai.com/";
const LINK_COLUMNS = "token, client, label, target_url, lead_email, kind, video_id, placement, source";

export function cleanToken(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "no-store",
    },
  });
}

// Cash by video (pulsify-saas #36): a video link lands on the client's page
// wearing the four tags the landing tracker records. Anything already on the
// target's query string is kept.
export function videoTarget(request, link, { pageOrigin } = {}) {
  const client = String(link.client || "").replace(/[^a-z0-9_-]/gi, "");
  const origin = pageOrigin || new URL(request.url).origin;
  const base = isHttpUrl(link.target_url)
    ? link.target_url
    : client ? `${origin}/${client}` : FALLBACK_URL;
  const url = new URL(base);
  url.searchParams.set("utm_source", "youtube");
  url.searchParams.set("utm_medium", link.placement || "description");
  url.searchParams.set("utm_campaign", client || "pulsify");
  url.searchParams.set("utm_content", link.video_id || "channel");
  return url.toString();
}

// Tracked links (Links tab): a bio, story, email or ad link lands on the page wearing the
// tags of where it lives, and utm_content=l-<token> so every visit and sale traces back to it.
// A link that goes straight to YouTube stays exactly as typed: YouTube drops the tags and the visit
// never reaches our tracker, so the click count is all we have for it (pulsify-saas #72).
export function linkTarget(request, link, { pageOrigin } = {}) {
  const client = String(link.client || "").replace(/[^a-z0-9_-]/gi, "");
  const origin = pageOrigin || new URL(request.url).origin;
  const base = isHttpUrl(link.target_url)
    ? link.target_url
    : client ? `${origin}/${client}` : FALLBACK_URL;
  const url = new URL(base);
  if (isYouTubeHost(url.hostname)) return url.toString();
  url.searchParams.set("utm_source", link.source || "other");
  url.searchParams.set("utm_medium", link.placement || "other");
  url.searchParams.set("utm_campaign", client || "pulsify");
  url.searchParams.set("utm_content", `l-${link.token}`);
  return url.toString();
}

export async function recordOpen(env, request, link) {
  const ip = request.headers.get("cf-connecting-ip") || null;
  const country = (request.cf && request.cf.country) || request.headers.get("cf-ipcountry") || null;
  const city = (request.cf && request.cf.city) || null;
  const userAgent = request.headers.get("user-agent") || null;
  const referrer = request.headers.get("referer") || null;

  try {
    await env.DB.prepare(
      `INSERT INTO asset_events (
        token,client,lead_email,ip,country,city,user_agent,referrer,at
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
    ).bind(
      link.token,
      link.client || null,
      link.lead_email || null,
      ip,
      country,
      city,
      userAgent,
      referrer,
      new Date().toISOString(),
    ).run();
  } catch {
    // Tracking must never block the prospect's redirect.
  }

  // Video and tracked links can be clicked hundreds of times a day; they never ping.
  if (link.kind === "video" || link.kind === "link") return;

  try {
    await sendDiscordAlert(env, {
      client: link.client || "operator",
      title: "Asset opened",
      lines: [
        `Asset: ${link.label || link.token}`,
        `Lead: ${link.lead_email || "unknown"}`,
        `Client: ${link.client || "unassigned"}`,
      ],
    });
  } catch {
    // Alerts are best effort and never block the redirect.
  }
}

// Count the click and send the person on. `pageOrigin` is where the client's own page lives when
// the link has no destination of its own (the shared domain, even when the click came in on theirs).
export async function followLink(context, link, { pageOrigin, count = true } = {}) {
  const { request, env } = context;
  if (count) {
    const trackingTask = recordOpen(env, request, link);
    if (typeof context.waitUntil === "function") context.waitUntil(trackingTask);
    else await trackingTask;
  }

  if (link.kind === "video") return redirect(videoTarget(request, link, { pageOrigin }));
  if (link.kind === "link") return redirect(linkTarget(request, link, { pageOrigin }));
  return redirect(isHttpUrl(link.target_url) ? link.target_url : FALLBACK_URL);
}

// ---------- finding the link ----------

export async function findLinkByToken(env, token) {
  try {
    return await env.DB.prepare(
      `SELECT ${LINK_COLUMNS}
         FROM asset_links
        WHERE token=? AND archived=0
        LIMIT 1`,
    ).bind(token).first();
  } catch {
    // Before migration 0046 adds asset_links.source, read the link without it.
    try {
      return await env.DB.prepare(
        `SELECT token, client, label, target_url, lead_email, kind, video_id, placement
           FROM asset_links
          WHERE token=? AND archived=0
          LIMIT 1`,
      ).bind(token).first();
    } catch {
      return null;
    }
  }
}

// pulsify-ai.com/a/<ending>. Endings are unique across clients that use the shared domain, but a
// client with its own domain may reuse one, so when two links share an ending the one belonging to a
// shared-domain client wins (the other client's links are printed with their own domain).
export async function findLinkBySlug(env, slug) {
  let rows;
  try {
    rows = (await env.DB.prepare(
      `SELECT ${LINK_COLUMNS}, slug FROM asset_links WHERE slug=? AND archived=0 LIMIT 6`,
    ).bind(slug).all()).results || [];
  } catch {
    return null; // before migration 0070 there are no endings
  }
  if (rows.length <= 1) return rows[0] || null;
  let withDomain = new Set();
  try {
    const found = await env.DB.prepare(
      "SELECT client FROM link_domains WHERE status='active'",
    ).all();
    withDomain = new Set((found.results || []).map((row) => row.client));
  } catch {
    // no table yet: everyone is on the shared domain
  }
  const shared = rows.filter((row) => !withDomain.has(row.client));
  return shared.length === 1 ? shared[0] : null;
}

// The client's own domain: the path is one of that client's endings or tokens.
export async function findClientLink(env, client, key) {
  let row = null;
  try {
    row = await env.DB.prepare(
      `SELECT ${LINK_COLUMNS} FROM asset_links WHERE client=? AND slug=? AND archived=0 LIMIT 1`,
    ).bind(client, String(key).toLowerCase()).first();
  } catch {
    row = null;
  }
  if (row) return row;
  const byToken = await findLinkByToken(env, cleanToken(key));
  return byToken && byToken.client === client ? byToken : null;
}

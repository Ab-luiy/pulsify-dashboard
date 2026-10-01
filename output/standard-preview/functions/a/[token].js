import { sendDiscordAlert } from "../_shared/integrations.js";

const FALLBACK_URL = "https://pulsify-ai.com/";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const token = cleanToken(params?.token);
  if (!env.DB || !token) return redirect(FALLBACK_URL);

  let link;
  try {
    link = await env.DB.prepare(
      `SELECT token, client, label, target_url, lead_email, kind, video_id, placement, source
         FROM asset_links
        WHERE token=? AND archived=0
        LIMIT 1`,
    ).bind(token).first();
  } catch {
    // Before migration 0046 adds asset_links.source, read the link without it.
    try {
      link = await env.DB.prepare(
        `SELECT token, client, label, target_url, lead_email, kind, video_id, placement
           FROM asset_links
          WHERE token=? AND archived=0
          LIMIT 1`,
      ).bind(token).first();
    } catch {
      return redirect(FALLBACK_URL);
    }
  }

  if (!link) return redirect(FALLBACK_URL);

  const trackingTask = recordOpen(env, request, link);
  if (typeof context.waitUntil === "function") context.waitUntil(trackingTask);
  else await trackingTask;

  if (link.kind === "video") return redirect(videoTarget(request, link));
  if (link.kind === "link") return redirect(linkTarget(request, link));
  return redirect(isHttpUrl(link.target_url) ? link.target_url : FALLBACK_URL);
}

// Cash by video (pulsify-saas #36): a video link lands on the client's page
// wearing the four tags the landing tracker records. Anything already on the
// target's query string is kept.
export function videoTarget(request, link) {
  const client = String(link.client || "").replace(/[^a-z0-9_-]/gi, "");
  const base = isHttpUrl(link.target_url)
    ? link.target_url
    : client ? `${new URL(request.url).origin}/${client}` : FALLBACK_URL;
  const url = new URL(base);
  url.searchParams.set("utm_source", "youtube");
  url.searchParams.set("utm_medium", link.placement || "description");
  url.searchParams.set("utm_campaign", client || "pulsify");
  url.searchParams.set("utm_content", link.video_id || "channel");
  return url.toString();
}

// Tracked links (Links tab): a bio, story, email or ad link lands on the page wearing the
// tags of where it lives, and utm_content=l-<token> so every visit and sale traces back to it.
export function linkTarget(request, link) {
  const client = String(link.client || "").replace(/[^a-z0-9_-]/gi, "");
  const base = isHttpUrl(link.target_url)
    ? link.target_url
    : client ? `${new URL(request.url).origin}/${client}` : FALLBACK_URL;
  const url = new URL(base);
  url.searchParams.set("utm_source", link.source || "other");
  url.searchParams.set("utm_medium", link.placement || "other");
  url.searchParams.set("utm_campaign", client || "pulsify");
  url.searchParams.set("utm_content", `l-${link.token}`);
  return url.toString();
}

async function recordOpen(env, request, link) {
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

function cleanToken(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "no-store",
    },
  });
}

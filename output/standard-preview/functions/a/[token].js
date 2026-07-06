import { sendDiscordAlert } from "../_shared/integrations.js";

const FALLBACK_URL = "https://pulsify-funnels.pages.dev/";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const token = cleanToken(params?.token);
  if (!env.DB || !token) return redirect(FALLBACK_URL);

  let link;
  try {
    link = await env.DB.prepare(
      `SELECT token, client, label, target_url, lead_email
         FROM asset_links
        WHERE token=? AND archived=0
        LIMIT 1`,
    ).bind(token).first();
  } catch {
    return redirect(FALLBACK_URL);
  }

  if (!link) return redirect(FALLBACK_URL);

  const trackingTask = recordOpen(env, request, link);
  if (typeof context.waitUntil === "function") context.waitUntil(trackingTask);
  else await trackingTask;

  return redirect(isHttpUrl(link.target_url) ? link.target_url : FALLBACK_URL);
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

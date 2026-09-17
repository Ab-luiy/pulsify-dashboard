import { accessToken, validateAccess } from "./access.js";
import { runJob } from "./db.js";
import { syncInstagram } from "./jobs/instagram.js";
import { syncInstagramInbox } from "./jobs/instagram-inbox.js";
import { syncYouTubeLeads } from "./jobs/leads.js";
import { syncYouTube } from "./jobs/youtube.js";

const JOBS = {
  youtube: syncYouTube,
  instagram: syncInstagram,
  "instagram-inbox": syncInstagramInbox,
  leads: syncYouTubeLeads,
};

export default {
  async scheduled(controller, env, ctx) {
    if (env.SYNC_ENABLED !== "true") return;
    const job = scheduledJob(controller.cron);
    if (!job) return;
    ctx.waitUntil(runJob(env, job, () => JOBS[job](env)));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/hooks/composio") {
      const raw = await request.text();
      if (!await verifyComposio(request, raw, env.COMPOSIO_WEBHOOK_SECRET)) {
        return json({ ok: false, error: "invalid webhook signature" }, 401);
      }
      ctx.waitUntil(runJob(env, "instagram-inbox", () => syncInstagramInbox(env)));
      return json({ ok: true, accepted: true }, 202);
    }
    const match = /^\/run\/(youtube|instagram|instagram-inbox|leads)$/.exec(url.pathname);
    if (request.method === "POST" && match) {
      const operator = await validateAccess(accessToken(request), env.ACCESS_AUD);
      if (!operator) return json({ ok: false, error: "operator sign-in required" }, 401);
      try {
        return json(await runJob(env, match[1], () => JOBS[match[1]](env)));
      } catch (error) {
        return json({ ok: false, job: match[1], error: String(error?.message || error) }, 500);
      }
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, worker: "pulsify-sync" });
    }
    return new Response("Not found", { status: 404 });
  },
};

export function scheduledJob(cron) {
  if (cron === "* * * * *") return "instagram-inbox";
  if (cron === "15 */6 * * *") return "youtube";
  if (cron === "0 5 * * *") return "instagram";
  if (cron === "0 6 * * 1") return "leads";
  return null;
}

async function verifyComposio(request, raw, secret) {
  if (!secret) return false;
  const id = request.headers.get("webhook-id") || "";
  const timestamp = request.headers.get("webhook-timestamp") || "";
  const signatures = request.headers.get("webhook-signature") || "";
  if (!id || !timestamp || !signatures) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const keyText = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes;
  try { keyBytes = Uint8Array.from(atob(keyText), (character) => character.charCodeAt(0)); }
  catch { keyBytes = new TextEncoder().encode(keyText); }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expectedBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${raw}`)));
  const expected = btoa(String.fromCharCode(...expectedBytes));
  return signatures.split(" ").some((part) => part.replace(/^v1,/, "") === expected);
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

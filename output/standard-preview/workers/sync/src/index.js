import { accessToken, validateAccess } from "./access.js";
import { runJob } from "./db.js";
import { syncInstagram } from "./jobs/instagram.js";
import { syncInstagramInbox } from "./jobs/instagram-inbox.js";
import { syncYouTubeLeads } from "./jobs/leads.js";
import { syncYouTube } from "./jobs/youtube.js";
import { sweepWebhooks } from "./jobs/webhook-outbox.js";
import { syncPayments } from "./jobs/payments.js";
import { ingestSeen, sweepSeen } from "./jobs/outreach-notify.js";
import { handleZernioEvent, syncZernioInbox } from "./jobs/zernio-inbox.js";
import { syncSearchIndex } from "./jobs/search-index.js";
import { verifySignature } from "../../../functions/_shared/zernio.js";

const JOBS = {
  youtube: syncYouTube,
  instagram: syncInstagram,
  "instagram-inbox": syncInstagramInbox,
  leads: syncYouTubeLeads,
  "webhook-outbox": sweepWebhooks,
  "payment-rematch": syncPayments,
  "zernio-inbox": syncZernioInbox,
  "search-index": syncSearchIndex,
};

export default {
  async scheduled(controller, env, ctx) {
    if (env.SYNC_ENABLED !== "true") return;
    for (const job of scheduledJobs(controller.cron, controller.scheduledTime)) {
      ctx.waitUntil(runJob(env, job, () => JOBS[job](env)));
    }
    if (controller.cron === "* * * * *") ctx.waitUntil(sweepSeen(env).catch(() => 0));

  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/hooks/zernio") {
      const raw = await request.text();
      if (!await verifySignature(raw, env.ZERNIO_WEBHOOK_SECRET, request.headers.get("x-zernio-signature"))) {
        return json({ ok: false, error: "invalid webhook signature" }, 401);
      }
      let payload = null;
      try { payload = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
      if (payload?.event === "webhook.test") return json({ ok: true, test: true });
      ctx.waitUntil(handleZernioEvent(env, payload, request.headers.get("x-zernio-event-id")).catch(() => null));
      return json({ ok: true, accepted: true }, 202);
    }
    if (request.method === "POST" && url.pathname === "/hooks/composio") {
      const raw = await request.text();
      if (!await verifyComposio(request, raw, env.COMPOSIO_WEBHOOK_SECRET)) {
        return json({ ok: false, error: "invalid webhook signature" }, 401);
      }
      // Read receipts (messaging_seen) ride the same hook when Composio relays them.
      let payload = null;
      try { payload = JSON.parse(raw); } catch { payload = null; }
      if (payload) ctx.waitUntil(ingestSeen(env, payload).catch(() => 0));
      ctx.waitUntil(runJob(env, "instagram-inbox", () => syncInstagramInbox(env)));
      return json({ ok: true, accepted: true }, 202);
    }
    const match = /^\/run\/(youtube|instagram|instagram-inbox|leads|webhook-outbox|payment-rematch|zernio-inbox|search-index)$/.exec(url.pathname);
    if (request.method === "POST" && match) {
      const operator = await validateAccess(accessToken(request), env.ACCESS_AUD);
      if (!operator) return json({ ok: false, error: "operator sign-in required" }, 401);
      try {
        const resync = match[1] === "instagram-inbox" && url.searchParams.get("resync") === "1";
        return json(await runJob(env, match[1], () => (resync ? syncInstagramInbox(env, { resync: true }) : JOBS[match[1]](env))));
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

// Webhooks remain immediate. Polling is recovery, not the primary live path.
export function scheduledJobs(cron, scheduledTime = Date.now()) {
  if (cron !== "* * * * *") { const job = scheduledJob(cron); return job ? [job] : []; }
  const minute = new Date(scheduledTime).getUTCMinutes();
  return ["webhook-outbox", ...(minute % 5 === 0 ? ["instagram-inbox", "zernio-inbox"] : []), ...(minute % 15 === 0 ? ["search-index"] : [])];
}

export function scheduledJob(cron) {
  if (cron === "* * * * *") return "instagram-inbox";
  if (cron === "15 */6 * * *") return "youtube";
  if (cron === "0 5 * * *") return "instagram";
  if (cron === "0 6 * * 1") return "leads";
  if (cron === "*/30 * * * *") return "payment-rematch";
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

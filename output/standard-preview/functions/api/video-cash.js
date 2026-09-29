// GET /api/video-cash?range=all|90d|30d
// The client's YouTube videos ranked by cash collected (pulsify-saas #36).
// Client session, portal token or operator impersonation; always read-only.

import { json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { videoCashReport } from "../_shared/video-cash.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true });
  if (access.error) return access.error;
  const url = new URL(request.url);
  const range = ["all", "90d", "30d"].includes(url.searchParams.get("range")) ? url.searchParams.get("range") : "all";
  try {
    return json(await videoCashReport(env, access.client, { range, origin: url.origin }));
  } catch (error) {
    console.error("video-cash report failed", error);
    return json({ ok: false, error: "Your video report could not load. Try again shortly." }, 500);
  }
}

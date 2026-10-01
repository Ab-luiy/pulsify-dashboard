// Public: someone asks for a workspace from the sign-in page.
//   POST /api/access-request {name, email, link?, note?, website?}
// Always answers the same way once the fields are valid, so it never says whether
// an email already has an account. "website" is a hidden field only bots fill in.
import { json, sha256Hex } from "../_shared/common.js";
import { cleanRequest, createRequest, REQUEST_RECEIVED } from "../_shared/access-requests.js";

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ ok: false, error: "Forbidden" }, 403);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const reply = json({ ok: true, message: REQUEST_RECEIVED }, 200, { "cache-control": "no-store" });
  if (String(body.website || "").trim()) return reply;
  const cleaned = cleanRequest(body);
  if (cleaned.error) return json({ ok: false, error: cleaned.error }, 422);
  const ip = request.headers.get("cf-connecting-ip") || "";
  try {
    const result = await createRequest(env, { value: cleaned.value, ipKey: ip ? (await sha256Hex(ip)).slice(0, 24) : "", origin: url.origin });
    if (result.ok === false) return json({ ok: false, error: "Requests are unavailable right now. Try again shortly." }, 503);
  } catch {
    return json({ ok: false, error: "Requests are unavailable right now. Try again shortly." }, 503);
  }
  return reply;
}

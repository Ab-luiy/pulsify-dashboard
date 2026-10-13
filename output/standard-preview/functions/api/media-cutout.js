// Cut the person (or main subject) out of one of the client's own photos, for text behind the subject on
// carousel slides (founder 2026-10-13). The private pulsify-cutout Worker does the work through the CUTOUT
// service binding; the PNG is stored next to the original in the client's public media namespace under a
// key derived from the source, so each photo is cut once and every later call is free.
//   POST {src: "/m/<client>/<uuid>.<ext>"} -> {ok, url: "/m/<client>/<uuid>.png", cached}
import { json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { takeAllowance } from "../_shared/usage.js";

const CUTOUTS_PER_DAY = 25;

const SOURCE = /^\/m\/([a-z0-9_-]{1,64})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|jpe?g|webp)$/i;

/** A stable UUID-shaped key for the cutout of a given source, so it matches the public media namespace. */
export async function cutoutKey(client, sourceKey) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`cutout:v1:${sourceKey}`)));
  const hex = [...digest.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${client}/${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}.png`;
}

export async function onRequestPost({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  if (!env.MEDIA || !env.CUTOUT) return json({ ok: false, error: "Cutouts are not set up on this server." }, 503);
  const body = await request.json().catch(() => ({}));
  const match = String(body.src || "").trim().match(SOURCE);
  if (!match) return json({ ok: false, error: "Pick one of your own uploaded photos." }, 422);
  const [, owner, id, ext] = match;
  // Only the client's own media: never cut out another account's photo.
  if (owner.toLowerCase() !== String(access.client).toLowerCase()) return json({ ok: false, error: "That photo is not in your media." }, 403);

  const sourceKey = `${owner}/${id}.${ext}`;
  const key = await cutoutKey(owner, sourceKey);
  if (await env.MEDIA.head(key)) return json({ ok: true, url: `/m/${key}`, cached: true });

  // A new cutout spends the shared Cloudflare Images allowance: at most CUTOUTS_PER_DAY per client per day.
  if (env.DB && !(await takeAllowance(env, owner.toLowerCase(), "cutout", CUTOUTS_PER_DAY))) {
    return json({ ok: false, error: `That is today's ${CUTOUTS_PER_DAY} cutouts. More tomorrow.` }, 429);
  }
  const source = await env.MEDIA.get(sourceKey);
  if (!source) return json({ ok: false, error: "That photo could not be found." }, 404);
  const response = await env.CUTOUT.fetch("https://cutout.internal/", {
    method: "POST",
    headers: { "content-type": source.httpMetadata?.contentType || "image/jpeg" },
    body: source.body,
  });
  if (!response.ok) return json({ ok: false, error: "The cutout did not work on this photo. Try another one." }, 502);
  await env.MEDIA.put(key, response.body, { httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" } });
  return json({ ok: true, url: `/m/${key}`, cached: false });
}

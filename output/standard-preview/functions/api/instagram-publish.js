// Post a carousel to the client's own Instagram from the editor (founder 2026-10-13: "export it or directly
// release it from the software to Instagram"). Zernio publishes through the account the client connected
// themselves (client-connect.js stored its account_id).
//   POST /api/instagram-publish  multipart: carousel, caption, when ("now" | ISO time), slide-01..slide-10 (JPEG)
//   -> {ok, status: "published" | "scheduled", url?, post_id}
// The slides are stored in the client's media (Instagram fetches them by public URL), the caption is kept on
// the carousel, and the post is remembered on the carousel's params so the pipeline can show it as posted.
import { json, nowIso, parseJson } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { getIntegration } from "../_shared/integrations.js";
import { matchesImageSignature } from "../_shared/image-upload.js";
import { zernioConfigured, zernioFetch } from "../_shared/zernio.js";

const MAX_SLIDES = 10;
const MAX_SLIDE_BYTES = 8 * 1024 * 1024;
const CAPTION_MAX = 2200;

export async function onRequestPost({ request, env }, fetcher = fetch) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  if (access.impersonated) return json({ ok: false, error: "Operator preview is read-only." }, 403);
  if (!env.DB || !env.MEDIA) return json({ ok: false, error: "Posting is not set up on this server." }, 500);
  if (!zernioConfigured(env)) return json({ ok: false, error: "Posting is not set up on this server." }, 503);

  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: "Send the slides as a form." }, 422);
  const carouselId = Number(form.get("carousel") || 0);
  const row = await env.DB.prepare("SELECT id, client_id, status, params_json, output_json FROM studio_carousels WHERE id=?").bind(carouselId).first();
  if (!row || String(row.client_id).toLowerCase() !== String(access.client).toLowerCase()) return json({ ok: false, error: "That carousel is not in your account." }, 404);
  if (row.status === "review") return json({ ok: false, error: "This carousel is with the team for review. Post it once it is back." }, 409);

  const instagram = await getIntegration(env, "client", access.client, "instagram");
  const accountId = instagram?.config?.account_id;
  if (!accountId) return json({ ok: false, error: "Connect your Instagram first.", connect: true }, 409);

  const caption = String(form.get("caption") || "").slice(0, CAPTION_MAX);
  const when = String(form.get("when") || "now");
  const scheduled = when === "now" ? null : new Date(when);
  if (scheduled && (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now() + 5 * 60000)) {
    return json({ ok: false, error: "Pick a time at least five minutes from now." }, 422);
  }

  // The slides, in order, checked as real JPEGs and stored where Instagram can fetch them.
  const files = [];
  for (let n = 1; n <= MAX_SLIDES; n += 1) {
    const file = form.get(`slide-${String(n).padStart(2, "0")}`);
    if (!file || typeof file.arrayBuffer !== "function") break;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > MAX_SLIDE_BYTES || !matchesImageSignature("image/jpeg", bytes)) return json({ ok: false, error: `Slide ${n} is not a usable image.` }, 422);
    files.push(bytes);
  }
  if (!files.length) return json({ ok: false, error: "There are no slides to post." }, 422);

  const origin = new URL(request.url).origin;
  const urls = [];
  for (const bytes of files) {
    const key = `${access.client}/${crypto.randomUUID()}.jpg`;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" } });
    urls.push(`${origin}/m/${key}`);
  }

  let result;
  try {
    result = await zernioFetch(env, "/v1/posts", {
      method: "POST",
      body: JSON.stringify({
        content: caption,
        mediaItems: urls.map((url) => ({ type: "image", url, mimeType: "image/jpeg" })),
        platforms: [{ platform: "instagram", accountId }],
        ...(scheduled ? { scheduledFor: scheduled.toISOString() } : { publishNow: true }),
        metadata: { pulsify_client: access.client, pulsify_carousel: String(row.id) },
      }),
    }, fetcher);
  } catch (error) {
    return json({ ok: false, error: `Instagram did not take the post: ${String(error?.message || "").replace(/^zernio [^:]+: /, "").slice(0, 200)}` }, 502);
  }

  const post = result?.post || result || {};
  const postId = String(post._id || post.id || "");
  const platform = (post.platforms || result?.platforms || []).find((entry) => entry?.platform === "instagram") || {};
  const url = platform.platformPostUrl || result?.platformPostUrl || "";
  const status = scheduled ? "scheduled" : "published";

  const params = parseJson(row.params_json, {});
  params.instagram = { post_id: postId, status, url: url || undefined, at: nowIso(), scheduled_for: scheduled?.toISOString() };
  const output = parseJson(row.output_json, {});
  if (output && typeof output === "object") output.caption = caption;
  await env.DB.prepare("UPDATE studio_carousels SET params_json=?, output_json=?, updated_at=? WHERE id=?")
    .bind(JSON.stringify(params), JSON.stringify(output), nowIso(), row.id).run();
  return json({ ok: true, status, url: url || undefined, post_id: postId });
}

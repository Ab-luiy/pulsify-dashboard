// Profile pictures (pulsify-saas #31/#32, founder 2026-09-25): the operator's
// and each client workspace's own picture, kept in R2 and served same-origin
// (the app's CSP only allows our own images).
//   GET    /api/avatar?owner=operator|client   the picture, or 204 when there is none
//   POST   /api/avatar  multipart {owner, file}  png, jpeg or webp, 2 MB at most
//   DELETE /api/avatar?owner=operator|client
// The operator side needs the operator identity; the client side needs the
// client session, and the operator previewing a workspace may change it too.
import { withOperator } from "../_shared/access.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { json, normalizeEmail, sha256Hex, str } from "../_shared/common.js";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function keyFor(request, env, owner) {
  if (owner === "operator") {
    const operator = resolveOperator(request, env);
    if (operator.error) return { error: operator.error };
    return { key: `avatars/operator/${await sha256Hex(normalizeEmail(operator.operatorEmail || "operator"))}` };
  }
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true });
  if (access.error) return { error: access.error };
  return { key: `avatars/client/${access.client}` };
}

const ownerOf = (value) => (str(value) === "operator" ? "operator" : "client");

async function get({ request, env }) {
  if (!env.MEDIA) return new Response(null, { status: 204 });
  const found = await keyFor(request, env, ownerOf(new URL(request.url).searchParams.get("owner")));
  if (found.error) return found.error;
  const stored = await env.MEDIA.get(found.key);
  // No picture yet: an empty answer, not a 404, so the sidebar's check does not log an error on every page.
  if (!stored) return new Response(null, { status: 204, headers: { "cache-control": "private, no-store" } });
  return new Response(stored.body, { headers: { "content-type": stored.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, max-age=300" } });
}

async function post({ request, env }) {
  if (!env.MEDIA) return json({ ok: false, error: "no media bucket bound" }, 500);
  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: "multipart form required" }, 400);
  const found = await keyFor(request, env, ownerOf(form.get("owner")));
  if (found.error) return found.error;
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ ok: false, error: "Choose a picture to upload." }, 422);
  const type = str(file.type).toLowerCase();
  if (!TYPES.has(type)) return json({ ok: false, error: "Use a PNG, JPG or WebP picture." }, 415);
  if (!file.size || file.size > MAX_AVATAR_BYTES) return json({ ok: false, error: "The picture must be 2 MB or smaller." }, 413);
  await env.MEDIA.put(found.key, await file.arrayBuffer(), { httpMetadata: { contentType: type } });
  return json({ ok: true, updated_at: new Date().toISOString() });
}

async function remove({ request, env }) {
  if (!env.MEDIA) return json({ ok: false, error: "no media bucket bound" }, 500);
  const found = await keyFor(request, env, ownerOf(new URL(request.url).searchParams.get("owner")));
  if (found.error) return found.error;
  await env.MEDIA.delete(found.key);
  return json({ ok: true });
}

export const onRequestGet = withOperator(get);
export const onRequestPost = withOperator(post);
export const onRequestDelete = withOperator(remove);

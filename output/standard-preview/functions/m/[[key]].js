const CONTENT_TYPES = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function onRequestGet({ params, env }) {
  return serveMedia(params, env, false);
}

export async function onRequestHead({ params, env }) {
  return serveMedia(params, env, true);
}

async function serveMedia(params, env, headOnly) {
  const key = readKey(params);
  // This bucket also holds private archives, voice notes and operator assets.
  // Only the exact client/UUID.image namespace written by media-upload is public.
  // Do not widen this to arbitrary R2 keys or rely on a list of private prefixes.
  if (!isPublicImageKey(key) || !env.MEDIA) return notFound();

  // V1 uses the unguessable UUID object key as the guard. Per-client serving auth is a later hardening step.
  const object = await env.MEDIA.get(key);
  if (!object) return notFound();

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === "function") object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", object.httpMetadata?.contentType || contentTypeFromKey(key));
  }
  if (!Object.values(CONTENT_TYPES).includes(headers.get("content-type")?.split(";")[0].trim().toLowerCase())) return notFound();
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (object.httpEtag) headers.set("etag", object.httpEtag);

  return new Response(headOnly ? null : object.body, { status: 200, headers });
}

function isPublicImageKey(key) {
  return /^[a-z0-9_-]{1,64}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpe?g|webp|gif)$/i.test(key)
    && !/^(?:operator-photos|archive|clients|avatars|lead-images)\//i.test(key);
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
}

function readKey(params) {
  const value = params?.key;
  const key = (Array.isArray(value) ? value.join("/") : String(value || "")).replace(/^\/+|\/+$/g, "");
  if (!key || key.split("/").some((part) => !part || part === "." || part === "..")) return "";
  return key;
}

function contentTypeFromKey(key) {
  const extension = String(key).split(".").pop().toLowerCase();
  return CONTENT_TYPES[extension] || "application/octet-stream";
}

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
  if (!key || key.startsWith("operator-photos/") || !env.MEDIA) return new Response("Not found", { status: 404 });

  // V1 uses the unguessable UUID object key as the guard. Per-client serving auth is a later hardening step.
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === "function") object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", object.httpMetadata?.contentType || contentTypeFromKey(key));
  }
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (object.httpEtag) headers.set("etag", object.httpEtag);

  return new Response(headOnly ? null : object.body, { status: 200, headers });
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

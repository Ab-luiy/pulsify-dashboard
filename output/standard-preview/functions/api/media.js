import { withOperator } from '../_shared/access.js';
import {
  checkAdmin,
  cleanId,
  generateOpaqueToken,
  json,
  nowIso,
  str,
} from "../_shared/common.js";
import {
  deleteMedia,
  putMedia,
} from "../_shared/media-storage.js";

const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_MEDIA_BYTES = 900 * 1024;

async function handle_onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ ok: false, error: "valid JSON body required" }, 400);
  }

  const client = cleanId(body.client);
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);

  const clientExists = await env.DB.prepare(
    "SELECT 1 AS found FROM client_config WHERE client=?",
  ).bind(client).first();
  if (!clientExists) return json({ ok: false, error: "client not found" }, 404);

  const filename = str(body.filename);
  if (!filename) return json({ ok: false, error: "filename is required" }, 422);

  const contentType = str(body.content_type).toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return json({
      ok: false,
      error: "content_type must be image/png, image/jpeg, or image/webp",
    }, 422);
  }

  const decoded = decodeBase64(body.data_base64);
  if (!decoded.ok) return json({ ok: false, error: decoded.error }, decoded.status);

  const id = generateOpaqueToken(18);
  await putMedia(env, {
    id,
    client,
    content_type: contentType,
    bytes: decoded.bytes,
    created_at: nowIso(),
  });

  return json({ ok: true, id, url: `/media/${id}` });
}

async function handle_onRequestDelete({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!isStorageId(id)) return json({ ok: false, error: "valid media id required" }, 422);

  const deleted = await deleteMedia(env, id);
  return json({ ok: true, id, deleted });
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

function decodeBase64(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, status: 422, error: "data_base64 is required" };
  }

  const encoded = value.replace(/\s+/g, "");
  if (
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
  ) {
    return { ok: false, status: 422, error: "data_base64 must be valid base64" };
  }

  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const decodedSize = (encoded.length / 4) * 3 - padding;
  if (decodedSize > MAX_MEDIA_BYTES) return mediaTooLarge();

  try {
    const binary = atob(encoded);
    if (binary.length > MAX_MEDIA_BYTES) return mediaTooLarge();
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return { ok: true, bytes: bytes.buffer };
  } catch {
    return { ok: false, status: 422, error: "data_base64 must be valid base64" };
  }
}

function mediaTooLarge() {
  return {
    ok: false,
    status: 413,
    error: "image exceeds the 900KB upload limit; images are compressed client-side, so this should not happen",
  };
}

function isStorageId(value) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestDelete = withOperator(handle_onRequestDelete);
export const onRequestOptions = withOperator(handle_onRequestOptions);

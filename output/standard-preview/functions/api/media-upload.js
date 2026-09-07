import { json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function onRequestPost({ request, env }) {
  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: true,
    allowQueryToken: false,
  });
  if (access.error) return access.error;
  if (!env.MEDIA) return json({ ok: false, error: "no media bucket bound" }, 500);

  let upload;
  try {
    upload = await readUpload(request);
  } catch (error) {
    return json({ ok: false, error: error.message || "invalid image upload" }, error.status || 400);
  }

  const extension = IMAGE_TYPES.get(upload.contentType);
  if (!extension) return json({ ok: false, error: "png, jpg, jpeg, webp, or gif image required" }, 415);
  if (!upload.size) return json({ ok: false, error: "image file required" }, 422);
  if (upload.size > MAX_UPLOAD_BYTES) return json({ ok: false, error: "image must be 10 MB or smaller" }, 413);
  if (!matchesImageSignature(upload.contentType, upload.signature)) {
    return json({ ok: false, error: "file content does not match the selected image type" }, 415);
  }

  const key = `${access.client}/${crypto.randomUUID()}.${extension}`;
  const url = `/m/${key}`;
  const now = nowIso();

  try {
    await env.MEDIA.put(key, upload.body, {
      httpMetadata: { contentType: upload.contentType },
      customMetadata: { clientId: access.client },
    });
  } catch {
    return json({ ok: false, error: "image could not be stored" }, 500);
  }

  try {
    const result = await env.DB.prepare(
      `INSERT INTO proof_items (client_id, kind, url, claim, permission, created_at)
       VALUES (?, 'image-link', ?, ?, 'unknown', ?)`,
    ).bind(access.client, url, upload.claim || null, now).run();
    const id = Number(result?.meta?.last_row_id || 0) || null;
    return json({ ok: true, id, client: access.client, kind: "image-link", url, claim: upload.claim || "", permission: "unknown" }, 201);
  } catch {
    await env.MEDIA.delete(key).catch(() => {});
    return json({ ok: false, error: "image record could not be saved" }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

async function readUpload(request) {
  const contentTypeHeader = String(request.headers.get("content-type") || "").trim();
  if (contentTypeHeader.toLowerCase().startsWith("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") throw uploadError("image file required", 422);
    return {
      body: file,
      size: Number(file.size || 0),
      contentType: normalizeContentType(file.type),
      claim: str(form.get("claim")).slice(0, 500),
      signature: new Uint8Array(await file.slice(0, 16).arrayBuffer()),
    };
  }

  const contentType = normalizeContentType(contentTypeHeader);
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_UPLOAD_BYTES) throw uploadError("image must be 10 MB or smaller", 413);
  const body = await request.arrayBuffer();
  return {
    body,
    size: body.byteLength,
    contentType,
    claim: str(new URL(request.url).searchParams.get("claim")).slice(0, 500),
    signature: new Uint8Array(body.slice(0, 16)),
  };
}

function normalizeContentType(value) {
  return String(value || "").split(";", 1)[0].trim().toLowerCase();
}

function uploadError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function matchesImageSignature(contentType, bytes) {
  if (contentType === "image/png") {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (contentType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (contentType === "image/gif") {
    return startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
      || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  }
  if (contentType === "image/webp") {
    return startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
      && startsWith(bytes?.slice(8), [0x57, 0x45, 0x42, 0x50]);
  }
  return false;
}

function startsWith(actual, expected) {
  return expected.every((byte, index) => actual?.[index] === byte);
}

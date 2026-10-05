import { json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

import { MAX_UPLOAD_BYTES, IMAGE_TYPES, readUpload, matchesImageSignature } from "../_shared/image-upload.js";

export { MAX_UPLOAD_BYTES };

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

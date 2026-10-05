import { withOperator, operatorIdentity } from "../_shared/access.js";
import { checkAdmin, json, nowIso } from "../_shared/common.js";
import { MAX_UPLOAD_BYTES, IMAGE_TYPES, readUpload, matchesImageSignature } from "../_shared/image-upload.js";

export const FOLDERS = new Set(["portraits", "everyday", "scenery", "other"]);
export function safeFilename(value, extension) {
  const name = Array.from(String(value || "photo").split(/[\\/]/).pop().replace(/[<>:"|?*\x00-\x1f]/g, "_").replace(/[. ]+$/g, "")).slice(0, 180).join("") || "photo";
  return /\.(png|jpe?g|webp|gif)$/i.test(name) ? name : `${name}.${extension}`;
}
function record(row) {
  return { ...row, url: `/api/operator-photos?id=${row.id}`, download_url: `/api/operator-photos?id=${row.id}&download=1` };
}
async function get({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  const params = new URL(request.url).searchParams;
  if (params.has("id")) {
    if (!/^[1-9]\d*$/.test(params.get("id"))) return json({ ok: false, error: "Invalid photo id." }, 422);
    const row = await env.DB.prepare("SELECT * FROM operator_photos WHERE id=?").bind(Number(params.get("id"))).first();
    if (!row) return json({ ok: false, error: "Photo not found." }, 404);
    const object = await env.MEDIA.get(row.storage_key);
    if (!object) return json({ ok: false, error: "Photo not found." }, 404);
    const headers = { "content-type": row.content_type, "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
    if (params.get("download") === "1") headers["content-disposition"] = `attachment; filename="photo-${row.id}"; filename*=UTF-8''${encodeURIComponent(row.filename)}`;
    return new Response(object.body, { headers });
  }
  const folder = params.get("folder");
  if (folder && !FOLDERS.has(folder)) return json({ ok: false, error: "Invalid folder." }, 422);
  const before = params.get("before");
  if (before && !/^[1-9]\d*$/.test(before)) return json({ ok: false, error: "Invalid page." }, 422);
  const rows = await env.DB.prepare("SELECT id, filename, folder, content_type, size_bytes, sha256, created_at FROM operator_photos WHERE (? IS NULL OR folder=?) AND (? IS NULL OR id<?) ORDER BY id DESC LIMIT 61")
    .bind(folder, folder, before ? Number(before) : null, before ? Number(before) : null).all();
  const items = (rows.results || []).slice(0, 60);
  return json({ ok: true, items: items.map(record), next: (rows.results || []).length > 60 ? items.at(-1).id : null });
}
async function post({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.MEDIA || !env.DB) return json({ ok: false, error: "Photo storage is unavailable." }, 503);
  let upload;
  try { upload = await readUpload(request); }
  catch (error) { return json({ ok: false, error: error.message || "Invalid upload." }, error.status || 400); }
  const extension = IMAGE_TYPES.get(upload.contentType);
  if (!extension || !matchesImageSignature(upload.contentType, upload.signature)) return json({ ok: false, error: "Use a PNG, JPG, WebP or GIF image." }, 415);
  if (!upload.size) return json({ ok: false, error: "Choose an image." }, 422);
  if (upload.size > MAX_UPLOAD_BYTES) return json({ ok: false, error: "Images must be 10 MB or smaller." }, 413);
  const folder = upload.folder || "other";
  if (!FOLDERS.has(folder)) return json({ ok: false, error: "Invalid folder." }, 422);
  const bytes = upload.body instanceof ArrayBuffer ? upload.body : await upload.body.arrayBuffer();
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(b => b.toString(16).padStart(2, "0")).join("");
  const storageKey = `operator-photos/${crypto.randomUUID()}.${extension}`;
  const filename = safeFilename(upload.filename, extension);
  const created = nowIso();
  try { await env.MEDIA.put(storageKey, bytes, { httpMetadata: { contentType: upload.contentType } }); }
  catch { return json({ ok: false, error: "The photo could not be stored. Try again." }, 500); }
  try {
    const result = await env.DB.prepare("INSERT INTO operator_photos (storage_key,filename,folder,content_type,size_bytes,sha256,created_at,uploaded_by) VALUES (?,?,?,?,?,?,?,?)")
      .bind(storageKey, filename, folder, upload.contentType, upload.size, sha256, created, operatorIdentity(request)?.email || "automation").run();
    return json({ ok: true, item: record({ id: Number(result.meta.last_row_id), filename, folder, content_type: upload.contentType, size_bytes: upload.size, sha256, created_at: created }) }, 201);
  } catch {
    await env.MEDIA.delete(storageKey).catch(() => {});
    return json({ ok: false, error: "The photo record could not be saved. Try again." }, 500);
  }
}
export const onRequestGet = withOperator(get);
export const onRequestPost = withOperator(post);

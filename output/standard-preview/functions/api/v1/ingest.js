// POST /api/v1/ingest  Push API. Team-scoped API key, 30 requests per minute,
// 1 MB body, 201 with an id, idempotent on external id or reference.
import { json } from "../../_shared/common.js";
import { consumeRateLimit, ingest, ingestError, MAX_BODY_BYTES, resolveApiKey, validateIngest } from "../../_shared/push-ingest.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const key = await resolveApiKey(env, request);
  if (!key) return json({ ok: false, error: "invalid or missing API key" }, 401);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) return json({ ok: false, error: "body exceeds 1 MB" }, 413);
  if (!await consumeRateLimit(env, key.id)) {
    return json({ ok: false, error: "rate limit: 30 requests per minute per key" }, 429, { "retry-after": "60" });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: "body exceeds 1 MB" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return ingestError("invalid JSON body", 400); }
  const record = validateIngest(body);
  if (record.error) return ingestError(record.error);
  const result = await ingest(env, key, record);
  if (result.error) return ingestError(result.error);
  await env.DB.prepare("UPDATE api_keys SET last_used_at=? WHERE id=?").bind(new Date().toISOString(), key.id).run().catch(() => null);
  return json({ ok: true, id: result.id, kind: record.kind, duplicate: result.duplicate }, result.duplicate ? 200 : 201);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, x-api-key, authorization" } });
}

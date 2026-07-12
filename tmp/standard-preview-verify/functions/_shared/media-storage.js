/**
 * Media storage boundary.
 *
 * Handlers depend only on these functions. Replacing D1 with R2 later should
 * require changes here, not in the upload, serving, or client-delete routes.
 */

export async function getMedia(env, id) {
  return env.DB.prepare(
    "SELECT id, client, content_type, bytes, created_at FROM media WHERE id=?",
  ).bind(id).first();
}

export async function putMedia(env, media) {
  const result = await env.DB.prepare(
    "INSERT INTO media (id, client, content_type, bytes, created_at) VALUES (?,?,?,?,?)",
  ).bind(
    media.id,
    media.client,
    media.content_type,
    media.bytes,
    media.created_at,
  ).run();
  return Number(result.meta?.changes || 0);
}

export async function deleteMedia(env, id) {
  const result = await env.DB.prepare(
    "DELETE FROM media WHERE id=?",
  ).bind(id).run();
  return Number(result.meta?.changes || 0);
}

export async function deleteClientMedia(env, client) {
  const result = await env.DB.prepare(
    "DELETE FROM media WHERE client=?",
  ).bind(client).run();
  return Number(result.meta?.changes || 0);
}

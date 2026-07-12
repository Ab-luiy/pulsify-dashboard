import { cleanId, json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;
  const client = cleanId(access.client);

  const body = await request.json().catch(() => ({}));
  const index = Number(body.index);
  const done = Boolean(body.done);
  if (!Number.isInteger(index) || index < 0) {
    return json({ ok: false, error: "valid todo index required" }, 422);
  }

  const row = await env.DB.prepare(
    `SELECT json
       FROM client_dashboard_content
      WHERE client_id=? AND section='todos'`,
  ).bind(client).first();
  if (!row?.json) return json({ ok: false, error: "todo section not found" }, 404);

  const parsed = safeParse(row.json);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : null;
  if (!list || !list[index]) return json({ ok: false, error: "todo item not found" }, 404);

  list[index] = { ...list[index], done };
  const nextValue = Array.isArray(parsed) ? list : { ...parsed, items: list };
  await env.DB.prepare(
    `UPDATE client_dashboard_content
        SET json=?, updated_at=?
      WHERE client_id=? AND section='todos'`,
  ).bind(JSON.stringify(nextValue), new Date().toISOString(), client).run();

  return json({ ok: true, saved: true, todos: nextValue });
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

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * THE SETTINGS API — Cloudflare Pages Function.
 * Route when deployed: GET/POST /settings?client=frank
 *
 * Lets the Settings page (settings.html) save Wistia/Typeform/Kit details
 * straight into the database from the browser — nothing gets pasted into chat.
 * Gated by a single ADMIN_KEY (a Cloudflare secret you set once) sent as the
 * `x-admin-key` header, so the page holding the Kit API key isn't wide open.
 */

export async function onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;

  const url = new URL(request.url);
  const client = url.searchParams.get("client") || "unknown";
  if (!env.DB) return json({ ok: false, error: "no database bound yet" });

  const row = await env.DB.prepare(
    "SELECT client,wistia_media_id,typeform_url,kit_tag_id,kit_api_key,updated_at FROM client_config WHERE client=?"
  ).bind(client).first();

  if (!row) return json({ ok: true, client, config: null });

  // Mask the API key on the way out — the form shows "saved" not the raw value.
  row.kit_api_key_set = !!row.kit_api_key;
  delete row.kit_api_key;
  return json({ ok: true, client, config: row });
}

export async function onRequestPost({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound yet" });

  const body = await request.json().catch(() => ({}));
  const client = body.client || "unknown";

  const existing = await env.DB.prepare("SELECT kit_api_key FROM client_config WHERE client=?").bind(client).first();
  const keepKey = body.kit_api_key && body.kit_api_key.length ? body.kit_api_key : (existing ? existing.kit_api_key : null);

  await env.DB.prepare(
    `INSERT INTO client_config (client, wistia_media_id, typeform_url, kit_tag_id, kit_api_key, updated_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(client) DO UPDATE SET
       wistia_media_id=excluded.wistia_media_id,
       typeform_url=excluded.typeform_url,
       kit_tag_id=excluded.kit_tag_id,
       kit_api_key=excluded.kit_api_key,
       updated_at=excluded.updated_at`
  ).bind(client, body.wistia_media_id || null, body.typeform_url || null, body.kit_tag_id || null, keepKey, new Date().toISOString()).run();

  return json({ ok: true, saved: true });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
    },
  });
}

function checkAuth(request, env) {
  if (!env.ADMIN_KEY) return json({ ok: false, error: "ADMIN_KEY not set yet — ask Claude to configure it" }, 500);
  const given = request.headers.get("x-admin-key");
  if (given !== env.ADMIN_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

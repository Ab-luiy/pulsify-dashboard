/**
 * Per-client integration settings.
 *
 * GET/POST /api/settings?client=<client-id>
 * Header: x-admin-key: <ADMIN_KEY>
 */

export async function onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const client = cleanId(url.searchParams.get("client") || "unknown");
  const row = await env.DB.prepare(
    `SELECT client,client_name,wistia_media_id,typeform_url,typeform_webhook_secret,
            kit_tag_id,kit_api_key,allowed_origin,proof_images_json,updated_at
       FROM client_config WHERE client=?`,
  ).bind(client).first();

  if (!row) return json({ ok: true, client, config: null });
  row.kit_api_key_set = Boolean(row.kit_api_key);
  row.typeform_webhook_secret_set = Boolean(row.typeform_webhook_secret);
  row.proof_images = parseJson(row.proof_images_json);
  delete row.kit_api_key;
  delete row.typeform_webhook_secret;
  delete row.proof_images_json;
  return json({ ok: true, client, config: row });
}

export async function onRequestPost({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client || "unknown");
  if (client === "unknown") return json({ ok: false, error: "valid client id required" }, 422);

  const existing = await env.DB.prepare(
    "SELECT kit_api_key,typeform_webhook_secret FROM client_config WHERE client=?",
  ).bind(client).first();
  const kitKey = body.kit_api_key || existing?.kit_api_key || null;
  const webhookSecret =
    body.typeform_webhook_secret || existing?.typeform_webhook_secret || null;

  const proofImages = body.proof_images && typeof body.proof_images === "object"
    ? JSON.stringify(
        Object.fromEntries(
          Object.entries(body.proof_images).filter(([, url]) => url && String(url).trim()),
        ),
      )
    : null;

  await env.DB.prepare(
    `INSERT INTO client_config (
      client,client_name,wistia_media_id,typeform_url,typeform_webhook_secret,
      kit_tag_id,kit_api_key,allowed_origin,proof_images_json,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(client) DO UPDATE SET
      client_name=excluded.client_name,
      wistia_media_id=excluded.wistia_media_id,
      typeform_url=excluded.typeform_url,
      typeform_webhook_secret=excluded.typeform_webhook_secret,
      kit_tag_id=excluded.kit_tag_id,
      kit_api_key=excluded.kit_api_key,
      allowed_origin=excluded.allowed_origin,
      proof_images_json=excluded.proof_images_json,
      updated_at=excluded.updated_at`,
  ).bind(
    client,
    body.client_name || client,
    body.wistia_media_id || null,
    body.typeform_url || null,
    webhookSecret,
    body.kit_tag_id || null,
    kitKey,
    body.allowed_origin || null,
    proofImages,
    new Date().toISOString(),
  ).run();

  return json({
    ok: true,
    saved: true,
    webhook_url: `${new URL(request.url).origin}/event?client=${encodeURIComponent(client)}`,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

function checkAuth(request, env) {
  if (!env.ADMIN_KEY) return json({ ok: false, error: "ADMIN_KEY not configured" }, 500);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}

function parseJson(value) {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return {}; }
}

function cleanId(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "unknown";
}

function json(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

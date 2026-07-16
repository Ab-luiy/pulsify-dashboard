export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const result = await env.DB.prepare(
    `SELECT client, COALESCE(client_name,client) AS client_name, wistia_media_id,
            typeform_url, kit_tag_id, COALESCE(page_active,1) AS page_active,
            prospect_email, acquisition_token, updated_at
       FROM client_config ORDER BY client_name COLLATE NOCASE`,
  ).all();
  return json({ ok: true, clients: result.results || [] });
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

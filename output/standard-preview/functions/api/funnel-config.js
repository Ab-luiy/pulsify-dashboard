export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const client = String(url.searchParams.get("client") || "")
    .toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
  if (!client) return json({ ok: false, error: "client required" }, 400);
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const row = await env.DB.prepare(
    `SELECT client, COALESCE(client_name,client) AS client_name,
            wistia_media_id, typeform_url, proof_images_json,
            COALESCE(page_active,1) AS page_active
       FROM client_config WHERE client=?`,
  ).bind(client).first();
  if (!row) return json({ ok: false, error: "unknown client" }, 404);
  let proofImages = {};
  if (row.proof_images_json) {
    try { proofImages = JSON.parse(row.proof_images_json); } catch { proofImages = {}; }
  }
  delete row.proof_images_json;
  row.proof_images = proofImages;
  row.page_active = row.page_active !== 0;
  return json({ ok: true, config: row });
}

function json(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=60",
    },
  });
}

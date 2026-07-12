import { checkAdmin, cleanId, json, normalizeEmail } from "../_shared/common.js";
import { createSetupLink } from "../_shared/client-auth.js";

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client || "");
  const email = normalizeEmail(body.email || "");
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);
  if (!email) return json({ ok: false, error: "valid email required" }, 422);

  const exists = await env.DB.prepare(
    "SELECT client FROM client_config WHERE client=?",
  ).bind(client).first();
  if (!exists) {
    return json({ ok: false, error: "save this client in Settings before creating a dashboard login" }, 404);
  }

  const result = await createSetupLink(env, new URL(request.url).origin, client, email);
  return json(result, result.ok ? 200 : 422);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

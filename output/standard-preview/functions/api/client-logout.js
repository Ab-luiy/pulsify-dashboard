import { json, sha256Hex } from "../_shared/common.js";
import { clearClientSessionCookie, CLIENT_SESSION_COOKIE, parseCookies } from "../_shared/client-auth.js";

export async function onRequestPost({ request, env }) {
  const token = parseCookies(request.headers.get("cookie")).get(CLIENT_SESSION_COOKIE);
  if (env.DB && token) {
    const hash = await sha256Hex(token);
    await Promise.all([
      env.DB.prepare(
        "DELETE FROM client_sessions WHERE token_hash=?",
      ).bind(hash).run().catch(() => null),
      env.DB.prepare(
        "DELETE FROM impersonation_sessions WHERE token_hash=?",
      ).bind(hash).run().catch(() => null),
    ]);
  }
  return json(
    { ok: true, logged_out: true },
    200,
    { "set-cookie": clearClientSessionCookie() },
  );
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

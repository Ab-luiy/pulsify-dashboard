/**
 * Per-client portal access tokens — the client's private login link.
 *
 * POST /api/portal-token?client=<id>  -> mint/rotate; returns the raw token + full
 *                                        link ONCE. Rotating invalidates the old link.
 * GET  /api/portal-token?client=<id>  -> { has_token: bool } (never returns the token)
 *
 * Both are operator-only (x-admin-key). The raw token is never stored — only its
 * SHA-256 hash lands in client_config.portal_token_hash. /leads verifies a presented
 * token by hashing it and matching that column, then scopes all reads to that client.
 */

export async function onRequestPost({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const client = cleanId(url.searchParams.get("client") || "");
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);

  const token = generateToken();
  const hash = await sha256Hex(token);
  const result = await env.DB.prepare(
    "UPDATE client_config SET portal_token_hash=?, updated_at=? WHERE client=?",
  ).bind(hash, new Date().toISOString(), client).run();

  if (!result.meta?.changes) {
    return json(
      { ok: false, error: "save this client in Settings before creating a portal link" },
      404,
    );
  }

  return json({
    ok: true,
    client,
    token,
    link: `${url.origin}/client?client=${encodeURIComponent(client)}&t=${token}`,
    note: "Shown once. If lost, generate a new link — the old one stops working.",
  });
}

export async function onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const client = cleanId(url.searchParams.get("client") || "");
  const row = await env.DB.prepare(
    "SELECT portal_token_hash FROM client_config WHERE client=?",
  ).bind(client).first();

  return json({ ok: true, client, has_token: Boolean(row?.portal_token_hash) });
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

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function checkAuth(request, env) {
  if (!env.ADMIN_KEY) return json({ ok: false, error: "ADMIN_KEY not configured" }, 500);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}

function cleanId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "";
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

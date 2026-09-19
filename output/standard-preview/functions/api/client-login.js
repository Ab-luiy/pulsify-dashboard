import { json, normalizeEmail } from "../_shared/common.js";
import {
  clearFailedLogins,
  countRecentFailedLogins,
  isRateLimited,
  issueClientSession,
  rateLimitPayload,
  recordFailedLogin,
  verifyPassword,
} from "../_shared/client-auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email || "");
  const password = String(body.password || "");
  if (!email || !password) {
    return json({ ok: false, error: "email and password are required" }, 422);
  }

  const failedCount = await countRecentFailedLogins(env, email);
  if (isRateLimited(failedCount)) {
    return json(rateLimitPayload(failedCount), 429);
  }

  const authRow = await env.DB.prepare(
    `SELECT client_id, email, pass_hash, pass_salt, iterations
       FROM client_auth
      WHERE email=?`,
  ).bind(email).first();

  const valid = await verifyPassword(password, authRow);
  if (!valid) {
    await recordFailedLogin(env, email);
    const nextCount = failedCount + 1;
    return json(rateLimitPayload(nextCount), nextCount >= 5 ? 429 : 401);
  }

  await clearFailedLogins(env, email);
  // An archived workspace keeps its data but nobody signs into it.
  const config = await env.DB.prepare("SELECT status FROM client_config WHERE client=?").bind(authRow.client_id).first().catch(() => null);
  if (config?.status === "archived") return json({ ok: false, error: "This workspace has been archived. Contact Pulsify to reopen it." }, 403);
  const session = await issueClientSession(env, authRow.client_id);
  return json(
    {
      ok: true,
      client: authRow.client_id,
      redirect: `/portal?client=${encodeURIComponent(authRow.client_id)}`,
    },
    200,
    { "set-cookie": session.cookie },
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

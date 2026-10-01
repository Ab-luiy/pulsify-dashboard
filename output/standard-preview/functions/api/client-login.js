import { json, normalizeEmail } from "../_shared/common.js";
import { addressHash, PASSWORD_MAX, sameOrigin } from "../_shared/auth-guard.js";
import {
  clearFailedLogins,
  countRecentFailedLogins,
  isRateLimited,
  issueClientSession,
  rateLimitPayload,
  recordFailedLogin,
  verifyPassword,
} from "../_shared/client-auth.js";

const NO_STORE = { "cache-control": "no-store" };

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: "Forbidden" }, 403, NO_STORE);
  if (!env.DB) return json({ ok: false, error: "Sign-in is unavailable right now. Try again shortly." }, 503, NO_STORE);

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email || "");
  const password = String(body.password || "");
  if (!email || !password) {
    return json({ ok: false, error: "Enter your email and password." }, 422, NO_STORE);
  }
  // Nobody's real password is this long; refusing it keeps a huge value from costing a hash.
  if (password.length > PASSWORD_MAX) return json({ ok: false, error: "Incorrect password." }, 401, NO_STORE);

  const ip = await addressHash(request);
  const failedCount = await countRecentFailedLogins(env, email, ip);
  if (isRateLimited(failedCount)) {
    return json(rateLimitPayload(failedCount), 429, NO_STORE);
  }

  const authRow = await env.DB.prepare(
    `SELECT client_id, email, pass_hash, pass_salt, iterations
       FROM client_auth
      WHERE email=?`,
  ).bind(email).first();

  const valid = await verifyPassword(password, authRow);
  if (!valid) {
    await recordFailedLogin(env, email, ip);
    const nextCount = failedCount + 1;
    return json(rateLimitPayload(nextCount), nextCount >= 5 ? 429 : 401, NO_STORE);
  }

  await clearFailedLogins(env, email, ip);
  // An archived workspace keeps its data but nobody signs into it.
  const config = await env.DB.prepare("SELECT status FROM client_config WHERE client=?").bind(authRow.client_id).first().catch(() => null);
  if (config?.status === "archived") return json({ ok: false, error: "This workspace has been archived. Contact Pulsify to reopen it." }, 403, NO_STORE);
  const session = await issueClientSession(env, authRow.client_id);
  return json(
    {
      ok: true,
      client: authRow.client_id,
      redirect: `/app/portal?client=${encodeURIComponent(authRow.client_id)}`,
    },
    200,
    { ...NO_STORE, "set-cookie": session.cookie },
  );
}

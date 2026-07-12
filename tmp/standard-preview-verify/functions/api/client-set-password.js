import { json } from "../_shared/common.js";
import {
  PBKDF2_ITERATIONS,
  consumeSetupToken,
  createPasswordSalt,
  invalidateSetupTokensForClient,
  issueClientSession,
  hashPassword,
} from "../_shared/client-auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const setupToken = String(body.setup_token || "");
  const password = String(body.password || "");
  if (!setupToken || !password) {
    return json({ ok: false, error: "setup token and password are required" }, 422);
  }
  if (password.length < 10) {
    return json({ ok: false, error: "password must be at least 10 characters" }, 422);
  }

  const setup = await consumeSetupToken(env, setupToken);
  if (!setup) {
    return json({ ok: false, error: "this setup link is invalid or expired" }, 401);
  }

  const salt = createPasswordSalt();
  const passHash = await hashPassword(password, salt, PBKDF2_ITERATIONS);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE client_auth
        SET email=?,
            pass_hash=?,
            pass_salt=?,
            iterations=?,
            updated_at=?
      WHERE client_id=?`,
  ).bind(
    setup.email,
    passHash,
    salt,
    PBKDF2_ITERATIONS,
    now,
    setup.client_id,
  ).run();

  await invalidateSetupTokensForClient(env, setup.client_id);
  const session = await issueClientSession(env, setup.client_id);

  return json(
    {
      ok: true,
      client: setup.client_id,
      redirect: `/portal?client=${encodeURIComponent(setup.client_id)}`,
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

import { constantTimeEqual, json, normalizeEmail, nowIso, sha256Hex } from "../_shared/common.js";
import { consumeSetupToken, rejectImpersonatedSession } from "../_shared/client-auth.js";
import { sameOrigin } from "../_shared/auth-guard.js";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

// A setup page asks for a code each time it loads, so cap how many emails one link can trigger.
const CODES_PER_LINK_PER_HOUR = 5;

async function allowCode(env, setupToken) {
  const bucket = new Date().toISOString().slice(0, 13);
  const key = `setup-code:${(await sha256Hex(setupToken)).slice(0, 24)}`;
  try {
    await env.DB.prepare("INSERT INTO api_key_usage (key_id, bucket, count) VALUES (?,?,1) ON CONFLICT(key_id, bucket) DO UPDATE SET count=count+1").bind(key, bucket).run();
    const row = await env.DB.prepare("SELECT count FROM api_key_usage WHERE key_id=? AND bucket=?").bind(key, bucket).first();
    return (row?.count || 0) <= CODES_PER_LINK_PER_HOUR;
  } catch {
    return true;
  }
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: "Forbidden" }, 403);
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const impersonationError = await rejectImpersonatedSession(request, env);
  if (impersonationError) return impersonationError;

  const body = await request.json().catch(() => ({}));
  const setupToken = String(body.setup_token || "");
  if (!setupToken) return json({ ok: false, error: "setup token is required" }, 422);

  const setup = await consumeSetupToken(env, setupToken);
  if (!setup) {
    return json({ ok: false, error: "this setup link is invalid or expired" }, 401);
  }

  if (!env.RESEND_API_KEY) {
    return json({ ok: true, requires_code: false, sent: false });
  }
  if (!(await allowCode(env, setupToken))) {
    return json({ ok: false, error: "Too many codes requested for this link. Wait an hour, or ask for a new link." }, 429);
  }
  if (!env.EMAIL_FROM) {
    return json({ ok: false, error: "EMAIL_FROM is not configured" }, 500);
  }

  const email = normalizeEmail(setup.email);
  if (!email) {
    return json({ ok: false, error: "setup email is invalid" }, 422);
  }

  await purgeExpiredCodes(env);
  const code = createCode();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
  const createdAt = nowIso();

  await env.DB.prepare(
    `INSERT INTO client_email_codes (client_id, email, purpose, code_hash, expires_at, attempts, created_at)
     VALUES (?, ?, 'setup', ?, ?, 0, ?)
     ON CONFLICT(client_id, email, purpose) DO UPDATE SET
       code_hash=excluded.code_hash,
       expires_at=excluded.expires_at,
       attempts=0,
       created_at=excluded.created_at`,
  ).bind(setup.client_id, email, codeHash, expiresAt, createdAt).run();

  try {
    await sendSetupCodeEmail(env, {
      email,
      clientId: setup.client_id,
      code,
      expiresAt,
    });
  } catch (error) {
    return json({ ok: false, error: `could not send email code: ${safeMessage(error)}` }, 502);
  }

  return json({
    ok: true,
    requires_code: true,
    sent: true,
    email,
    expires_at: expiresAt,
    max_attempts: MAX_ATTEMPTS,
  });
}

export async function readSetupCodeRecord(env, clientId, email) {
  await purgeExpiredCodes(env);
  const normalized = normalizeEmail(email || "");
  if (!normalized) return null;
  return env.DB.prepare(
    `SELECT client_id, email, purpose, code_hash, expires_at, attempts, created_at
       FROM client_email_codes
      WHERE client_id=? AND email=? AND purpose='setup'`,
  ).bind(clientId, normalized).first();
}

export async function verifySetupCode(env, setup, code) {
  const row = await readSetupCodeRecord(env, setup.client_id, setup.email);
  if (!row) {
    return { ok: false, error: "email verification code not found. Reload the page and request a new code." };
  }
  if (String(row.expires_at || "") <= nowIso()) {
    await deleteSetupCode(env, setup.client_id, setup.email);
    return { ok: false, error: "email verification code expired. Reload the page and request a new code." };
  }
  if (Number(row.attempts || 0) >= MAX_ATTEMPTS) {
    return { ok: false, error: "too many incorrect code attempts. Reload the page and request a new code." };
  }

  const actual = await sha256Hex(String(code || "").trim());
  if (!constantTimeEqual(actual, row.code_hash || "")) {
    await env.DB.prepare(
      `UPDATE client_email_codes
          SET attempts=attempts + 1
        WHERE client_id=? AND email=? AND purpose='setup'`,
    ).bind(setup.client_id, normalizeEmail(setup.email),).run();
    const refreshed = await readSetupCodeRecord(env, setup.client_id, setup.email);
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - Number(refreshed?.attempts || 0));
    return {
      ok: false,
      error: attemptsLeft
        ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`
        : "Too many incorrect code attempts. Reload the page and request a new code.",
    };
  }

  return { ok: true };
}

export async function deleteSetupCode(env, clientId, email) {
  const normalized = normalizeEmail(email || "");
  if (!normalized) return;
  await env.DB.prepare(
    "DELETE FROM client_email_codes WHERE client_id=? AND email=? AND purpose='setup'",
  ).bind(clientId, normalized).run();
}

async function purgeExpiredCodes(env) {
  await env.DB.prepare(
    "DELETE FROM client_email_codes WHERE expires_at<?",
  ).bind(nowIso()).run();
}

function createCode() {
  // Rejection sampling keeps the six digits uniform.
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer); while (buffer[0] >= 4294000000);
  return String(buffer[0] % 1000000).padStart(6, "0");
}

async function sendSetupCodeEmail(env, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [payload.email],
      subject: `Your Pulsify setup code for ${payload.clientId}`,
      text: [
        `Your Pulsify setup code is ${payload.code}.`,
        "It expires in 10 minutes.",
        "If you did not request this code, ignore this email.",
      ].join("\n\n"),
    }),
  });
  if (!response.ok) {
    throw new Error(`${response.status}: ${(await response.text()).slice(0, 400)}`);
  }
}

function safeMessage(error) {
  return String(error?.message || error || "unknown error").slice(0, 400);
}

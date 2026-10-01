// Team sign-in on our own form (founder, 2026-10-01). Public endpoint; every action is POST and same-origin.
//   {action:"link",   email}                          emails a one-time link to set or reset the team password
//   {action:"setup",  setup_token, password}          sets the password from that link and signs in
//   {action:"login",  email, password, trust?, next?} password step; a trusted device goes straight in, a new one gets an emailed code
//   {action:"verify", challenge, code}                finishes a sign-in with the emailed 6-digit code
// Only addresses on the team (OPERATOR_EMAILS or operator_users) can ever sign in. Every failure answers the
// same way for team and non-team addresses, so nothing here says who is on the team.
import { constantTimeEqual, generateOpaqueToken, json, normalizeEmail, nowIso, sha256Hex, str } from "../_shared/common.js";
import { addressHash, consoleDestination, passwordProblem, PASSWORD_MAX, sameOrigin } from "../_shared/auth-guard.js";
import {
  PBKDF2_ITERATIONS,
  clearFailedLogins,
  countRecentFailedLogins,
  createPasswordSalt,
  hashPassword,
  isRateLimited,
  parseCookies,
  rateLimitPayload,
  recordFailedLogin,
  verifyPassword,
} from "../_shared/client-auth.js";
import { isOperatorEmailDb, issueOperatorSession, revokeOperatorSessionsFor } from "../_shared/operator-session.js";

export const DEVICE_COOKIE = "__Host-pulsify_device";
export const OPERATOR_PASSWORD_MIN = 12;
const DEVICE_DAYS = 30;
const CODE_MINUTES = 10;
const CODE_ATTEMPTS = 5;
const SETUP_HOURS = 48;
const LINKS_PER_HOUR = 3;
const CODES_PER_HOUR = 6;
const NO_STORE = { "cache-control": "no-store" };

const GENERIC_LINK = { ok: true, sent: true, message: "If that address is on the Pulsify team, a one-time link is on its way. It works once and expires in 48 hours." };
const WRONG = "Incorrect email or password.";

const deviceCookie = (value, seconds) => `${DEVICE_COOKIE}=${value}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;

async function allow(env, key, limit) {
  const bucket = new Date().toISOString().slice(0, 13);
  try {
    await env.DB.prepare("INSERT INTO api_key_usage (key_id, bucket, count) VALUES (?,?,1) ON CONFLICT(key_id, bucket) DO UPDATE SET count=count+1").bind(key, bucket).run();
    const row = await env.DB.prepare("SELECT count FROM api_key_usage WHERE key_id=? AND bucket=?").bind(key, bucket).first();
    return (row?.count || 0) <= limit;
  } catch {
    return true;
  }
}

async function sendMail(env, to, subject, text, fetcher = fetch) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function sixDigits() {
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer); while (buffer[0] >= 4294000000);
  return String(buffer[0] % 1000000).padStart(6, "0");
}

// A signed-in response: the team session, plus the trusted-device cookie when asked for.
async function signedIn(env, email, { trust = false, next = "", providerId = "password" } = {}) {
  const session = await issueOperatorSession(env, { email, providerUserId: providerId });
  await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?, 'operator-sign-in', NULL, ?, ?)")
    .bind(email, JSON.stringify({ via: providerId }), nowIso()).run().catch(() => null);
  const headers = new Headers({ "content-type": "application/json", ...NO_STORE });
  headers.append("set-cookie", session.cookie);
  if (trust) {
    const token = generateOpaqueToken(32);
    const now = Date.now();
    await env.DB.prepare("INSERT INTO operator_devices (token_hash, email, created_at, expires_at) VALUES (?,?,?,?)")
      .bind(await sha256Hex(token), email, new Date(now).toISOString(), new Date(now + DEVICE_DAYS * 86400000).toISOString()).run().catch(() => null);
    headers.append("set-cookie", deviceCookie(token, DEVICE_DAYS * 86400));
  }
  return new Response(JSON.stringify({ ok: true, redirect: consoleDestination(next) }), { status: 200, headers });
}

async function isTrustedDevice(request, env, email) {
  const token = parseCookies(request.headers.get("cookie")).get(DEVICE_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return false;
  const row = await env.DB.prepare("SELECT 1 AS ok FROM operator_devices WHERE token_hash=? AND email=? AND expires_at>?").bind(await sha256Hex(token), email, nowIso()).first().catch(() => null);
  return Boolean(row);
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: "Forbidden" }, 403, NO_STORE);
  if (!env.DB) return json({ ok: false, error: "Sign-in is unavailable right now. Try again shortly." }, 503, NO_STORE);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400, NO_STORE); }
  const seen = new URL(request.url).origin;
  const origin = /\.pages\.dev$/.test(new URL(seen).hostname) ? "https://pulsify-ai.com" : seen;
  const action = str(body.action);
  if (action === "link") return sendLink(env, body, origin);
  if (action === "setup") return setPassword(env, body);
  if (action === "login") return login(request, env, body);
  if (action === "verify") return verify(env, body);
  return json({ ok: false, error: "unknown action" }, 422, NO_STORE);
}

async function sendLink(env, body, origin) {
  const email = normalizeEmail(body.email);
  if (!email) return json({ ok: false, error: "Enter a valid email address." }, 422, NO_STORE);
  try {
    if (!(await allow(env, `op-link:${email}`, LINKS_PER_HOUR))) return json(GENERIC_LINK, 200, NO_STORE);
    if (!(await isOperatorEmailDb(env, email))) return json(GENERIC_LINK, 200, NO_STORE);
    const token = generateOpaqueToken(32);
    const now = nowIso();
    await env.DB.prepare("DELETE FROM operator_setup_tokens WHERE email=?").bind(email).run();
    await env.DB.prepare("INSERT INTO operator_setup_tokens (token_hash, email, expires_at, created_at) VALUES (?,?,?,?)")
      .bind(await sha256Hex(token), email, new Date(Date.now() + SETUP_HOURS * 3600000).toISOString(), now).run();
    await sendMail(env, email, "Set your Pulsify team password", [
      "Here is your one-time link to set a password for the Pulsify team console:",
      `${origin}/login/operator?setup=${encodeURIComponent(token)}`,
      "",
      "It works once and expires in 48 hours. If you did not ask for this, ignore it; nothing changes until the link is used.",
      "",
      "Pulsify",
    ].join("\n"));
  } catch { /* same answer regardless */ }
  return json(GENERIC_LINK, 200, NO_STORE);
}

async function setPassword(env, body) {
  const token = str(body.setup_token);
  const password = String(body.password || "");
  if (!token) return json({ ok: false, error: "This setup link is invalid or expired. Ask for a new one." }, 401, NO_STORE);
  const row = await env.DB.prepare("SELECT email, expires_at FROM operator_setup_tokens WHERE token_hash=?").bind(await sha256Hex(token)).first();
  if (!row || String(row.expires_at) <= nowIso() || !(await isOperatorEmailDb(env, row.email))) {
    return json({ ok: false, error: "This setup link is invalid or expired. Ask for a new one." }, 401, NO_STORE);
  }
  const problem = passwordProblem(password, row.email, OPERATOR_PASSWORD_MIN);
  if (problem) return json({ ok: false, error: problem }, 422, NO_STORE);
  const salt = createPasswordSalt();
  const hash = await hashPassword(password, salt, PBKDF2_ITERATIONS);
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO operator_auth (email, pass_hash, pass_salt, iterations, created_at, updated_at) VALUES (?,?,?,?,?,?)
     ON CONFLICT(email) DO UPDATE SET pass_hash=excluded.pass_hash, pass_salt=excluded.pass_salt, iterations=excluded.iterations, updated_at=excluded.updated_at`,
  ).bind(row.email, hash, salt, PBKDF2_ITERATIONS, now, now).run();
  await env.DB.prepare("DELETE FROM operator_setup_tokens WHERE email=?").bind(row.email).run();
  // A new password ends every other session and trusted device. The link itself proved the mailbox, so this one signs in.
  await revokeOperatorSessionsFor(env, row.email);
  await env.DB.prepare("DELETE FROM operator_devices WHERE email=?").bind(row.email).run().catch(() => null);
  return signedIn(env, row.email, { trust: body.trust !== false, next: str(body.next), providerId: "password-setup" });
}

async function login(request, env, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!email || !password) return json({ ok: false, error: "Enter your email and password." }, 422, NO_STORE);
  if (password.length > PASSWORD_MAX) return json({ ok: false, error: WRONG }, 401, NO_STORE);
  const key = `op:${email}`;
  const ip = await addressHash(request);
  const failed = await countRecentFailedLogins(env, key, ip);
  if (isRateLimited(failed)) return json(rateLimitPayload(failed), 429, NO_STORE);

  const row = await env.DB.prepare("SELECT pass_hash, pass_salt, iterations FROM operator_auth WHERE email=?").bind(email).first();
  const passwordOk = await verifyPassword(password, row);
  const onTeam = await isOperatorEmailDb(env, email);
  if (!passwordOk || !onTeam) {
    await recordFailedLogin(env, key, ip);
    const next = failed + 1;
    const payload = rateLimitPayload(next);
    return json({ ...payload, error: next >= 5 ? payload.error : `${WRONG} ${payload.attempts_left} attempt${payload.attempts_left === 1 ? "" : "s"} left before the login pauses.` }, next >= 5 ? 429 : 401, NO_STORE);
  }
  await clearFailedLogins(env, key, ip);

  const trust = body.trust === true;
  if (await isTrustedDevice(request, env, email)) return signedIn(env, email, { trust: false, next: str(body.next) });

  // New device: an emailed code proves the mailbox before the session starts.
  if (!(await allow(env, `op-code:${email}`, CODES_PER_HOUR))) return json({ ok: false, error: "Too many codes requested. Wait an hour and try again." }, 429, NO_STORE);
  const code = sixDigits();
  const challenge = generateOpaqueToken(32);
  const now = nowIso();
  await env.DB.prepare("INSERT INTO operator_challenges (token_hash, email, code_hash, attempts, trust, next, expires_at, created_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind(await sha256Hex(challenge), email, await sha256Hex(code), 0, trust ? 1 : 0, consoleDestination(str(body.next)), new Date(Date.now() + CODE_MINUTES * 60000).toISOString(), now).run();
  const sent = await sendMail(env, email, "Your Pulsify team sign-in code", [`Your sign-in code is ${code}.`, `It expires in ${CODE_MINUTES} minutes.`, "If you did not try to sign in, change your password: someone has it."].join("\n\n"));
  if (!sent) return json({ ok: false, error: "We could not send your sign-in code. Try again in a moment." }, 502, NO_STORE);
  return json({ ok: true, step: "code", challenge, email }, 200, NO_STORE);
}

async function verify(env, body) {
  const challenge = str(body.challenge);
  const code = str(body.code).replace(/\s+/g, "");
  if (!challenge || !/^\d{6}$/.test(code)) return json({ ok: false, error: "Enter the 6-digit code from your email." }, 422, NO_STORE);
  const hash = await sha256Hex(challenge);
  const row = await env.DB.prepare("SELECT email, code_hash, attempts, trust, next, expires_at FROM operator_challenges WHERE token_hash=?").bind(hash).first();
  if (!row || String(row.expires_at) <= nowIso()) {
    if (row) await env.DB.prepare("DELETE FROM operator_challenges WHERE token_hash=?").bind(hash).run();
    return json({ ok: false, expired: true, error: "That code has expired. Sign in again to get a new one." }, 401, NO_STORE);
  }
  if (Number(row.attempts) >= CODE_ATTEMPTS) {
    await env.DB.prepare("DELETE FROM operator_challenges WHERE token_hash=?").bind(hash).run();
    return json({ ok: false, expired: true, error: "Too many wrong codes. Sign in again to get a new one." }, 401, NO_STORE);
  }
  if (!constantTimeEqual(await sha256Hex(code), row.code_hash)) {
    await env.DB.prepare("UPDATE operator_challenges SET attempts=attempts+1 WHERE token_hash=?").bind(hash).run();
    const left = Math.max(0, CODE_ATTEMPTS - Number(row.attempts) - 1);
    return json({ ok: false, error: left ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong codes. Sign in again to get a new one." }, 401, NO_STORE);
  }
  await env.DB.prepare("DELETE FROM operator_challenges WHERE token_hash=?").bind(hash).run();
  if (!(await isOperatorEmailDb(env, row.email))) return json({ ok: false, error: WRONG }, 401, NO_STORE);
  return signedIn(env, row.email, { trust: Boolean(row.trust), next: row.next || "" });
}

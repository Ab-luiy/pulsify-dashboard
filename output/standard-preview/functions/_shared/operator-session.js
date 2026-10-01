import { generateOpaqueToken, normalizeEmail, sha256Hex } from './common.js';
import { parseCookies } from './client-auth.js';

// Operator sign-in through PropelAuth. The browser holds an opaque token in a
// __Host- cookie (HttpOnly, Secure, SameSite=Lax, Path=/, no Domain), D1 holds
// only its SHA-256 hash. Sessions are short and can be revoked server-side.
export const OPERATOR_COOKIE = '__Host-pulsify_operator';
export const OPERATOR_SESSION_SECONDS = 12 * 60 * 60;

/** The founder-approved operator list (OPERATOR_EMAILS, comma separated). */
export function operatorEmails(env) {
  return new Set(String(env?.OPERATOR_EMAILS || env?.OPERATOR_EMAIL || '')
    .split(',').map(normalizeEmail).filter(Boolean));
}

export function isOperatorEmail(env, email) {
  const normalized = normalizeEmail(email);
  return Boolean(normalized) && operatorEmails(env).has(normalized);
}

/** Same check plus operators the founder added from the console (operator_users). Env owners skip the query. */
export async function isOperatorEmailDb(env, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (operatorEmails(env).has(normalized)) return true;
  if (!env?.DB) return false;
  try {
    const row = await env.DB.prepare('SELECT 1 AS ok FROM operator_users WHERE email = ? AND removed_at IS NULL').bind(normalized).first();
    return Boolean(row);
  } catch { return false; }
}

function cookie(value, maxAge) {
  return `${OPERATOR_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export const clearOperatorCookie = () => cookie('', 0);

export async function issueOperatorSession(env, { email, providerUserId }) {
  const token = generateOpaqueToken(32);
  const now = new Date();
  await env.DB.prepare(
    `INSERT INTO operator_sessions (token_hash, email, provider_user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(
    await sha256Hex(token), normalizeEmail(email), String(providerUserId),
    now.toISOString(), new Date(now.getTime() + OPERATOR_SESSION_SECONDS * 1000).toISOString(),
  ).run();
  return { cookie: cookie(token, OPERATOR_SESSION_SECONDS) };
}

/**
 * The operator behind this request's session cookie, or null. The email must
 * still be on OPERATOR_EMAILS, so removing someone from the list signs them
 * out everywhere on their next request.
 */
export async function resolveOperatorSession(request, env) {
  const token = parseCookies(request.headers.get('cookie')).get(OPERATOR_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token) || !env?.DB) return null;
  try {
    const row = await env.DB.prepare(
      `SELECT email, expires_at FROM operator_sessions
        WHERE token_hash = ? AND revoked_at IS NULL`,
    ).bind(await sha256Hex(token)).first();
    if (!row || Date.parse(row.expires_at) <= Date.now() || !(await isOperatorEmailDb(env, row.email))) return null;
    return { email: row.email, via: 'session' };
  } catch {
    return null;
  }
}

export async function revokeOperatorSession(request, env) {
  const token = parseCookies(request.headers.get('cookie')).get(OPERATOR_COOKIE);
  if (!token || !env?.DB) return;
  try {
    await env.DB.prepare('UPDATE operator_sessions SET revoked_at = ? WHERE token_hash = ?')
      .bind(new Date().toISOString(), await sha256Hex(token)).run();
  } catch { /* the cookie is cleared regardless */ }
}

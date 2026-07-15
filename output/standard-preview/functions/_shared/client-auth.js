import {
  cleanId,
  constantTimeEqual,
  generateOpaqueToken,
  json,
  normalizeEmail,
  nowIso,
  sha256Hex,
} from "./common.js";

export const CLIENT_SESSION_COOKIE = "pulsify_client_session";
export const PBKDF2_ITERATIONS = 100000;
const SESSION_TTL_DAYS = 30;
const SETUP_TOKEN_TTL_HOURS = 72;
const FAILED_LOGIN_LIMIT = 5;
const FAILED_LOGIN_WINDOW_MINUTES = 15;
export const IMPERSONATION_TTL_MINUTES = 30;

export async function hashPassword(password, salt, iterations = PBKDF2_ITERATIONS) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations,
    },
    passwordKey,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

export function createPasswordSalt() {
  return generateOpaqueToken(24);
}

export async function verifyPassword(password, row) {
  const salt = row?.pass_salt || "pulsify-client-auth-dummy-salt";
  const iterations = Number(row?.iterations || PBKDF2_ITERATIONS);
  const expected = row?.pass_hash || "0".repeat(64);
  const actual = await hashPassword(password, salt, iterations);
  return constantTimeEqual(actual, expected) && Boolean(row?.pass_hash);
}

export async function countRecentFailedLogins(env, email) {
  const threshold = isoMinutesAgo(FAILED_LOGIN_WINDOW_MINUTES);
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total
       FROM client_login_attempts
      WHERE email=? AND attempted_at>=?`,
  ).bind(email, threshold).first();
  return Number(row?.total || 0);
}

export async function recordFailedLogin(env, email) {
  await env.DB.prepare(
    "INSERT INTO client_login_attempts (email, attempted_at) VALUES (?, ?)",
  ).bind(email, nowIso()).run();
}

export async function clearFailedLogins(env, email) {
  await env.DB.prepare(
    "DELETE FROM client_login_attempts WHERE email=?",
  ).bind(email).run();
}

export function isRateLimited(count) {
  return count >= FAILED_LOGIN_LIMIT;
}

export function rateLimitPayload(count) {
  const attemptsLeft = Math.max(0, FAILED_LOGIN_LIMIT - count);
  return {
    ok: false,
    error: attemptsLeft
      ? `Incorrect password. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left before the login pauses.`
      : "Too many failed login attempts. Wait 15 minutes and try again.",
    rate_limited: attemptsLeft === 0,
    attempts_left: attemptsLeft,
  };
}

export async function issueClientSession(env, clientId) {
  const token = generateOpaqueToken(32);
  const tokenHash = await sha256Hex(token);
  const createdAt = nowIso();
  const expiresAt = isoDaysFromNow(SESSION_TTL_DAYS);

  await env.DB.prepare(
    `INSERT INTO client_sessions (token_hash, client_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).bind(tokenHash, clientId, expiresAt, createdAt).run();

  return {
    token,
    expiresAt,
    cookie: serializeCookie(CLIENT_SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    }),
  };
}

export async function issueImpersonationExchange(env, clientId, createdBy = "admin") {
  const exchangeToken = generateOpaqueToken(32);
  const exchangeHash = await sha256Hex(exchangeToken);
  const createdAt = nowIso();
  const expiresAt = isoMinutesFromNow(IMPERSONATION_TTL_MINUTES);

  const sessionStatement = env.DB.prepare(
    `INSERT INTO impersonation_sessions (
       token_hash, exchange_hash, client_id, created_at, expires_at, created_by, consumed_at
     ) VALUES (NULL, ?, ?, ?, ?, ?, NULL)`,
  ).bind(exchangeHash, clientId, createdAt, expiresAt, createdBy);
  const eventStatement = env.DB.prepare(
    `INSERT INTO operator_events (actor, action, client, detail, created_at)
     VALUES (?, 'impersonate-start', ?, ?, ?)`,
  ).bind(createdBy, clientId, JSON.stringify({ surface: "command-center" }), createdAt);
  const results = await env.DB.batch([sessionStatement, eventStatement]);

  return {
    exchangeToken,
    createdAt,
    expiresAt,
    eventId: results?.[1]?.meta?.last_row_id ?? null,
  };
}

export async function consumeImpersonationExchange(env, exchangeToken) {
  const rawToken = String(exchangeToken || "").trim();
  if (!rawToken || !env.DB) return null;

  const exchangeHash = await sha256Hex(rawToken);
  const sessionToken = generateOpaqueToken(32);
  const tokenHash = await sha256Hex(sessionToken);
  const consumedAt = nowIso();
  const row = await env.DB.prepare(
    `UPDATE impersonation_sessions
        SET token_hash=?, exchange_hash=NULL, consumed_at=?
      WHERE exchange_hash=? AND token_hash IS NULL AND consumed_at IS NULL AND expires_at>?
      RETURNING client_id, expires_at, created_by`,
  ).bind(tokenHash, consumedAt, exchangeHash, consumedAt).first();
  if (!row) return null;

  try {
    await env.DB.prepare(
      `INSERT INTO operator_events (actor, action, client, detail, created_at)
       VALUES (?, 'impersonate-use', ?, ?, ?)`,
    ).bind(
      row.created_by || "admin",
      row.client_id,
      JSON.stringify({ surface: "portal" }),
      consumedAt,
    ).run();
  } catch {
    await env.DB.prepare(
      "DELETE FROM impersonation_sessions WHERE token_hash=?",
    ).bind(tokenHash).run().catch(() => null);
    return null;
  }

  const secondsRemaining = Math.max(
    0,
    Math.min(
      IMPERSONATION_TTL_MINUTES * 60,
      Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000),
    ),
  );
  if (!secondsRemaining) return null;

  return {
    client: cleanId(row.client_id),
    expiresAt: row.expires_at,
    cookie: serializeCookie(CLIENT_SESSION_COOKIE, sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
      maxAge: secondsRemaining,
    }),
  };
}

export function clearClientSessionCookie() {
  return serializeCookie(CLIENT_SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
    maxAge: 0,
  });
}

export async function purgeExpiredClientSessions(env) {
  const cutoff = nowIso();
  await Promise.all([
    env.DB.prepare(
      "DELETE FROM client_sessions WHERE expires_at<?",
    ).bind(cutoff).run(),
    env.DB.prepare(
      "DELETE FROM impersonation_sessions WHERE expires_at<?",
    ).bind(cutoff).run().catch(() => null),
  ]);
}

export async function createSetupLink(env, origin, clientId, email) {
  const safeClient = cleanId(clientId);
  const normalizedEmail = normalizeEmail(email);
  if (!safeClient) return { ok: false, error: "valid client id required" };
  if (!normalizedEmail) return { ok: false, error: "valid email required" };

  const existingByEmail = await env.DB.prepare(
    "SELECT client_id FROM client_auth WHERE email=?",
  ).bind(normalizedEmail).first();
  if (existingByEmail && cleanId(existingByEmail.client_id) !== safeClient) {
    return { ok: false, error: "this email is already assigned to another client" };
  }

  const existing = await env.DB.prepare(
    `SELECT client_id, pass_hash, pass_salt, iterations, created_at
       FROM client_auth WHERE client_id=?`,
  ).bind(safeClient).first();

  const createdAt = existing?.created_at || nowIso();
  await env.DB.prepare(
    `INSERT INTO client_auth (client_id, email, pass_hash, pass_salt, iterations, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id) DO UPDATE SET
       email=excluded.email,
       pass_hash=excluded.pass_hash,
       pass_salt=excluded.pass_salt,
       iterations=excluded.iterations,
       updated_at=excluded.updated_at`,
  ).bind(
    safeClient,
    normalizedEmail,
    existing?.pass_hash || null,
    existing?.pass_salt || null,
    Number(existing?.iterations || PBKDF2_ITERATIONS),
    createdAt,
    nowIso(),
  ).run();

  await env.DB.prepare(
    "DELETE FROM client_setup_tokens WHERE client_id=?",
  ).bind(safeClient).run();

  const token = generateOpaqueToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = isoHoursFromNow(SETUP_TOKEN_TTL_HOURS);
  await env.DB.prepare(
    `INSERT INTO client_setup_tokens (token_hash, client_id, email, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(tokenHash, safeClient, normalizedEmail, expiresAt, nowIso()).run();

  return {
    ok: true,
    client: safeClient,
    email: normalizedEmail,
    link: `${origin}/portal/login?client=${encodeURIComponent(safeClient)}&setup=${encodeURIComponent(token)}`,
    expires_at: expiresAt,
    note: "Shown once. Generating a new setup link turns off the previous one.",
  };
}

export async function consumeSetupToken(env, token) {
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT token_hash, client_id, email, expires_at
       FROM client_setup_tokens
      WHERE token_hash=?`,
  ).bind(tokenHash).first();
  if (!row) return null;
  if (String(row.expires_at || "") <= nowIso()) {
    await env.DB.prepare(
      "DELETE FROM client_setup_tokens WHERE token_hash=?",
    ).bind(tokenHash).run();
    return null;
  }
  return row;
}

export async function invalidateSetupTokensForClient(env, clientId) {
  await env.DB.prepare(
    "DELETE FROM client_setup_tokens WHERE client_id=?",
  ).bind(clientId).run();
}

export async function resolveClientAccess(request, env, options = {}) {
  if (!env.DB) {
    return { error: json({ ok: false, error: "no database bound" }, 500) };
  }

  const url = new URL(request.url);
  const clientHint = cleanId(options.clientHint ?? url.searchParams.get("client"), "");

  const sessionAccess = await resolveSessionAccess(request, env);
  if (sessionAccess?.impersonated) {
    if (clientHint && sessionAccess.client !== clientHint) {
      return { error: json({ ok: false, error: "unauthorized" }, 403) };
    }
    if (options.allowImpersonated !== true) {
      return { error: json({ error: "read only" }, 403) };
    }
    return sessionAccess;
  }

  const tokenAccess = await resolveTokenAccess(request, env, {
    allowHeaderToken: options.allowHeaderToken !== false,
    allowQueryToken: Boolean(options.allowQueryToken),
  });
  if (tokenAccess) {
    if (clientHint && tokenAccess.client !== clientHint) {
      return { error: json({ ok: false, error: "unauthorized" }, 403) };
    }
    return tokenAccess;
  }

  if (sessionAccess) {
    if (clientHint && sessionAccess.client !== clientHint) {
      return { error: json({ ok: false, error: "unauthorized" }, 403) };
    }
    return sessionAccess;
  }

  return { error: json({ ok: false, error: "unauthorized" }, 401) };
}

export async function rejectImpersonatedSession(request, env) {
  if (!env.DB) return null;
  const access = await resolveSessionAccess(request, env);
  return access?.impersonated
    ? json({ error: "read only" }, 403)
    : null;
}

export async function resolveSessionAccess(request, env) {
  const token = parseCookies(request.headers.get("cookie")).get(CLIENT_SESSION_COOKIE);
  if (!token) return null;

  await purgeExpiredClientSessions(env);
  const hash = await sha256Hex(token);
  const impersonation = await env.DB.prepare(
    `SELECT s.client_id, s.expires_at, s.created_by, c.client_name
       FROM impersonation_sessions s
       LEFT JOIN client_config c ON c.client=s.client_id
      WHERE s.token_hash=? AND s.consumed_at IS NOT NULL AND s.expires_at>?`,
  ).bind(hash, nowIso()).first().catch(() => null);
  if (impersonation) {
    return {
      client: cleanId(impersonation.client_id),
      client_name: impersonation.client_name || cleanId(impersonation.client_id),
      auth_mode: "session",
      impersonated: true,
      expires_at: impersonation.expires_at,
      created_by: impersonation.created_by || "admin",
    };
  }

  const row = await env.DB.prepare(
    `SELECT s.client_id, s.expires_at, c.client_name
       FROM client_sessions s
       LEFT JOIN client_config c ON c.client=s.client_id
      WHERE s.token_hash=? AND s.expires_at>?`,
  ).bind(hash, nowIso()).first();
  if (!row) return null;

  return {
    client: cleanId(row.client_id),
    client_name: row.client_name || cleanId(row.client_id),
    auth_mode: "session",
    impersonated: false,
  };
}

export async function resolveTokenAccess(request, env, options = {}) {
  const url = new URL(request.url);
  const headerToken = options.allowHeaderToken === false
    ? null
    : request.headers.get("x-portal-token");
  const queryToken = options.allowQueryToken ? url.searchParams.get("t") : null;
  const rawToken = String(headerToken || queryToken || "").trim();
  if (!rawToken) return null;

  const hash = await sha256Hex(rawToken);
  const row = await env.DB.prepare(
    `SELECT client, COALESCE(client_name, client) AS client_name
       FROM client_config
      WHERE portal_token_hash=?`,
  ).bind(hash).first();
  if (!row) return null;

  return {
    client: cleanId(row.client),
    client_name: row.client_name || cleanId(row.client),
    auth_mode: "token",
  };
}

export function parseCookies(header) {
  const map = new Map();
  for (const part of String(header || "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    map.set(name, rest.join("="));
  }
  return map;
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  if (options.maxAge != null) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function isoMinutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isoHoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isoDaysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

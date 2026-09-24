-- Operator sign-in through PropelAuth (replaces the Cloudflare Access screen).
-- Only a SHA-256 hash of the session token is stored; the token lives in an
-- HttpOnly, Secure, SameSite=Lax __Host- cookie.
CREATE TABLE IF NOT EXISTS operator_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_expires
  ON operator_sessions (expires_at);

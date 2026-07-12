-- Client dashboard P1: credentialed auth, session storage, setup links,
-- failed-login rate limiting, and per-client section JSON.

CREATE TABLE IF NOT EXISTS client_auth (
  client_id   TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  pass_hash   TEXT,
  pass_salt   TEXT,
  iterations  INTEGER NOT NULL DEFAULT 150000,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_sessions (
  token_hash  TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_sessions_client
  ON client_sessions (client_id, expires_at);

CREATE TABLE IF NOT EXISTS client_setup_tokens (
  token_hash  TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL,
  email       TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_setup_tokens_client
  ON client_setup_tokens (client_id, expires_at);

CREATE TABLE IF NOT EXISTS client_login_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_login_attempts_email_time
  ON client_login_attempts (email, attempted_at);

CREATE TABLE IF NOT EXISTS client_dashboard_content (
  client_id   TEXT NOT NULL,
  section     TEXT NOT NULL,
  json        TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (client_id, section)
);

CREATE INDEX IF NOT EXISTS idx_client_dashboard_content_client
  ON client_dashboard_content (client_id);

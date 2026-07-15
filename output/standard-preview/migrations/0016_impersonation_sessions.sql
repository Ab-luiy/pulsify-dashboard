-- Operator god-view Phase 2: short-lived, read-only client impersonation.

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash    TEXT UNIQUE,
  exchange_hash TEXT UNIQUE,
  client_id     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  created_by    TEXT NOT NULL,
  consumed_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_client_expiry
  ON impersonation_sessions (client_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_creator_time
  ON impersonation_sessions (created_by, created_at DESC);

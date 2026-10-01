-- Team sign-in on our own form (founder, 2026-10-01): password plus an emailed code on new devices.
-- PropelAuth stays as a fallback until the founder retires it.
CREATE TABLE IF NOT EXISTS operator_auth (
  email TEXT PRIMARY KEY,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS operator_setup_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_operator_setup_tokens_email ON operator_setup_tokens (email);
CREATE TABLE IF NOT EXISTS operator_challenges (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  trust INTEGER NOT NULL DEFAULT 0,
  next TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS operator_devices (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_operator_devices_email ON operator_devices (email);

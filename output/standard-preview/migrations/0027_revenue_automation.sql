-- Phase 3: revenue and automation layer.
-- Additive only. Payment matching, outbound webhooks, Push API keys.

-- One payment attaches to at most one target. Status lifecycle:
-- suggested -> confirmed | rejected. Automatic high-confidence matches are
-- inserted as confirmed with decided_by='auto' and stay reviewable.
CREATE TABLE IF NOT EXISTS payment_matches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id  INTEGER NOT NULL,
  client_id   TEXT NOT NULL,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('crm_lead','workspace_record','contact_email')),
  target_id   TEXT NOT NULL,
  target_label TEXT,
  confidence  REAL NOT NULL DEFAULT 0,
  reasons_json TEXT NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL CHECK(status IN ('suggested','confirmed','rejected')),
  decided_by  TEXT,
  decided_at  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Enforce one confirmed match per payment at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_matches_one_confirmed
  ON payment_matches (payment_id) WHERE status='confirmed';

CREATE INDEX IF NOT EXISTS idx_payment_matches_client_status
  ON payment_matches (client_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_matches_payment
  ON payment_matches (payment_id, status);

-- Extra payment context needed for matching that the original payments table lacks.
ALTER TABLE payments ADD COLUMN customer_email TEXT;
ALTER TABLE payments ADD COLUMN customer_name TEXT;
ALTER TABLE payments ADD COLUMN kind TEXT NOT NULL DEFAULT 'charge';
ALTER TABLE payments ADD COLUMN refunded_cents INTEGER NOT NULL DEFAULT 0;

-- Outbound webhooks. Secret is sealed with secret-box under context
-- 'webhook:'||id so a leaked row cannot be replayed elsewhere.
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id          TEXT PRIMARY KEY,
  scope       TEXT NOT NULL CHECK(scope IN ('operator','client')),
  client_id   TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL,
  secret_enc  TEXT NOT NULL,
  events_json TEXT NOT NULL DEFAULT '[]',
  active      INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_scope_client
  ON webhook_endpoints (scope, client_id, active);

-- Every event is written here once, then the Worker sweep fans it out.
CREATE TABLE IF NOT EXISTS webhook_outbox (
  id           TEXT PRIMARY KEY,
  scope        TEXT NOT NULL CHECK(scope IN ('operator','client')),
  client_id    TEXT NOT NULL DEFAULT '',
  event        TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  is_test      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  dispatched_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_pending
  ON webhook_outbox (dispatched_at, created_at);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id           TEXT PRIMARY KEY,
  endpoint_id  TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  attempt      INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  status       TEXT NOT NULL CHECK(status IN ('pending','delivered','failed')),
  status_code  INTEGER,
  error        TEXT,
  sent_at      TEXT,
  created_at   TEXT NOT NULL,
  UNIQUE(endpoint_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_due
  ON webhook_deliveries (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint
  ON webhook_deliveries (endpoint_id, created_at DESC);

-- Push API keys. Only the SHA-256 hash is stored; the key is shown once.
CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT PRIMARY KEY,
  scope       TEXT NOT NULL CHECK(scope IN ('operator','client')),
  client_id   TEXT NOT NULL DEFAULT '',
  key_hash    TEXT NOT NULL UNIQUE,
  key_prefix  TEXT NOT NULL,
  label       TEXT,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_scope_client
  ON api_keys (scope, client_id, revoked_at);

-- Rate limiting for Push API, one row per key per minute bucket.
CREATE TABLE IF NOT EXISTS api_key_usage (
  key_id  TEXT NOT NULL,
  bucket  TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, bucket)
);

-- Ingested records that do not map onto an existing table yet keep a
-- durable, idempotent home so nothing pushed is ever lost.
CREATE TABLE IF NOT EXISTS ingest_records (
  id           TEXT PRIMARY KEY,
  scope        TEXT NOT NULL CHECK(scope IN ('operator','client')),
  client_id    TEXT NOT NULL DEFAULT '',
  kind         TEXT NOT NULL CHECK(kind IN ('lead','message','metric','payment')),
  external_id  TEXT,
  payload_json TEXT NOT NULL,
  key_id       TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  UNIQUE(scope, client_id, kind, external_id)
);

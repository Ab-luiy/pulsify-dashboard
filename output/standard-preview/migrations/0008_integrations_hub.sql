-- Integrations hub I1: operator/client connections, webhook event log, payments,
-- and client lifecycle status.

ALTER TABLE client_config ADD COLUMN status TEXT DEFAULT 'prospect';

CREATE TABLE IF NOT EXISTS integrations (
  scope       TEXT NOT NULL,
  client_id   TEXT NOT NULL DEFAULT '',
  provider    TEXT NOT NULL,
  config_json TEXT,
  secret_json TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (scope, client_id, provider)
);

CREATE TABLE IF NOT EXISTS integration_events (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  provider             TEXT NOT NULL,
  kind                 TEXT NOT NULL,
  client               TEXT,
  external_id          TEXT,
  payload_summary_json TEXT NOT NULL,
  ts                   TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_events_external
  ON integration_events (provider, kind, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_events_client_ts
  ON integration_events (client, ts);

CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client       TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL,
  rail         TEXT NOT NULL,
  reference    TEXT NOT NULL UNIQUE,
  occurred_at  TEXT NOT NULL,
  recorded_by  TEXT NOT NULL,
  note         TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_client_occurred
  ON payments (client, occurred_at);

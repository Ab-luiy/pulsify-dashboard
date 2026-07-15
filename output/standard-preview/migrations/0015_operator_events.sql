-- Operator command center Phase 1: audit trail for operator-side client access.

CREATE TABLE IF NOT EXISTS operator_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  client     TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operator_events_client_created
  ON operator_events (client, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_events_created
  ON operator_events (created_at DESC);

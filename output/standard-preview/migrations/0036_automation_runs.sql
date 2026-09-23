-- Delivery automations: one row per thing an automation has already handled
-- (a booking briefed, a Fathom call imported, a weekly report drafted), so
-- every sweep is idempotent.
CREATE TABLE IF NOT EXISTS automation_runs (
  kind       TEXT NOT NULL,
  ref        TEXT NOT NULL,
  client_id  TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL,
  detail     TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (kind, ref)
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_client ON automation_runs (client_id, kind, created_at);

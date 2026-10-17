-- Ticket #79: lead magnet delivery. One row per person who filled in the capture page.
-- download_token opens the guide from the emailed link until download_expires.
-- is_test marks synthetic captures made by the "Run a test" button; they are deleted by "Remove test data".
CREATE TABLE IF NOT EXISTS lead_magnet_captures (
  id               TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  visitor_id       TEXT,
  run_id           TEXT,
  lead_id          INTEGER,
  download_token   TEXT NOT NULL,
  download_expires TEXT NOT NULL,
  emailed_at       TEXT,
  downloaded_at    TEXT,
  is_test          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_captures_client ON lead_magnet_captures (client_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_magnet_captures_token ON lead_magnet_captures (download_token);

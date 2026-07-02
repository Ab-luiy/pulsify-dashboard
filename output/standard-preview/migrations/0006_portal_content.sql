-- Backs the client portal's Content, Calls, and Arsenal tabs.
-- Pipeline (deals/revenue) is intentionally NOT here — that data lives in a
-- different system and the Pipeline tab stays a pending state.
-- Run once against the pulsify-portal D1 database.

CREATE TABLE IF NOT EXISTS content_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client        TEXT NOT NULL,
  title         TEXT NOT NULL,
  stage         TEXT NOT NULL DEFAULT 'production',
  platform      TEXT,
  url           TEXT,
  notes         TEXT,
  scheduled_for TEXT,
  updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS call_notes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  client         TEXT NOT NULL,
  call_date      TEXT,
  title          TEXT,
  summary        TEXT,
  decisions      TEXT,
  actions        TEXT,
  recording_url  TEXT,
  created_at     TEXT
);

CREATE TABLE IF NOT EXISTS client_assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client     TEXT NOT NULL,
  label      TEXT NOT NULL,
  kind       TEXT,
  url        TEXT,
  notes      TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_items_client_stage ON content_items (client, stage);
CREATE INDEX IF NOT EXISTS idx_call_notes_client_date ON call_notes (client, call_date);
CREATE INDEX IF NOT EXISTS idx_client_assets_client ON client_assets (client);

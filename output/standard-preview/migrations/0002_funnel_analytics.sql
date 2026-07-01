-- Upgrade the original Frank proof-of-concept into the shared, per-client funnel pipe.
-- Run once against the pulsify-portal D1 database.

ALTER TABLE leads ADD COLUMN visitor_id TEXT;
ALTER TABLE leads ADD COLUMN session_id TEXT;
ALTER TABLE leads ADD COLUMN page_id TEXT;
ALTER TABLE leads ADD COLUMN source TEXT DEFAULT 'typeform';
ALTER TABLE leads ADD COLUMN response_id TEXT;
ALTER TABLE leads ADD COLUMN phone TEXT;
ALTER TABLE leads ADD COLUMN answers_json TEXT;
ALTER TABLE leads ADD COLUMN kit_status TEXT;
ALTER TABLE leads ADD COLUMN utm_json TEXT;
ALTER TABLE leads ADD COLUMN updated_at TEXT;

ALTER TABLE watch_events ADD COLUMN visitor_id TEXT;
ALTER TABLE watch_events ADD COLUMN session_id TEXT;
ALTER TABLE watch_events ADD COLUMN page_id TEXT;
ALTER TABLE watch_events ADD COLUMN wistia_visitor_key TEXT;
ALTER TABLE watch_events ADD COLUMN position_seconds REAL;
ALTER TABLE watch_events ADD COLUMN duration_seconds REAL;
ALTER TABLE watch_events ADD COLUMN watch_seconds REAL DEFAULT 0;
ALTER TABLE watch_events ADD COLUMN unique_seconds REAL;
ALTER TABLE watch_events ADD COLUMN playback_rate REAL;
ALTER TABLE watch_events ADD COLUMN muted INTEGER;
ALTER TABLE watch_events ADD COLUMN metadata_json TEXT;

ALTER TABLE client_config ADD COLUMN client_name TEXT;
ALTER TABLE client_config ADD COLUMN typeform_webhook_secret TEXT;
ALTER TABLE client_config ADD COLUMN allowed_origin TEXT;

CREATE TABLE IF NOT EXISTS page_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client      TEXT NOT NULL,
  visitor_id  TEXT,
  session_id  TEXT,
  page_id     TEXT,
  event       TEXT NOT NULL,
  email       TEXT,
  path        TEXT,
  referrer    TEXT,
  utm_json    TEXT,
  metadata_json TEXT,
  at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_client_email ON leads (client, email);
CREATE INDEX IF NOT EXISTS idx_leads_visitor ON leads (client, visitor_id);
CREATE INDEX IF NOT EXISTS idx_watch_visitor ON watch_events (client, visitor_id);
CREATE INDEX IF NOT EXISTS idx_watch_session ON watch_events (client, session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_client ON page_events (client, event);
CREATE INDEX IF NOT EXISTS idx_page_events_visitor ON page_events (client, visitor_id);

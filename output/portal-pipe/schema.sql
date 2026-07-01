-- Complete schema for a new shared Pulsify funnel database.

CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client       TEXT NOT NULL,
  email        TEXT,
  name         TEXT,
  phone        TEXT,
  revenue      TEXT,
  situation    TEXT,
  status       TEXT DEFAULT 'new',
  source       TEXT DEFAULT 'typeform',
  visitor_id   TEXT,
  session_id   TEXT,
  page_id      TEXT,
  response_id  TEXT,
  answers_json TEXT,
  kit_status   TEXT,
  utm_json     TEXT,
  applied_at   TEXT,
  updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS watch_events (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  client             TEXT NOT NULL,
  email              TEXT,
  visitor_id         TEXT,
  session_id         TEXT,
  page_id            TEXT,
  media_id           TEXT,
  wistia_visitor_key TEXT,
  event              TEXT,
  percent            REAL,
  position_seconds   REAL,
  duration_seconds   REAL,
  watch_seconds      REAL DEFAULT 0,
  unique_seconds     REAL,
  playback_rate      REAL,
  muted              INTEGER,
  metadata_json      TEXT,
  at                 TEXT
);

CREATE TABLE IF NOT EXISTS page_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client        TEXT NOT NULL,
  visitor_id    TEXT,
  session_id    TEXT,
  page_id       TEXT,
  event         TEXT NOT NULL,
  email         TEXT,
  path          TEXT,
  referrer      TEXT,
  utm_json      TEXT,
  metadata_json TEXT,
  at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_config (
  client                  TEXT PRIMARY KEY,
  client_name             TEXT,
  wistia_media_id         TEXT,
  typeform_url            TEXT,
  typeform_webhook_secret TEXT,
  kit_tag_id              TEXT,
  kit_api_key             TEXT,
  allowed_origin          TEXT,
  updated_at              TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_client ON leads (client);
CREATE INDEX IF NOT EXISTS idx_leads_client_email ON leads (client, email);
CREATE INDEX IF NOT EXISTS idx_leads_visitor ON leads (client, visitor_id);
CREATE INDEX IF NOT EXISTS idx_watch_client ON watch_events (client);
CREATE INDEX IF NOT EXISTS idx_watch_visitor ON watch_events (client, visitor_id);
CREATE INDEX IF NOT EXISTS idx_watch_session ON watch_events (client, session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_client ON page_events (client, event);
CREATE INDEX IF NOT EXISTS idx_page_events_visitor ON page_events (client, visitor_id);

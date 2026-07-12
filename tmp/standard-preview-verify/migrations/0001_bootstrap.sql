CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client     TEXT NOT NULL,
  email      TEXT,
  name       TEXT,
  revenue    TEXT,
  situation  TEXT,
  status     TEXT DEFAULT 'new',
  applied_at TEXT
);

CREATE TABLE IF NOT EXISTS watch_events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  client   TEXT NOT NULL,
  email    TEXT,
  media_id TEXT,
  event    TEXT,
  percent  REAL,
  at       TEXT
);

CREATE TABLE IF NOT EXISTS client_config (
  client          TEXT PRIMARY KEY,
  wistia_media_id TEXT,
  typeform_url    TEXT,
  kit_tag_id      TEXT,
  kit_api_key     TEXT,
  updated_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_client ON leads (client);
CREATE INDEX IF NOT EXISTS idx_watch_client ON watch_events (client);

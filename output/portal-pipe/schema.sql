-- The two tables the pipe writes to (Cloudflare D1).
-- Create once: wrangler d1 execute pulsify-portal --file=schema.sql

CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client     TEXT NOT NULL,            -- which client this lead belongs to (e.g. "frank")
  email      TEXT,
  name       TEXT,
  revenue    TEXT,
  situation  TEXT,
  applied_at TEXT,
  status     TEXT DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS watch_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  client    TEXT NOT NULL,
  email     TEXT,                      -- ties a watch to a person (passed from the form)
  media_id  TEXT,                      -- which Wistia video
  event     TEXT,                      -- play | progress | end
  percent   INTEGER,                   -- how far they watched
  at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_client ON leads (client);
CREATE INDEX IF NOT EXISTS idx_watch_client ON watch_events (client);

-- Integration settings, pasted in via the native Settings page (not chat).
-- One row per client. kit_api_key lives here too — protected by the ADMIN_KEY
-- gate on the settings route, not by keeping it out of the database.
CREATE TABLE IF NOT EXISTS client_config (
  client         TEXT PRIMARY KEY,
  wistia_media_id TEXT,
  typeform_url    TEXT,
  kit_tag_id      TEXT,
  kit_api_key     TEXT,
  updated_at      TEXT
);

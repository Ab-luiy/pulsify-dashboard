-- IP and geo on funnel events. Cloudflare provides these per request.
ALTER TABLE page_events ADD COLUMN ip TEXT;
ALTER TABLE page_events ADD COLUMN country TEXT;
ALTER TABLE page_events ADD COLUMN city TEXT;
ALTER TABLE page_events ADD COLUMN user_agent TEXT;
ALTER TABLE watch_events ADD COLUMN ip TEXT;
ALTER TABLE watch_events ADD COLUMN country TEXT;

-- Off-page asset tracking. Each short link redirects to a target and logs opens.
CREATE TABLE IF NOT EXISTS asset_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT NOT NULL UNIQUE,
  client      TEXT,
  label       TEXT,
  target_url  TEXT NOT NULL,
  lead_email  TEXT,
  created_at  TEXT NOT NULL,
  archived    INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS asset_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT NOT NULL,
  client      TEXT,
  lead_email  TEXT,
  ip          TEXT,
  country     TEXT,
  city        TEXT,
  user_agent  TEXT,
  referrer    TEXT,
  at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_links_client ON asset_links (client);
CREATE INDEX IF NOT EXISTS idx_asset_events_token ON asset_events (token);

CREATE TABLE IF NOT EXISTS media (
  id           TEXT PRIMARY KEY,
  client       TEXT,
  content_type TEXT,
  bytes        BLOB,
  created_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_client ON media (client);

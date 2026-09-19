-- In-house notifications. Every procedure that emits an event also writes a
-- row here; the bell in both shells reads it. No email, no third party.
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  scope       TEXT NOT NULL CHECK(scope IN ('operator','client')),
  client_id   TEXT NOT NULL DEFAULT '',
  kind        TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','success','warn','error')),
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  entity_json TEXT,
  dedupe_key  TEXT,
  created_at  TEXT NOT NULL,
  read_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_feed ON notifications (scope, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (scope, client_id, read_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications (dedupe_key) WHERE dedupe_key IS NOT NULL;

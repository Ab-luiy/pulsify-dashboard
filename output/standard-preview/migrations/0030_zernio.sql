-- Zernio inbox bridge. Webhook events are deduped on Zernio's event id;
-- conversation ids from Zernio map onto the ig_conversations rows we already
-- hold (matched by participant id) so history does not duplicate.
CREATE TABLE IF NOT EXISTS zernio_events (
  id          TEXT PRIMARY KEY,
  event       TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS zernio_conversation_map (
  zernio_id       TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  account_id      TEXT,
  updated_time    TEXT,
  synced_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_zernio_map_conversation ON zernio_conversation_map (conversation_id);

-- Phase 6: outreach queue. The daily "who do I message next" list. One row
-- per Instagram handle with the brief the draft is built from, the draft
-- itself, and where it stands. Sent and replied are reconciled from
-- ig_conversations/ig_messages by handle; the operator only ever marks
-- sent, skip and requeue by hand. Additive only.
CREATE TABLE IF NOT EXISTS outreach_queue (
  id              TEXT PRIMARY KEY,
  handle          TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('crm','yt_leads','manual')),
  name            TEXT,
  niche           TEXT,
  detail          TEXT,
  gap             TEXT NOT NULL DEFAULT '',
  link            TEXT,
  draft           TEXT,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','skipped','replied')),
  position        INTEGER,
  conversation_id TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  sent_at         TEXT,
  skipped_at      TEXT,
  UNIQUE(handle)
);

CREATE INDEX IF NOT EXISTS idx_outreach_queue_status_position ON outreach_queue (status, position);

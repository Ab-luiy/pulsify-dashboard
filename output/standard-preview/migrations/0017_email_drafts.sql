-- Operator email composer drafts and Kit delivery outcomes.

CREATE TABLE IF NOT EXISTS email_drafts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client     TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  tag_id     TEXT,
  status     TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'failed')),
  created_at TEXT NOT NULL,
  sent_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_created_at
  ON email_drafts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_drafts_client_created_at
  ON email_drafts (client, created_at DESC);

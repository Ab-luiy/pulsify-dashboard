-- Instagram outreach tracker. Everything derivable (stage, timers, counts) is
-- computed from ig_conversations/ig_messages at read time. This table holds
-- only what a human decides plus signals polling cannot produce.
CREATE TABLE IF NOT EXISTS ig_outreach (
  conversation_id   TEXT PRIMARY KEY,
  operator_email    TEXT NOT NULL DEFAULT 'operator',
  pfp_url           TEXT,
  sentiment         TEXT CHECK(sentiment IN ('positive','negative')),
  outcome           TEXT CHECK(outcome IN ('booked','closed','lost')),
  hibernated_at     TEXT,
  notes             TEXT,
  seen_at           TEXT,
  seen_notified_at  TEXT,
  reply_notified_at TEXT,
  updated_at        TEXT NOT NULL
);

-- Notification log shown in the tracker's activity strip.
CREATE TABLE IF NOT EXISTS ig_outreach_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK(kind IN ('seen','reply','booked','closed','hibernated')),
  handle          TEXT,
  name            TEXT,
  text            TEXT,
  created_at      TEXT NOT NULL,
  delivered_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_ig_outreach_events_recent ON ig_outreach_events (created_at DESC);

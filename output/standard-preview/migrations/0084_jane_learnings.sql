-- Things Jane noticed in client chats that could improve Pulsify's knowledge (pulsify-saas #92).
-- Nothing here reaches Jane's prompts or a client's memory until an operator approves it.
-- shared = 1: an anonymised general lesson that may help every client once approved.
-- shared = 0: a fact about this one client, added to that client's memory once approved.
CREATE TABLE IF NOT EXISTS jane_learnings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('angle', 'objection', 'method_gap', 'client_fact')),
  shared      INTEGER NOT NULL CHECK (shared IN (0, 1)),
  text        TEXT NOT NULL,
  evidence    TEXT NOT NULL DEFAULT '',
  chat_id     INTEGER,
  message_id  INTEGER,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_jane_learnings_status
  ON jane_learnings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jane_learnings_shared
  ON jane_learnings (shared, status, reviewed_at DESC);

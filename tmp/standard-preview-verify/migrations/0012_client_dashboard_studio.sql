-- Client dashboard P2: sequence studio drafts/review and setup-email verification codes.

CREATE TABLE IF NOT EXISTS studio_sequences (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL,
  type          TEXT,
  intent        TEXT,
  topic         TEXT NOT NULL,
  goal          TEXT,
  trigger_word  TEXT,
  params_json   TEXT NOT NULL,
  output_json   TEXT,
  manual_prompt TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  review_note   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_sequences_client_status
  ON studio_sequences (client_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS client_email_codes (
  client_id   TEXT NOT NULL,
  email       TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (client_id, email, purpose)
);

CREATE INDEX IF NOT EXISTS idx_client_email_codes_expires
  ON client_email_codes (expires_at);

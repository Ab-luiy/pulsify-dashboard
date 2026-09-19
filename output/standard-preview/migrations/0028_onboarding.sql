-- Phase 4: signed-to-live client onboarding. Additive only.

-- One row per client, whatever fired the provisioning. Idempotent on client.
CREATE TABLE IF NOT EXISTS client_provisioning (
  client_id      TEXT PRIMARY KEY,
  email          TEXT NOT NULL,
  source         TEXT NOT NULL CHECK(source IN ('docusign','payment','operator')),
  contract_ref   TEXT,
  provisioned_at TEXT NOT NULL,
  provisioned_by TEXT NOT NULL,
  welcome_state  TEXT NOT NULL DEFAULT 'pending' CHECK(welcome_state IN ('pending','sent','failed','skipped')),
  welcome_attempts INTEGER NOT NULL DEFAULT 0,
  welcome_sent_at TEXT,
  welcome_error  TEXT
);

-- Server-side checklist progress per client per step. The operator can
-- complete steps on the client's behalf while impersonating.
CREATE TABLE IF NOT EXISTS checklist_steps (
  client_id    TEXT NOT NULL,
  step         TEXT NOT NULL,
  position     INTEGER NOT NULL,
  state        TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','skipped','done')),
  completed_by TEXT,
  completed_at TEXT,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (client_id, step)
);

-- Applications, opt-ins and bookings collapsed into one row per contact touch.
CREATE TABLE IF NOT EXISTS pipeline_touches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name  TEXT,
  kind          TEXT NOT NULL CHECK(kind IN ('application','optin','booking','payment')),
  ts            TEXT NOT NULL,
  source        TEXT NOT NULL,
  external_id   TEXT,
  amount_cents  INTEGER,
  payload_json  TEXT NOT NULL DEFAULT '{}',
  UNIQUE(client_id, kind, external_id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_touches_contact
  ON pipeline_touches (client_id, contact_email, ts DESC);

-- Voice notes recorded on the onboarding page.
CREATE TABLE IF NOT EXISTS voice_notes (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL,
  r2_key        TEXT NOT NULL,
  mime          TEXT NOT NULL,
  bytes         INTEGER NOT NULL,
  transcript    TEXT,
  state         TEXT NOT NULL DEFAULT 'uploaded' CHECK(state IN ('uploaded','transcribed','failed','applied')),
  error         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_notes_client
  ON voice_notes (client_id, created_at DESC);

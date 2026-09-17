-- Phase 2: shared operator/client data spine.
-- Additive only. Existing CRM and payments tables remain canonical.

CREATE TABLE IF NOT EXISTS metric_points (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  scope       TEXT NOT NULL CHECK(scope IN ('operator','client')),
  client_id   TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL,
  metric      TEXT NOT NULL,
  ts          TEXT NOT NULL,
  value       REAL,
  value_text  TEXT,
  dims_json   TEXT NOT NULL DEFAULT '{}',
  UNIQUE(scope, client_id, source, metric, ts, dims_json)
);

CREATE INDEX IF NOT EXISTS idx_metric_points_lookup
  ON metric_points (scope, client_id, source, metric, ts);

CREATE TABLE IF NOT EXISTS snapshots (
  scope        TEXT NOT NULL CHECK(scope IN ('operator','client')),
  client_id    TEXT NOT NULL DEFAULT '',
  source       TEXT NOT NULL,
  kind         TEXT NOT NULL,
  captured_at  TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (scope, client_id, source, kind)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_scope_client
  ON snapshots (scope, client_id);

CREATE TABLE IF NOT EXISTS stories (
  scope        TEXT NOT NULL CHECK(scope IN ('operator','client')),
  client_id    TEXT NOT NULL DEFAULT '',
  media_id     TEXT PRIMARY KEY,
  captured_at  TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stories_scope_client_captured
  ON stories (scope, client_id, captured_at);

CREATE TABLE IF NOT EXISTS yt_leads (
  id           TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  score        REAL,
  tier         TEXT,
  niche        TEXT,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_yt_leads_filter
  ON yt_leads (tier, niche, score DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS yt_leads_meta (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operator_state (
  operator_email TEXT NOT NULL,
  key            TEXT NOT NULL,
  value_json     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (operator_email, key)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job         TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  status      TEXT NOT NULL CHECK(status IN ('running','success','error')),
  items       INTEGER NOT NULL DEFAULT 0,
  error       TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_job_started
  ON sync_runs (job, started_at DESC);

-- Instagram inbox state. The message tables preserve provider truth; the
-- existing crm_added/crm_overrides tables remain the pipeline projection.
CREATE TABLE IF NOT EXISTS ig_conversations (
  id                   TEXT PRIMARY KEY,
  operator_email       TEXT NOT NULL,
  connected_account_id TEXT NOT NULL DEFAULT '',
  participant_id       TEXT,
  participant_username TEXT,
  participant_name     TEXT,
  first_message_at     TEXT,
  last_message_at      TEXT NOT NULL,
  last_direction       TEXT CHECK(last_direction IN ('inbound','outbound')),
  payload_json         TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ig_conversations_operator_recent
  ON ig_conversations (operator_email, last_message_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ig_conversations_operator_participant
  ON ig_conversations (operator_email, connected_account_id, participant_id)
  WHERE participant_id IS NOT NULL AND participant_id <> '';

CREATE TABLE IF NOT EXISTS ig_messages (
  id             TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  operator_email TEXT NOT NULL,
  direction      TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  sent_at        TEXT NOT NULL,
  text           TEXT,
  payload_json   TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES ig_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ig_messages_conversation_sent
  ON ig_messages (conversation_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_ig_messages_operator_sent
  ON ig_messages (operator_email, sent_at DESC);

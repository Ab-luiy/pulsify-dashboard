-- Ticket #78: a thin workflow layer (recipe = trigger, AI step, human approval, action).
-- workflow_recipes: one saved recipe per client and kind (config + on/off). public_slug is the
--   address of a recipe's public page (the lead magnet capture page), unique across clients.
-- workflow_runs: one row per run, with the step log, so every client has a run history.
--   trigger_ref makes a run idempotent (an outbox event id, a capture id).
-- Runs are mirrored into automation_runs (migration 0036) so the existing sweeps see them.
-- Not applied live until the founder says so.
CREATE TABLE IF NOT EXISTS workflow_recipes (
  client_id   TEXT NOT NULL,
  kind        TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL DEFAULT '{}',
  public_slug TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (client_id, kind)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_recipes_slug ON workflow_recipes (public_slug) WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS workflow_runs (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL,
  kind          TEXT NOT NULL,
  flow          TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_ref   TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('running','awaiting_approval','waiting','done','failed','rejected','skipped')),
  step_index    INTEGER NOT NULL DEFAULT 0,
  steps_json    TEXT NOT NULL DEFAULT '[]',
  state_json    TEXT NOT NULL DEFAULT '{}',
  summary       TEXT,
  error         TEXT,
  is_test       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  finished_at   TEXT,
  UNIQUE (client_id, kind, trigger_ref)
);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_client ON workflow_runs (client_id, created_at DESC);

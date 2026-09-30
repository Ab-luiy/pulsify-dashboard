-- Lead score, per-lead pipeline and post-call forms (InfoOS build, 2026-09-30). Additive only.

-- Where each visit came from on the map (Cloudflare's request.cf latitude/longitude),
-- for the visitor globe. Older rows fall back to the country centre.
ALTER TABLE page_events ADD COLUMN lat REAL;
ALTER TABLE page_events ADD COLUMN lng REAL;

CREATE INDEX IF NOT EXISTS idx_page_events_client_visitor
  ON page_events (client, visitor_id, at);
CREATE INDEX IF NOT EXISTS idx_page_events_client_at
  ON page_events (client, at);
CREATE INDEX IF NOT EXISTS idx_watch_events_client_visitor
  ON watch_events (client, visitor_id, at);

-- The post-call form: what happened on a booked call. One row per call
-- (booking_ref = the booking's external id, or 'manual:<id>' for a call logged by hand).
CREATE TABLE IF NOT EXISTS lead_outcomes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id    TEXT NOT NULL,
  email        TEXT NOT NULL,
  booking_ref  TEXT,
  call_at      TEXT,
  attended     TEXT CHECK (attended IN ('showed','no_show','cancelled','rescheduled')),
  result       TEXT CHECK (result IN ('closed','not_closed','follow_up','unqualified')),
  deal_cents   INTEGER,
  payment_type TEXT CHECK (payment_type IN ('pif','plan','finance','deposit')),
  pre_sold     TEXT CHECK (pre_sold IN ('yes','somewhat','no')),
  objection    TEXT,
  notes        TEXT,
  closer       TEXT,
  created_by   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_outcomes_booking
  ON lead_outcomes (client_id, booking_ref) WHERE booking_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_outcomes_client_email
  ON lead_outcomes (client_id, email, call_at);

-- Calls marked confirmed by the client's team (the Calls list flag).
CREATE TABLE IF NOT EXISTS call_flags (
  client_id    TEXT NOT NULL,
  booking_ref  TEXT NOT NULL,
  confirmed_at TEXT,
  confirmed_by TEXT,
  PRIMARY KEY (client_id, booking_ref)
);

-- The fitted score model per client ('' = all Pulsify funnels pooled).
CREATE TABLE IF NOT EXISTS lead_models (
  client_id   TEXT PRIMARY KEY,
  model_json  TEXT NOT NULL,
  fitted_at   TEXT NOT NULL
);

-- Score history, one row per person whenever their score changes on the nightly run,
-- so we can show how often past hot leads really bought.
CREATE TABLE IF NOT EXISTS lead_score_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  person_key  TEXT NOT NULL,
  score       INTEGER NOT NULL,
  band        TEXT NOT NULL,
  stage       TEXT NOT NULL,
  at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_score_snapshots_person
  ON lead_score_snapshots (client_id, person_key, at);

-- Tracked links for any placement, and the client's sales team (InfoOS build, 2026-09-30). Additive only.

-- Links tab: a tracked link for an Instagram bio, a story, an email or an ad. kind='link'
-- links say where they live (source, placement) so the visit wears those tags.
ALTER TABLE asset_links ADD COLUMN source TEXT;
CREATE INDEX IF NOT EXISTS idx_asset_links_client_kind ON asset_links (client, kind);

-- The client's own setters and closers (Team tab). commission_pct is the closer's share
-- of cash collected on their deals, setter_pct the setter's share on calls they set.
-- link_token is the setter's own tracked booking link (asset_links token).
CREATE TABLE IF NOT EXISTS team_members (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('setter','closer','both')),
  email          TEXT,
  commission_pct REAL,
  setter_pct     REAL,
  link_token     TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_team_members_client ON team_members (client_id, active);

-- Forms the team files: end-of-day numbers and post-set notes. Post-call forms live in lead_outcomes.
CREATE TABLE IF NOT EXISTS team_forms (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  member_id   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('eod','set')),
  lead_email  TEXT,
  data_json   TEXT NOT NULL DEFAULT '{}',
  day         TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_team_forms_client_day ON team_forms (client_id, day);

-- Commission paid per pay period.
CREATE TABLE IF NOT EXISTS commission_payouts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL,
  member_id     TEXT NOT NULL,
  period_start  TEXT NOT NULL,
  period_end    TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL,
  paid_at       TEXT NOT NULL,
  paid_by       TEXT NOT NULL,
  UNIQUE (client_id, member_id, period_start)
);

-- Who set and who closed a call, by team member id (the closer text stays for teams without a roster).
ALTER TABLE lead_outcomes ADD COLUMN closer_id TEXT;
ALTER TABLE lead_outcomes ADD COLUMN setter_id TEXT;

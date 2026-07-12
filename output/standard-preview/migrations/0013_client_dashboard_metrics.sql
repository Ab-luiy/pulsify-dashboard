-- Client dashboard P3: sequence metrics + account snapshots.

CREATE TABLE IF NOT EXISTS sequence_log (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id          TEXT NOT NULL,
  posted_on          TEXT NOT NULL,
  type               TEXT NOT NULL,
  topic              TEXT NOT NULL,
  slide_count        INTEGER NOT NULL,
  slide_views_json   TEXT NOT NULL,
  dms                INTEGER,
  profile_visits     INTEGER,
  notes              TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sequence_log_client_posted
  ON sequence_log (client_id, posted_on);

CREATE TABLE IF NOT EXISTS account_snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id    TEXT NOT NULL,
  taken_on     TEXT NOT NULL,
  followers    INTEGER NOT NULL,
  icp_leads    INTEGER,
  avg_views    INTEGER,
  notes        TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_snapshots_client_taken
  ON account_snapshots (client_id, taken_on);

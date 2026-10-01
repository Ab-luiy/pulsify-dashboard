-- Operators assigned from the console (founder, 2026-10-01). The founder's own address stays in the
-- OPERATOR_EMAILS secret and can never be removed here; everyone added from the UI lives in this table.
CREATE TABLE IF NOT EXISTS operator_users (
  email TEXT PRIMARY KEY,
  name TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL,
  removed_at TEXT
);
ALTER TABLE access_requests ADD COLUMN role TEXT;

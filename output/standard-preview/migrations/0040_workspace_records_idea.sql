-- Reel ideas become workspace records of kind 'idea' (pulsify-saas overnight
-- fix 2026-09-25: they used to live only in the browser tab). SQLite cannot
-- change a CHECK constraint in place, so the table is rebuilt with every row
-- copied across, then the index is recreated. Nothing references this table.
CREATE TABLE workspace_records_next (
 id TEXT PRIMARY KEY,
 client_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('youtube','lead','copy','reference','idea')),
 title TEXT NOT NULL,
 data_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
INSERT INTO workspace_records_next (id, client_id, kind, title, data_json, created_at, updated_at)
  SELECT id, client_id, kind, title, data_json, created_at, updated_at FROM workspace_records;
DROP TABLE workspace_records;
ALTER TABLE workspace_records_next RENAME TO workspace_records;
CREATE INDEX IF NOT EXISTS workspace_records_client ON workspace_records(client_id,kind,updated_at);

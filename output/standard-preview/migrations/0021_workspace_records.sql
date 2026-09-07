CREATE TABLE IF NOT EXISTS workspace_records (
 id TEXT PRIMARY KEY,
 client_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('youtube','lead','copy','reference')),
 title TEXT NOT NULL,
 data_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS workspace_records_client ON workspace_records(client_id,kind,updated_at);

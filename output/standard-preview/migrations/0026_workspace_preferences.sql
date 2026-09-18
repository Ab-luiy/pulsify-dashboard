CREATE TABLE IF NOT EXISTS workspace_preferences (
 client_id TEXT NOT NULL,
 key TEXT NOT NULL,
 value_json TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY (client_id, key)
);

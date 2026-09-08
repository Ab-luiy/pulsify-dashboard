CREATE TABLE IF NOT EXISTS copywriter_usage (
 client_id TEXT NOT NULL,
 day TEXT NOT NULL,
 requests INTEGER NOT NULL DEFAULT 0,
 last_at INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(client_id,day)
);

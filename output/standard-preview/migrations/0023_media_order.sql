CREATE TABLE IF NOT EXISTS client_media_order (
 client_id TEXT PRIMARY KEY,
 ids_json TEXT NOT NULL DEFAULT '[]',
 updated_at TEXT NOT NULL
);

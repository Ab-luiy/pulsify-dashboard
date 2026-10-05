CREATE TABLE IF NOT EXISTS operator_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storage_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  folder TEXT NOT NULL CHECK (folder IN ('portraits','everyday','scenery','other')),
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL
);

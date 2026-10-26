-- Approved client documents remain isolated; stable keys support repeatable source updates.
CREATE TABLE IF NOT EXISTS jane_documents (
  client_id TEXT NOT NULL,
  document_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('reference','transcript','approved-example')),
  public_use INTEGER NOT NULL DEFAULT 0 CHECK(public_use IN (0,1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(client_id, document_key)
);
CREATE TABLE IF NOT EXISTS jane_example_notes (
  client_id TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  PRIMARY KEY(client_id, message_id)
);

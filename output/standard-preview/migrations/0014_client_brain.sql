-- Client brain Phase 1: structured intake fields and link-based proof items.

CREATE TABLE IF NOT EXISTS client_brain (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  section     TEXT NOT NULL CHECK (section IN ('identity','offer','icp','story','voice','proof','funnel','donot')),
  field       TEXT NOT NULL,
  value_json  TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('client-form','voice-note','transcript','operator','research')),
  updated_at  TEXT NOT NULL,
  UNIQUE (client_id, section, field)
);

CREATE INDEX IF NOT EXISTS idx_client_brain_client_section
  ON client_brain (client_id, section);

CREATE TABLE IF NOT EXISTS proof_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('image-link','video-link','screenshot-link')),
  url         TEXT NOT NULL,
  claim       TEXT,
  permission  TEXT NOT NULL DEFAULT 'unknown' CHECK (permission IN ('unknown','granted','denied')),
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proof_items_client_created
  ON proof_items (client_id, created_at);

-- R2 upload will replace link-paste proof capture once R2 is enabled.

-- Onboarding v2 adds six brain sections (intent, money, positioning, content, program, commitment).
-- Migration 0014 limited client_brain.section to the original eight with a CHECK, so every answer in a new
-- section was refused ("Could not save that answer"). SQLite cannot change a CHECK in place, so the table is
-- rebuilt with the same columns, the same UNIQUE key and the same rows. The code (SECTIONS in
-- functions/api/client-brain.js) is the guard for which sections exist; the source CHECK stays.
-- Back up first: wrangler d1 export pulsify-portal --remote --table client_brain --output client_brain-backup.sql

CREATE TABLE client_brain_rebuilt (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  section     TEXT NOT NULL,
  field       TEXT NOT NULL,
  value_json  TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('client-form','voice-note','transcript','operator','research')),
  updated_at  TEXT NOT NULL,
  UNIQUE (client_id, section, field)
);

INSERT INTO client_brain_rebuilt (id, client_id, section, field, value_json, source, updated_at)
  SELECT id, client_id, section, field, value_json, source, updated_at FROM client_brain;

DROP TABLE client_brain;

ALTER TABLE client_brain_rebuilt RENAME TO client_brain;

CREATE INDEX IF NOT EXISTS idx_client_brain_client_section
  ON client_brain (client_id, section);

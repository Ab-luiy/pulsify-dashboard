-- Controlled hook retests tied to logged sequence metrics.

CREATE TABLE IF NOT EXISTS sequence_variants (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id        TEXT NOT NULL,
  sequence_ref     INTEGER NOT NULL,
  label            TEXT NOT NULL,
  hook_text        TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('testing', 'won', 'lost', 'retired')),
  completion_pct   REAL CHECK (completion_pct IS NULL OR (completion_pct >= 0 AND completion_pct <= 100)),
  started_at       TEXT NOT NULL,
  resolved_at      TEXT,
  created_at       TEXT NOT NULL,
  UNIQUE (client_id, sequence_ref, label)
);

CREATE INDEX IF NOT EXISTS idx_sequence_variants_client_status
  ON sequence_variants (client_id, status, started_at);

CREATE INDEX IF NOT EXISTS idx_sequence_variants_sequence
  ON sequence_variants (client_id, sequence_ref, id);

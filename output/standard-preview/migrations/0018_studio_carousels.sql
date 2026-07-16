-- Client dashboard P4: carousel Studio drafts and review lifecycle.

CREATE TABLE IF NOT EXISTS studio_carousels (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL,
  structure     TEXT NOT NULL,
  topic         TEXT NOT NULL,
  goal          TEXT NOT NULL,
  params_json   TEXT NOT NULL,
  output_json   TEXT,
  manual_prompt TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
  review_note   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_carousels_client_status
  ON studio_carousels (client_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_carousels_review
  ON studio_carousels (status, updated_at DESC);

-- Semantic search bookkeeping. Vectors live in Cloudflare Vectorize
-- (index pulsify-search); this table remembers what has been embedded so the
-- indexer only touches new or changed text.
CREATE TABLE IF NOT EXISTS search_index_state (
  doc_id      TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  scope       TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  indexed_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_index_kind ON search_index_state (kind, indexed_at);

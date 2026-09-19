-- Let the indexer skip already-indexed rows in SQL instead of hashing each candidate.
ALTER TABLE search_index_state ADD COLUMN source_id TEXT;
CREATE INDEX IF NOT EXISTS idx_search_index_source ON search_index_state (source_id);

-- Keep bell and background lookups bounded as historical rows accumulate.
CREATE INDEX IF NOT EXISTS idx_notifications_operator_feed ON notifications(scope, created_at DESC) WHERE kind != 'system';
CREATE INDEX IF NOT EXISTS idx_notifications_operator_unread ON notifications(scope, read_at) WHERE kind != 'system';
CREATE INDEX IF NOT EXISTS idx_ig_messages_search_recent ON ig_messages(sent_at DESC) WHERE text IS NOT NULL AND length(text)>=12;
CREATE INDEX IF NOT EXISTS idx_ig_outreach_seen_pending ON ig_outreach(seen_at) WHERE seen_at IS NOT NULL AND seen_notified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_runs_active ON sync_runs(job, started_at) WHERE status='running';

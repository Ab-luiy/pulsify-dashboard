-- The 7-fig packaging library's videos (founder 2026-10-15): videos that beat their own channel's normal by 10x or
-- more, by niche. Gathered by the sync Worker's `outliers` job from the YouTube Data API; every row is refreshed
-- within 30 days or deleted (YouTube API policy for data we do not own).
CREATE TABLE IF NOT EXISTS outlier_channels (
  channel_id TEXT PRIMARY KEY,
  niche TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  uploads_playlist TEXT NOT NULL DEFAULT '',
  found_at TEXT NOT NULL,
  checked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_outlier_channels_check ON outlier_channels (checked_at);

CREATE TABLE IF NOT EXISTS outlier_niches (
  niche TEXT PRIMARY KEY,
  discovered_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outlier_videos (
  video_id TEXT PRIMARY KEY,
  niche TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL,
  views INTEGER NOT NULL,
  channel_median INTEGER NOT NULL,
  multiplier REAL NOT NULL,
  duration_s INTEGER NOT NULL DEFAULT 0,
  refreshed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outlier_videos_niche ON outlier_videos (niche, multiplier DESC);
CREATE INDEX IF NOT EXISTS idx_outlier_videos_channel ON outlier_videos (channel_id);

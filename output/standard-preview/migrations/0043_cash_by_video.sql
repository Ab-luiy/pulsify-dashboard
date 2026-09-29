-- Cash by video (pulsify-saas #36). Additive only.
-- Each client's public YouTube uploads, one tracked link per video placement,
-- and plain UTM columns on page_events so visits can be looked up by video.

CREATE TABLE IF NOT EXISTS yt_videos (
  client_id        TEXT NOT NULL,
  video_id         TEXT NOT NULL,
  channel_id       TEXT,
  title            TEXT NOT NULL DEFAULT '',
  published_at     TEXT,
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  views            INTEGER,
  likes            INTEGER,
  comments         INTEGER,
  synced_at        TEXT NOT NULL,
  PRIMARY KEY (client_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_yt_videos_client_published
  ON yt_videos (client_id, published_at DESC);

-- kind='video' links belong to a video (or video_id='channel' for the channel
-- About link); placement is description, pinned-comment or channel.
ALTER TABLE asset_links ADD COLUMN kind TEXT NOT NULL DEFAULT 'asset';
ALTER TABLE asset_links ADD COLUMN video_id TEXT;
ALTER TABLE asset_links ADD COLUMN placement TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_links_video
  ON asset_links (client, video_id, placement) WHERE kind='video';

ALTER TABLE page_events ADD COLUMN utm_source TEXT;
ALTER TABLE page_events ADD COLUMN utm_content TEXT;

UPDATE page_events
   SET utm_source = lower(json_extract(utm_json, '$.utm_source')),
       utm_content = json_extract(utm_json, '$.utm_content')
 WHERE utm_json IS NOT NULL AND json_valid(utm_json) AND utm_json <> '{}';

CREATE INDEX IF NOT EXISTS idx_page_events_utm_content
  ON page_events (client, utm_content, at);

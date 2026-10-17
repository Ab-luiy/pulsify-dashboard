-- Readable tracked links and links made from a YouTube address (pulsify-saas #72). Additive only.
--
-- slug      the readable ending of a link: /a/trading-ep12 on the shared domain, /trading-ep12 on the
--           client's own domain. Lowercase letters, digits and single hyphens. Rules in _shared/link-slug.js.
-- origin    'youtube-sync' for a link the sync made on its own when it found a new video; NULL for
--           links people made.
-- video_url the YouTube address a link was made from (for a link that sends people to the client's own
--           page the destination is that page, so the video address is kept here).
ALTER TABLE asset_links ADD COLUMN slug TEXT;
ALTER TABLE asset_links ADD COLUMN origin TEXT;
ALTER TABLE asset_links ADD COLUMN video_url TEXT;

-- One client never has two links with the same ending. Whether two clients may share one is decided
-- in code (a client on the shared domain needs a unique ending, a client on its own domain does not).
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_links_client_slug
  ON asset_links (client, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asset_links_slug ON asset_links (slug) WHERE slug IS NOT NULL;

-- A video gets at most one automatic link, even if someone archives it (it is not made again).
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_links_auto_video
  ON asset_links (client, video_id) WHERE origin = 'youtube-sync';

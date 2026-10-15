-- The automatic outlier library is gone (founder 2026-10-15: nothing reaches clients that he has not approved).
-- The outlier score now grades a client's own synced videos (functions/_shared/outlier-score.js) and needs no tables.
DROP TABLE IF EXISTS outlier_videos;
DROP TABLE IF EXISTS outlier_channels;
DROP TABLE IF EXISTS outlier_niches;

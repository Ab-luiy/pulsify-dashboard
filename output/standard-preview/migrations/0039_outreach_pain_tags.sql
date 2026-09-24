-- Operator inbox (pulsify-saas ticket #14): what each prospect struggles with
-- and which assets were sent. Both JSON, written only through
-- functions/_shared/pain-tags.js cleanTags() / cleanAssetEntry().
ALTER TABLE ig_outreach ADD COLUMN pain_tags TEXT;
ALTER TABLE ig_outreach ADD COLUMN asset_log TEXT;

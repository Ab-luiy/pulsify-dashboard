-- Lets each client pick which landing-page design renders (the "picker"),
-- and stores their per-field page copy so the same template can serve any
-- prospect's actual words instead of Frank's hardcoded copy.

ALTER TABLE client_config ADD COLUMN template_variant TEXT DEFAULT 'canonical';
ALTER TABLE client_config ADD COLUMN page_content_json TEXT;

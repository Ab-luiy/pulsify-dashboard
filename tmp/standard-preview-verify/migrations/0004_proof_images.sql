-- Let each client's proof-wall images be updated from the Settings page,
-- without a code deploy. Stored as a JSON object: { "<tag>": "<image url>", ... }
-- keyed by the proof tile's tag text (e.g. "Payment proof").

ALTER TABLE client_config ADD COLUMN proof_images_json TEXT;

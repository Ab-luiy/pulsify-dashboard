-- Receipts are emailed to the client the moment they are issued (pulsify-saas #24). Additive only.
ALTER TABLE receipts ADD COLUMN emailed_at TEXT;
ALTER TABLE receipts ADD COLUMN email_error TEXT;

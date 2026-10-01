-- A setup link the system itself emailed to the person has already proved they own the mailbox, so the
-- extra 6-digit code is skipped for it (founder, 2026-10-01). Links an operator copies and shares by hand
-- keep the code step.
ALTER TABLE client_setup_tokens ADD COLUMN emailed_at TEXT;

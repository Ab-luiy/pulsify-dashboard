-- Only real leads count (pulsify-saas ticket #27, founder 2026-09-25).
-- A stored override of who a conversation is to the founder:
--   'personal'  a friend or his own account, never a lead, never nags
--   'lead'      an inbound conversation he chose to count as a lead
--   NULL        derived: he wrote first -> lead, they wrote first -> inbound
-- Written only through functions/api/outreach.js action relation:*.
ALTER TABLE ig_outreach ADD COLUMN relation TEXT;

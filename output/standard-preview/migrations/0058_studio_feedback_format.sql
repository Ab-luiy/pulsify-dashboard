-- Review rules are tagged with the format they came from so a carousel note ("cover too wordy") does not
-- steer story sequences or YouTube. '' means every format (all rules written before this migration, and
-- general rules). Additive: nothing is dropped or rewritten.
ALTER TABLE studio_feedback ADD COLUMN format TEXT NOT NULL DEFAULT '';

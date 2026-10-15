-- Onboarding v2 (founder 2026-10-15, wiki/synthesis/onboarding-v2-spec-2026-10-15.md).

-- Everything a client has typed in a form, saved while they type (pulsify-saas #67).
CREATE TABLE IF NOT EXISTS form_drafts (
  client_id TEXT NOT NULL,
  form_key TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  position TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (client_id, form_key)
);

-- Part A "How you found us": Pulsify's own record of how the client was sold. Never read by a generator.
CREATE TABLE IF NOT EXISTS sale_stories (
  client_id TEXT PRIMARY KEY,
  answers_json TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- The operator's ticks on "What this client needs figured out" (pulsify-saas #70). state: done | call.
CREATE TABLE IF NOT EXISTS onboarding_needs (
  client_id TEXT NOT NULL,
  need_key TEXT NOT NULL,
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (client_id, need_key)
);

-- The answer a client replaced, so the operator can see what it said before.
CREATE TABLE IF NOT EXISTS client_brain_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  section TEXT NOT NULL,
  field TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source TEXT,
  replaced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_client_brain_history ON client_brain_history (client_id, replaced_at);

---
name: project_ig_scorer_prototype
description: Live IG/X lead scorer is inverted vs the ICP; a vetted WIP prototype (v2) fixes it but is NOT promoted yet
metadata: 
  node_type: memory
  type: project
  originSessionId: 1111c1a0-5390-4338-b475-a0688bc76035
---

The live `tools/social_lead_scoring.py` (scores IG + X stranger leads; YT uses the
free official API instead) still rewards course/mentorship signal, so it ranks GURUS
tier A and drops real craft-doers — backwards vs the [[project_yt_lead_criteria]]
reframe. Proven via `tools/audit_social_scoring.py`, a no-credit synthetic battery:
**OLD = 8/13 fixtures mis-ranked**.

Prototype `tools/social_lead_scoring_proto.py` (**WIP, NOT wired into scrape_ig_leads.py**,
v2 as of 2026-06-21) → **0/13 mismatches**:
- **Craft/proof is the top lever** (+35, first-person anchored so a guru's "students
  made $2M" ≠ craft) — keeps real doers above sellers.
- **Offer signal (mentorship / DM-to-join / course) is ACCEPTED**: a modest +12 buyer
  signal, NOT a penalty. Per user 2026-06-21 — those can be EMERGING mentors with no
  real method yet = our ideal customer (proto tags wound="method"). Doers still outrank
  them via craft.
- **Reputation** = followers (no 150k cliff) + **verified bonus** (verified > non-verified).
- **Activity** = mediacount + recency, NEVER likes (daily posters can have low likes).
- **GEO/English gate** (new): hard-drop non-Latin script (Devanagari/Arabic/Bengali/etc.)
  + locale tells (flags 🇮🇳🇵🇰, currency ₹₦, cities Mumbai/Lahore/Lagos/Dhaka, phone
  +91/+92/+234). Western/English market only — kills the foreign/spam hashtag flood.
- Hard-drop private accounts; EXCLUDE gate (SMMA/agency/closer/setter/mindset) reused.

Open / tunable: geo gate only catches OBVIOUS tells — English-writing no-location
accounts slip through (upgrade = langdetect on captions or LLM Western-market judge);
established gurus (61/B) currently outrank emerging mentors (48/C) — could add a
big-student-number deprioritizer so no-method mentors rank above polished machines;
weights are first-draft; the `sq`/hashtag plumbing bug in scrape_ig_leads.py is unfixed.

**Next discovery vector (user's preferred, not built):** SEED-FOLLOWING — scrape the
*following lists* of appointment setters / closers (they follow creators they want to
pitch → curated monetizable-creator lists), then vet each through this same scorer.
Build as a `--seeds` mode; following endpoint is the most ban-prone IG scrape → free
path = instaloader get_followees on a burner (capped), safer path = Apify actor.

**Why:** scoring quality gates lead quality — a free IG scraper feeding the broken
live scorer just produces dog-water leads faster.

**How to apply:** don't trust the live scorer's tiers until the prototype is folded in;
before promoting, tune weights on a real IG pull or add the LLM judge, then replace
social_lead_scoring.py and re-run the audit. See [[feedback_content_targets_b2c_coaches]].

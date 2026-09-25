---
name: project-standard-onboarding-form
description: "The client onboarding form is ONE standard form in the new app at /app/portal/onboarding (pulsify-saas #16, 2026-09-25); it writes straight into the client brain; legacy /onboard only redirects there"
metadata:
  node_type: memory
  type: project
  originSessionId: 87960850-c60f-429a-8e2b-ab7350a4c3fd
  modified: 2026-09-25T20:15:10.900Z
---

Founder decision 2026-09-25: "go with one standard form first". Per-client AI-tailored questions are a later step, not started.

- Lives at `/app/portal/onboarding` (pulsify-saas `src/features/onboarding/`), a focus page with no portal shell. The private link is `/app/portal/onboarding?client=X&t=TOKEN` (portal gate signs them in, the page strips `t` from the address bar).
- 17 questions in 7 parts that map to brain sections (identity, offer, icp, story, voice, funnel, proof). Every answer saves on Continue through client-brain.js `answers`; only changed, non-blank answers go out, so skipping never clears operator work.
- "Finished" = `proof.has_proof` has a client source (it is only written on Finish). The operator brain screen and the client Overview nudge both read progress from `questions.ts onboardingProgress`.
- Proof links go through `action: "add-proof"` (adds only). Never use the full `proof_items` submission from the form: it deletes and rewrites the vault and resets granted permissions.
- The operator's "Get the form link" mints a new portal token, which turns off the previous form AND portal link (one token per client). The card asks before doing it.
- Legacy `/onboard` now 302s to the new route with the same query; first password set redirects to it too.

Different from [[project-onboarding-form]] (the post-close buyer-psychology Typeform), which is still separate and incomplete.

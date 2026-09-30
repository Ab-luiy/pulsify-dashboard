---
name: feedback_app_wording
description: "HARD 2026-09-30 - app wording: never 'health' anywhere people read (client status = On track / Watch / At risk, Funnel score, Collections); first page is 'Home' not 'Overview'/'Your workspace'; Instagram and YouTube always use their own marks; sign out is a power button"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e0f85de8-f3a4-4484-ae1e-b5a76817c2d8
  modified: 2026-09-30T16:54:34.720Z
---

In the Pulsify app (both the operator console and the client portal), the word "health" never appears in anything people read. The founder said it "sounds stupid" and asked for the market term. The replacements are: "Client status" with On track / Watch / At risk / Needs onboarding, "Funnel score" for the 0 to 100 funnel number, "Collections" for money waiting to be collected, and "on track" for a story sequence the backend marks healthy. Code and API names keep `health`, so the backend stays untouched.

The first page in both shells is "Home" (not "Overview" and not "Your workspace"). Instagram and YouTube always use their own marks (`src/components/patterns/brand-icons.tsx`), never generic chat or play icons. Sign out is a power button (his 2026-09-24 note). The island shortcuts show their names.

**Why:** founder, 2026-09-30. He also asked me to go back through his older notes for small naming and icon tweaks, so he expects these to be remembered, not re-asked.

**How to apply:** check any new screen's labels against this before shipping; the full list is in pulsify-saas docs/DESIGN.md "Wording rules". Related: [[feedback_app_colour_placement]], [[project_infoos_integration]].

---
name: project_frontend_overhaul_2026_10_12
description: "2026-10-12 founder approved Phase 1 of the frontend audit and reversed bring-your-own-key: Pulsify's own AI key writes for clients server-side"
metadata:
  node_type: memory
  type: project
  originSessionId: 5c21bdf1-a08c-428a-8f2d-72cbdc7eefd4
  modified: 2026-10-12T09:54:15.356Z
---

Audit: wiki/synthesis/frontend-audit-2026-10-12.md (13 sections, 5 phases). Founder 2026-10-12: "go ahead with phase 1, and yes use our key".

**Decision: the app writes for clients on Pulsify's key, server-side.** Supersedes the 2026-10-03 bring-your-own-key / copy-paste-prompt decision in [[project_mvp_first_client]]. Why: clients never finished a piece because every generator handed them a prompt for their own ChatGPT, and that prompt carried the whole method (IP leak). Once server generation is live, remove "Copy AI prompt" for clients. This is Phase 3.

Phase 1 (approved): remove the 9 story type cards and arc pages (one "what do you want to post about?" input instead), cut bulky subtitles and instruction paragraphs, remove the big empty icon cards, delete/redirect pure duplicates (metrics routes, formulas on YT overview, projects lists, payments providers), fix the audit's bugs. Phases 2-5 still need his go: operator Client view + content pipeline board, server generation, onboarding/carousel/thumbnail rebuild, protection (split builds, rate limits, watermark, terms).

**How to apply:** screenshots before release, main-only releases ([[feedback_main_only_releases]]), app wording rules ([[feedback_app_wording]]).

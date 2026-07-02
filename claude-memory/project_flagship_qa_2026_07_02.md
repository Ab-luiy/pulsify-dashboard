---
name: flagship-qa-2026-07-02
description: "Fable QA pass over the live funnels system - full report + 7 standing rules in wiki/synthesis/flagship-qa-2026-07-02.md; three open fixes (F1 worktree merge, F2 bare-domain Frank, F3 settings full-replace)"
metadata: 
  node_type: memory
  type: project
  originSessionId: f4365cfb-5a05-4c17-a2b4-fe27b929db76
---

2026-07-02, user-approved Fable 5 deep QA of the deployed outreach system (code read + live production checks). Full report: `wiki/synthesis/flagship-qa-2026-07-02.md`. Architecture passed (tenant isolation, tokens, secret masking, middleware, templates). RESOLVED same day: F1-F3 fixed by Codex (commit 5ceebc1, merged to brain main, deployed) and independently live-verified by Claude - bare domain now generic, settings POST merge-semantics, source on main. F4 stays an accepted rule-bounded boundary. The 7 standing rules remain permanently in force. Original findings for reference:

- **F1 (do first):** complete deployed source exists ONLY in unmerged worktree `.claude/worktrees/keen-tereshkova-bc3897/` - merge to vault main before it's cleaned. Standing rule: deployed code lives on main.
- **F2:** bare `pulsify-funnels.pages.dev/` renders Frank's real pitch (functions/index.js defaults client to "frank"; static fallback index.html also Frank-coded). Default must be generic.
- **F3:** `/api/settings` POST full-replaces - absent fields become NULL (only the 2 secrets merge). Lead Studio bridge partial POST can wipe a client's config. Fix = preserve-if-absent for all columns; until then callers send full config.
- **F4 (bounded, accepted):** no-secret `/event` = open lead injection + Kit spam vector. RULE: never save kit_api_key without typeform_webhook_secret. Funnel analytics are directional, never quoted as verified.

**Why:** these are exactly the misses that would surface in front of a prospect or client.
**How to apply:** enforce the 7 standing rules in the report on all funnels work; check F1-F3 status in AGENT_CHAT before building on the funnels repo (Codex may claim F2/F3). Related: [[agent-cross-call-protocol]], [[fable-grade-quality]].

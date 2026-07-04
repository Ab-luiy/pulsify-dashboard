---
name: project-operator-console
description: Unified /admin console + add-client wizard live on pulsify-funnels since 2026-07-04
metadata: 
  node_type: memory
  type: project
  originSessionId: 22a9258e-5003-469a-aa46-6323351075c9
---

Live since 2026-07-04 at https://pulsify-funnels.pages.dev/admin: one operator console unifying /settings, /portal, /integrations, /campaigns (all four legacy pages still work behind banners — the Lead Studio bridge depends on /api/settings, don't retire them without checking). One ADMIN_KEY unlock (localStorage `pulsify_admin_key`, mirrors legacy sessionStorage both ways). Every field has a plain-English hint + per-section "What do these mean?" glossary drawer. Add-client wizard: 8 steps, SaaS-signup style, name-only creates the client (only required step), rest skippable with incremental partial saves — safe because functions/api/settings.js merges partial payloads (old F3 wipe bug fixed via hasOwn/keep). Pending fields surface as a Setup checklist strip on #clients that reopens the wizard at that step. Spec: wiki/synthesis/operator-console-spec.md. Commits a95fc17 (console) + 477b664 (wizard), both Codex gpt-5.5 high builds, Claude-reviewed, frontend-only (zero functions/ changes). Current ADMIN_KEY was recovered from the elated-brahmagupta session transcript after the founder lost it — the founder holds it now; he thought it was "abood2013" (it never was). Junk D1 row `multitest` (name "[deleted test]") still in client_config pending founder's delete approval. Related: [[project-integrations-hub-i1]], [[project-funnel-portal-pipeline]].

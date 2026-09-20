---
type: synthesis
tags: [outreach, funnel, sales, product]
sources: [[kendo-app-teardown-2026-09-17]], [[pulsify-command-center-architecture-2026-09-17]], [[phase5-review-and-polish-codex-brief]], [[cold-dm-formula]]
created: 2026-09-20
updated: 2026-09-20
---

# Phase 6: the outreach product, Kendo-grade

Phase 5 (Codex, running now) polishes what exists: tracker, leads, search, audit fixes. Phase 6 turns those pieces into the thing the founder actually sits in every day to do outreach. Founder's words on 2026-09-20: "we need it to be up and running for outreach, I don't want it to look like html jargon bs, I need a full on stack of engineers on this."

## Why this matters for Pulsify

Outreach is the bridge revenue channel while content compounds. Today the tracker keeps score after the fact. Nothing tells the founder who to message next, with what, and nothing closes the loop from a lead in Lead Studio to a thread in the tracker. Kendo's lesson is that the product is the daily work queue, not the report.

## What Phase 6 ships

1. **Today queue** (operator view "Today", under Growth, first item). One screen that answers "who do I message now": follow-ups due (from `/api/outreach`) on top, then new openers from the queue, each with a ready draft written to the cold DM formula, a Copy button, Open on Instagram, Mark sent, Skip. Daily cap configurable (default 25 openers). When the sent DM shows up through Zernio, the queue item flips to sent by itself.
2. **Outreach queue backend.** Table `outreach_queue` (migration 0035): lead handle, source (crm, yt_leads, manual), brief fields for the draft (name, niche, one specific detail, gap), draft text, status queued|sent|skipped|replied, timestamps, position. API `/api/outreach-queue`: GET today (candidates ranked: CRM new-lead first, then yt_leads tier A/B with a handle), POST add|draft|sent|skip|reorder, auto-reconcile against `ig_conversations` by handle.
3. **Drafts.** Built from `wiki/content-engine/cold-dm-formula.md`: five beats, 30-45 words, lowercase, rotating openers, one specific detail, gap framed as opportunity, gift, ownership close. Template fill first; an optional AI pass through the existing `/generate` path (Gemini) when a brief exists. Every draft is editable before copy. No emojis, no em dashes, no exclamation marks.
4. **Command palette** (Ctrl+K, both shells): jump to any view, find a contact by name or handle (`/api/outreach?q=` for operator, `/api/pipeline?q=` for client), run actions (mark booked, hibernate, open on Instagram). Kendo has none; this is where Pulsify goes past it.
5. **Kendo gap review**: a ranked list of what still reads as "html" next to Kendo, with the file-level fix for each, so the next design pass is a checklist not a vibe.

## Team and file ownership (parallel, isolated worktrees, no deploys)

Each engineer works on its own branch from `main`, runs `node --test tests/*.test.mjs` green, and reports. Claude integrates after Codex's Phase 5 run finishes: merge, suite, deploy Worker then Pages from `output/standard-preview`.

- **queue-backend**: `migrations/0035_outreach_queue.sql`, `functions/_shared/outreach-queue.js`, `functions/_shared/dm-draft.js`, `functions/api/outreach-queue.js`, one line in `functions/_middleware.js` (add `outreach-queue` to adminApis and mixedApis), `tests/outreach-queue.test.mjs`.
- **queue-frontend**: `admin/queue-view.js`, `admin/queue-view.css`, `shared/command-palette.js`, `shared/command-palette.css`, nav and mount lines in `admin/phase1.js`, `portal/phase1.js`, `admin.html`, `portal/index.html`. Mock-API browser verification at 1536 and 390, dark and light.
- **kendo-gap-review**: read only, writes `wiki/synthesis/kendo-gap-review-2026-09-20.md`.

Nobody touches: landing pages, `admin/outreach-view.js`, `admin/leads-view.js`, `admin/search-view.js`, `admin/integrations-view.js`, Zernio, notifications, realtime, `clients/**`. Those are Codex's for Phase 5.

## Standards

Kendo standard from [[kendo-app-teardown-2026-09-17]]: 150 ms `cubic-bezier(.16,1,.3,1)`, raised-neutral primary button, hairline borders, layout-matched skeletons, one URL with client-state view switching, warm-black tokens already in `shared/shell.css`. Copy in Pulsify voice, no AI tells. Tests on real SQLite like the existing suites.

## Open questions / gaps

- Sending from Pulsify through Zernio is possible (`POST /v1/inbox/conversations/{id}/messages`). Founder said sending from the phone is fine; not in Phase 6 unless he asks.
- Per-client Zernio accounts (clients running their own outreach inside their workspace) is the natural Phase 7.

## Source trail

- Founder direction 2026-09-20 (this session).
- [[kendo-app-teardown-2026-09-17]], [[cold-dm-formula]], [[phase5-review-and-polish-codex-brief]].

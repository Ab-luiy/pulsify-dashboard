---
type: synthesis
tags: [sales, funnel, offer]
sources: [[playbooks/pulsify-offer-v1]], [[playbooks/pulse-system-stack]], [[synthesis/mvp-plan-2026-10-02]]
created: 2026-10-04
updated: 2026-10-04
---

# Sales Co-pilot plan (client-facing), 2026-10-04

Founder decision 2026-10-04: build the client-facing Sales Co-pilot now (it was deferred in [[synthesis/mvp-plan-2026-10-02]]). Claude planned; Codex implements, tests and self-verifies. Reason it matters: offer v1 promises it in weeks 6-8, and the SaaS highlight sequence (slide 10) shows it on camera: who's closing, who's not, who hits cadence, who hits the KPIs.

## What already exists (do not rebuild)

Verified in code 2026-10-04 (InfoOS build, 2026-09-30):
- `team_members`, `team_forms` (eod / set), `commission_payouts` in migration 0046; `functions/_shared/team.js` `loadTeam` returns reps, 30-day numbers, forms, compliance (calls without a post-call form), commissions, flags (sale with no payment, payment with no closer). `GET/POST /api/team`.
- `functions/api/lead-calls.js` (`_shared/lead-calls.js`): month of booked calls, confirmed flag, waiting-on-form list, 30-day show and close rates. `call-flags.js`, `lead-outcomes.js` (post-call form).
- `functions/_shared/delivery-automation.js`: pre-call brief per booked call and Fathom import, both written to call notes, operator-notified.
- Portal: `pulsify-saas/src/features/portal-team/{sales-team.tsx,commissions-screen.tsx,queries.ts}`, `portal-leads/post-call-form.tsx`.

So the Co-pilot is about 60% built. The gaps are targets, a scoreboard that reads at a glance, the brief and notes visible to the client per call, and follow-up drafts after a no-close.

## Tickets (one at a time, in this order)

**SC1 KPI targets and cadence.** Additive migration (next number after 0053): `sales_targets (id, client_id, member_id NULL = whole team, metric, period 'week'|'month', target REAL, created_at, updated_at)`. Metrics: calls_taken, show_rate, close_rate, cash_collected_cents, eod_forms_filed. Extend `loadTeam` with `targets` and per-rep `{metric, actual, target, status}` where status is On track / Watch / At risk (app wording rule: never "health"). POST action `set-target`. UI: target editor in Team settings, status chip per rep per metric.

**SC2 Scoreboard.** Top of the portal Team screen: one row per rep, sorted by cash collected this period: calls taken, show rate, close rate, cash, cadence status. Use the shared DataTable (TanStack) and existing KPI strip; no new primitives. Empty state when no team: founder as the default lead (seed on provision via `_shared/workspace-seed.js`) and one line on adding a setter or closer.

**SC3 Brief and notes on every call.** Client portal Calls list: each call opens a side panel with the pre-call brief, the Fathom summary and action items (if recorded), the post-call form, and the closer. Read from where delivery-automation already writes call notes; add a read endpoint only if none exists (check `client-data` / `workspace-records` first). No new AI calls.

**SC4 No-close follow-up drafts.** When a post-call form records no sale, draft a 5-touch, 30-day follow-up (offer v1 step 7) through `functions/_shared/anthropic.js` only (the single LLM path; manual copy-paste fallback when no key). Drafts go into the existing review gate (content-reviews), never auto-sent. Use the client brain for voice and the brief plus call notes for context.

Deferred: live call co-pilot (in-call prompts), proposal templates, CRM auto-updates beyond what lead-outcomes already does, Slack reporting (Slack retired).

## Build rules for Codex

- Read only `pulsify-saas/CLAUDE.md`, `docs/DESIGN.md` and the files named above. Do not rescan the legacy tree.
- Frontend: Next.js static export, React, TypeScript, Tailwind, shadcn, TanStack DataTable, `LiquidIndicator` for chip rows, motion tokens from `src/lib/motion.ts`. Homepage palette placement rule applies.
- Backend: Cloudflare Pages Functions + D1, additive migrations only, access through `resolveReportClient` / `resolveReportWriter`, `withOperator` for operator paths.
- Each ticket: claim on the AGENT_CHAT Lock Board, branch off main, `npm run check` plus backend `node --test` green, browser check of the Team screen as operator and as demo client, close with "Fixes #n". Release only from a clean pushed main (main == live). Log in `wiki/log.md`.
- Never invent numbers in seeded or demo data shown to real clients; the Example workspace may hold sample data, labelled.

## Open questions

- Default cadence targets per role (calls/day for a closer, conversations/day for a setter): founder to set, or leave empty until the client sets them.

## Implementation, 2026-10-04

Codex implemented SC1-SC4 in the existing portal and backend. Targets start empty. Calendar periods use UTC: Monday to Sunday or the calendar month. Count targets compare actuals with elapsed-period pace; rate targets compare the observed rate directly. No denominator displays an empty rate. EOD cadence counts distinct rep-days. Confirmed cash is net of refunds.

The Team screen opens with the shared scoreboard. New and existing client workspaces without a sales roster receive a single owner row named You, with no fabricated activity or commission. Each call opens its linked brief, recorded summary and action items, closer and editable post-call form. Legacy briefs link only on a unique exact match; ambiguous recordings remain unlinked.

A showed call marked not closed or follow-up queues five drafts for days 1, 3, 7, 14 and 30. Client Anthropic access generates them; missing access or a provider failure exposes the full prompt for manual paste-back. The existing operator review gate handles approval and rejection. Approved messages can be copied; nothing sends automatically. Editing the underlying call replaces old drafts and prevents stale approval.

This closes the sales execution gap in [[playbooks/pulsify-offer-v1]] and [[playbooks/pulse-system-stack]]. Content and offer remain the inputs; the Co-pilot supports the funnel after the booking. It does not establish conversion gains without client use and measured outcomes. Release evidence is recorded in [[log]].

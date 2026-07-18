# CODEX_TASK_leak_cleanup.md

Founder-approved housekeeping + one review pass, 2026-07-18. Claude specs, Codex executes. Speed over depth: one pass each item, no review-of-the-review, medium effort throughout. Everything here is repo work in `C:/Users/Abdullah/Desktop/Pulsify-Brain`; no deploy is expected unless item 2 finds a real defect.

## Context

The 2026-07-13 → 07-16 sprint shipped ten builds live to pulsify-funnels.pages.dev (client brain, follow-up queue, operator command center, proof vault + pulse feed, Trakyo port P1+P2, impersonation, Kit email composer, carousel studio, retest loop, acquisition-pages manager; migrations 0015-0020). A vault audit today found five leaks; Claude already fixed the stale-memory one. Four remain — they are yours.

## Item 1 — backfill `wiki/log.md` (the real leak)

`wiki/log.md` newest entry is 2026-07-12. The whole sprint is missing from the canonical chronological record even though several handoff notes claimed it was documented there.

- Source of truth: the `AGENT_CHAT.md` Log entries dated 2026-07-13 through 2026-07-16 (plus the 2026-07-16 16:08 acquisition-pages DONE).
- Append entries in the file's existing format: `## [YYYY-MM-DD] {operation} | {short title}` + one short paragraph. Use operation `client-update` for portal builds, `decision` where a durable choice was made (e.g. Slack operating system).
- Consolidate sensibly: one entry per shipped build or coherent group, not one per AGENT_CHAT message. Roughly 6-10 entries total.
- Keep it append-only: add after the newest existing entry, do not touch older entries.
- Voice rules apply: no em-dashes beyond sparing use, no hedging, no reward copy.

## Item 2 — independent review of the acquisition-pages build (the only unreviewed deploy)

The 2026-07-16 16:08 acquisition-pages manager (migration 0020 + the file set listed in that AGENT_CHAT entry) was self-deployed without the usual second-agent review. Give it the standard review pass:

- Read the diff scope: `output/standard-preview/migrations/0020_acquisition_pages.sql`; `functions/api/settings.js`, `clients.js`, `campaigns.js`, `funnel-config.js`; `functions/event.js`, `leads.js`, `index.js`, `[slug].js`, `_shared/page-render.js`; `js/funnel-integrations.js`; `admin.html`; `admin/console.js`; `admin/console.css`.
- Verify: ADMIN_KEY gating on operator surfaces, no cross-client leakage in slug/page rendering, inactive-page 404 behavior, tracked-link token unguessability, operator-preview event suppression actually suppresses, migration additive-only.
- Run all 13 `.mjs` suites under `output/standard-preview/tests/` and `node --check` the touched JS.
- If everything passes: record PASS in AGENT_CHAT, done. If you find a real defect: fix it, re-run suites, deploy with Wrangler `--branch main`, smoke (admin 200, Frank 200, campaigns/settings 401 unauth), and record the fix. Judgment call is yours; do not deploy for cosmetic nits.

## Item 3 — archive the completed task specs

All 17 `CODEX_TASK_*.md` files in repo root are shipped. Create `done-tasks/` at repo root and `git mv` all of them into it — including this file once you finish, as the final step. Add a one-line `done-tasks/README.md`: completed Codex task specs, archived 2026-07-18, see AGENT_CHAT.md and wiki/log.md for outcomes.

## Item 4 — fresh wiki lint

`wiki/lint-report.md` is dated 2026-07-09, pre-sprint. Re-run the lint per CLAUDE.md's lint workflow (contradictions, stale claims, orphan pages, missing cross-links, voice violations) over `wiki/` and overwrite `wiki/lint-report.md` with the new report. Focus the pass on pages touched or made stale by the sprint (funnel-portal-pipeline, client-brain-spec, pulsify-portal-master-architecture, index.md freshness) rather than re-reading every historical page at full depth. Report only; do not auto-fix findings.

## Ground rules

- Post STARTED and DONE to `AGENT_CHAT.md` (canonical) and mirror to Slack `#build-log` if the connector allows; connector cancellation is acceptable, repo record wins.
- Claim files on the Lock Board before editing.
- Update `wiki/log.md` with one final entry for this cleanup itself (operation `lint`).
- No secrets, no em-dashes/en-dashes in new copy, no reward copy, no remote D1 writes (item 2 fix path excepted if a defect requires it — it should not).
- Auto-backup/commits: normal checkpoint behavior is fine for this task; nothing here forbids commits.

## Acceptance

1. `wiki/log.md` has entries covering 07-13 → 07-16 sprint + this cleanup, correct format, append-only.
2. AGENT_CHAT has a PASS-or-fixed review record for acquisition pages with test results stated.
3. Repo root contains zero `CODEX_TASK_*.md` files; `done-tasks/` has all 18 (17 + this one).
4. `wiki/lint-report.md` is dated 2026-07-18 with specific page/line findings.

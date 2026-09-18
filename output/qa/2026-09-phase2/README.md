# Phase 2 native interiors QA

Verified 2026-09-18 against the source deployed as funnels release `70e809ea` and dashboard source commit `51c314f`.

## Result

The operator dashboard is mounted inside the apex shell as native same-origin markup. The browser matrix found zero iframes across operator views. Dashboard reads use the authenticated D1 spine; the previous JSON data file is not requested. Direct authenticated navigation to `ops.pulsify-ai.com/?embed=1&view=crm` resolves to `pulsify-ai.com/admin#crm`.

The shared interior layer provides an eight-cell KPI grid, persistent ordering and visibility, one-time feature introductions, a persistent launch checklist, action-oriented empty states and gating dialogs. CRM polling runs every 45 seconds only while the CRM view is visible.

## Verification

- Backend: 33 tests passed.
- Browser: 108 screenshots covering every operator and client view at 1536 px and 390 px in dark and light themes.
- State: KPI order, hidden metrics and checklist completion survive reload through the preference API mock.
- Network: D1 snapshot requests observed; `dashboard-data-v2.json` absent; hidden CRM interval produced no sync request.
- Lighthouse desktop, fresh browser per theme: performance 92 light / 100 dark, accessibility 96 in both themes.
- Lighthouse mobile, fresh browser per theme: performance 77 light / 75 dark, accessibility 96 and cumulative layout shift 0 in both themes.
- Live: apex 200, protected spine API 401 anonymously, Worker health 200, pages.dev admin 302 to the apex.

## Seven-gate review

1. Verified behavior: tests, screenshots, Lighthouse reports and authenticated live navigation are saved here.
2. Facts: UI totals come from the existing workspace state or D1. The dashboard label says `Saved data` while provider sync is paused.
3. Copy: final labels use the Pulsify direct voice and avoid invented outcomes.
4. Builder review: the complete diff and generated dashboard were re-read after the browser suite.
5. Cross-review: the founder supplied the concrete review that triggered this pass. A new Claude call was skipped because the quota gate showed Codex above its weekly review threshold and Claude usage was unavailable; the shared operating rules say not to call near limits.
6. Compounding: reusable surface primitives, a build script, tests and this checkpoint remain in the repo.
7. Consistency: the same components and tokens serve operator and client interiors across both themes and breakpoints.

## Remaining acceptance

Provider activation is external to this release. `pulsify-sync` still needs `YT_API_KEY` and `COMPOSIO_API_KEY`, then `SYNC_ENABLED=true`. After that, run and retain evidence for a real Instagram DM projection, YouTube refresh, lead refresh and three scheduled cycles.

Simulated mobile Lighthouse performance remains below the desktop gate because the legacy client application still ships as one large bundle. Local product CSS now loads before paint, eliminating the full-page layout shift; route-level mobile splitting remains future performance work.

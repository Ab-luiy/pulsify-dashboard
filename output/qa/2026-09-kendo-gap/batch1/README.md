# Kendo gap Batch 1: primitives

Local implementation only. No deploy, live API call, secret read, schema or view-logic change.

## Changes

- shared/shell.css: complete semantic, chart, sidebar and six shadow tokens; exact documented dark shadows, warm-neutral light palette, Pulsify green accent retained, theme-aware --ui-* bridge. One 36 px button with raised-neutral primary/ghost, pending and disabled states; 40 px input with a 36 px compact modifier, textarea/select support and a visible 3 px focus halo. Legacy control/input classes alias these primitives. Underline tabs and one segmented-control family; non-modal menu versus centered modal styles; 150 ms expo transitions, 100 ms leave and 2.8 s skeleton tokens.
- shared/shell.js: destination icon map for both existing nav adapters, 1.75-stroke SVG set, sliding nav pill, switcher/calendar SVGs, trigger-anchored non-modal top-layer menus with outside click, Escape, focus return, resize/scroll positioning and exit animation. No navigation adapter changes.
- shared/surface.css: tokenized shadows/motion/overlays; SVG masks for checklist chevrons/checks, drag handles and intro art without editing the surface renderer.
- shared/integrations-view.css: removes duplicate control/input/tab/modal definitions in favor of shared primitives, replaces warning/destructive/shadow hex values with tokens. Keeps view layout and logic.
- admin/contact-row.css: tokenized motion/focus, shared pill anatomy and an SVG-mask fallback when the unchanged tracker replaces chevron contents on toggle.
- admin/contact-row.js: only the chevron markup changed to a shell SVG (the current tree used Open/+/- rather than the review's older question mark).

## P1 disposition

| Gap-review P1 | Batch 1 result |
|---|---|
| Mirage views | Deferred to Batch 3; unchanged |
| Iframe views | Deferred to Batch 4; unchanged |
| Missing tokens | Implemented; focus/elevation resolve in both themes |
| Placeholder nav icons | Destination map applied in the shell; adapters unchanged |
| Six button definitions | Shared primitive with legacy aliases; login/onboarding excluded by scope |
| Inconsistent inputs/dead focus | Shared input aliases; all five tested focus paths show a halo |
| Skeleton layout | Deferred to Batch 2; existing 2.8 s shimmer retained |
| Error copy/button mutation | Deferred to Batch 2; unchanged |
| Mobile tables/nested scrolling | Deferred to later batches; unchanged |

## Verification

- node --check: shared/shell.js, admin/contact-row.js and both QA CJS scripts pass.
- node --test tests/*.test.mjs: **109 passed, 0 failed** (node-tests.log).
- Existing phase5-contacts-browser.cjs: pass, 17 captures, including archive/restore, sorting and expansion (phase5-contacts.log).
- Existing bugfix-browser.cjs: pass, all 17 operator sections, bell races/coalescing/failed writes, integration credentials/retry and mobile (bugfix-browser.log).
- Existing phase2-browser.cjs: attempted headless; blocked at initial navigation with ERR_CONNECTION_REFUSED because its external mock server at 127.0.0.1:8771 is absent. No successful Phase 2 claim.
- primitives-browser.cjs: pass; 20 requested view captures plus 12 menu/dialog captures. Checks computed focus halos, compact/normal input and textarea heights, button timing, nav-pill alignment, theme bridge, actual shell navigation/title, SVGs before/after contact toggle, non-modal menus, centered legacy dialogs, Escape/focus return and reduced motion. Zero page errors or viewport overflow in the five-view matrix.
- Reviewed both contact sheets and full-size dark Overview/Outreach/date menu captures. Fixed a mobile menu content-box overflow found by the browser assertions. Light values remain the brief's approximation, pending founder visual acceptance.

## Screenshots

The root contains overview, outreach, leads, integrations and settings at 1536 and 390, each in dark and light: {view}-{theme}-{width}.png. review-sheet-dark.png and review-sheet-light.png show all 20. account-menu, date-menu and dialog captures cover all four combinations. Existing regression artifacts are redirected into regression/ so historical QA evidence is preserved.

Run from the repository root:

    node output/qa/2026-09-kendo-gap/batch1/primitives-browser.cjs
    node output/qa/2026-09-kendo-gap/batch1/run-regression.cjs phase5-contacts-browser
    node output/qa/2026-09-kendo-gap/batch1/run-regression.cjs bugfix-browser

## Remaining boundaries

No edits to queue, tracker logic, Zernio, notifications.js, landing pages, clients, or other wiki pages. Bell/portal text glyph call sites and dialog/toast removal timing in those excluded renderers remain for their owning batches; shell menus use the new leave animation now. Grain, sidebar footer redesign, dashboard ports, view skeleton/error handling and portal/onboarding stack remain outside Batch 1. Browser tests use mock APIs and do not assert production behavior. Claude deploys after review.

The launcher-owned codex-batch1/run.log is actively written during this session and is excluded from the requested primitive commit. It may remain the only dirty path after commit; the standard backup script may checkpoint it separately.

## Commit blocker

Attempted the requested main commit, `Kendo gap batch 1: primitives`, after all available checks passed. Both git add and git commit were denied because the session cannot create .git/index.lock (filesystem permission denied; escalation unavailable). No commit was created. Claude must stage the listed files and batch1 QA directory, then commit with that exact message from a writable session. The active launcher log should remain outside that commit.

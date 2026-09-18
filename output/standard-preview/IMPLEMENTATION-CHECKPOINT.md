# Portal implementation checkpoint

Updated: 2026-09-18. Read this together with NOTES-AUDIT.md, PHASE2-INVENTORY.md and the newest AGENT_CHAT.md entries when resuming. This is shared project state, not a separate agent memory.

## Current objective

Implement the remaining requirements from both founder portal briefs. The founder explicitly rejected an audit-only outcome and authorizes continuing implementation, testing and deployment. Keep this file updated after milestones and before a session ends. Never count untested code as deployed or provider configuration as functioning integration.

## Deployment state

Current funnels release: `3d0baea8.pulsify-funnels.pages.dev`. Current dashboard source is commit `51c314f` on `pulsify-dashboard/main`; its custom hostname redirects authenticated users to the native apex view. Canonical entry: https://pulsify-ai.com. The apex shows the operator/client gateway; explicit `?client=` prospect pages remain available. Migrations 0023 through 0026 are applied remotely. The Phase 2 sync Worker version is `f5a859fc-fe45-40c1-9ffb-06d2540e1fdc` at https://pulsify-sync.abod-louai.workers.dev with schedules paused by `SYNC_ENABLED=false` until its provider secrets are attached. Protected spine endpoints return 401 anonymously.

## Implementation files

- portal/composition.js: shared canvas story/carousel/thumbnail renderer and PNG export.
- portal/story-templates.js: 27 original editable templates, three treatments for each of nine story types. Original designs, not claimed creator screenshots.
- portal/composition-editor.js: composition preview, position/size/background controls and shared export.
- portal/thumbnail-designer.js: editable compositions, saved structured designs and feed-size preview.
- portal/workspace-shell.js: template gallery/cloning, thumbnail designer routes, post-upload media ordering, first pass at Content/Plans/Team/To-dos interiors.
- admin/native-dashboard.js and admin/dashboard.html: same-origin native dashboard mount. No iframe remains in operator dashboard views.
- shared/surface.css and shared/surface.js: Kendo-derived eight-cell KPI grid, metric ordering/visibility controls, actionable empty states, feature introductions, launch checklist and gating dialog.
- portal/legacy.css and portal/legacy.js: extracted legacy client workspace payload. The portal boot shell now paints before the deferred application bundle.
- functions/api/workspace-preferences.js and migrations/0026_workspace_preferences.sql: tenant-scoped persistent metric/checklist preferences. Migration applied remotely on September 18.
- functions/api/dashboard-generate.js and functions/api/transcript.js: same-origin operator endpoints required by the native dashboard.
- functions/api/media-order.js and migrations/0023_media_order.sql: tenant-scoped persistent order. Migration applied remotely on September 9.
- portal/index.html and workspace-shell.css: scripts and composition layering.

## Exact next work

1. Attach `YT_API_KEY` and `COMPOSIO_API_KEY` to `pulsify-sync`, set `SYNC_ENABLED=true`, manually run `instagram-inbox`, `youtube` and `leads`, verify one real Instagram DM projects into CRM without regressing terminal stages, and retain evidence from three scheduled runs. `COMPOSIO_WEBHOOK_SECRET` is optional until webhooks are enabled.
2. Continue social OAuth, encrypted token storage/refresh and account consent. The provider cards still record delegated access; the Worker/data spine does not replace OAuth onboarding.
3. Implement unified founder account/session and separate SDR dashboard handoff without breaking current admin-key/client auth.
4. Adapt onboarding selections into workspace feature configuration. Existing intake saves client context but does not select modules automatically.
5. Continue bundle-level mobile performance work. Desktop Lighthouse is 100 performance and 96 accessibility in both themes; simulated mobile performance remains below the Phase 1 desktop benchmark because the legacy client application is still a large single bundle.
6. Rebuild remaining account, carousel and operator setup interiors. Preserve the existing array/object formats.
7. Activate and live-test DocuSign after account/HMAC/email configuration. Code, admin status, migration 0024 and tests are built. No actual invitation emails were sent during development. See CONTRACT-ONBOARDING.md.

## Completed verification in this resumed session

- Corrected stale template type metadata and added server/client placeholder review guard.
- New route deep links and nested Team/Plans schema load correctly.
- Designed story cloning/reload and preview/export pixel equality pass.
- Thumbnail save/reload/export and video attachment pass; five-stage client-context AI suggestions are wired.
- Persistent media order validation, missing auth and tenant ownership checks pass against real SQLite.
- Rebuilt Leads forms persist notes/AI summaries and survive reload.
- Contract test covers signed events, account isolation, atomic creation, encrypted pending link, retry, duplicates and existing accounts with mocked delivery.
- Sixteen backend test files and the extended Playwright suite pass.

## Verification and release commands

- `node --test output/standard-preview/tests/*.test.mjs`
- `node output/standard-preview/tests/workspace-browser.cjs` (real local UI, mocked APIs; Chrome/Playwright installed).
- `node output/standard-preview/tests/phase2-browser.cjs` covers 108 operator/client screenshots at 1536 px and 390 px in both themes, loading state, native mounting, no iframe, persisted preferences, feature intro, checklist and hidden-view polling.
- Browser evidence: `output/qa/2026-09-phase2/`.
- Current release passes 33 backend tests and the full Phase 2 browser matrix. Desktop Lighthouse is 100 performance and 96 accessibility in fresh browsers for both themes.
- Apply additive D1 migrations using Wrangler remote execute --command; --file previously failed while the query endpoint worked. Never drop data.
- Deploy from output/standard-preview: `npx wrangler pages deploy . --project-name pulsify-funnels --branch main --commit-dirty=true`.
- Live QA can use existing ignored .wrangler/qa/live-ai.cjs; temporary session must be deleted in finally. Never print auth values.
- Update this checkpoint and audit, log files in AGENT_CHAT.md/wiki/log.md, clear lock, verify status, then run auto-backup.ps1 to brain/main. origin is a different public repo.

## Resume log

- 2026-09-18 native Phase 2 interiors and final release: replaced the operator iframe with a same-origin native dashboard built from the verified D1-backed source; retired direct dashboard embeds; changed CRM refresh from five seconds to 45 seconds and only while the CRM is visible; shipped the Kendo-derived KPI grid, configurable metrics, feature intros, launch checklist, empty states and gating dialog; applied migration 0026 for tenant-scoped preferences; and extracted the legacy portal payload into deferred assets with a layout-matched boot shell. Funnels release `3d0baea8` is live. Dashboard source commit `51c314f` redirects the direct host into `pulsify-ai.com/admin#crm`. Thirty-three backend tests and the 108-view browser matrix pass. Fresh desktop Lighthouse runs score 100 performance and 96 accessibility in both themes. Provider-run acceptance remains pending only because the Worker is paused without `YT_API_KEY` and `COMPOSIO_API_KEY`.

- 2026-09-18 Phase 2 data-spine foundation: inventoried legacy state and chose the migration defaults in `PHASE2-INVENTORY.md`; added migration 0025, scoped spine APIs, operator bootstrap data, the unified scheduled Worker, signed Composio webhook ingestion, normalized Instagram conversation/message storage and CRM projection. The one-time backfill completed remotely with 14 snapshots, 5 stories, 1,335 YouTube leads and 7 metric points. The dashboard now reads D1 snapshots, series and paginated leads through the Phase 1 proxy, and dashboard views mount inside the apex shell. Direct `ops.pulsify-ai.com/crm` navigation returns to the apex CRM view. CRM sync polls every five seconds only while its view is visible. The unchanged Instagram inbox path makes one Composio list call per minute and exits before message reads. The admin-key probe returned 121 CRM rows and produced audited `admin-key-use` event 11. The Worker remains intentionally paused until `YT_API_KEY` and `COMPOSIO_API_KEY` are attached; `COMPOSIO_WEBHOOK_SECRET` is optional until webhooks are enabled. Next acceptance: attach the two secrets, set `SYNC_ENABLED=true`, manually run `instagram-inbox` and `youtube`, verify a real founder Instagram DM projects into the CRM without regressing terminal stages, then collect three scheduled-run and responsive screenshot evidence.

- 2026-09-17 Phase 1 production release: Claude approved the diff. Dashboard changes were rebased over the newest `origin/main` data refresh and pushed as `dc9a34c`; Cloudflare deployed dashboard release `ead70aa1-9847-4e33-ba05-3c3d14942f2e`. Funnels deployed first and the final identity-propagation fix is live as release `0e14ef0d-cc37-433d-bede-7dbbc4de1e7c`. Anonymous pages.dev redirects and `/api/clients` denial pass. Fresh Google sign-in reaches the launcher; `demo-rio` impersonation shows the banner and Exit returns to `/admin`. Twenty-one funnels tests and two dashboard auth tests pass. One release condition remains unexecuted: `tools/crm_sync.py` cannot perform its admin-key write/audit probe because `FUNNELS_ADMIN_KEY` is absent from the available local environments. No production record was modified for that check.

- 2026-09-17 Phase 1 local checkpoint: Access RS256/JWKS middleware, API-only audited automation key, operator bootstrap/launcher, shared shell/themes/date controls, persistent console interiors, client impersonation banner and split login implemented. Client login and existing write protections preserved. CRM sync source restored against the verified existing schema without modifying live rows. Console/dashboard audience vars are configured in source. Dashboard isolated branch `codex/phase1-identity-shell`, worktree `.codex-tmp/phase1-dashboard`; existing external dashboard edits untouched. 20 backend tests, full workspace browser regression, Phase 1 screenshots/state/date checks and dashboard tests pass; both Workers compile. Lighthouse dark 100/100 and light 99/100. See `output/qa/2026-09-phase1/README.md` for scope and remaining acceptance/release checks. No deployment. Claude review attempted but expired OAuth prevented it; founder review-gate decision pending. Do not claim the live pages.dev bypass is closed until deployment and live verification.

- 2026-09-09: resumed after cutoff, ran required fast-forward pull, verified existing source survives in git and retained the active implementation lock. Created this checkpoint before further changes.

- 2026-09-09 milestone: fixed template metadata after switching type, server/client placeholder review guard, deep links and nested Team/Plans data preservation. Added saved-thumbnail selection to video packages and client-context AI suggestions at all five video steps. Added SQLite tests for template review/media order and browser tests for template clone/reload, pixel parity, thumbnail save/reload/PNG export, attachment and AI application. All 15 backend test files and extended browser suite pass. Migration 0023 remote application in progress; no newer deploy confirmed yet.

- 2026-09-09 release milestone: migration 0023 applied remotely; composition/template/thumbnail/media batch deployed as 39836b85. Live checks passed with zero browser errors and protected endpoints returning 401 anonymously; temporary QA session deleted.
- 2026-09-09 next milestone in source: DocuSign raw-body HMAC/account/role/explicit-envelope-marker validation, atomic account provisioning, encrypted pending invitations, delivery retries and duplicate protection, plus admin connection status and CONTRACT-ONBOARDING.md. New SQLite contract test passes; 16 backend test files pass. Migration 0024 NOT applied and this milestone NOT deployed yet. No real emails sent.
- 2026-09-09 UI milestone in source: replaced legacy Leads panel with stage filters, focused edit dialog, persisted conversation summaries using existing AI. Extended browser suite passes, including lead reload and admin contract-status panel. Next: migrate 0024/deploy/verify; continue remaining audit items. Social OAuth/imports, founder unified login, adaptable intake, native font assets, archive metadata and remaining account/carousel/operator interiors remain unfinished.

- 2026-09-09 final release checkpoint: 776a4c37 is live with all changes above, including the 16 verified video metadata records. Migrations 0023/0024 applied. Latest live checks passed, temporary session removed. Remaining work is explicitly listed above; the full founder brief is not complete. Shared lock released and final repo backup follows.

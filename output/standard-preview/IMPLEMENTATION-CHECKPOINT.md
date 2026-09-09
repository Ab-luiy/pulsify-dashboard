# Portal implementation checkpoint

Updated: 2026-09-09. Read this together with NOTES-AUDIT.md and the newest AGENT_CHAT.md entries when resuming. This is shared project state, not a separate agent memory.

## Current objective

Implement the remaining requirements from both founder portal briefs. The founder explicitly rejected an audit-only outcome and authorizes continuing implementation, testing and deployment. Keep this file updated after milestones and before a session ends. Never count untested code as deployed or provider configuration as functioning integration.

## Deployment state

Last verified production release: 34510f3b.pulsify-funnels.pages.dev. Canonical: https://pulsify-funnels.pages.dev. Subsequent composition/template/media changes exist in source and were captured by the repo backup, but have not been deployed.

## Implemented in source since that release

- portal/composition.js: shared canvas story/carousel/thumbnail renderer and PNG export.
- portal/story-templates.js: 27 original editable templates, three treatments for each of nine story types. Original designs, not claimed creator screenshots.
- portal/composition-editor.js: composition preview, position/size/background controls and shared export.
- portal/thumbnail-designer.js: editable compositions, saved structured designs and feed-size preview.
- portal/workspace-shell.js: template gallery/cloning, thumbnail designer routes, post-upload media ordering, first pass at Content/Plans/Team/To-dos interiors.
- functions/api/media-order.js and migrations/0023_media_order.sql: tenant-scoped persistent order. Migration not yet applied remotely.
- portal/index.html and workspace-shell.css: scripts and composition layering.

## Exact next checks and fixes

1. Prevent unresolved template placeholders from being sent for review; fix stale chosen-template metadata after changing type.
2. Correct asynchronous deep-link loading for new workspace and designer routes.
3. Connect saved thumbnail designs to the video packaging wizard, verify save/reload/export and template clone/reload with browser tests.
4. Test media-order authorization, tenant isolation, invalid inputs and persistence. Test preview/export parity and inspect actual screenshots.
5. Add client-context AI video/title/thumbnail suggestions inside the video wizard.
6. Complete remaining Leads, account, carousel and operator setup interiors without dropping existing data/actions.
7. Implement founder account/session path, DocuSign verified/idempotent provisioning and adaptable onboarding.
8. Implement social OAuth, encrypted token storage, refresh/imports and signed/idempotent DM webhooks. Real activation still requires provider app configuration and account consent.
9. Catalogue original YouTube title/creator metadata only when verifiable; exact licensed Instagram fonts and absent creator screenshots must not be fabricated.

## Verification and release commands

- `node --test output/standard-preview/tests/*.test.mjs`
- `node output/standard-preview/tests/workspace-browser.cjs` (real local UI, mocked APIs; Chrome/Playwright installed).
- Browser screenshots: output/standard-preview/.wrangler/qa (ignored).
- Previous release passed 15 backend test files, browser suite and actual hosted AI generation. New features need additional tests; existing browser suite passed on the interrupted source but did not exercise the new features.
- Apply additive D1 migrations using Wrangler remote execute --command; --file previously failed while the query endpoint worked. Never drop data.
- Deploy from output/standard-preview: `npx wrangler pages deploy . --project-name pulsify-funnels --branch main --commit-dirty=true`.
- Live QA can use existing ignored .wrangler/qa/live-ai.cjs; temporary session must be deleted in finally. Never print auth values.
- Update this checkpoint and audit, log files in AGENT_CHAT.md/wiki/log.md, clear lock, verify status, then run auto-backup.ps1 to brain/main. origin is a different public repo.

## Resume log

- 2026-09-09: resumed after cutoff, ran required fast-forward pull, verified existing source survives in git and retained the active implementation lock. Created this checkpoint before further changes.

- 2026-09-09 milestone: fixed template metadata after switching type, server/client placeholder review guard, deep links and nested Team/Plans data preservation. Added saved-thumbnail selection to video packages and client-context AI suggestions at all five video steps. Added SQLite tests for template review/media order and browser tests for template clone/reload, pixel parity, thumbnail save/reload/PNG export, attachment and AI application. All 15 backend test files and extended browser suite pass. Migration 0023 remote application in progress; no newer deploy confirmed yet.

- 2026-09-09 release milestone: migration 0023 applied remotely; composition/template/thumbnail/media batch deployed as 39836b85. Live checks passed with zero browser errors and protected endpoints returning 401 anonymously; temporary QA session deleted.
- 2026-09-09 next milestone in source: DocuSign raw-body HMAC/account/role/explicit-envelope-marker validation, atomic account provisioning, encrypted pending invitations, delivery retries and duplicate protection, plus admin connection status and CONTRACT-ONBOARDING.md. New SQLite contract test passes; 16 backend test files pass. Migration 0024 NOT applied and this milestone NOT deployed yet. No real emails sent.
- 2026-09-09 UI milestone in source: replaced legacy Leads panel with stage filters, focused edit dialog, persisted conversation summaries using existing AI. Extended browser suite passes, including lead reload and admin contract-status panel. Next: migrate 0024/deploy/verify; continue remaining audit items. Social OAuth/imports, founder unified login, adaptable intake, native font assets, archive metadata and remaining account/carousel/operator interiors remain unfinished.

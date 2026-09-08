# Portal journeys — September 7, 2026

> September 8 update: the current shell, integrated AI, focused workflows and verification are documented in [WORKSPACE-REDESIGN.md](WORKSPACE-REDESIGN.md). Older manual-only AI and future-dashboard notes below describe the previous release.

## Implemented

- Instagram task entry, established sequence-type menu, layout starters and attributed reference galleries. Full 18-panel founder-captured Niksetting example plus proof/lesson excerpts. Creator examples are reference material, never Pulsify results.
- YouTube task entry, three long-form formats, title patterns, thumbnail directions, hooks and outlines. Video packages save to tenant-scoped D1 records. Supplied thumbnail images and URL-added real video packaging are separate from layout templates. Published titles for the supplied archive images are unknown and not invented.
- Copywriter briefs and finished writing, with client-context download and a copyable prompt for the user's own AI.
- Manual leads/DM register, follow-up dates, current-stage board and conversation notes. DM summary flow prepares a prompt from pasted conversation text; it does not read the Instagram inbox or claim a summary was generated.
- All-time saved-record totals and links to measured retention and recorded payments. Lead-stage counts are current states, not historical conversions.
- Dedicated access/connections page, including visible status refresh every 60 seconds while open. Provider-side webhooks still determine whether new events exist.
- Multi-image selection/drop, previews, pre-upload ordering/removal, progress per file and retry without re-uploading successful files. Existing tenant-scoped R2 validation remains in use. Uploads remain stored in the existing proof/media table; claims and permissions retain their existing behavior.
- Story editor background selection, four Instagram-inspired system-font families, freehand lines, line undo and PNG composition export. Copy, photo choice, font and strokes save inside the existing draft payload. Export uses system fonts and a simplified composition; it is not a native Instagram renderer. Stickers and native Instagram fonts are applied in Instagram.
- Centered login redesign and an invitation-based registration route. New password-setup links use `/portal/register`. Initial account setup redirects to onboarding; password resets return to the portal.
- Founder `/admin#launch` destination screen for dashboard, client portals and manual client creation. Existing authenticated operator access is preserved. The separate outreach dashboard remains on its own host; this is not cross-domain SSO.

## Deployment

Apply additive migration `0021_workspace_records.sql` to `pulsify-portal`, then deploy `output/standard-preview` to the existing `pulsify-funnels` Pages project on branch `main`. No provider credentials or customer notifications are part of deployment. Reference assets are guarded by the existing portal session resolver and served with no-store headers.

## Verification

Existing backend regression suite and a new real-SQLite record suite cover tenant isolation, authentication, stale update rejection, size validation and persistence. The local Playwright suite covers navigation, 18-panel reference browsing, selected story type, video/lead form writes, relocated access form, editor font and drawing controls, 390px root overflow, login, founder launch and add-client wizard. Browser API writes are mocked; database behavior is tested independently. Screenshots are under ignored `.wrangler/qa/`.

## Not connected by this release

- Instagram inbox/analytics import and YouTube analytics import require real account authorization and provider implementation. The recovered Composio audit tool is operator-side and has not been exposed as a multi-client inbox connector.
- Hosted AI remains off under the existing founder decision. The editor supplies manual guidance, brief preparation and paste-back; there is no live AI chat service.
- DocuSign contract-triggered provisioning is future work, as requested. The current add-client and invitation flow works manually. Next implementation: signature-verified and idempotent completed-contract webhook, approved contract-to-client mapping, account provisioning, invitation delivery, onboarding intake and operator notification. Provider setup and verified email delivery are required before enabling it.
- Reel thought capture remains the existing session-only tool. Persistent finished reel scripts can be saved in Copywriter.
- No social publishing, DM sends, real email sends or contract actions run from these new controls.

## Files

`admin.html`, `admin/console.js`, `portal/index.html`, `portal/login/index.html`, `portal/login/auth.css`, `portal/studio-app.js`, `portal/journeys.js`, `portal/journeys.css`, `portal/media-workspace.js`, `portal/references/*`, `functions/portal/[[path]].js`, `functions/_shared/client-auth.js`, `functions/api/client-set-password.js`, `functions/api/workspace-records.js`, `migrations/0021_workspace_records.sql`, `tests/workspace-records.test.mjs`, `tests/journeys-browser.cjs`, and this report. Shared coordination is in `AGENT_CHAT.md` and `wiki/log.md`.

## Published version
Published September 7 to https://pulsify-funnels.pages.dev, deployment https://567313b5.pulsify-funnels.pages.dev. The D1 file-import endpoint rejected authentication; the same additive schema was applied successfully through the standard D1 query endpoint. All 14 backend test files passed. Local browser checks additionally verified the operator launch screen and add-client wizard. The changed-file list also includes tests/portal-readiness.test.mjs, READINESS.md and STUDIO-RENOVATION.md.

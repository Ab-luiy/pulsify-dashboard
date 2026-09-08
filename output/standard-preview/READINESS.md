# Client portal readiness, September 7, 2026

> September 8 update: the current shell, integrated AI, focused workflows and verification are documented in [WORKSPACE-REDESIGN.md](WORKSPACE-REDESIGN.md). Older manual-only AI and future-dashboard notes below describe the previous release.

The deployed core portal is usable for operator-assisted client onboarding. This is not certification that every third-party automation in the July roadmap has been built or connected.

## Entry points

- Client login: https://pulsify-funnels.pages.dev/portal/login
- Operator console: https://pulsify-funnels.pages.dev/admin
- Verified deployment: https://d4d510b3.pulsify-funnels.pages.dev
- Founder test account: abod.louai@gmail.com, attached to the existing `demo-rio` workspace. The password was set as requested directly in production using a salted PBKDF2 hash. It is not stored in source or this report.
- The demo is visibly labelled as a founder test workspace; its historical sample revenue and tasks are not client results. QA story/carousel drafts and a one-pixel QA proof image remain only in that demo.

## Fixes shipped

- Password login clears stale private-link state. Password setup links remain accessible while already signed in. Password resets revoke earlier sessions.
- Private links now also establish a secure session, so refreshing after removing the URL token does not lose access.
- Private portal pages use no-store, no-referrer and noindex headers. Mobile login places the form first and explains password recovery.
- Proof uploads now use `image-link`, which the actual production SQLite CHECK constraint accepts. The old mock test incorrectly accepted `image`.
- Integration states load for password sessions. Clients can save their own allowed connection settings; secret fields are write-only, and delegated access is explicit.
- Connection labels distinguish configured credentials from received events. YouTube and Instagram access confirmation does not claim automatic analytics import.
- Clients can download their own AI context package, open onboarding from Settings, and return to the dashboard after submitting intake.
- Setup-email configuration is checked before rotating setup links. If delivery fails, the operator still gets a usable link to share directly.
- Deployment excludes test sources, Markdown notes and local Wrangler configuration.

## Verification

- Thirteen automated test files passed, including a new real SQLite test for initial password setup, one-time links, reset/session revocation, client isolation, proof uploads against the actual migration, setup-email failure, private-link refresh and context export isolation.
- Production login, dashboard, brain, integrations, sequence/weekly metrics, variants, both studio histories, pulse, context export, portal and onboarding returned successful responses.
- Production cross-client dashboard/context requests returned 403. A logged-out session returned 401.
- Production to-do changes survived re-fetch and were restored. Connection configuration survived re-fetch without falsely granting delegated access. Story and carousel prompt drafts persisted. A proof image uploaded to R2, saved in D1 and loaded successfully.
- Browser login and all ten navigation panels passed on the permanent production domain. Founder also confirmed Revenue opened. No browser script errors were observed. Mobile Home and Revenue had no root horizontal overflow at 390px; this was not an exhaustive device matrix.
- A temporary Chrome DNS/control-session problem affected the deployment-alias checks; the permanent domain and controls subsequently worked and were rechecked.

## Requirements for each new client

Create the client in the operator console, generate a password setup link for their own email, and share that link directly. Have them complete onboarding. Populate their plan, to-dos, team and starting data before presenting the workspace as ready. Connect only the actual services used by that client, configure provider-side webhooks, and test a real provider event before promising automated reporting. Keep each client on a separate account.

## Still not automatic

- Production currently exposes only ADMIN_KEY as a Pages secret. Automatic setup emails need Resend and a verified sending address. The copy-and-share setup link works without email delivery.
- Studio works through manual prompts and stored drafts. Hosted AI generation needs an AI provider key; it was not represented as enabled.
- YouTube/Instagram metrics are logged manually; access confirmation is not OAuth or an automatic importer.
- Payment/booking/email automations require each client's real accounts and webhooks. Real external delivery was not tested or triggered in this readiness pass.
- Plans, team and to-dos are maintained by the operator. Reel thought capture remains session-local as labelled. The legacy `/client` page is not the full `/portal` workspace.

## Useful next additions

A personal welcome video, a client-specific first-week checklist with a visible first milestone, and a weekly before/after progress recap would make the workspace feel prepared for that client. The AI context download is already available; populate it with their actual offer, audience, voice and proof before their first working session.

## Portal renovation, September 7 (later release)
The guided channel workspaces, new login and invitation registration, operator destination screen, media batch queue, story photo/drawing tools, saved YouTube packages, copywriter and manual lead register are now described in PORTAL-JOURNEYS.md. That report supersedes the earlier navigation and Studio scope notes above. Existing provider limitations still apply.

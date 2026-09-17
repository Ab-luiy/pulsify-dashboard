---
name: project_phase0_accounts_done
description: Command Center Phase 0 accounts fully set up 2026-09-17; where every ID lives; secrets never in chat; founder writes the Phase 1 brief with Fable
metadata:
  type: project
---

On 2026-09-17 the founder and I completed the whole Phase 0 account list for the Pulsify Command Center: pulsify-ai.com live on the funnels Pages project, Cloudflare Access gating /admin (Google + OTP login, team `pulsify-ai`), Meta app 1617160843090125 under the clean "abdul" portfolio (verification skipped, Instagram Testers instead), Google Cloud project pulsify-dashboard-496614 with two OAuth clients in Testing mode, Resend verified with hello@pulsify-ai.com, DocuSign sandbox Connect config live, Fathom API key. Eight secrets on pulsify-funnels, names only recorded.

**Why:** these were the founder-only blockers before Codex Phase 1 (identity + shell). Workers stays on Free by founder decision (cron + D1, not Queues).

**How to apply:** every ID, AUD tag, and the secrets inventory are in `wiki/playbooks/account-registry.md`; read it before touching any integration. Secrets routine that worked: I fill the Cloudflare Variables dialog name, he pastes the value, I verify length/prefix via JS without reading it, then save. The founder writes the Phase 1 Codex brief himself with Fable; do not draft it unprompted. Open items: pages.dev/admin still bypasses Access until middleware validates the JWT; Pulsify Portal OAuth client needs its redirect URI from Codex; DocuSign is sandbox only. See [[project_domain_purchase_pending]], [[user_founder_emails]].

**Claude verification 2026-09-17 (probes):** apex landing 200; /admin on pulsify-ai.com and www 302 to Access with matching AUD; Access certs live; Resend DNS resolving. Still open: pulsify-funnels.pages.dev/admin returns 200 anonymously, pulsify-dashboard.pages.dev is public. Secret names not verifiable here (no CLOUDFLARE_API_TOKEN). Phase 1 brief: wiki/synthesis/phase1-identity-shell-codex-brief.md. Founder still owes: ops.pulsify-ai.com custom domain on the dashboard project, an Access app for it, and one Test run of the Google IdP.

**Phase 1 RELEASED 2026-09-17 (Claude-verified live):** funnels deploy 0e14ef0d, dashboard main dc9a34c deploy ead70aa1. pages.dev/admin -> 302 pulsify-ai.com; pulsify-dashboard.pages.dev -> 302 ops.pulsify-ai.com (Access, AUD e2b3...); anonymous /api/clients 401; legacy /integrations redirects into /admin?view=. Operator login is Google via Cloudflare Access; admin key is API-only, audited. Shell, launcher, impersonation banner, split login live. Only unexecuted check: crm_sync.py admin-key probe (needs FUNNELS_ADMIN_KEY in a local .env). Follow-ups for Phase 2: dead theme CSS in dashboard index.html, localhost dev bypass for dashboard middleware, dashboard views inside the shell after D1 migration.

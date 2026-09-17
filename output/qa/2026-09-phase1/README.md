# Phase 1 local verification

Status: released to production on 2026-09-17 after Claude's approval. The funnels deployment is `0e14ef0d-cc37-433d-bede-7dbbc4de1e7c`; the dashboard deployment is `ead70aa1-9847-4e33-ba05-3c3d14942f2e` at commit `dc9a34c`.

## Evidence

- 21 backend tests pass (`node --test output/standard-preview/tests/*.test.mjs`). Includes JWT signature/audience/issuer/expiry rejection, Pages request-clone identity propagation, API-key audit, existing tenant/write protections, CRM conflict handling and inclusive date ranges with currencies kept separate.
- Full existing workspace browser regression passes: editors, saves/reloads, exports, AI failure handling, repeated dialogs and four responsive widths. APIs are mocked; no client records changed.
- Phase 1 browser checks pass: 12 screenshots at 1536/390, dark/light, operator/client/login; impersonation banner; client-scoped switcher; date filtering; operator iframe document and draft preservation; sidebar/theme persistence.
- Dashboard's 12 views, deep links, settings and embedded view pass. Two dashboard auth tests pass, including direct generation/transcript denial.
- Both Pages Workers compile successfully with Wrangler.
- Final Lighthouse: dark performance 100, accessibility 100; light performance 99, accessibility 100. Reports use the local launcher and mocked data, not production latency.

## Review boundaries

Dashboard code is on branch `codex/phase1-identity-shell` in `.codex-tmp/phase1-dashboard` and was rebased over the current data refresh before fast-forwarding `origin/main` to `dc9a34c`. The pre-existing external dashboard checkout was not edited. No database migration, email send or customer-data edit occurred.

Date selection filters dated payments and sequence rows, operator collected revenue, and dashboard dated metric series/transactions. Existing explicitly labeled weekly/monthly/all-time snapshots retain their source periods. Undated dashboard trends report that no dated series is connected. This does not manufacture historical data or convert snapshot-only feeds into history.

The dashboard uses the shared shell on its own Access-protected host. Cross-host launcher links open a new tab; native console interiors are persistent same-origin frames to preserve their existing forms and state. Existing interior components remain largely intact as directed by the Phase 1 brief. Broader Kendo requirements such as replacing every legacy loading message and transition remain a review item; do not describe the whole Kendo port as complete.

## Production verification

- `pulsify-funnels.pages.dev/admin` returns 302 to `pulsify-ai.com/admin`.
- `pulsify-dashboard.pages.dev/` returns 302 to `ops.pulsify-ai.com/`.
- Anonymous `pulsify-ai.com/api/clients` returns 401.
- A fresh Google sign-in with the configured operator account reaches the launcher.
- Impersonating `demo-rio` shows the persistent banner; Exit returns to `/admin`.
- Both custom operator hosts redirect anonymous sessions to Cloudflare Access. Client login and the Frank landing page continue returning 200.
- The final CRM automation-key write/audit check is pending because `FUNNELS_ADMIN_KEY` is not present in the available local environments. No key was exposed or rotated to work around this.

Raw anonymous HTTP evidence is saved in `live-http.json`.

# Phase 1 local verification

Status: implementation saved locally; not deployed. Production is still the previous release. Claude's required diff review could not run because the CLI OAuth session expired. Founder decision on restoring login or waiving that review is pending.

## Evidence

- 20 backend tests pass (`node --test output/standard-preview/tests/*.test.mjs`). Includes JWT signature/audience/issuer/expiry rejection, API-key audit, existing tenant/write protections, CRM conflict handling and inclusive date ranges with currencies kept separate.
- Full existing workspace browser regression passes: editors, saves/reloads, exports, AI failure handling, repeated dialogs and four responsive widths. APIs are mocked; no client records changed.
- Phase 1 browser checks pass: 12 screenshots at 1536/390, dark/light, operator/client/login; impersonation banner; client-scoped switcher; date filtering; operator iframe document and draft preservation; sidebar/theme persistence.
- Dashboard's 12 views, deep links, settings and embedded view pass. Two dashboard auth tests pass, including direct generation/transcript denial.
- Both Pages Workers compile successfully with Wrangler.
- Final Lighthouse: dark performance 100, accessibility 100; light performance 99, accessibility 100. Reports use the local launcher and mocked data, not production latency.

## Review boundaries

Dashboard code is on local branch `codex/phase1-identity-shell` in `.codex-tmp/phase1-dashboard`, based on `origin/main` at `0cb8104`. The pre-existing external dashboard checkout was not edited. No public main push, Cloudflare deployment, database migration, email send or customer-data edit occurred.

Date selection filters dated payments and sequence rows, operator collected revenue, and dashboard dated metric series/transactions. Existing explicitly labeled weekly/monthly/all-time snapshots retain their source periods. Undated dashboard trends report that no dated series is connected. This does not manufacture historical data or convert snapshot-only feeds into history.

The dashboard uses the shared shell on its own Access-protected host. Cross-host launcher links open a new tab; native console interiors are persistent same-origin frames to preserve their existing forms and state. Existing interior components remain largely intact as directed by the Phase 1 brief. Broader Kendo requirements such as replacing every legacy loading message and transition remain a review item; do not describe the whole Kendo port as complete.

## Release still required

1. Obtain Claude's diff review after restoring its login, or an explicit founder waiver.
2. Review any findings, fetch current `origin/main`, and integrate the isolated dashboard branch without overwriting automated data updates.
3. Deploy the funnels source and dashboard, then verify anonymous redirects and authenticated Google/impersonation flows on the live hosts.
4. Record deployment IDs and live verification. Current screenshots and tests alone do not prove production enforcement.

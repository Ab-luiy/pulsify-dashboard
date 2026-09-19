# Phase 4 Codex review

Date: 2026-09-19

Scope: independent read-only review of the Phase 4 onboarding implementation in commit `24c69e0`, followed by corrections, regression tests, migration 0028, deployment, and disposable production checks.

## Findings and corrections

1. **DocuSign completion could invalidate the link sent to the client.** The contract handler created one setup link, then unified provisioning created a second token before the legacy delivery path emailed the first. Provisioning now claims the client atomically, accepts the contract link as the canonical link, resumes safely after partial failure, and sends one welcome email. The contract is marked delivered only after the welcome reaches `sent`.
2. **Existing active clients could be provisioned again on their next payment.** Payment onboarding now runs only for Pulsify prospects. Payments for active clients still create revenue and buyer-touch records without rotating portal credentials or resending the welcome.
3. **Payment events did not carry buyer identity into the pipeline.** Stripe, Whop, Push API, and scheduled payment ingestion now pass normalized customer name and email into payment processing and record a pipeline touch.
4. **An Instagram handle was treated as a verified integration.** Saving the handle now keeps Instagram pending until tester acceptance or sync confirmation. YouTube follows the brief and completes from a saved handle.
5. **Onboarding could navigate before async saves completed.** Integration and transcript steps now block forward navigation until their API calls succeed and show the error inline when they fail.
6. **The 25 MB voice limit could exhaust a 128 MB Worker while converting the upload into a number array.** Voice notes are capped at 6 MiB, empty files are rejected, the browser records at 64 kbps, and an uploaded R2 object is removed if the database insert fails. Impersonated sessions cannot write transcript-derived brain entries.
7. **Welcome delivery could occupy a request indefinitely.** Each Resend attempt now has a 10-second abort deadline and a stable idempotency key. The three-attempt recovery behavior remains intact.

## Reviewed and retained

- The checklist GET performs eight small, client-scoped indexed or primary-key queries. At current scale this is clearer and cheaper to operate than adding a cache invalidation system.
- Welcome retries remain in the request because onboarding does not yet have a queue binding. The bounded attempts fit the DocuSign request budget and persist enough state to resume safely.

## Verification

- Backend suite: 36/36 passing.
- Contract provisioning regression: same setup link across retries, one delivered invitation, one sent welcome, eight checklist rows, and idempotent replay.
- Phase 4 regressions: Instagram confirmation semantics, YouTube completion, active-client payment isolation, buyer touches, and 6 MiB audio rejection.
- Browser checks: workspace, Phase 1, and Phase 2 suites passing; Phase 2 produced 108 screenshots.
- Pages Functions build: passing with Wrangler.
- Syntax, whitespace, and secret scans: passing.

## Production release

Deployment identifiers, migration evidence, disposable checks, and cleanup results are appended after release.

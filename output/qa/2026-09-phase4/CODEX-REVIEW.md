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
8. **Client deletion left Phase 4 data and voice objects behind.** The delete path now removes provisioning, checklist, pipeline-touch and voice-note rows, and deletes each voice-note R2 object before removing its database record.

## Reviewed and retained

- The checklist GET performs eight small, client-scoped indexed or primary-key queries. At current scale this is clearer and cheaper to operate than adding a cache invalidation system.
- Welcome retries remain in the request because onboarding does not yet have a queue binding. The bounded attempts fit the DocuSign request budget and persist enough state to resume safely.

## Verification

- Backend suite: all 29 test files passing, including the Phase 4 and client-deletion regressions.
- Contract provisioning regression: same setup link across retries, one delivered invitation, one sent welcome, eight checklist rows, and idempotent replay.
- Phase 4 regressions: Instagram confirmation semantics, YouTube completion, active-client payment isolation, buyer touches, and 6 MiB audio rejection.
- Browser checks: workspace, Phase 1, and Phase 2 suites passing; Phase 2 produced 108 screenshots.
- Pages Functions build: passing with Wrangler.
- Syntax, whitespace, and secret scans: passing.

## Production release

Migration 0028 was applied to remote D1 as six independent additive statements. Verification found all four tables and both indexes. Final Funnels deployment: `2735fd6f.pulsify-funnels.pages.dev`.

Disposable production acceptance on `pulsify-ai.com`:

- Operator provisioning returned 201, sent the welcome once on attempt one, and returned `duplicate: true` on replay.
- The new client began at 0/8 checklist steps.
- A 184,996-byte spoken WAV returned a 60-character transcript from Workers AI. Applying it wrote the offer and ICP brain rows and advanced the checklist to 2/8.
- The live deletion route removed the config, auth, setup token, provisioning record, eight checklist rows, three brain rows, one voice row, and one R2 voice object.
- A direct D1 query returned zero matching client, auth, provisioning, checklist, voice-note, and brain rows after cleanup.
- Anonymous requests to the onboarding surface and protected Phase 4 APIs return 401.

The release sent one welcome message to a founder-owned Gmail alias as prescribed by the acceptance plan. The only outstanding items are older provider acceptance checks: the current natural `instagram` run fails because Composio returns 404 for `INSTAGRAM_GET_IG_USER_MEDIA`, `leads` has not produced a run yet, a fresh founder DM still needs a two-minute projection check, and Stripe test-mode charge/refund acceptance still needs a connected restricted client key.

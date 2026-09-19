# Phase 5 review and execution checkpoint

Status: first release batch complete; full Phase 5 review and design acceptance are not complete.

## Released fixes

Pages production deployment: 6f3fb7aa.pulsify-funnels.pages.dev, serving pulsify-ai.com.

- Onboarding GETs allow authenticated impersonation for preview; existing mutation guards still reject impersonated writes.
- Anonymous onboarding GETs redirect to the login page with a return destination. Invalid private-link tokens are stripped from that destination. Other auth failures retain their original status.
- Successful password/setup login honors same-origin onboarding or portal return destinations. External destinations and login loops are rejected.
- Unknown client slugs return the branded 404. A top-level 404.html also stops Pages SPA fallback on unknown nested paths. Database outages return 503 rather than a false-success gateway.
- Login browser regression updated for Claude's email-first design; old assertions targeted the retired single-step form.

## Evidence

Full backend suite: 83/83 passing. Focused login browser suite: desktop 1536 and mobile 390, client/operator routing, same-origin onboarding return and external redirect rejection pass. Screenshots under login/.

Production read-only probes after deployment:

| Path | Status | Result |
| --- | --- | --- |
| /onboard | 302 | /portal/login?next=%2Fonboard |
| /nope-phase5-check | 404 | HTML not-found response |
| /missing-phase5/nested | 404 | HTML not-found response |
| /frank-wieler | 200 | existing live client page |
| /portal/login | 200 | login |
| / | 200 | gateway |

Impersonated onboarding preview and continued write rejection are verified by the local auth regression, not claimed as a live impersonation check.

## Review observations requiring the next pass

These are source observations, not completed remediations:

- functions/_shared/search.js indexPending writes search_index_state for every selected document even when its embedding is missing and no vector was upserted. Failed embeddings can become permanently skipped.
- workers/sync/src/jobs/zernio-inbox.js records a webhook event before processing it; retries following processing failure return duplicate. The sweep also catches non-429 message-fetch errors as an empty list and advances updated_time, which can skip missed messages.
- functions/_shared/archive.js proceeds without an R2 binding, leaves private-link token hashes in place, and restore always sets prospect/page_active=1. Review preservation, access revocation, and prior-state restoration before exposing archive controls.
- functions/_shared/realtime.js accepts arbitrary payload fields despite the public-channel contract; add a payload boundary rather than relying solely on current callers. Client notifications currently call only pushOperator for operator rows, so client rows receive no push.
- Bell request coalescing, shared outreach rows/skeletons, last-interaction sorting, remaining audit fixes and the full second-reader review remain outstanding.

The founder was asked once to resolve bell-only vs Discord vs email. No outside-channel change or relay deletion was made pending the answer.

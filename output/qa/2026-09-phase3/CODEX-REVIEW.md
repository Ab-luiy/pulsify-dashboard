# Phase 3 independent review

Reviewed 2026-09-18 against `wiki/synthesis/phase3-revenue-automation-codex-brief.md`.

Status: local fixes complete, deployment held by founder direction. No production writes, cleanup, or deployment occurred during this review.

## Material defects found and fixed locally

1. Stripe could count one card payment twice because `charge.succeeded` used the Charge id while `payment_intent.succeeded` used the PaymentIntent id. Both now use the PaymentIntent when present.
2. Refund replay was unsafe. `charge.refunded` carries a cumulative amount while `refund.created` carries an incremental amount; both were added. Refund events are now deduplicated, cumulative totals are applied absolutely, incremental refunds are applied once, and failed out-of-order refunds remain retryable.
3. Whop webhook amounts were treated as cents even though the current API expresses `total`, `amount`, and `refunded_amount` in major currency units. Normalization now converts those fields to cents and reads the nested `payment.id` on refunds.
4. Whop webhooks had no signature verification. The connector now accepts a signing secret and verifies the documented `webhook-id`, `webhook-timestamp`, and `webhook-signature` contract.
5. The Worker never imported Stripe or Whop data. Its 30-minute job only rematched rows already in D1. It now imports succeeded charges and completed refunds from both providers, uses bounded cursor pagination, overlaps the last successful window safely, writes through the existing normalized payment path, emits events, matches leads, and records sync failures.
6. The Stripe connector did not accept the restricted read-only key required by the brief. The provider registry and connection dialog now accept it.
7. Push API body size validation counted JavaScript characters rather than UTF-8 bytes. The 1 MB limit now measures bytes.
8. Duplicate Push metrics returned 201 and `duplicate:false` even though D1 ignored the row. They now return the existing metric id with HTTP 200 and `duplicate:true`.
9. Push messages only entered `ingest_records`; they never reached `ig_conversations`, `ig_messages`, or the CRM. Operator-scoped Instagram messages now project immediately into all three while preserving terminal CRM stages.
10. Push messages without an external id were not idempotent because SQLite permits multiple NULL values in a unique key. A deterministic fallback external id is now generated.
11. Client revenue exposed every payment and ignored refunds. It now returns confirmed matches only, calculates net cash after refunds, and exposes average deal size.
12. Client-facing Phase 3 APIs were blocked by middleware even though their handlers implemented tenant-scoped access. Integrations, API keys, webhooks, and payment matches now reach their own client authorization checks.
13. The operator Integrations screen defaulted to operator scope while showing client-only Stripe, Whop, Cal.com, and Calendly buttons, so those buttons always failed. It now has a client workspace selector and disables invalid-scope actions.
14. The client portal still rendered the old connection cards. It now mounts the Phase 3 Integrations view in client scope, with impersonated sessions read-only.
15. Payment matching lived only below Integrations and had no manual candidate search. The operator Payments navigation now opens the matching view, and unlinked rows have searchable manual attachment.
16. Candidate scoring omitted the brief's amount proximity. Booking/application candidates can now contribute exact or near amount evidence when the event supplies an amount.
17. Several advertised outbound events had no producer. CRM lead creation and stage changes, Instagram messages, client provisioning, checklist completion, approved content sequences, and Worker failures now enqueue their documented events.
18. Task 3.0's unmatched Instagram inbox was absent. The CRM now reads a scoped conversations endpoint and shows conversations that have not projected into `crm_added`.

## Verification

- `node --test tests/*.test.mjs`: 34/34 pass.
- Focused Phase 3 suite covers Push lead/message/metric/payment writes, idempotency, Stripe event-family canonicalization, cumulative refunds, Whop units and refund references, signed outbound delivery with retries, tenant isolation, confirmed-only client KPIs, manual match APIs, and scheduled Stripe/Whop import overlap.
- `npx wrangler pages functions build --outdir=.codex-pages-build`: compiled successfully; generated bundle removed.
- `npx wrangler deploy --dry-run` in `workers/sync`: compiled successfully, 81.98 KiB upload / 21.82 KiB gzip.
- `git diff --check`: clean.

## Still blocked by the deployment hold

- No local fix in this review has been deployed.
- No webhook.site endpoint was created, no production test event was sent, and no forced-failure retry was triggered.
- No live Stripe or Whop test charge/refund was created.
- No production Push message/metric/payment was sent.
- No production cleanup was performed for the release-check API key or lead.
- Task 3.0 still needs production evidence: three consecutive clean `sync_runs` per required job and one real Instagram DM appearing in CRM within two minutes.

The next action is a second review of this local diff, followed by a controlled funnels-first and Worker-second deployment only after the founder lifts the hold. Live checks should then use disposable records and clean them up.

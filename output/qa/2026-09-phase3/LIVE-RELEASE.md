# Phase 3 production release evidence

Released 2026-09-19 after founder approval and Claude's second-reader sign-off.

## Deployment

- Funnels deployment: `0fec35eb.pulsify-funnels.pages.dev`.
- Final Worker version: `ea7c184a-0460-4a2d-8d2e-6f49f574f907`.
- Migration 0027 was already complete in production. All eight Phase 3 tables/indexes and the four added `payments` columns were verified. The four non-idempotent `ALTER TABLE` statements were not replayed.
- `INTEGRATION_ENCRYPTION_KEY` was already present on `pulsify-sync`. The 2026-09-18 release audit records that Pages and Worker were rotated to the same value in one script. No key was rotated in this release.
- The approved pre-release suite passed 34/34. The post-fix suite passes 35/35 after adding the historical-replay regression. The final Worker dry-run bundles successfully.

## Live checks that passed

- Anonymous `POST /api/v1/ingest` returned `401` with `invalid or missing API key` on the apex and immutable deployment URL.
- A disposable operator Push key created a lead with `201`, a repeat returned `duplicate:true`, the row projected into `crm_added`, revocation made the next request return `401`, and all synthetic key, usage, ingest and CRM rows were removed.
- A disposable `webhook.site` endpoint was created through the production API. Event `evt_j8hbnuQkFMg0bJxJ` delivered as `whd_rXlgquPyeC7qrQ` on attempt 1 with HTTP 200. The captured raw body matched the `X-Pulsify-Signature` HMAC.
- The same endpoint was switched to its forced-500 path. Event `evt_DaTqh9i0sXJerSfC` finished at attempt 3 with status `failed`, HTTP 500 and no next attempt. The endpoint, deliveries, outbox rows and request bin were deleted.
- `/portal/login` returned 200 with the Pulsify lockup. A temporary password verifier exercised the real `demo-rio` login endpoint and authenticated Rio Vance portal; the original password hash, salt, iteration count and timestamp were restored, and the temporary session was deleted. Production shows zero release-created demo sessions.
- Cleanup verification returned zero release keys, zero synthetic leads and zero release webhook endpoints.

## Live defect found and fixed

The every-minute Instagram inbox job had 790 historical rows stuck in `running` and 43 terminal subrequest-limit errors. With no saved watermark, every invocation replayed all conversations, wrote messages individually and emitted historical events until Cloudflare stopped the Worker.

The final Worker compares the provider's conversation `updated_time` against the same value saved in each durable conversation row, batches message inserts, caps catch-up work, suppresses historical webhook floods and times out Composio calls after 20 seconds. The repaired job completed a 50-message catch-up in 11 seconds, saved the owner and watermark, then completed cleanly on later one-minute schedules.

## Task 3.0 evidence

The three newest rows for each job that has run are successful:

| Job | Three newest successful starts, UTC | Items |
|---|---|---|
| `instagram-inbox` | 01:54:18, 01:53:18, 01:52:19 | 0, 0, 0 |
| `webhook-outbox` | 01:54:18, 01:53:18, 01:52:19 | 0, 0, 0 |
| `payment-rematch` | 01:30:03, 01:00:03, 00:30:03 | 0, 0, 0 |
| `youtube` | 00:15:03, 2026-09-18 18:15:03, 2026-09-18 12:15:03 | 3, 3, 3 |

The inbox now contains 50 conversations and 417 messages. In the last hour it created 2 conversations, updated all 50 durable conversation rows during catch-up, and inserted 50 messages.

## External acceptance still required

- `instagram` and `leads` do not yet have `sync_runs` rows because their daily and weekly schedules have not fired since activation. They need three authenticated manual runs each, or three natural schedule windows.
- The newest real Instagram message predates this repair. The founder must send one real DM so its message timestamp and CRM projection can be compared within the required two-minute window.
- No Stripe or Whop client integration exists in the production `integrations` table, no Stripe CLI or test key is available in this environment, and creating a fake provider record would not test the real path. Connect a test-mode restricted Stripe key, create and refund one test charge, then verify Suggested or Matched state and net-revenue reversal.

Phase 3 is deployed and the autonomous checks above are complete. Final acceptance remains open on these provider-owned checks.

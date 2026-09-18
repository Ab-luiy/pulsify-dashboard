---
type: synthesis
tags: [portal, dashboard, integrations, funnel, sales]
sources: [[wiki/synthesis/pulsify-command-center-architecture-2026-09-17]], [[wiki/synthesis/phase2-data-spine-codex-brief]], [[wiki/synthesis/kendo-app-teardown-2026-09-17]], output/standard-preview (functions/_shared/integrations.js, hooks.js, payments.js, migrations 0008 and 0025)
created: 2026-09-18
updated: 2026-09-18
---

# Phase 3 Codex brief: revenue and automation layer

Self-contained build brief for Codex. Phases 0 to 2 are live: one domain, Access login, one shell, D1 data spine, native dashboard, KPI grid, intros, checklist, gating. This phase is deliberately narrow. It builds only the integration work that needs no external review and that makes money visible: payment matching, signed outbound webhooks, a Push API, and the Integrations view. Instagram and YouTube OAuth stay out until a legal entity exists for Meta Business Verification and Google OAuth verification. Zapier, Make, and n8n cover the gap through the Push API in the meantime, which is exactly how Kendo handles HubSpot, Aloware, and Salesloft.

Read [[account-registry]] for IDs. Never put a secret value in a file, a log, or chat.

## Starting state

- `integrations` table keyed by scope, client, provider with `config_json` and `secret_json`; `integration_events` with a unique index on provider, kind, external id; `payments` table with `reference` unique; Stripe signature verification in `hooks.js`; Kit onboarding automation; Discord alerts; `secret-box.js` AES-GCM. All live.
- Spine tables from 0025 and 0026 live. Worker `pulsify-sync` deployed. **Still paused: `SYNC_ENABLED` is false and `YT_API_KEY`, `COMPOSIO_API_KEY` are not attached.** Task 3.0 is blocked on the founder flipping it.
- Kendo contracts to copy are in [[kendo-app-teardown-2026-09-17]] Part 2 and [[pulsify-command-center-architecture-2026-09-17]] Part 3, "One integration layer".

## Task 3.0. Turn the spine on and prove it (founder plus Codex)

Founder: on Worker `pulsify-sync`, add secrets `YT_API_KEY` and `COMPOSIO_API_KEY`, set `SYNC_ENABLED` to `true`. Codex then posts in `AGENT_CHAT.md`: three consecutive `sync_runs` rows per job with status, the count of `ig_conversations` created by the every-minute inbox job over one hour, and confirmation that a new DM sent from the founder's Instagram appears in the CRM within two minutes. Add an "Unmatched" inbox in the CRM view for handles the job cannot attribute, per the exact-match rule. Nothing else in this phase starts until this evidence is posted.

## Task 3.1. Payment matching

- Connection kinds on the `PROVIDERS` registry: `api_key_team` for Stripe (restricted key, Charges and Invoices read) and Whop (company key, payments read), `webhook_in` for both. Per-client scope.
- Import: Worker job every 30 minutes pulls new charges and refunds per connected client into `payments` (existing table, keep `reference` unique), plus a `payment_matches (payment_id, target_kind, target_id, confidence, status, decided_by, decided_at)` table in migration 0027.
- Ranking: candidates are CRM leads and portal contacts for that client. Score by exact email match first, then customer name plus amount and date proximity to a booked call or application event from `integration_events`. One payment can attach to one target only. Automatic matches above the confidence threshold are labeled "auto" and still reviewable; below it they go to a "Suggested" list.
- Operator UI in the shell's Payments view: three tabs, Matched, Suggested, Unlinked. Suggested rows show the candidate with a one-click Confirm and a search box. Every decision writes `operator_events`.
- Client portal: cash collected and average deal size in the client's KPI grid read from confirmed matches only. Unlinked payments never appear to the client.
- Tests: uniqueness of match per payment, tenant isolation, refund reverses the KPI, Stripe signature rejection path unchanged.

## Task 3.2. Outbound webhooks

- Table `webhook_endpoints (id, scope, client_id, url, secret_enc, events_json, active, created_at)` and `webhook_deliveries (id, endpoint_id, event_id, attempt, status_code, sent_at, error)` in 0027. Secret encrypted with `secret-box.js`.
- Events, first set: `lead.created`, `lead.stage_changed`, `conversation.new_message`, `payment.matched`, `payment.refunded`, `client.provisioned`, `client.checklist_step_completed`, `content.sequence_published`, `integration.sync_failed`.
- Delivery: headers `X-Pulsify-Signature` (HMAC SHA-256 over the raw body), `X-Pulsify-Event`, `X-Pulsify-Delivery-Id`. Body `{id, event, created_at, data}`. Three attempts with 1, 2, 4 second backoff, 10 second timeout. Test send with `_isTest: true`. Delivery is performed by the Worker on a one-minute sweep of a `webhook_outbox` table, never inline in the request that caused the event, so Pages Functions stay fast and the free plan needs no Queues.
- Operator UI: endpoint list, add endpoint dialog, event checklist, "Send test", delivery history with status codes.

## Task 3.3. Push API

- `POST /api/v1/ingest` on the funnels project. Auth by `X-API-Key`, keys are team scoped, generated in the Integrations view, stored hashed, shown once.
- Accepts one of: `lead` (name, handle or email, source, notes, tags), `message` (handle, direction, text, ts), `metric` (source, metric, ts, value, dims), `payment` (amount, currency, reference, customer email, ts). Validates, writes to the spine or CRM tables through the same insert functions the Worker uses, returns 201 with an id. Idempotent on reference or external id.
- Limits to start: 30 requests per minute per key, 1 MB body. 401, 413, 429 with the same semantics as Kendo's Push API.
- A one-page doc at `/docs/push-api` on the apex, written by Claude, with a Zapier and an n8n example.

## Task 3.4. Integrations view

Copy the Kendo page: hero card that swaps with an icon strip, categorized grid (Payments, Email, Booking, Contracts, Calls, Automation, Social), status pill per connector from `GET /api/integrations/{provider}/status`, a connect dialog matched to the connection kind (paste key, or webhook URL with a copy button and secret shown once), and a "Coming soon" state for Instagram OAuth and YouTube Analytics that explains the tester path. Status endpoint returns `state`, `last_sync_at`, `last_event_at`, `counts`. Client portal gets the same view scoped to their connectors.

## Verification before handing back

1. Task 3.0 evidence posted first.
2. A test Stripe charge on the founder's own Stripe (restricted key, test mode) appears in Suggested, is confirmed, shows in a client KPI, and its refund reverses it.
3. A test webhook endpoint (webhook.site is fine) receives a signed `payment.matched` event with a verifiable signature and three retries on a forced failure.
4. A Push API lead from a curl call appears in the CRM.
5. All existing tests plus new ones pass. Screenshots of the Integrations and Payments views at 1536 and 390 in both themes under `output/qa/2026-09-phase3/`.
6. Post deployment IDs and all counts in `AGENT_CHAT.md`, update `IMPLEMENTATION-CHECKPOINT.md` and `wiki/log.md`.

## Out of scope

Instagram OAuth and messaging scopes, YouTube Analytics OAuth, Slack, Queues, Fathom ingest as a product feature, any redesign of interiors already shipped.

## Source trail

- [[kendo-app-teardown-2026-09-17]] Part 2 for the webhook, Push API, revenue matching, and status contracts.
- [[pulsify-command-center-architecture-2026-09-17]] Parts 3 to 5.
- `output/standard-preview/functions/_shared/{integrations,hooks,payments,secret-box}.js`, migrations 0008, 0025, 0026.

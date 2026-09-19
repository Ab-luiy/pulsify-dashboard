---
type: synthesis
tags: [portal, funnel, sales, integrations]
sources: [[wiki/synthesis/pulsify-portal-master-architecture]], [[wiki/synthesis/pulsify-command-center-architecture-2026-09-17]], [[wiki/synthesis/phase3-revenue-automation-codex-brief]], output/standard-preview/CONTRACT-ONBOARDING.md, output/qa/2026-09-phase3/LIVE-RELEASE.md
created: 2026-09-19
updated: 2026-09-19
---

# Phase 4 Codex brief: a client goes from signed to live without anyone touching the console

Self-contained. Phases 0 to 3 are live. The product now has identity, a shell, a data spine, revenue matching, webhooks, a Push API, and a real login. What it does not have is a path where a person signs a contract and ends up inside a populated portal on their own. Today every step between "signed" and "working" is the founder doing it by hand in the console. Phase 4 closes that, because the next client is the first real test of everything built so far and the founder will be selling, not clicking.

Everything below reuses code that exists. No new providers. No OAuth. No new accounts beyond what is already in [[account-registry]].

## What exists and is reused

- DocuSign Connect webhook with HMAC, atomic account provisioning, encrypted pending invitation, retries. Sandbox only. `functions/api/docusign-connect.js`, `contract_provisioning` table, `CONTRACT-ONBOARDING.md`.
- Resend sending through `EMAIL_FROM`, used today for setup links, login codes, and contract status.
- Payment path with Mark-paid, Kit subscriber and tag, onboarding draft. `functions/_shared/payments.js`.
- Launch checklist with server-side progress per client and the `client.checklist_step_completed` outbound event. `functions/api/workspace-preferences.js`.
- Intake at `/onboard` saving structured client context. `functions/onboard/[[path]].js`.
- Client brain tables and export. `functions/api/client-brain.js`, `client-brain-export.js`.
- Integration events of kind `application`, `optin`, `booking`, `payment` already written by `event.js` and `hooks.js`.
- Provider connect dialogs in the Integrations view, client scope, from Phase 3.

## Task 4.0. Close the Phase 3 acceptance the founder owns

Codex posts in `AGENT_CHAT.md`, using the Access-authenticated manual run route on the Worker: three clean `sync_runs` rows each for `instagram` and `leads`. Then asks the founder for the two remaining items and records them when they land: one real DM reaching the CRM within two minutes, and one Stripe test-mode charge and refund on a client with a restricted key. Nothing in 4.1 onward depends on these, so do not block on them.

## Task 4.1. One event, one trigger

The provisioning trigger is currently DocuSign only. Make it a single internal function `provisionClient(env, { source, client, email, name, contractRef })` that three inputs call:

1. DocuSign envelope completed (exists).
2. A confirmed payment for a client whose `client_config.status` is `prospect` (Mark-paid or a confirmed Stripe or Whop match from Phase 3).
3. An operator button "Provision now" on the client row in the console, for the founder's manual deals.

Idempotent on client id. Writes `client.provisioned` to the outbox (producer exists). Records `operator_events`.

## Task 4.2. The welcome path

On provision:

- Send the welcome email through Resend from `EMAIL_FROM`: one-time setup link (exists), what happens next in three lines, and a calendar link if the client has a booking provider connected. Copy is Claude-written and lives in `shared/email/welcome.md` so it is edited, not coded. Retry three times with backoff, record failures in `delivery_failures` (table exists from 0007).
- Set `client_config.status` to `onboarding`.
- Seed the launch checklist for the client with these eight steps, in this order, with the auto-complete rule beside each:
  1. Record your offer voice note. Auto-completes when the intake at `/onboard` has a voice note or the offer fields filled.
  2. Tell us who you sell to. Auto-completes when ICP fields in the client brain are non-empty.
  3. Connect Instagram. Auto-completes when an Instagram tester connection is recorded on the client (the tester path, not OAuth).
  4. Connect YouTube. Auto-completes when a channel handle is saved.
  5. Connect payments. Auto-completes when a Stripe or Whop integration for the client is connected.
  6. Upload your first proof. Auto-completes on the first proof item.
  7. Generate your first sequence. Auto-completes on the first studio sequence.
  8. Ship it. Auto-completes when a sequence status becomes live.
  Each step deep-links to the exact view. Progress is stored server-side per client per step, not per user, because the operator may complete steps on the client's behalf while impersonating.

## Task 4.3. The onboarding page becomes the first login

- `/onboard` is today a form. Make it the landing surface after the first password is set: full-screen, the shell's dark theme, a single column, one step at a time with the same 150 ms transition as the shell, progress dots at the top. It walks steps 1 to 5 of the checklist inline and then drops the client into the portal Overview with steps 6 to 8 waiting in the checklist card. "Skip for now" is allowed on every step and leaves it open in the checklist.
- Voice note step: record in browser (MediaRecorder, webm, 10 minute cap) or upload, stored in R2 under the client prefix, transcribed with Workers AI Whisper (`@cf/openai/whisper`) into the client brain offer fields. Show the transcript for correction before saving. If transcription fails, save the audio and leave the step open with a plain message.
- Connect steps reuse the Phase 3 connect dialogs in client scope. The Instagram step explains the tester invite in two sentences and links to the accept screen; it completes when the founder marks the tester accepted or the sync Worker sees the account.
- Every step completion writes `client.checklist_step_completed` to the outbox.

## Task 4.4. Booking and application become one pipeline stage

- Normalize `application`, `optin`, and `booking` events into `pipeline_touches (client_id, contact_email, contact_name, kind, ts, source, payload_json)` in migration 0028, additive. Backfill from `integration_events` once.
- A client's Leads view shows contacts with their latest touch, so a booked call and an application from the same email are one row, not two.
- These touches feed payment matching as candidates (Phase 3 already reads `integration_events`; switch it to `pipeline_touches` so both paths agree).

## Task 4.5. DocuSign out of the sandbox

- Read `DOCUSIGN_BASE_URL` from a var so production (`www.docusign.net`) and demo differ by configuration only. Default stays demo until the founder has a paid plan.
- Founder ask, names only: when the paid DocuSign account exists, create the same Connect configuration there and add `DOCUSIGN_ACCOUNT_ID` for it. Until then the sandbox path is the test path and real contracts are provisioned with the "Provision now" button from 4.1.

## Out of scope

Instagram and YouTube OAuth, Meta messaging scopes, Google verification, Slack, Queues, any new visual system work, the Studio interior.

## Verification before handing back

1. A fresh prospect client created in the console, then provisioned three ways (sandbox envelope, Mark-paid, button), produces exactly one welcome email, one `client.provisioned` event, one checklist with eight open steps, and status `onboarding`. The second and third triggers are no-ops.
2. Walk the onboarding page as the new client at 1536 and 390: voice note recorded and transcribed into the brain, ICP saved, connect steps skipped, lands in Overview with the checklist at 2 of 8. Screenshots under `output/qa/2026-09-phase4/`.
3. Complete steps 6 to 8 from the portal and confirm each auto-completes and emits its event.
4. Application, opt-in, and booking for the same email show as one row in Leads; a payment from that email matches automatically.
5. Existing suite plus new tests for idempotent provisioning, checklist auto-complete rules, touch normalization, and welcome email retry. All pass.
6. Deploy funnels then Worker, post deployment IDs and every check in `AGENT_CHAT.md`, update `IMPLEMENTATION-CHECKPOINT.md` and `wiki/log.md`. Disposable records cleaned up.

## Source trail

- [[pulsify-portal-master-architecture]] "Onboarding, minutes not days" and "The onboarding page is its own designed surface". This phase is that section, built.
- `CONTRACT-ONBOARDING.md`, `LIVE-RELEASE.md`, and the Phase 3 brief for what already exists.
- Cloudflare Workers AI model catalog for `@cf/openai/whisper` (verify the current model id at build time, do not assume).

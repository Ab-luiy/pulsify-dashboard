---
type: synthesis
tags: [funnel, sales, outreach, scaling]
sources: [[wiki/synthesis/phase4-client-onboarding-codex-brief]], [[wiki/synthesis/pulsify-command-center-architecture-2026-09-17]], AGENT_CHAT.md entries 2026-09-19
created: 2026-09-19
updated: 2026-09-19
---

# Phase 5 Codex brief: second-reader review of the 2026-09-19 releases, then the outreach surfaces polish

Everything below shipped on 2026-09-19 without a second reader. Codex's first job is the same read-only review it did for Phase 3, which caught 18 real defects. Its second job is the founder's design request: make Leads, Search and the Outreach tracker look and sort the way an operator works.

## Why this matters for Pulsify

The founder is about to start outreach from the tracker. Every bug in the tracker, the inbox sync or notifications now costs a real conversation. And the tracker is the first screen he sees every day; it has to feel like Kendo, not like a first draft.

## Part A. Review, read-only first, then fix locally, then deploy

Scope, all under `output/standard-preview`:

1. Phase 4 onboarding: `functions/_shared/{provisioning,checklist,pipeline-touches,welcome-email}.js`, `functions/api/{provision,checklist,pipeline,voice-note}.js`, `onboard/phase4.{js,css}`, migration 0028. Five known questions are in the AGENT_CHAT entry "COMPLETED PHASE 4 LOCAL BUILD".
2. Outreach tracker: `functions/_shared/outreach.js`, `functions/api/outreach.js`, `admin/outreach-view.js`, migration 0029. Check the touch clustering (60 min), the 24 h ladder, ghost and close rate formulas, and that hibernating threads never count as follow-ups.
3. Zernio bridge: `functions/_shared/zernio.js`, `functions/api/zernio.js`, `workers/sync/src/jobs/zernio-inbox.js`, migration 0030. Known gotchas already fixed: `from_` key, message id is the Graph mid, `/direct/` url, 60 req/min. Verify the webhook HMAC (`X-Zernio-Signature`, hex of raw body), event-id dedupe, and that `participantPicture` gets written when live events carry it (replayed history had null).
4. Notifications: `functions/_shared/notifications.js`, `functions/api/notifications.js`, `shared/notifications.js` (rebuilt today as an anchored dropdown with expand and origin hand-off), migration 0031.
5. Realtime: `functions/_shared/realtime.js`, `functions/api/realtime-config.js`, `shared/realtime.js`. Confirm nothing sensitive can ever ride the public channel: payloads must stay ids and reasons.
6. Semantic search: `functions/_shared/search.js`, `functions/api/search.js`, `workers/sync/src/jobs/search-index.js`, `admin/search-view.js`, migrations 0032 and 0033. Confirm a client scope can never retrieve DM vectors, and that the indexer stays inside Workers AI free limits (currently 50 docs per minute).
7. Unified login and Settings: `portal/login/index.html`, `functions/api/login-lookup.js`, `functions/api/account.js`, `shared/settings-view.js`. Enumeration resistance on the sign-in link path is the thing to break.
8. Cleanup the bell session flagged: `functions/_shared/notify-operator.js` and `functions/api/notify.js` are now a fallback relay only. Decide with the founder's rule below, then delete or keep.

One thing to settle with the founder before deleting anything: one session was told "no emails, only Discord", the other was told the founder has no Discord and wants email. Ask him once, then make outreach-notify match.

Suite: `node --test tests/*.test.mjs`, 77 passing at handoff. Deploy order stays: migrations (additive, statement by statement), Worker from `workers/sync`, Pages from `output/standard-preview` (never from a subdirectory; that mistake shipped a 404 twice today).

## Part B. Outreach surfaces polish (founder request, verbatim intent)

"Let Codex handle the design and the outlooks of the Leads / Search / Outreach tracker looks and sortings and how the skeleton looks in there. We need it to be sorted by date interacted and inbound and outbound. And I just want it to look better than whatever is on right now."

What to build:

- Outreach tracker (`admin/outreach-view.js` + the `.ot-*` rules in `admin/integrations-view.css`): a proper sort control with "Last interaction" as the default, plus "Follow-up due", "Reply rate", "Name". Inbound and outbound stay separate sections, each independently sortable. Keep follow-ups pinned on top only when that sort is chosen; the founder wants date-interacted as the resting order. Contact rows should read like a contact book: picture, name, handle, last line, last interaction time, stage pill, one glance. Expanded row: chat history first, actions second, note third. Loading state: layout-matched skeletons (the Kendo rule in the architecture doc), not a grey block.
- Leads (`admin/leads-view.js`): same sort control, same row anatomy, and make the Instagram inbox and funnel contacts feel like one list with a source chip rather than two tabs, if that reads better in practice. Founder's call on review.
- Search (`admin/search-view.js`): results as the same row anatomy as the tracker so a hit looks like the contact it points to; group by person when several messages from the same thread match; keep the match percentage but make it quiet.
- Shared: the three views must use one row component and one skeleton. Extract to `admin/contact-row.js` or similar. Desktop and phone width. Dark and light.
- Kendo standard applies: 150 ms `cubic-bezier(.16,1,.3,1)`, raised-neutral primary, hairline borders, no decorative color. See [[kendo-app-teardown-2026-09-17]].

Acceptance: screenshots of all three at 1536 and 390 in both themes under `output/qa/2026-09-phase5/`, sort by last interaction verified against the API order, and the founder says it looks better.

## Part D. Website audit findings

The full-site audit at [[website-audit-2026-09-19]] lists 14 ranked findings with an execution order. Two are P1 and go first: `/onboard` returning JSON 401 to impersonated and anonymous visitors, and every unknown path soft-404ing to the operator landing. Three items were fixed during the audit and are already live.

## Part C. Still open, founder-side, keep asking

- Real Instagram read receipt through Zernio: send a DM from ab.luiy to the other account, open it there, confirm a `message.read` event lands and the tracker marks seen.
- Cloudflare Zero Trust: turn on Instant Auth on the Access application so `/admin` skips the Cloudflare-branded picker.
- Phase 3 acceptance: one Stripe test-mode charge and refund on a client with a restricted key.

## Connections

- [[phase4-client-onboarding-codex-brief]] — what Part A item 1 reviews
- [[pulsify-command-center-architecture-2026-09-17]] — the phase plan this extends
- [[kendo-app-teardown-2026-09-17]] — the visual standard for Part B

## Source trail

AGENT_CHAT.md entries dated 2026-09-19 (Phase 4 build, tracker, Zernio, realtime, search, notifications), founder messages in the 2026-09-19 session.

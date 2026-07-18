# CODEX TASK — proof vault section + pulse feed (client portal)

Author: Claude. Date: 2026-07-15. Model: gpt-5.6-sol. Founder said keep going.

Two client-portal surfaces from the master architecture (`wiki/synthesis/pulsify-portal-master-architecture.md`), both read/UI layers over data that already exists. Everything lands on `output/standard-preview` (portal `portal/index.html` with its `id="panel-*"` convention and `tab-btn nav-item` nav, D1 `pulsify-portal`). Client access uses the existing `resolveClientAccess` token pattern (see `functions/api/client-brain.js` and `client-dashboard.js`). Read those first and extend, do not rebuild.

## Feature 1 — the proof vault tab (portal)

A `panel-proof` section + nav entry in the client portal:

- A gallery grid of the client's `proof_items`: uploaded images render as thumbnails via their stored `/m/...` URLs, video links render as link cards. Each item shows its claim caption and (when set) permission status.
- Upload more from here: reuse the EXISTING `/api/media-upload` endpoint and the onboard form's upload pattern (file input, image validation happens server-side already). New uploads appear in the grid without a reload.
- A caption/claim edit per item (what it shows, which claim it backs) writing through the existing client-brain/proof path or a small extension of it. Keep writes token-scoped to the client.
- An honest empty state: no proof yet, one line on why proof matters (student results carry the selling), and the upload control. Never fabricate.
- Voice reminder surfaced subtly in the UI: student results, never lifestyle.

## Feature 2 — the pulse feed (portal home)

The heartbeat stream: one reverse-chronological feed of the client's own recent activity, merged from existing tables (no new tables, no new events pipe):

- Sources (all filtered to that client, last ~30 days, capped ~50 items): `payments` (a payment landed), `page_events`/`watch_events` (their funnel page got visits/watches), `studio_sequences` (draft created / sent for review / approved), `sequence_log` (a sequence posted/logged), `proof_items` (proof added), `integration_events` (bookings etc. where present), `content_items` (content shipped) — use whichever of these exist with usable timestamps; confirm columns against the migrations and skip sources that lack them rather than guessing.
- A new token-scoped endpoint `functions/api/pulse-feed.js` that does a small fixed number of queries (one per source table, filtered by client, ordered by time desc, limited), merges + sorts server-side, and returns typed items ({kind, title, detail, ts}).
- UI: a "Pulse" block on the portal home/first panel (or its own small panel if cleaner with the existing layout): icon per kind, relative time, most recent first. Skeleton while loading, honest empty state for a new client.

## Discipline

- LOCAL-VERIFY ONLY: `node --check` every touched JS file + extracted portal inline JS; a mocked-D1 test that pulse-feed merges multiple sources in time order, filters to the requesting client only (cross-client isolation), and 401s without a valid token; and that the proof vault write path stays token-scoped. Existing client-brain, proof-media, followups, operator-overview, view-tracking tests must still pass.
- NO new tables (no migration expected). NO deploy, NO remote D1, NO commit, NO secrets.
- Voice: no em-dashes or en-dashes, no reward copy, sentence case.
- Claim files on AGENT_CHAT.md Lock Board first; post a done note with exact files + verification. Claude reviews then deploys.

## Not in scope

Operator-side vault curation UI (the Brain view already renders proof), push notifications, webhooks, any new external API, and the R2 serving-auth hardening (separate task).

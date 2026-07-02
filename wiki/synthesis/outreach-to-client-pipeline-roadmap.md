---
type: synthesis
tags: [funnel, outreach, sales, scaling]
sources: [[wiki/synthesis/funnel-portal-pipeline]], [[wiki/synthesis/landing-page-standard]], [[wiki/playbooks/pulsify-dashboard-workstream]], [[claude-memory/project_funnel_portal_pipeline]], [[claude-memory/project_dashboard_product_vision]], [[claude-memory/project_lead_studio]]
created: 2026-07-01
updated: 2026-07-02
---

> **Status update 2026-07-02:** the buildable remainder of this roadmap was executed and deployed in one run — provisioning flow, Lead Studio bridge, /campaigns board, portal tab backends (Content/Calls/Arsenal), failure logging + /api/health, and both playbooks ([[playbooks/prospect-signed-onboarding]], [[playbooks/landing-page-launch-qa]]). Per-phase updates are inline below. What remains is user-side (Wistia/Typeform/Kit accounts, ADMIN_KEY click-test, optional GEMINI_API_KEY) plus the deliberately-deferred items called out in Phases 4 and 5.

# Outreach-to-client pipeline: the A-to-Z roadmap

Where the landing-page/portal/funnel work is ultimately headed, and exactly how far along each piece is as of 2026-07-01. Written because the last two days of work happened phase-by-phase without ever naming the destination — this names it.

## Why this matters for Pulsify

Content → offer → funnel. This whole system is the funnel pillar's acquisition engine, but it does double duty: the same infrastructure is both (1) Pulsify's own tool for signing new coaching clients, and (2) the productized deliverable Pulsify hands a client once they're signed. Get this right once, and it pays twice.

## The destination (Z)

A repeatable loop, most of it running without a Claude session babysitting each step:

1. A prospect (a real creator/coach matching ICP) is already sitting in the lead CRM (`pulsify-dashboard`, YouTube/IG sourcing, Lead Studio-enriched).
2. One action turns that lead into a real, honest, personalized landing page — built on the standard template, carrying THAT prospect's real proof (case study, numbers, voice) where it exists, honest generic copy where it doesn't. No invented facts, ever.
3. That page goes out cold, in volume (10-15/day), as a "look what we already built you for free" outreach hook — the free-value-first strategy already codified in [[wiki/synthesis/prospect-funnel-reference-library]].
4. Engagement (visits, VSL watch %, applications) is visible in one place across ALL sent pages, not one prospect at a time — so Pulsify knows who's worth a follow-up without checking 15 separate URLs.
5. When a prospect signs, the exact same page "upgrades" in place — Kit and the Typeform webhook turn on, the client folder (`clients/{name}/`) gets created, and the prospect gets a real client portal instead of a cold-outreach page.
6. The client portal fills in over time: funnel data (already live), then content pipeline, deal pipeline, call notes, revenue — the productized system from [[claude-memory/project_dashboard_product_vision]].
7. Ongoing operation needs minimal hand-holding: secrets rotate safely, failures alert instead of silently dying, QA is real, and adding client #20 doesn't take more manual work than client #2 did.

## Phase 0 — Foundation

**Status: ~95% done, live, verified.**

- Landing-page standard: hero/VSL → application → proof wall → close, one approved skin (Inter, `#6871f4`, violet glow), codified in [[wiki/synthesis/landing-page-standard]]. Anti-invention rule and headline rule both documented and actively enforced (Frank's copy was corrected twice against real transcript data, not assumptions).
- Backend is genuinely multi-tenant: every table (`leads`, `watch_events`, `page_events`, `client_config`) is keyed by `client`, not hardcoded to one prospect.
- Domain: renamed off "pulsify-frank" to `pulsify-funnels.pages.dev` (2026-07-01) — the old project still exists but is dead, not deleted, on file as a user decision to leave it rather than destroy it unasked.
- Per-client portal auth: private tokenized links (`portal_token_hash`, SHA-256, never stores the raw token), token itself determines the client server-side — one client cannot read another's data even by editing the URL. Chosen over full email+password accounts because that's mature-SaaS machinery a handful of clients doesn't need yet; upgrades cleanly later without touching the isolation logic.
- Client portal shell exists (`client.html`, 5 tabs) — Funnel tab is live, the other four are honest "Pending" states.

**Open in this phase:** none blocking. This layer is solid.

## Phase 1 — Volume outreach engine

**Status: ~70% done.** This is the phase the user is asking about right now (10-15 pages/day).

> **Update 2026-07-02: done, except user-side accounts.** The Lead Studio connection now exists in both directions: (a) `/settings` has a "New prospect page" flow — paste a creator brief, copy a rules-encoded LLM prompt (or one-click `/api/generate`, Gemini-preferred, 501 until a key is set), paste the token JSON back, get the sendable link; (b) Lead Studio itself (pulsify-dashboard, deployed) gained a "Landing page" asset type that builds the same token JSON from a lead's stored creator profile and a "Create live page" action that provisions the page on pulsify-funnels via `/api/settings` (operator pastes the funnels ADMIN_KEY once, stored locally). Wistia/Typeform/Kit accounts remain the only open item, and they're user-side.

Done:
- One deployed page serves any prospect via `?client=<slug>` — no copied file per prospect (2026-07-01).
- Two design variants exist and are pickable (`assets/landing-page-standard/canonical/` and `variant-02/`, both on the same integration contract) — Codex-built, audited.
- Full content editor: `functions/index.js` server-renders any client's page from `page_content_json`, 22 tokens across both templates, generic honest defaults when a field's blank, zero leaked `{{TOKEN}}` text — built and live, **Codex audit of the render approach still pending** (three specific questions open in the 2026-07-01 19:20 log entry: the `env.ASSETS.fetch()` pattern, whether `/` route interception conflicts with `client.html`/`portal.html`, and the HTML-escaping approach).
- Typeform/Kit/webhook deliberately OFF by default for outreach-volume pages — Typeform's own embed and dashboard cover a cold page with no applications yet; wiring the full pipe is a later, per-client upgrade with zero new code needed.

Not done — the actual gap between "70%" and "ready for real 10-15/day volume":
- **No connection to Lead Studio.** Every prospect page today is built by manually typing into `/settings` — client id, name, copy tokens, one at a time. Lead Studio (in the separate `pulsify-dashboard` repo) already extracts a real, quote-sourced creator profile per lead. Nothing pipes that into `pulsify-funnels`'s `client_config`/`page_content_json` automatically. This is the single highest-leverage next build for actually hitting volume — turning "one creator profile already sitting in the CRM" into "one sendable outreach link" should be one action, not a manual form-fill.
- Real Wistia/Typeform accounts still don't exist (user hasn't created them) — moot for the webhook-off outreach path, but blocks anything that needs a real video per prospect rather than a generic placeholder.

## Phase 2 — Operator-side campaign visibility

**Status: ~10% done.** This is where the user's Typeform-picker-in-portal complaint from earlier tonight actually lives — claimed, not yet built.

The gap: `/portal` today shows funnel data one client at a time (pick from a dropdown, see that one prospect's numbers). Once you're sending 10-15 pages a day, that's the wrong shape — the operator needs a single view across ALL sent pages: who got a page, when, what design/copy it's running, did they visit, did they watch, did they apply. Effectively a lightweight "outreach campaign" layer on top of the existing per-client data, which is already fully queryable (every row is `client`-scoped) — this is a UI/aggregation problem, not a data problem.

**Not started.** Proposed scope once greenlit: extend `/portal` (or a new `/campaigns` view) to list every `client_config` row with its latest engagement summary in one table, sortable by "needs a follow-up" signals (opened, didn't apply; applied, no reply yet). This is squarely mine or Codex's to build — no new data model needed, it's a read/aggregation layer over what already exists.

> **Update 2026-07-02: done and live.** `/campaigns` (admin-gated, same key as `/settings`) lists every sent page with visits, max watch %, applications, delivery failures (7d), last activity, and a computed signal (applied > hot > visited > no activity), sortable, with per-row links to the page, the alternate-design preview, settings, and portal. Backed by `/api/campaigns` (four grouped queries, fail-soft).

## Phase 3 — Prospect-to-client conversion workflow

**Status: ~15% done.** The pieces exist in isolation; nothing formally connects them for landing pages specifically.

- CLAUDE.md already has a general onboarding trigger ("user names a signed client → run the full onboarding") and a fixed client folder convention (`clients/{name}/overview.md`, `content-pipeline.md`, `calls/`, `progress.md`, `decisions.md`).
- Every integration field in `client_config` is already optional and upgradable with zero code changes — turning on Kit/webhook for a newly-signed client is already just filling in two Settings fields.
- **Not yet written down anywhere:** the actual checklist for "prospect X just signed" as it applies to THIS system specifically — flip Kit/webhook on, decide if they keep the outreach page as-is or get a rebrand pass, create their `clients/{name}/` folder, generate their real client-portal link and hand it over. Small to write once someone actually signs through this pipeline; nobody has yet, so it's untested end to end.

> **Update 2026-07-02: written.** [[playbooks/prospect-signed-onboarding]] is the checklist. Still untested against a real signing — run the first one against it and correct it.

## Phase 4 — Full client portal buildout

**Status: ~5% done.** This is the large, separate body of work behind the client portal's four "Pending" tabs.

- Content tab needs a real content-pipeline backend (scripts in production/scheduled/published) — doesn't exist yet anywhere, not even for Pulsify's own internal use.
- Pipeline tab needs revenue/deal data — currently lives only in the separate `pulsify-dashboard` operator CRM as baked JSON, no shared schema with this system's D1 at all.
- Calls tab needs transcript/notes ingestion into a client-scoped, portal-readable form.
- Arsenal tab needs an actual asset-delivery mechanism (scripts, hooks, swipe files).

None of these are hard individually — each mirrors a pattern already proven elsewhere in the vault (Lead Studio's asset generation, the CRM's KPI tracking) — but wiring each into THIS portal, per client, is real, unstarted scope. This phase is the actual "$10K productized system" from [[claude-memory/project_dashboard_product_vision]], not a quick add-on.

> **Update 2026-07-02: three of four tabs are live.** Content, Calls, and Arsenal now run on real D1 tables (`content_items`, `call_notes`, `client_assets`, migration 0006), read through `/api/client-data` on the same dual-auth pattern as `/leads` (tenant isolation verified), edited by the operator in a new Delivery section in `/portal`, rendered live in `/client` with honest empty states. Pipeline stays pending on purpose — its revenue/deal data lives in the operator dashboard with no shared schema yet; that bridge is the remaining Phase 4 scope.

## Phase 5 — Scale and operational hardening

**Status: ~10% done.**

- Idempotency exists for the one place it mattered (Typeform lead dedup by `response_id`/email) — verified already correct, not a gap.
- Missing: monitoring/alerting on pipe failures (a silently-failing Kit call or webhook today just logs a status string nobody's watching), automated per-client deploy if this ever needs to move beyond query-param multi-tenancy to real custom subdomains, and real launch QA — which itself is blocked on the same missing Wistia/Typeform/Kit accounts from Phase 1.
- Cal.com booking integration and closed-revenue attribution (tying a booked call and closed deal back to which outreach page originated it) — not started, lowest priority, depends on Phase 2's campaign visibility existing first to have something to attribute revenue back to.

> **Update 2026-07-02: monitoring and QA are in.** Kit failures and rejected/unparseable Typeform webhooks now write to a `delivery_failures` table (migration 0007, fail-soft, never blocks the lead), surfaced per client on `/campaigns` and in a new admin `/api/health` endpoint (24h activity counts, 7d failures by kind, 20 most recent). Launch QA is codified in [[playbooks/landing-page-launch-qa]]. Still open in this phase: Cal.com + revenue attribution (unchanged), and real QA of the Wistia/Typeform/Kit legs once those accounts exist.

## Two repos, one system — the gap nobody's named yet

`pulsify-funnels` (this system) and `pulsify-dashboard` (the operator CRM, Lead Studio, YouTube/IG lead sourcing) are two entirely separate Cloudflare projects with no API bridge between them today. Long-term, Phase 1's Lead Studio connection and Phase 2's campaign visibility both effectively require these to talk to each other — either a direct API call from one to the other, or a shared D1 database. Worth deciding deliberately rather than discovering by accident later; not urgent to solve today, but every phase above eventually bumps into it.

> **Update 2026-07-02: decided and built — direct API, no shared D1.** Lead Studio calls `pulsify-funnels`'s `/api/settings` cross-origin with the operator's admin key (entered once, stored in the browser). The repos stay separate; the contract between them is the settings API plus the token JSON shape. Revenue-data sharing for the portal's Pipeline tab is still an open question and stays one.

## Overall: how close are we

Rough weighted read, not a precise number: **roughly a third of the way to Z**, but the part that matters for what the user is asking about right now — can real outreach start today — is much further along than the overall average suggests.

**You can start sending outreach today**, right now, with the current system: go to `/settings`, fill in a prospect's client id/name/Typeform link (Wistia and Kit optional), pick a design, optionally add their real proof if you have it, save, send the link. It's manual per prospect and there's no cross-page dashboard yet, but nothing is broken or blocking a first real send.

**What determines whether 10-15/day is sustainable, in priority order:**
1. Lead Studio → landing-page connection (Phase 1) — turns "manual form-fill per prospect" into "one click from a lead already in the CRM."
2. Campaign visibility (Phase 2) — otherwise 15 pages a day become 15 tabs to check by hand.
3. Real Wistia/Typeform/Kit accounts — user-side, not a build blocker, but caps what "real" means per page until it happens.

## Open questions / gaps

- Whether Lead Studio and this system should share one D1/one Cloudflare account, or stay separate with an API bridge — not decided.
- Whether custom per-client domains are ever needed, or query-param multi-tenancy is the permanent answer — not decided, lower priority than everything above.
- Codex's three open audit questions on the content-editor render pipeline (see Phase 1) are unresolved as of this writing. *(Update 2026-07-02: self-answered in the AGENT_CHAT log — `env.ASSETS.fetch()` is the right Pages pattern for co-deployed assets; the `/` Function only intercepts the exact root path so `/client`, `/portal`, `/settings`, `/campaigns` are unaffected; uniform `&<>"'` escaping is correct for both attribute and text positions. Codex can still overrule with a second look.)*

## Source trail

Everything above is drawn from the live `AGENT_CHAT.md` log (2026-06-30 through 2026-07-01), [[wiki/synthesis/landing-page-standard]], [[wiki/synthesis/funnel-portal-pipeline]], [[wiki/playbooks/pulsify-dashboard-workstream]], and this session's own direct verification of the live `pulsify-funnels.pages.dev` deployment.

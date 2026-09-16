---
type: synthesis
tags: [portal, dashboard, funnel, integrations, infra, product]
sources: [[wiki/synthesis/kendo-app-teardown-2026-09-17]], [[wiki/synthesis/kendo-port-codex-brief]], [[wiki/synthesis/pulsify-portal-master-architecture]], [[wiki/synthesis/client-dashboard-redesign-spec-2026-07-12]], output/standard-preview/IMPLEMENTATION-CHECKPOINT.md, output/standard-preview/NOTES-AUDIT.md, live sites on 2026-09-17, docs.kendo.ai, Meta, Google, Fathom, Cloudflare developer docs
created: 2026-09-17
updated: 2026-09-17
---

# Pulsify Command Center: one login, one shell, one integration layer

This is the platform plan that sits above the visual port in [[kendo-port-codex-brief]]. It answers four things the founder asked on 2026-09-17: what Codex shipped recently and where it left off, what our live surfaces are and why they do not feel like one product, how Kendo's integrations actually work under the hood and what it takes to build the equivalent for Pulsify's tools, and what accounts, keys, and approvals have to exist before any of it works. Nothing here is a weekend job. Kendo's integration catalog is the output of a team working for a long time against provider review queues. The plan below is sequenced so every phase ships something usable and nothing depends on an approval we do not yet have.

## Part 1. Where we are

### What Codex shipped in the last two weeks (September 7 to 9)

All of it lives in `Pulsify-Brain/output/standard-preview/` and deploys to pulsify-funnels on Cloudflare Pages. Read `IMPLEMENTATION-CHECKPOINT.md` and `NOTES-AUDIT.md` in that folder for the exact state. Summary:

- Client portal made login-ready: session cookies, PBKDF2 password hashing, setup links, email codes, R2 proof uploads, scoped context download, onboarding navigation. Founder test login exists as demo-rio.
- Studio renovation: four app modes, live slide editing, tenant-scoped save and review, `studio-sequences` API.
- Full portal skeleton redesign: expandable channel sidebar with route history, step-split forms, 27 editable story templates on a shared canvas renderer, thumbnail designer with PNG export, 45 protected library assets, Workers AI copywriter, workspace records and summaries, migrations 0021 to 0024.
- DocuSign contract provisioning: HMAC-validated webhook, atomic account creation, encrypted pending invitations via `secret-box.js` (AES-GCM), retries, admin status panel. Built and tested, not activated, no real emails sent.
- Admin console rebuilt around a launch screen with groups: Command center, Home, Clients, Client brain, Client work, Integrations, Email, Acquisition pages, Links directory.
- 16 backend test files plus a Playwright browser suite pass.

What Codex explicitly left unfinished, in its own words from the checkpoint: social OAuth with encrypted token storage and refresh, scoped analytics imports and signed inbox events, a unified founder account across the portal and the SDR dashboard, onboarding selections that configure the workspace, remaining Account and Carousel interiors, and DocuSign activation. The integration cards for Instagram and YouTube today store delegated-access notes. They do not connect to anything.

### The live surfaces

| Surface | URL | Who uses it | Auth today | Stack | Design today |
|---|---|---|---|---|---|
| Prospect landing pages | pulsify-funnels.pages.dev/{slug}, bare domain renders Frank | Prospects | None | Pages Functions render from D1 config | Light, Inter, blue accent, the locked landing standard |
| Client portal | pulsify-funnels.pages.dev/portal | Clients | Email plus password, session cookie, email code | Pages Functions, D1, R2, Workers AI | Dark purple, Inter |
| Operator console | pulsify-funnels.pages.dev/admin | Founder | Admin key pasted into the browser, stored in localStorage | Same project | Dark, Inter, purple |
| Legacy integrations hub | pulsify-funnels.pages.dev/integrations | Founder | Admin key | Same project | Legacy page, still linked |
| Operator dashboard (SDR, CRM, content, health) | pulsify-dashboard.pages.dev | Founder | No login. Public URL. | Separate repo Ab-luiy/pulsify-dashboard, single 885 KB HTML file, data in a committed JSON refreshed by GitHub Actions every 6 hours (YouTube) and daily (Instagram via Composio) | Light, Satoshi font, an 11-option theme switcher (Pulse, Trakyo, Mirage, Dark, Light, Signal, Obsidian, Atelier, Aurora, Prism, Voltage) |
| Portal preview (design north star) | pulsify-funnels.pages.dev/portal-preview/ | Internal | None | Static | Trakyo light, money green |

Six surfaces, four visual languages, three authentication models, two repositories, and two data stores (D1 for the portal, a JSON file in git for the dashboard). That is the real reason nothing feels native. Kendo has one domain, one Firebase identity, one shell, one Firestore, and every screen is a view onto the same team-scoped data.

Two things stand out as urgent regardless of design:

1. The operator dashboard is public. It shows your CRM count, cash, and pipeline to anyone with the URL. This gets a login in Phase 1.
2. The admin key model is fragile. You do not know the key, it lives in one browser's localStorage, and the hub and console both depend on it. Cloudflare Access replaces it with your Google login.

## Part 2. How Kendo's integration layer actually works

Pulled from docs.kendo.ai and the app on 2026-09-17. This is the pattern to copy, independent of which providers we connect.

### Three connection kinds

- **Per-user OAuth.** Fathom, Zoom, Google Workspace, Wispr. The user clicks Connect, approves scopes on the provider, Kendo stores the token per user, and imports are attributed to that user. Zoom scopes are exactly `user:read`, `meeting:read`, `recording:read`. Google requests Gmail draft compose, Calendar manage, and Meet artifact read, and explicitly avoids broad mailbox reading.
- **Team API key or admin credential.** Fireflies, Aircall, Dialpad, Quo, Grain, Granola, Close, Gong, Avoma, GoHighLevel, Stripe, Whop. An admin pastes a scoped key once. Stripe is a restricted read-only key with Charges and Invoices read. Whop is a company API key with payments read.
- **Inbound webhooks and polling.** Fathom pushes a webhook when a meeting completes. RingCentral and GoHighLevel are polled every 15 to 30 minutes. Close syncs on a 30-minute cycle.

### The invariants

- **Attribution by email, exact match only.** "Kendo uses exact matches and does not guess between similar names." Unmatched imports go to the team owner or are skipped, per provider setting.
- **Status per provider per team.** Every integration has a `/status` endpoint the shell polls on load. The client sees connected, needs attention, or not connected, never the secret.
- **Idempotent event log.** Every inbound event is recorded once, keyed by provider plus external id.
- **Backfill is bounded.** 25 calls or 30 days on connect, then automatic.
- **Outbound webhooks are signed and retried.** Headers `X-Kendo-Signature` (HMAC SHA-256 over the raw body), `X-Kendo-Event`, `X-Kendo-Delivery-Id`. Three attempts with 1, 2, 4 second backoff, 10 second timeout, test events flagged `_isTest`. Five event families: calls, training, scorecards and coaching, revenue, team and integrations.
- **A Push API for anything they do not natively support.** `POST /api/integrations/push-api/ingest` with `X-API-Key`, transcript or audio URL plus rep email, tags, notes, deal fields. 30 requests per minute, 10 MB body, 201 with a `callId`. This is how Zapier, Make, n8n, HubSpot, Aloware, and Salesloft all plug in without bespoke connectors.
- **Revenue matching is a ranked suggestion, not magic.** Kendo caches payments, ranks likely matches by date and deal context, prevents one payment attaching to two calls, and lets a manager correct it.
- **Plan gating wraps everything.** Connect buttons render fully and open an upgrade dialog on the free tier.

### Kendo's infrastructure for this

Vercel for the app, Firebase for auth and Firestore for data, Google Cloud Storage for media, OpenAI and Anthropic for analysis, a separate `api.kendo.ai` for heavy work. None of that is exotic and none of it is required for us. Our Cloudflare stack can do the same job with one addition described below.

## Part 3. The target: Pulsify Command Center

### One domain

Buy pulsify-ai.com now, not after the first payment. Every unification below needs one apex domain so a single session cookie and a single Access policy can span the whole product. Proposed hosts:

| Host | Serves | Project |
|---|---|---|
| app.pulsify-ai.com | Client portal, operator console, and the migrated dashboard views | pulsify-funnels (rename later) |
| go.pulsify-ai.com | Prospect landing pages and tracked redirect links | pulsify-funnels, path routes, no auth |
| hooks.pulsify-ai.com | Inbound provider webhooks and the Push API | Companion Worker (see Data spine) |

Use a flat-rate registrar as decided in [[project_domain_purchase_pending]], then point DNS at Cloudflare.

### One identity

- **Founder and team:** Cloudflare Access in front of `app.pulsify-ai.com/admin*` and the dashboard views, identity provider Google, policy allow `abod.louai@gmail.com` and future team emails. Access injects a `Cf-Access-Jwt-Assertion` header and a `CF_Authorization` cookie. The Pages middleware validates the JWT against `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs` with the application AUD tag, then treats `payload.email` as the operator identity. The admin key stays as a break-glass fallback only. Free-tier seat count must be checked on Cloudflare's pricing page before relying on it for a team; for one founder it is not a concern.
- **Clients:** keep the existing password plus email-code session (`client_sessions`, PBKDF2, httpOnly cookie). Add "Sign in with Google" later only if clients ask.
- **Impersonation:** already built (`impersonation_sessions`, exchange tokens, audit events). Wire it to the workspace switcher so opening a client from the operator shell is one click and logged.

This removes the admin key from daily use, gives the dashboard a login, and makes "one founder login" real without touching the client auth Codex just hardened.

### One shell

Implement the shell from [[kendo-port-codex-brief]] once, in `shared/`, and mount every surface inside it:

- Sidebar workspace switcher at the top: **Pulsify (operator)** plus one entry per client. Choosing a client enters an impersonated session with a visible banner.
- Operator workspace views: Overview (the Launchpad), CRM, Leads and Lead Studio, Content, Instagram, YouTube, Payments and Income, Health, Acquisition pages, Integrations, Email, Clients, Settings. These are today's dashboard tabs and admin sections merged into one nav, grouped Kendo-style: top group, then Growth, then Delivery, then Workspace.
- Client workspace views: today's portal sections, unchanged in function.
- The Overview for the operator is the one-click launcher the founder asked for: a grid of every surface (each client portal, each live landing page, each acquisition page, Lead Studio, Campaigns, the legacy hub until it dies), each card showing a status line from the bootstrap payload. The dashboard already has a "Launchpad, everything one click away" block; it becomes the home of the whole product instead of a panel inside one of six apps.
- The Kendo mechanics apply everywhere: state-based view switching, one 150 ms entrance, one easing, layout-matched skeletons, bootstrap once and cache, page header shell, action-carrying empty states, gated actions that still render.

### One data spine

The dashboard's JSON-in-git model has to go. It cannot hold client data, it cannot be queried, and it commits to a public repository every six hours. Move it into D1 tables in the same `pulsify-portal` database the portal already uses (`channel_snapshots`, `ig_snapshots`, `crm_leads`, `content_items`, `health_entries`, plus a generic `metric_points(client_id, source, metric, ts, value)`).

Cloudflare constraint that shapes the design: Pages Functions can produce to Queues but cannot consume them, and Pages has no cron triggers. So add one **companion Worker** (`pulsify-sync`) bound to the same D1 and R2:

- Cron triggers replace the three GitHub Actions workflows (YouTube stats every 6 hours, Instagram daily, YouTube leads).
- Queue consumer processes inbound webhooks off the request path, the way Kendo tells webhook receivers to "respond quickly, process in the background."
- Scheduled token refresh for every long-lived provider token.

Queues run on the free plan with 24-hour retention. Workers Paid at 5 dollars a month raises retention to 14 days and removes the daily request ceiling. Budget for it.

### One integration layer

Extend what exists instead of rewriting. Today: `PROVIDERS` registry with kit, discord, calcom, calendly, whop, stripe, youtube, instagram, zapier; `integrations` table keyed by scope, client, provider with `config_json` and `secret_json`; `integration_events` with a unique index on provider, kind, external id; Stripe signature verification; Kit onboarding automation; Discord alerts; `secret-box.js` AES-GCM. That is a real foundation. Add:

1. **Connection kinds** on each provider definition: `oauth_user`, `api_key_team`, `webhook_in`, `poll`. Drives the connect UI automatically.
2. **Token vault.** Move every `secret_json` through `secret-box.js` with a per-client context, add `expires_at`, `refresh_at`, `last_refresh_error`. The sync Worker refreshes anything within 7 days of expiry.
3. **Status endpoint per provider**, `GET /api/integrations/{provider}/status?client=`, returning `state` (connected, needs_reauth, error, disconnected), `last_sync_at`, `last_event_at`, `counts`. The shell polls this on load exactly as Kendo does.
4. **Sync jobs table** (`integration_syncs`: provider, client, started, finished, items, error) so the Integrations view can show history and the operator can see failures without reading logs.
5. **Outbound webhooks** for clients and for our own automations, copying Kendo's contract: `X-Pulsify-Signature` HMAC SHA-256 over the raw body, `X-Pulsify-Event`, `X-Pulsify-Delivery-Id`, three retries with exponential backoff, delivery history, test sends. Event families for us: `lead.*`, `content.*` (sequence published, retest started, winner picked), `payment.*`, `client.*` (provisioned, onboarding step completed), `integration.*`.
6. **Push API** at `POST hooks.pulsify-ai.com/v1/ingest` with team-scoped `X-API-Key`, accepting leads, DM transcripts, content metrics, and payments. This is how the YouTube scraper, the Composio Instagram puller, Lead Studio, and any Zapier or n8n flow feed the system without a bespoke connector each. Same limits as Kendo to start: 30 requests per minute, 10 MB.
7. **Attribution rule:** exact email or exact handle match, never fuzzy. Unmatched goes to an inbox for the operator.

## Part 4. Connector by connector

What each integration is, how it connects, what we pull, what exists, what blocks it, and honest effort. "Built" means code exists in `output/standard-preview`. Effort assumes Codex building against a spec, and excludes provider review wait time.

| Provider | Why Pulsify needs it | Auth kind | What we pull or push | Prerequisites and blockers | Exists today | Effort |
|---|---|---|---|---|---|---|
| **Instagram (Instagram API with Instagram Login)** | Client and founder profile growth, reels and story metrics, DM inbox for the lead register | Per-user OAuth. Authorize at `instagram.com/oauth/authorize`, exchange at `api.instagram.com/oauth/access_token`, long-lived token via `graph.instagram.com/access_token` valid 60 days, refresh via `refresh_access_token` after 24 hours and before expiry | Profile and media insights, comments, and with the messages scope the DM inbox and replies | Professional (Business or Creator) account. Meta developer app. Scopes `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_content_publish`, `instagram_business_manage_messages`. Messaging and any scope used by other people's accounts need App Review with a screencast; messaging reviews are the strictest. The 24-hour reply window applies, `human_agent` extends it to 7 days for real human replies only. Insights permission name for this API flavor must be confirmed in the Meta dashboard before submitting, it was not on the page I could verify | Delegated-access card only. Read-only inbox pull works via Composio in `ig-report/` | OAuth plus insights: 1 week. Messaging: 1 week of code plus review time. Composio bridge can carry the inbox until review passes |
| **YouTube** | Founder channel and client channels, the primary revenue engine | Public Data API key for public stats (exists, refreshes every 6 hours). Per-user OAuth for Analytics with scopes `yt-analytics.readonly` and `youtube.readonly` | Views, watch time, subscribers, traffic sources, per-video retention, top videos | Google Cloud project with OAuth consent screen. These scopes are sensitive, so Google verification is required before non-test users can connect: privacy policy, homepage, domain verification, demo video. Unverified apps are capped to test users. Data API default quota is 10,000 units a day, `search.list` costs 100 units a call, which is why the lead scraper must stay off the same key | Public stats and the leads scraper exist. No OAuth | 1 week of code. Verification typically weeks, start it first |
| **Kit** | Email delivery after opt-in and after payment, the client's list | API key per client today. Kit v4 also offers OAuth with PKCE and refresh for third-party apps, which is the right model once clients connect themselves | Subscribers, tags, sequences, broadcasts, webhooks for subscribe and purchase events | A Kit developer app for OAuth. Webhook signature verification per Kit's docs | Built: onboarding automation creates subscriber, tag, broadcast | OAuth upgrade 3 days. Inbound webhooks 2 days |
| **Stripe** | Client revenue matched to funnel and content | Restricted read-only key per client (Charges and Invoices read), plus a webhook endpoint with signature verification | Payments, refunds, disputes, customer email for matching | Client creates the restricted key in their Stripe dashboard | Built: webhook with signature check, payments table, Mark-paid trigger | Ranked payment-to-lead matching UI: 4 days |
| **Whop** | Same as Stripe for Whop-based coaches | Company API key with payments read, plus webhooks (`payment.succeeded` and friends, per docs.whop.com) | Payments, memberships | Client generates the key. Verify the webhook signature scheme from Whop's docs during build | Webhook path exists in `hooks.js` | 3 days |
| **Fanbasis** | Common processor in this niche | API with 13 webhook events (`payment.succeeded`, `subscription.created` and so on) per apidocs.fan. The developer docs at dev-docs.fanbasis.com are login gated | Payments, subscriptions | Client account plus API access. Signature scheme unverified until we can read the gated docs | Nothing | 3 days once docs are in hand |
| **Typeform, Cal.com, Calendly** | Application and booking events on landing pages | Inbound webhooks with per-client secrets | Submissions, bookings, cancellations | Client-side webhook setup, or ours on their behalf | Cal.com and Calendly webhook path exists. Typeform arrives through the landing page pipe | 2 days to normalize into one `booking` and `application` event |
| **Wistia** | VSL watch time per prospect | Existing pipe | Play and watch events | None new | Built | 0 |
| **Fathom** | Sales calls and client coaching calls, the Kendo-style call layer if we ever want it | API key from Fathom settings, OAuth for registered apps, webhooks created via API with `include_transcript` and `include_summary`, 60 calls a minute general limit, 30 for transcripts | Recordings, transcripts, summaries, action items | Fathom account (API on all tiers). OAuth app registration for client self-connect | Fathom MCP is connected for reading meetings in this environment. Nothing in the product | 4 days for webhook ingest plus transcript storage. Analysis on top is a separate product decision |
| **Slack or Discord** | Operator alerts | Discord webhook exists. Slack needs an app with `chat:write` and channel selection | Alerts, weekly summaries | Slack app creation if wanted | Discord built | Slack 2 days. Founder decision 2026-07-30 says Slack is not active, so Discord stays default |
| **DocuSign** | Contract signed triggers provisioning | Connect webhook with HMAC | Envelope completed | DocuSign account, HMAC key, a controlled live test | Built, not activated | 1 day to activate |
| **Zapier, Make, n8n** | Everything else | Our Push API plus outbound webhooks | Any | Push API and outbound webhooks from Part 3 | Zapier provider stub | Covered by the layer, 0 extra |
| **Transactional email** | Setup links, codes, invitations, weekly summaries | A provider such as Resend or Postmark with DKIM on pulsify-ai.com | Outbound only | Domain first. Email rail is parked until the domain exists per the master architecture | Drafts exist, no sender | 2 days after domain |

## Part 5. What has to exist before the code works

Accounts and approvals the founder or the operator must create. Codex cannot do these.

1. **Domain:** pulsify-ai.com at a flat-rate registrar, DNS on Cloudflare.
2. **Cloudflare:** Zero Trust team with Google as identity provider and an Access application for the operator paths. Workers Paid plan. A Queue, a cron Worker, and the same D1 and R2 bound to it.
3. **Meta:** a Meta developer account, a Business Portfolio, an app of type Business with the Instagram product added, Business Verification, then App Review for the messaging scope with a screencast of the login, consent, receive, and reply flow. Start this in week 1. It is the longest pole.
4. **Google:** a Cloud project, OAuth consent screen in production mode, verified domain, privacy policy and terms pages on pulsify-ai.com, a YouTube Data API key kept separate from the scraper key, and OAuth verification for the Analytics scopes. Also the longest pole. Start week 1.
5. **Kit:** developer app for OAuth, or keep per-client API keys for the first clients.
6. **Stripe and Whop:** nothing on our side. Each client creates restricted keys. A written one-page guide per processor.
7. **Fanbasis:** request API access and the gated docs.
8. **Fathom:** API key on the founder account now, OAuth app registration when clients connect their own.
9. **DocuSign:** developer account, HMAC secret, one live test envelope.
10. **Email:** Resend or Postmark account with DKIM and SPF on the domain.
11. **Secrets management:** every key above goes into Cloudflare project secrets, never into localStorage or the repo. The break-glass admin key gets rotated once Access is live.

## Part 6. Visual instructions

The full recipe is in [[kendo-port-codex-brief]]. The unification-specific instructions, in priority order:

1. **One font, one token file.** Kill Satoshi on the dashboard and the 11-theme switcher. One `pulsify-ui.css` with Trakyo light and the Kendo-derived warm-dark theme, Inter everywhere until a Geist decision is made. Theme is a per-device Light, Dark, System control on the account view, nothing else.
2. **One shell.** Sidebar, header, workspace switcher, launcher overview as described above. The landing pages stay outside the shell and keep the locked light standard.
3. **One login screen.** The portal login already has the right bones (split panel would improve it). Give it the Kendo left-form right-gradient layout, the same buttons, and an "Operator sign in" that goes to Access instead of an admin key field.
4. **Onboarding checklist and feature intros** exactly as specified in the brief, seeded from the master architecture's onboarding steps, with the Instagram and YouTube steps auto-completing from real integration status.
5. **Integrations view** copies Kendo's page: a hero card that swaps with an icon strip, categorized grid, status pill per connector, a connect dialog per connection kind, and a "Coming soon" state for anything waiting on review so clients see the roadmap instead of a gap.
6. **KPI grid** as the core of every overview, client and operator, with tabular numbers and drill-in.
7. **Kill dashes.** Every missing datum becomes the action that fills it.

## Part 7. Sequence and honest effort

Effort is Codex build time with founder review. Provider review time runs in parallel and is not under our control.

| Phase | Scope | Depends on | Effort |
|---|---|---|---|
| 0. Accounts | Domain, Access, Workers Paid, Meta app and verification submission, Google project and verification submission, email provider | Founder | 2 days of founder time, then waiting |
| 1. Identity and shell | Access in front of operator paths with JWT validation in middleware, dashboard moved behind it, Kendo shell in `shared/`, launcher overview, workspace switcher wired to impersonation, brief Phase 1 mechanics | 0 (domain and Access) | 2 weeks |
| 2. Data spine | D1 tables for dashboard data, companion Worker with cron and queue consumer, GitHub Actions retired, dashboard views rendering from D1 inside the shell | 1 | 2 weeks |
| 3. Integration layer | Connection kinds, token vault, status endpoints, sync log, outbound webhooks, Push API, Integrations view | 2 | 2 weeks |
| 4. Connectors wave 1 | Stripe matching UI, Whop, Kit OAuth and webhooks, Typeform and booking normalization, DocuSign activation, email rail | 3 | 2 weeks |
| 5. Connectors wave 2 | YouTube Analytics OAuth, Instagram OAuth and insights, Instagram messaging behind the Composio bridge until review passes, Fathom ingest | 3 plus provider approvals | 3 weeks of code, approvals gate go-live |
| 6. Visual Phase 2 | Tokens, KPI grid, empty states, intros, checklist, gating | 1 | 2 weeks, can overlap with 3 to 5 |

Roughly a quarter of focused build to reach a product that holds together the way Kendo does, with the two platform approvals started on day one so they land inside that window. Anything shorter is the "quick and easy" the founder said he does not want.

## Part 8. Risks that are real

- **Meta and Google review** can reject or stall. Mitigation: keep Composio for Instagram reads and the public Data API for YouTube until approvals land, and never make the checklist depend on them.
- **Single-file HTML at 885 KB** on the dashboard will fight the shell. Mitigation: the data spine phase splits it into views loaded by the shell, and old `index-*.html` themes are deleted, not carried.
- **Two repositories** drift. Mitigation: after Phase 2 the dashboard repo only holds the scraper tools, and the product lives in one project.
- **Public dashboard today.** Mitigation: Access first, before any redesign.
- **Provider docs gaps** noted above (Whop signature scheme, Fanbasis gated docs, the exact Instagram insights scope name). Mitigation: verify at build time, do not assume.

## Connections

- [[kendo-app-teardown-2026-09-17]] is the evidence for every Kendo claim here.
- [[kendo-port-codex-brief]] is the visual and mechanics build spec this plan schedules.
- [[pulsify-portal-master-architecture]] is the product vision this serves. Onboarding steps and the two-tier model come from there.
- [[funnel-portal-pipeline]] and [[flagship-qa-2026-07-02]] describe the pipe that Phase 3 generalizes.

## Open questions / gaps

- Cloudflare Access free-tier seat count was not verified from the pricing page during this session. Check before adding team members.
- Whop webhook signature scheme and Fanbasis API details need their docs open at build time.
- Whether Pulsify wants call ingestion (Fathom) as a product feature or only as an internal tool is a founder decision.
- Geist versus Inter is a separate visual decision.

## Source trail

- Live inventory of pulsify-funnels.pages.dev, /portal/login, /admin, /integrations, and pulsify-dashboard.pages.dev on 2026-09-17.
- `output/standard-preview/IMPLEMENTATION-CHECKPOINT.md`, `NOTES-AUDIT.md`, `wrangler.toml`, `functions/`, `migrations/`, `AGENT_CHAT.md` entries 2026-09-07 to 2026-09-09.
- `pulsify-dashboard-sdr-build/.github/workflows/*.yml`, `functions/generate.js`.
- docs.kendo.ai: integrations-overview, fathom, zoom, slack, webhooks, push-api, google-workspace, revenue-tracking, security-overview.
- developers.facebook.com: Instagram Platform overview, Instagram API with Instagram Login, Business Login flow. Messaging window and review facts from web search results dated 2026, treat as secondary.
- developers.google.com: YouTube Analytics and Reporting authorization scopes, Data API quota; support.google.com OAuth verification.
- developers.fathom.ai: api-overview and llms.txt. docs.whop.com index. developers.kit.com llms.txt. apidocs.fan for Fanbasis.
- developers.cloudflare.com: Access JWT validation, Pages Functions bindings, Queues limits, Workers cron triggers.

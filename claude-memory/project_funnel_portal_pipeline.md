---
name: project_funnel_portal_pipeline
description: "Live, deployed, multi-tenant funnel pipeline at pulsify-funnels.pages.dev — landing page + per-client auth + client portal; awaiting real Wistia/Typeform/Kit accounts"
metadata: 
  node_type: memory
  type: project
  originSessionId: 240756a4-ac13-4777-8711-e81bd3feb023
---

The connected funnel system the user committed to 2026-06-30 (chosen explicitly to AVOID GoHighLevel — user dislikes GHL's native builder). Flow:

**Landing page** (our coded standard, [[project_landing_page_standard]], Codex's skin) hosted on **Cloudflare Pages** → embeds **Wistia** for the VSL (Wistia tracks watch %/drop-off natively; we dropped the custom HTML5 tracker) + **Typeform** for the application → **the pipe** (`output/portal-pipe/functions/event.js`, a Cloudflare Pages Function) catches the Typeform webhook + Wistia player events, writes to **Cloudflare D1** (`schema.sql`: leads + watch_events tables, scoped per `client`), AND forwards the email to **Kit/ConvertKit** (`addToKit()` → tags subscriber → triggers the email sequence the user builds in Kit). The **client dashboard/portal** reads it via `functions/leads.js` and shows applications + per-lead VSL watch %. Visual demo: `output/portal-pipe/portal-demo.html`.

**Status (2026-07-01, updated same day): LIVE, deployed for real, multi-client, domain renamed off "Frank."** Live infra:
- Cloudflare Pages project **`pulsify-funnels`** → **https://pulsify-funnels.pages.dev** (source = `output/standard-preview/`; `wrangler.toml`'s `name` field points here). The old `pulsify-frank` project still exists in Cloudflare (not deleted, just unused) — user was rightly annoyed a real prospect's name was in official infra; renamed 2026-07-01. Any doc/reference to `pulsify-frank.pages.dev` is stale — use `pulsify-funnels.pages.dev`.
- Cloudflare D1 database `pulsify-portal` (id `764a46f6-9f61-4f45-85b5-7e9a00e8be01`) — same DB bound to both old and new projects, so nothing was lost in the rename. Tables: `leads`, `watch_events`, `client_config`, `page_events`.
- **True multi-tenant now**: `js/funnel-integrations.js` resolves the client from a `?client=` URL query param first (falls back to the page's `data-client` attribute). One deployed `index.html` serves any prospect via `pulsify-funnels.pages.dev/?client=<slug>` — no copied file per prospect. Creating a new outreach page = one `/settings` entry (client id + name + Typeform link; Wistia/Kit/webhook optional, add later only for someone worth nurturing).
- **Per-client portal auth**: `client_config.portal_token_hash` (SHA-256, never stores the raw token). `POST /api/portal-token?client=<id>` (admin-key gated) mints a private link `/client?client=<id>&t=<token>` — the token itself determines the client server-side, ignoring any spoofed `?client=` param. `/leads` accepts either `x-portal-token` (client, scoped to just them) or `x-admin-key` (operator, sees all via dropdown).
- **Client-facing portal**: `output/standard-preview/client.html` (served at `/client`) — 5 tabs (Funnel/Content/Pipeline/Calls/Arsenal). Funnel tab is live-wired; the other four are honest "Pending" states, no fake data.
- **Native Settings page: https://pulsify-funnels.pages.dev/settings** — password-gated (`ADMIN_KEY` Cloudflare secret; current value was shared directly with the user 2026-07-01 since an earlier session withheld it and locked them out of their own settings — don't repeat that, the operator should always hold their own admin key). Now also has a "Generate client link" button (mints the portal token above) and 8 proof-image URL fields.
- Known gotchas: (1) Cloudflare Pages auto-redirects `foo.html` → `/foo`, so an API route can't share a path with a same-named page — Settings API lives at `/api/settings`. (2) Both Cloudflare **secrets** and **Functions bundle changes** can lag one deploy behind on the live domain — if something you just shipped doesn't show up, redeploy once more before assuming the code is wrong.

**Remaining blocker:** user hasn't created real Wistia/Typeform/Kit accounts yet — deliberately deprioritized for outreach-volume pages (Typeform embeds standalone with zero backend config; Kit/webhook only matter once someone's worth nurturing). Priority order after this: per-prospect copy still needs a content-editor (self-edit all page text via Settings, in progress elsewhere) so pages aren't Frank-specific; then launch QA once real accounts exist.

**Honest gotcha:** Typeform webhooks need a paid plan (Professional+); Tally is the free alternative with webhooks — moot for outreach-volume pages since the webhook is skipped there anyway. Strategy = start THIN + per-client (Road A), not full multi-tenant SaaS (see [[project_dashboard_product_vision]]).

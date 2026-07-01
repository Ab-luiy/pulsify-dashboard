---
name: project_funnel_portal_pipeline
description: "Live funnel pipeline — landing page (Wistia VSL + Typeform) → Cloudflare pipe → client dashboard + Kit emails; scaffolded at output/portal-pipe/, awaiting accounts"
metadata: 
  node_type: memory
  type: project
  originSessionId: 240756a4-ac13-4777-8711-e81bd3feb023
---

The connected funnel system the user committed to 2026-06-30 (chosen explicitly to AVOID GoHighLevel — user dislikes GHL's native builder). Flow:

**Landing page** (our coded standard, [[project_landing_page_standard]], Codex's skin) hosted on **Cloudflare Pages** → embeds **Wistia** for the VSL (Wistia tracks watch %/drop-off natively; we dropped the custom HTML5 tracker) + **Typeform** for the application → **the pipe** (`output/portal-pipe/functions/event.js`, a Cloudflare Pages Function) catches the Typeform webhook + Wistia player events, writes to **Cloudflare D1** (`schema.sql`: leads + watch_events tables, scoped per `client`), AND forwards the email to **Kit/ConvertKit** (`addToKit()` → tags subscriber → triggers the email sequence the user builds in Kit). The **client dashboard/portal** reads it via `functions/leads.js` and shows applications + per-lead VSL watch %. Visual demo: `output/portal-pipe/portal-demo.html`.

**Status (2026-07-01): LIVE, deployed for real.** User ran `npx wrangler login` (had a PowerShell execution-policy block; Claude just ran the login itself instead). Live infra:
- Cloudflare Pages project `pulsify-frank` → **https://pulsify-frank.pages.dev** (source = `output/standard-preview/`, this is now the real deploy source, not `output/portal-pipe/` which is reference-only)
- Cloudflare D1 database `pulsify-portal` (id `764a46f6-9f61-4f45-85b5-7e9a00e8be01`), 3 tables: leads, watch_events, client_config
- Pipe (`functions/event.js`, `functions/leads.js`) live and bound to D1 via `output/standard-preview/wrangler.toml`
- **Native Settings page: https://pulsify-frank.pages.dev/settings** — user explicitly asked NOT to paste Wistia/Typeform/Kit details through chat; built a password-gated form (ADMIN_KEY as a Cloudflare secret) that saves straight to the `client_config` D1 table via `functions/api/settings.js`. Kit API key never touches chat or Claude's context after entry; comes back masked on read.
- Known gotcha fixed: Cloudflare Pages auto-redirects `foo.html` → `/foo` (clean URLs) — so an API route can't live at the same path as a same-named page. Settings API had to move to `/api/settings` to avoid colliding with `/settings.html`→`/settings`.

**Remaining blocker:** user hasn't created the Wistia/Typeform/Kit accounts yet — once they do, they paste the values into the live Settings page themselves (not chat) and it's fully wired.

**Honest gotcha:** Typeform webhooks need a paid plan (Professional+); Tally is the free alternative with webhooks. Strategy = start THIN + per-client (Road A), not full multi-tenant SaaS yet (that's the parked direction — this is the seed of it; see [[project_dashboard_product_vision]] and the "are we SaaS?" discussion). Architecture briefed to Codex in AGENT_CHAT but NOT yet codified into wiki/synthesis (was still settling).

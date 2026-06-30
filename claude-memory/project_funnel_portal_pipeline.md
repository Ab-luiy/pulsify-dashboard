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

**Status (2026-06-30):** fully SCAFFOLDED with placeholders, NOT deployed. Verified locally. Blockers are all account/auth steps Claude can't do (can't create accounts or log into Cloudflare): user must run `npx wrangler login` (then Claude deploys the static page to a live URL — no other accounts needed for that), and create **Wistia + Typeform + Kit** accounts. Then Claude plugs in IDs/keys + binds D1 + deploys the pipe.

**Secrets rule:** user pastes only NON-secret IDs to chat (Wistia media ID, Typeform form link, Kit Tag ID); the **Kit API key is a secret** → user sets it themselves as a Cloudflare secret (`wrangler pages secret put KIT_API_KEY`), never in chat.

**Honest gotcha:** Typeform webhooks need a paid plan (Professional+); Tally is the free alternative with webhooks. Strategy = start THIN + per-client (Road A), not full multi-tenant SaaS yet (that's the parked direction — this is the seed of it; see [[project_dashboard_product_vision]] and the "are we SaaS?" discussion). Architecture briefed to Codex in AGENT_CHAT but NOT yet codified into wiki/synthesis (was still settling).

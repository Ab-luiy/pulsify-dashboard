---
name: project_funnel_view_tracking
description: Funnel view/watch tracking + off-page asset tracking shipped to pulsify-funnels 2026-07-06
metadata: 
  node_type: memory
  type: project
  originSessionId: 3de2118a-c944-48b6-9e22-6bee3f810846
---

Shipped 2026-07-06 (deployed to pulsify-funnels, source landed in brain main bf173ea). Founder asked to "see if leads opened the landing page / watched the VSL, to hammer warm leads," and to build everything relevant without asking.

Key recon fact: the tracking PIPE already existed and was live before this build — `/event` receiver, `page_events` + `watch_events` tables, `/api/campaigns` (per-page visitors/watch%/signal), `/leads` (full per-viewer watch breakdown), hot-watch Discord alert at 75%. It was just buried in `/admin` section 05 "Pages sent" and the founder didn't know it was there. Each prospect already has their own URL (`/?client=slug`) so a visit ~= that prospect.

What this build ADDED (migration 0010_view_tracking.sql, additive only):
- Per-prospect **View activity** drawer on the Pages sent board — reads `/leads`, shows each viewer's watch depth, watch time, plays, last-watched, applied-or-not. The "did THIS person watch" view.
- **Off-page asset tracking**: `functions/api/assets.js` (admin-key CRUD) mints `pulsify-funnels.pages.dev/a/{token}` links; `functions/a/[token].js` logs the open (IP/geo/UA) then 302s to any Google Doc/Gamma/URL. Manage + see open counts in the "Tracked assets" panel under Pages sent. This is the one capability that didn't exist (can't track a raw doc, can track a redirect to it).
- **IP + geo** on every event: event.js reads cf-connecting-ip + request.cf.country/city + user-agent into page_events (ip/country/city/user_agent) and watch_events (ip/country).
- Home overview shows "pages with activity: N of M".

Deploy specifics (funnels, NOT the dashboard): D1 = `pulsify-portal` (binding DB, id 764a46f6), Pages project `pulsify-funnels`. Deploy = `wrangler d1 execute pulsify-portal --remote --file=migrations/NNNN.sql` then `wrangler pages deploy . --project-name pulsify-funnels --branch main` from `output/standard-preview/`. GH Actions `deploy.yml` deploys ONLY pulsify-dashboard, so funnels never auto-deploys from main and never auto-reverts — but always land funnels source in main so the next manual deploy builds from it. Migration MUST run before code deploy (new-column INSERTs throw otherwise). Funnels source of truth = `output/standard-preview/` on brain main. See [[feedback_codex_builds_claude_specs]], [[project_integrations_hub_i1]], [[project_funnel_portal_pipeline]].

Founder-side to activate alerts: set a Discord webhook in `/integrations` to get "Asset opened" + hot-watch pings. Board stays empty until a real prospect visits a sent page.

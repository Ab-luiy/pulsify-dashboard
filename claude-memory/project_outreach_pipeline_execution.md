---
name: project_outreach_pipeline_execution
description: "2026-07-02: outreach-to-client roadmap executed end to end — provisioning flow, Lead Studio bridge, /campaigns board, portal tab backends, failure logging all LIVE; remaining blockers are user-side"
metadata: 
  node_type: memory
  type: project
  originSessionId: cc907dfe-a522-400a-9d8e-cc8bf17d666d
---

On 2026-07-02 the buildable remainder of `wiki/synthesis/outreach-to-client-pipeline-roadmap.md` shipped in one run (five Sonnet subagent builds, each locally verified, deployed live by me):

- **Provisioning flow** (`/settings`, pulsify-funnels): "New prospect page" — paste creator brief -> copy rules-encoded LLM prompt (or one-click `POST /api/generate`, Gemini-preferred then Anthropic, 501 until a key is set) -> paste token JSON -> creates client_config row -> sendable link + both preview links. Prompt spec lives in `js/provision-prompt.js` (browser) + `functions/_shared/provision-prompt.js` (server twin).
- **Lead Studio bridge** (pulsify-dashboard repo, pushed to main, live): new "Landing page" asset type builds the same token JSON from a lead's creator profile; "Create live page" POSTs to pulsify-funnels `/api/settings` (operator pastes funnels ADMIN_KEY once, localStorage `pulsify_funnels_admin_key`). Repos stay separate; the bridge is a direct API call, no shared D1.
- **/campaigns board** (admin-gated): all sent pages with visits, max watch %, applications, 7d failure count, last activity, follow-up signal (applied > hot >= 50% watch > visited > no activity). Backed by `/api/campaigns`.
- **Client portal tabs live**: Content/Calls/Arsenal on new D1 tables (migration 0006: content_items, call_notes, client_assets), `/api/client-data` (dual auth like /leads, tenant isolation verified), operator Delivery editor in `/portal`, honest empty states in `/client`. Pipeline tab stays pending (dashboard revenue data, no shared schema — deliberate).
- **Hardening**: `delivery_failures` table (migration 0007), Kit/webhook failures logged fail-soft in event.js, admin `/api/health` (24h counts, 7d failures, recent 20). Playbooks: `wiki/playbooks/prospect-signed-onboarding.md` (untested until first signing) + `wiki/playbooks/landing-page-launch-qa.md`.

**Why:** this makes 10-15 outreach pages/day operationally real — one flow from CRM lead to sendable link, one board to watch them all.

**How to apply / operational gotchas:**
- Deploying pulsify-funnels from a worktree WITHOUT `--branch main` creates a PREVIEW deployment (branch-aliased URL) and production never updates — always `npx wrangler pages deploy . --project-name pulsify-funnels --branch main`. This is likely what earlier sessions saw as "propagation lag."
- Still user-side: create Wistia/Typeform/Kit accounts; click-test the new authed UIs with the real ADMIN_KEY (I don't hold it — all authed-path verification was local with a dev key); optionally set GEMINI_API_KEY on the pulsify-funnels Cloudflare project to enable one-click generation (else the copy-prompt path works free).
[[project_funnel_portal_pipeline]] [[project_landing_page_standard]] [[project_lead_studio]]

---
name: project_lead_studio
description: "CRM Lead Studio — enlarge a lead, fill+save its info, generate a Claude-API asset, and keep a tracked asset history per lead"
metadata:
  node_type: memory
  type: project
  originSessionId: PLACEHOLDER
---

Built + deployed 2026-06-23 (see [[project_deploy_pipeline]]). Extends the pre-existing Asset Builder drawer in `awesome-bassi/index.html` into **"Lead Studio"**: per-lead enlarge → editable saved info → Claude-API asset generation → **tracked, persisted asset history**.

- **Enlarge** affordance: a `⛶` button on each CRM kanban card (top-right, next to delete) + the relabeled "⚡ Enlarge & build asset" button; both call `window.openAssetBuilder(name,...)`. A `⚡ N` badge on the card shows how many assets are tracked.
- **Editable saved info** (persists to `state.overrides[name]` in localStorage `pulsify_crm_v1` via `setOverride`, auto-saved on field `change`): email/contact, offer angle, problem identified, private notes, handle. Reloads when the lead is reopened. The drawer header shows a live meta row (tier/score/subs/status/wound/video link) via `window.getLeadByName`.
- **Asset generation**: existing browser-direct Anthropic call (`api.anthropic.com/v1/messages`, model `claude-sonnet-4-5`, key in localStorage `pulsify_api_key`). Prompt now also includes offer angle + notes. On success the asset auto-saves.
- **Tracked history**: each generated asset is pushed to `overrides[name].assets[]` as `{id,type,text,ts}` (newest first) via `window.pushLeadAsset`; rendered as a collapsible list with type + timestamp + Copy + Delete (`window.deleteLeadAsset`). Survives reloads.

Bridge fns exposed from the CRM IIFE: `getLeadByName`, `getLeadExtra`, `pushLeadAsset`, `deleteLeadAsset` (alongside existing `setOverride`, `renderCrm`). Verified end-to-end in preview (fields persist, asset tracks, card badge updates). [[project_hta_dashboard]] [[project_dashboard_product_vision]]

Later chronology (moved from the index, 2026-07-09):
- 2026-06-28: added "Short opener (1-liner)" mode (recurring-theme hook + gap question, reverse-pitch banned, fed by Perplexity prompt's Section 9); replaced "Outreach DM" with a "Typeform (application form)" generator (later parked, see [[project_typeform_parked]]).
- 2026-06-28 (ef6e07e): added "Full email sequence" (5-email arc, creator's voice, Humanizer standard) + "Ad scripts" (3 DR angles, Jeremy Haynes/Megalodon style: Hook-Body-CTA, PAS); optional "More on them" field fed into every gen; buildPrompt extracts VOICE + UNIQUE MECHANISM and applies a global HUMANIZER rule block; problem field became OPTIONAL (transcript the only hard requirement). Parked pending user-supplied structured input (offer architecture, lead magnets). Skipped per user: sales call scripts.
- 2026-06-28 (b2590cc): two-step "Creator profile" flow — "Build profile from transcript" runs our own version of the Perplexity extraction (8 sections incl. recurring hook) through the /generate Cloudflare proxy into an editable per-lead Creator profile field; asset gen uses that profile as primary source. LLM calls go through functions/generate.js (server-side key, browser field optional).
- 2026-06-28 (3e5e7ff): user refused to top up Anthropic credits (key valid, $0 balance) so /generate is provider-flexible: prefers GEMINI (gemini-2.5-flash free tier, needs GEMINI_API_KEY in Cloudflare Production, aistudio.google.com; Google may train on free-tier data — we only send public transcripts) else Anthropic; Gemini responses normalized to Anthropic shape. Manual always-free fallback: Copy-prompt button → paste into free Claude.ai/ChatGPT/Gemini.

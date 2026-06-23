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

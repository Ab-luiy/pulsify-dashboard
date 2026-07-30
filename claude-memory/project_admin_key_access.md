---
name: project-admin-key-access
description: Where the pulsify-funnels ADMIN_KEY actually lives and how to use it without asking the founder (he does not know the value)
metadata: 
  node_type: memory
  type: project
  originSessionId: d0a1e83b-23b7-45e9-82f1-3c3853f07418
  modified: 2026-07-30T08:09:21.603Z
---

**Founder directive 2026-07-28: never ask him for the admin key.** He does not know the value and should not have to. Treat it as something I retrieve myself.

**Where it is.** Not on disk. Verified 2026-07-28: no `.env` anywhere on the Desktop, no assignment-shaped hit outside test fixtures and page source. The only real copies are:

1. **Browser storage on `pulsify-funnels.pages.dev`** under key `pulsify_admin_key` (`localStorage` and `sessionStorage`, with fallbacks `pulsify_settings_admin_key`, `pulsify_portal_admin_key`, `pulsify_integrations_admin_key`, `pulsify_campaigns_admin_key`, `admin_key`). See `output/standard-preview/admin/console.js:6-13`.
2. **Cloudflare** as the server-side env var for the Pages project.

**How the API takes it:** header `x-admin-key`. Gated endpoints include `/api/assets`, `/api/clients`, `/api/settings`, `/api/integrations`.

**How to use it without handling the secret:** drive `/admin` in his Chrome. The unlock field is prefilled from stored storage (`console.js:347`), so the panel auto-unlocks and the UI does the authenticated calls. The value never enters chat or my context.

⚠️ **Blocker hit 2026-07-28:** the permission classifier denied both navigating the browser to `pulsify-funnels.pages.dev/admin` and reading `localStorage` wholesale (the latter reasonably, it looks like credential harvesting). Until the founder approves browser access to that origin, or the key lands in a gitignored `.env` as `FUNNELS_ADMIN_KEY` at the vault root, admin-gated actions cannot be completed agent-side. Do not work around the classifier; ask him to open the path.

**Durable fix worth pushing for:** `FUNNELS_ADMIN_KEY` in a gitignored `.env` at the vault root. He can copy the value out of the prefilled `/admin` unlock field in his own browser without needing to know it beforehand. That makes it readable by every future session and by `tools/crm_sync.py`, which already expects that variable name.

Related: [[project-crm-cross-browser-sync]], [[project-funnel-view-tracking]], [[project-operator-console]].

---
name: project_d1_direct_access
description: CRM/D1 writes never need the admin key - Cloudflare MCP and local wrangler both have direct authenticated access
metadata: 
  node_type: memory
  type: project
  originSessionId: eb2a5b3a-9f3e-46e1-99fd-e0b1c315de61
  modified: 2026-08-24T14:01:47.825Z
---

The `FUNNELS_ADMIN_KEY` blocker is not real for database work. Two authenticated routes exist on this machine:

- **Cloudflare MCP** (`mcp__plugin_cloudflare_cloudflare-bindings__d1_database_query`) - full read/write on D1. The only database is `pulsify-portal`, uuid `764a46f6-9f61-4f45-85b5-7e9a00e8be01`, 35+ tables.
- **`npx wrangler`** - already logged in with full scopes. Use `npx wrangler d1 execute pulsify-portal --remote -y --file=x.sql` for bulk writes, since passing 20KB of SQL through the MCP wastes context.

**Why:** [[project_admin_key_access]] says to never ask him for the admin key and to drive `/admin` in his Chrome instead. That is still right for *UI* actions, but it is the wrong instinct for data. Claude-in-Chrome is frequently not connected, and D1 was reachable directly the whole time.

**How to apply:** treat D1 writes as dangerous and reversible-by-design. Check whether the target table is empty first (additive beats destructive), look for existing rows under different keys before inserting (display-name vs handle duplicates are easy to create), and always write down the exact revert query.

CRM shape, READ FROM THE DEPLOYED CODE not inferred from data (I inferred once and got it wrong): the dashboard IS this repo, `origin` = pulsify-dashboard, and the live UI is `origin/main:index.html` (~1MB, 10.6k lines). The local index.html is stale, always `git show origin/main:index.html`. Vocabulary lives at ~line 8256: `STATUSES = ["new","building","sent","follow-up","replied","call-booked","won","dead"]` with labels New/Freebies/Sent/Followed up/Replied/Call booked/Won/Dead. Manually added leads (`crm_added`) use `stage: "new-lead"` and payload `{n,h,niche,dms,stage,_ts}`. `crm_overrides` carries `{status,batch,notes,_ts}` keyed by lead name. GOTCHA: `mergedPros()` hardcodes `_source:"manual"` on added leads, so they never show under the IG chip until that is fixed.

Related: [[project_admin_key_access]], [[project_lead_studio]], [[project_crm_cross_browser_sync]], [[project_cloudflare_mcp_setup]]

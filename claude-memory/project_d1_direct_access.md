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

CRM shape: base leads live in `yt_leads.json` keyed by display name. `crm_overrides` layers status on top, keyed by name, statuses observed are `new`/`building`/`sent`/`dead`. `crm_added` holds manually added leads as `{n,h,niche,dms,stage,_ts}`. Neither table has a CHECK constraint and the canonical dashboard repo is NOT on this machine, so the stage vocabulary is inferred, not verified - do not invent new enum values.

Related: [[project_admin_key_access]], [[project_lead_studio]], [[project_crm_cross_browser_sync]], [[project_cloudflare_mcp_setup]]

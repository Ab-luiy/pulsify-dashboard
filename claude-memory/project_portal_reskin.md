---
name: project_portal_reskin
description: "Two-portal design system — operator dashboard in Obsidian&Brass (Lane A), client portal in Ivory Editorial (Lane B), shared brass+ink accent"
metadata: 
  node_type: memory
  type: project
  originSessionId: d6966459-9f75-459a-b63a-53a89db26f4d
---

As of 2026-06-22 the dashboard moved off the all-crimson theme to a two-portal design system, hybrid by surface:

- Operator dashboard (`index.html`) = **Lane A "Obsidian & Brass"** — near-black + brass/champagne `#c9a55c` (`--accent`), with `--on-accent: #1c1407` dark ink for text sitting on brass fills (badges, active toggles, done-checks, checkmark, control buttons). Crimson is DEMOTED to alert-only (`--alert: #ef5350`, plus existing `--danger`), no longer the UI theme. The old neon-lime (`#d4ff3a`) and lime tints (`rgba(212,255,58,…)`) in the YT/asset-builder section + chart/stage palettes were folded into brass-gold `#d9b66a`. Reskin was token-driven (101 var refs did the bulk) + ~14 literal swaps.
- Client portal (`client.html`, NET-NEW file) = **Lane B "Ivory Editorial"** — warm bone `#f4f0e6`, ink `#1c1a16`, Fraunces serif display, brass accent. Only 3 tabs: My Funnel, Content, Pipeline (user deselected a standalone Action Plan tab — prescriptive gap+fix cues are woven INTO each tab instead). Demo client = "Meridian / Jordan Rivera", placeholder data, trading-creator flavored.
- Shared accent system across both portals = brass gold + ink (same family, so they read as one product).
- `reskin-concept.html` = scratch direction-chooser (two lanes side by side); safe to delete.

**Why:** user asked to redesign two portals (founder + clients) "with Claude design"; chose direct in-repo reskin, visual-only, hybrid lanes (A operator / B client).
**How to apply:** keep operator dark/brass + client ivory; reserve crimson/red for genuine ALERTS only; any new client-portal content must stay prescriptive (show the client their gaps + the fix). Work was done in worktree `wonderful-curran-8c48be` on branch `claude/wonderful-curran-8c48be` — NOT yet merged to `main`/live. [[project_dashboard_product_vision]] [[project_deploy_pipeline]] [[project_canonical_dashboard_worktree]]

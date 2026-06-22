---
name: project_portal_reskin
description: "Two-portal design system — operator dashboard in Obsidian&Brass (Lane A), client portal in Ivory Editorial (Lane B), shared brass+ink accent"
metadata: 
  node_type: memory
  type: project
  originSessionId: d6966459-9f75-459a-b63a-53a89db26f4d
---

As of 2026-06-22 the dashboard moved off the all-crimson theme to a two-portal design system, hybrid by surface:

- Operator dashboard (`index.html`) = **Lane A "Obsidian & Brass"** — near-black + brass/champagne `#c9a55c` (`--accent`), with `--on-accent: #1c1407` dark ink for text sitting on brass fills (badges, active toggles, done-checks, checkmark, control buttons). Crimson is DEMOTED to alert-only (`--alert: #ef5350`, plus existing `--danger`), no longer the UI theme. The old neon-lime (`#d4ff3a`) and lime tints (`rgba(212,255,58,…)`) in the YT/asset-builder section + chart/stage palettes were folded into brass-gold `#d9b66a`. Reskin is token-driven (token block identical across versions) + global literal swaps + ~5 white-on-brass contrast fixes. IMPORTANT: first mistakenly applied to a STALE 300KB copy in worktree `wonderful-curran-8c48be`; on 2026-06-22 user flagged that the LIVE dashboard is the 419KB version in `awesome-bassi-d88340` (8 tabs incl Health + Instagram, deploys to pulsify-dashboard.pages.dev) — reskin was REDONE on that current version. Also retuned Health-tab macro/calorie bars (protein bar detached from --accent to --danger; hBarGrad crimson→terracotta).
- Client portal (`client.html`, NET-NEW file) = **Lane B "Ivory Editorial"** — warm bone `#f4f0e6`, ink `#1c1a16`, brass accent. Type is minimalist all-Inter (Fraunces serif display was DROPPED 2026-06-22 at user request — "font needs to be minimalistic"); JetBrains Mono kept for data labels. Only 3 tabs: My Funnel, Content, Pipeline (user deselected a standalone Action Plan tab — prescriptive gap+fix cues are woven INTO each tab instead). Demo client = "Meridian / Jordan Rivera", placeholder data, trading-creator flavored.
- Shared accent system across both portals = brass gold + ink (same family, so they read as one product).
- `reskin-concept.html` = scratch direction-chooser (two lanes side by side); safe to delete.

**Why:** user asked to redesign two portals (founder + clients) "with Claude design"; chose direct in-repo reskin, visual-only, hybrid lanes (A operator / B client).
**How to apply:** keep operator dark/brass + client ivory; reserve crimson/red for genuine ALERTS only; any new client-portal content must stay prescriptive (show the client their gaps + the fix). Finished files copied to Desktop for easy review: `C:\Users\Abdullah\Desktop\pulsify-operator-dashboard.html` (reskinned current 419KB) + `pulsify-client-portal.html` (minimalist client). NOT yet integrated into `awesome-bassi-d88340` or deployed — deploy = copy both into awesome-bassi → merge to `main` → Cloudflare. The [[project_canonical_dashboard_worktree]] note (awesome-bassi is the only usable/live worktree) is CONFIRMED correct — `wonderful-curran-8c48be` was a stale throwaway. [[project_dashboard_product_vision]] [[project_deploy_pipeline]] [[project_canonical_dashboard_worktree]]

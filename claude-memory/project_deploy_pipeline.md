---
name: project_deploy_pipeline
description: "How the dashboard deploys — Cloudflare Pages from main, but main is far behind the canonical branch"
metadata: 
  node_type: memory
  type: project
  originSessionId: d8811b9e-a4c1-40dc-b3ef-9f86fa6a4460
---

The live dashboard is **Cloudflare Pages** at **https://pulsify-dashboard.pages.dev**, deployed by `.github/workflows/deploy.yml` **only on push to `main`** (wrangler `pages deploy`, behind Cloudflare Access auth). Remote: `github.com/Ab-luiy/pulsify-dashboard`.

**Critical gap (as of 2026-06-13):** `main` is ~22 commits / ~90KB behind the canonical branch `claude/awesome-bassi-d88340` — `main`'s tip is literally a commit called "test". The *entire* real dashboard (CRM, YT Leads, Asset Builder, Prompt Vault, Health, the Instagram tab) lives UNMERGED on `awesome-bassi` and has **never been deployed**. So the live Cloudflare site has been stale; the user views the dashboard **locally** (serve the canonical worktree — see [[dashboard-verification-workflow]]).

To make changes go live: merge `awesome-bassi` → `main` → auto-deploys. **First real merge will deploy all 22 commits at once — confirm scope with the user before doing it.**

Weekly **YT** lead gen already runs via `.github/workflows/refresh-yt-leads.yml` (cron Mon 06:00 UTC → `tools/scrape_yt_leads.py` → `inject_yt_leads.py` → commit/push to main). The IG lead-gen equivalent ([[project_composio_ig_bridge]]) should mirror this once its scraping method is decided. Related: [[project_canonical_dashboard_worktree]].

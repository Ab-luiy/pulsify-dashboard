---
name: project_deploy_pipeline
description: "How the dashboard deploys — Cloudflare Pages from origin/main; deploy by fast-forwarding a commit based on origin/main (prod gets data-only auto-commits on a stale code base)"
metadata:
  node_type: memory
  type: project
  originSessionId: d8811b9e-a4c1-40dc-b3ef-9f86fa6a4460
---

Live dashboard = **Cloudflare Pages** at **https://pulsify-dashboard.pages.dev**, auto-deploys **on push to `main`** of remote `origin` = `github.com/Ab-luiy/pulsify-dashboard` (separate from the `brain` backup remote). `.github/workflows/deploy.yml` (wrangler pages deploy).

**Deploy mechanic (learned 2026-06-23, IMPORTANT):** `origin/main` is the source of truth for what's live, and it receives **automated data-only commits** — daily "Refresh IG analytics" (→ `dashboard-data-v2.json`) and weekly "Refresh YT leads" (→ embedded data in `index.html`, `yt_leads.json`) via the refresh workflows. These land on `origin/main` on top of an **older code base** — the real, current dashboard CODE lives UNCOMMITTED in the `awesome-bassi-d88340` working tree (the committed `claude/awesome-bassi-d88340` branch is many commits BEHIND `origin/main`). So:
- **Do NOT** push the `awesome-bassi` branch to main (it's behind → non-FF, and a force-push would wipe the auto data-refresh commits).
- **DO** base the deploy commit on `origin/main`: `git fetch origin`; `git worktree add --detach <tmp> origin/main`; copy the working-tree `index.html` (+ any changed code files) into it; `git add`; commit; `git push origin HEAD:main` (clean fast-forward). This preserves the IG/YT data refreshes. Verify with `git merge-base --is-ancestor origin/main HEAD` before pushing.

**Mirage redesign + CRM Lead Studio deployed this way on 2026-06-23** (commit 24e0ae7, FF on top of 6e15f60). See [[project_portal_reskin]] and [[project_lead_studio]].

**TRAKYO redesign deployed 2026-06-27** (commit 09366bc, clean FF on top of c3f7718). Method confirmed working exactly as documented: `git worktree add -B <tmp> origin/main` → back up Mirage to `index-mirage.html` → `cp index-trakyo.html index.html` → commit (only index*.html) → `git push origin <tmp>:main`. The `awesome-bassi` branch was 17 data-only commits behind origin/main but origin/main's `index.html` was IDENTICAL to the branch's, so no data transplant was needed. See [[project_dashboard_v3_backlog]] for what shipped.

**Swap-back backups (newest first):** `index-mirage.html` = the Mirage design (live before Trakyo); `index-classic.html` = the pre-Mirage crimson/brass design. Both committed alongside `index.html` on main. User wants to **swap back on command**. To revert: in a worktree based on `origin/main`, `cp index-mirage.html index.html` (or `index-classic.html`), commit, push to main (FF) — Cloudflare redeploys.

Note: live site is behind Cloudflare Access auth; user also views the dashboard **locally** by serving the canonical worktree — see [[project_dashboard_verification]]. Related: [[project_canonical_dashboard_worktree]].

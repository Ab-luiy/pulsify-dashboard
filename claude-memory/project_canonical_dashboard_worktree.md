---
name: canonical-dashboard-worktree
description: Source of truth for the dashboard is origin/main of pulsify-dashboard, NOT the awesome-bassi worktree (which has fallen behind) — deploy by editing on top of origin/main
metadata: 
  node_type: memory
  type: project
  originSessionId: 16a9dcb5-b1d1-4286-b857-a7f08285b123
---

The real source of truth for the dashboard is **`origin/main` of `github.com/Ab-luiy/pulsify-dashboard`** (remote `origin`), which is what Cloudflare Pages deploys to `pulsify-dashboard.pages.dev`.

As of 2026-06-28 the `awesome-bassi-d88340` worktree is **20 commits BEHIND `origin/main`** and is no longer canonical. main has since shipped the Trakyo redesign, CRM pagination, the payouts pie, and daily IG analytics refreshes that awesome-bassi never received. Its `index.html` is ~2,600 lines smaller than main's. Earlier note (now wrong): "awesome-bassi is the only canonical worktree, all others unusable."

**Why:** main moves on its own (data-only auto-commits + other sessions' work). Treating any local worktree as canonical and deploying its index.html would silently revert everything main gained. I almost reverted 20 commits of prod this way before checking `git rev-list --left-right --count origin/main...HEAD`.

**How to apply:** Do NOT assume awesome-bassi (or any worktree) holds the latest. Before any dashboard deploy, `git fetch origin` and diff against `origin/main`. To ship a change, create a detached worktree off `origin/main` (`git worktree add --detach <tmp> origin/main`), apply the edit there, verify `git diff` is only your hunks, commit, and `git push origin HEAD:main` (fast-forward). Note remotes: `origin` = pulsify-dashboard (deploy), `brain` = pulsify-brain (autosync backup, unrelated to deploy). See [[deploy-pipeline]] and [[hta-dashboard]].

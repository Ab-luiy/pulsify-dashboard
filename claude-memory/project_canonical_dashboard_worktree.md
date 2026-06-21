---
name: canonical-dashboard-worktree
description: The single canonical dashboard worktree is awesome-bassi-d88340 — all other worktrees under .claude/worktrees/ are unusable and must not be edited
metadata: 
  node_type: memory
  type: project
  originSessionId: 16a9dcb5-b1d1-4286-b857-a7f08285b123
---

The canonical dashboard lives in `C:\Users\Abdullah\Desktop\Pulsify-Brain\.claude\worktrees\awesome-bassi-d88340\` on branch `claude/awesome-bassi-d88340`. This is the only worktree the user actively uses.

All other worktrees under `.claude/worktrees/` (sweet-liskov-2291de, angry-swanson-97a07a, friendly-engelbart-1b1e4d, silly-gates-9a31c3, …) are considered unusable — do not edit them, do not propose work in them, do not reference them as the source of truth.

**Why:** The other worktrees are stale/abandoned single-commit branches. awesome-bassi is the one with the real history — YouTube/Instagram/Cal.com/Typeform API integration, Content tab rework, layout fixes, README, assets/, chats/, project/ folders.

**How to apply:** Before editing any dashboard file under `Pulsify-Brain/`, confirm cwd is the awesome-bassi worktree. If invoked from a different worktree, switch over (cd, or open a fresh session there) before making changes. The deployed site `pulsify-dashboard.pages.dev` is built from `main` of `github.com/Ab-luiy/pulsify-dashboard`, so changes must land on main from this worktree's branch. See [[hta-dashboard]] for product context.

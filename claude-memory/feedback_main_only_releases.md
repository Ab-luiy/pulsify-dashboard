---
name: feedback-main-only-releases
description: pulsify-saas releases come from main only; main must always equal what is live
metadata:
  type: feedback
---

HARD 2026-10-01: pulsify-saas `main` is the one true copy and always equals what is live. Never release from a side branch or worktree. Land work on main, push, then `npm run release` from the main checkout (C:/Users/Abdullah/Desktop/pulsify-saas), then deploy Pages from the Brain.

**Why:** the live site had been built from side branches (claude/infoos-build, claude/graphite-preview) while main sat 64 commits behind; anyone building from main would have wiped a week of work. It nearly happened again the same day when another session deployed claude/graphite-preview after I had released from main; I had to merge it into main and re-release.

**How to apply:** before any release `git checkout main && git pull`. The release script refuses a dirty, unpushed or non-main checkout and writes app/release.json (commit shipped). If another session deployed since, merge their branch into main first. Delete merged branches and remove their worktrees after landing. Rule is in pulsify-saas CLAUDE.md, "Branches and releases". Related: [[project_ticket_board]], [[feedback_no_personal_details_public]].

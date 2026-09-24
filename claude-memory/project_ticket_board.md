---
name: project-ticket-board
description: "2026-09-24 founder adopted tickets; all Pulsify SaaS work lives in GitHub Issues on Ab-luiy/pulsify-saas, labelled by owner, milestones Step 0 -> Build queue -> Later"
metadata:
  node_type: memory
  type: project
  originSessionId: 667d93ee-0214-4df3-8e69-9ddb9ae2fed0
  modified: 2026-09-24T14:27:51.094Z
---

Founder said "set up tickets" on 2026-09-24 (a friend, Adiv, recommended breaking work into tickets instead of long essays). Board = GitHub Issues on Ab-luiy/pulsify-saas: #2-#8 Step 0 (new PropelAuth sign-in), #9-#19 Build queue (D1 design first, Growth G1 deliberately last), #20-#21 Later. Labels `owner: claude|codex|founder`, `type: design|backend|decision`, `idea`. Workflow is written in pulsify-saas/CLAUDE.md "Work tracking".

**Why:** the cloud session's plan lived in a sandbox doc and nearly got lost; one shared board keeps Claude, Codex and the founder on the same list.
**How to apply:** at the start of any SaaS work, run `gh issue list -R Ab-luiy/pulsify-saas` and work one ticket at a time; new work becomes a ticket first; close with "Fixes #n" or a closing comment. The GitHub Project board view needs the founder to run `gh auth refresh -s project` once (token lacks project scope as of 2026-09-24). Related: [[project-nextjs-migration]].

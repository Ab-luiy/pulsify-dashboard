---
name: codex-builds-claude-specs
description: "Standing division of labor — Claude thinks, plans, specs, and reviews; Codex implements, tests, and executes"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5037780b-f8fe-40fc-ae66-c468a7f53224
  modified: 2026-09-23T08:38:53.755Z
---

> OVERRIDE 2026-09-23: founder said "we're gonna be working in Claude for now" - Claude executes code A-Z (briefs, builds, tests, deploys) itself; do not hand off to Codex until he reverses it. Still log and lock in AGENT_CHAT.md. First job under this: the React/Next.js + TypeScript migration of output/standard-preview, see [[project-nextjs-migration]].

Founder-confirmed standing directive, reaffirmed 2026-07-30: implementation work goes to Codex. Claude is the default LLM and owns the deep thinking: research, recon, planning, specifications, copy judgment, and review. Codex owns agentic coding, file changes, tests, verification, automation implementation, website builds, and deployment from Claude's direction.

This division is no longer conditional on Fable access. Fable-grade remains the quality standard; it is not a required runtime dependency.

**How to apply:** Claude hands Codex a self-contained build brief with file paths, constraints, and acceptance checks. Codex executes and self-verifies without calling Claude back unless the founder explicitly asks or a high-risk unresolved decision genuinely requires it. When Claude is near a session limit, preserve its remaining turns for judgment and planning, not implementation or routine review. Log coordinated work in AGENT_CHAT.md.

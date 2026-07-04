---
name: codex-builds-claude-specs
description: "Standing division of labor — Claude specs and reviews, Codex writes the code; Claude does not build directly while on Fable"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5037780b-f8fe-40fc-ae66-c468a7f53224
---

Directive 2026-07-04: implementation work is handed to Codex (`codex exec --sandbox workspace-write`), always. Claude's job is the deep thinking: recon the code, write a self-contained spec with file paths and acceptance criteria, dispatch Codex as builder, then review the diff before deploy.

**Why:** Fable turns are scarce (access ends ~July 7 or at 50% Fable weekly — already past that reading); spend them on judgment, not typing. See [[fable-grade-quality]] and the cross-call protocol in AGENT_CHAT.md.

**How to apply:** After Fable is gone, the pattern shifts to: Opus 4.8 xhigh does the deep thinking/spec, then Claude codes directly with Sonnet 5.0 — Codex handoff is the rule only during the Fable window. Always run `python tools/quota.py` gate (Codex session >70% / weekly >85% = skip or downgrade) and log the cross-call in AGENT_CHAT.md per [[agent-cross-call-protocol]].

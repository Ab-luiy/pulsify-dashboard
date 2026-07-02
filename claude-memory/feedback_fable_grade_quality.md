---
name: fable-grade-quality
description: User directive 2026-07-02 - all shipped output must hold Fable-5-level quality regardless of executing model; seven-gate standard lives in AGENT_CHAT.md
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f4365cfb-5a05-4c17-a2b4-fe27b929db76
---

The user runs Claude sessions on Fable 5 (strongest Anthropic model) and expects that quality bar on everything shipped, including work built by Sonnet subagents or Codex gpt-5.4/5.5. Fable access is expected to end around 2026-07-07 or when the account hits 50% of its Fable weekly limit, so the bar must not depend on Fable being present.

**Why:** the user can tell the difference between careful and sloppy output, and Fable set their reference point. Quality regressions after Fable disappears would read as the system degrading.

**How to apply:** enforce the seven-gate "Output quality standard" in AGENT_CHAT.md's cross-call protocol on every deliverable: (1) nothing ships unverified, (2) no invented facts - flag gaps, (3) Humanizer/voice pass on all outbound copy, (4) builder re-reads its own full diff before handoff (never relay subagent output unreviewed), (5) cross-review for user-facing or deploy-critical work, (6) spend remaining Fable turns only on things that compound (standards, architecture calls, final QA - each turn should leave a durable rule/doc/decision behind), (7) if the user can tell which model built something, treat it as a gate failure and patch the standard, not just the deliverable. Watch the Fable weekly meter via tools/quota.py (see [[agent-cross-call-protocol]]).

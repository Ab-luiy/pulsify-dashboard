---
name: feedback-claude-writes-copy
description: "Founder directive 2026-07-04 - all client-facing copy is written by Claude, not Gemini/other LLMs"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 22a9258e-5003-469a-aa46-6323351075c9
---

Founder direction 2026-07-04: copywriting (landing page copy, VSLs, emails, any client-facing words) is Claude's job, not Gemini's. Gemini/API keys are only acceptable for mechanical generation paths, and even then the founder prefers Claude quality for copy.

**Why:** copy is the product's voice; the vault's voice rules + Humanizer standard live in Claude's context, and the founder trusts that over a keyed third-party model filling tokens.

**How to apply:** for new prospect pages, the preferred flow is founder pastes the creator brief in chat -> Claude writes the page-content JSON in-session (applying [[wiki/content-engine/copy-voice-guide]] and the landing-page standard) -> Claude creates the page via /api/settings. Don't push the GEMINI_API_KEY setup for copy generation; it's a fallback for when Claude isn't available. Related: [[project-operator-console]], [[feedback-humanizer-copy]].

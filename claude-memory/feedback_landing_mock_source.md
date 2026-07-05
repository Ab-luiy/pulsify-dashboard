---
name: feedback_landing_mock_source
description: "When building any Frank/landing outreach mockup, start from the APPROVED canonical template and never re-add the dropped mechanism section or the rejected authority/trust strip"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2a91ccc9-151d-4670-a813-0b1e4660c7aa
---

2026-07-05: user corrected me twice on the same build. When asked for Frank's outreach
landing mock I regenerated it from the SUPERSEDED `output/frank-mason-replica-v2/`, which
dragged back two elements the user had already explicitly rejected: the mechanism /
"The model" 3-step board section (dropped by default in the standard) and the hero
authority/trust strip ("7 years / multiple 7 figures / 1-on-1 support"). I also did the
build in Claude instead of handing it to Codex.

**Why:** the approved canonical mock is the ONLY source of truth
(`output/standard-preview/templates/canonical/index.html` + its `css/style.css`). Its
section set is hero -> application (embedded Typeform) -> proof wall -> closing. No
mechanism section, no authority strip, no hand-built multi-step form. Those exclusions are
documented in [[project_landing_page_standard]] and the wiki standard, and they keep
sneaking back when I rebuild from an old file instead of recalling the approved one.

**How to apply:** (1) recall/reuse the last APPROVED artifact — the canonical template —
don't regenerate from a replica or from memory; (2) the mechanism/"model" section and the
authority/trust strip are permanently rejected, never include them unless the user
re-approves; (3) all building/coding goes to Codex per [[feedback_codex_builds_claude_specs]],
Claude specs + reviews only.

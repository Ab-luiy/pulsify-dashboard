---
name: feedback_never_lose_typed_input
description: "HARD 2026-10-15: every field in the app autosaves drafts while typing and restores them on return (onboarding and everywhere else); ticket pulsify-saas #67"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 67c54d69-9a7d-464a-968f-df6657a1f2bd
  modified: 2026-10-15T12:00:53.078Z
---

Founder, 2026-10-15: "if there was a field they filled and they had to go and come back to it it needs to be there instead of them having to rewrite it back and lose their train of thoughts." He called it very important across the entire app.

**Rule:** every text box, form and editor saves drafts while the user types (about 1s after they stop), on our server plus a browser copy, and brings them back exactly where they left off, cursor at the end. Drafts never count as final answers or feed the AI until submitted. A small "Saved" tick only.

**Why:** losing half-written thoughts breaks their train of thought and makes the app feel cheap.

**How to apply:** use one shared draft hook (#67) for any new or changed input screen; never ship a form that only saves on submit. Spec: wiki/synthesis/onboarding-v2-spec-2026-10-15.md. Related: [[project_brain_in_app_vision_2026_10_15]].

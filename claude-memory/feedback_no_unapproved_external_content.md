---
name: feedback_no_unapproved_external_content
description: "HARD 2026-10-15: never show clients third-party content (YouTube videos, creators, thumbnails, titles) that the founder has not approved"
metadata:
  node_type: memory
  type: feedback
  originSessionId: be1a82ea-2267-4eb7-bf10-663b7cf38b53
  modified: 2026-10-15T09:30:50.134Z
---

On 2026-10-15 I built an automatic "outlier" collector that pulled random YouTube videos by niche into the client's 7-fig packaging section. The founder saw unknown creators and low-quality videos in his app and was furious: "Who are these people? I don't even approve of any of this."

**Rule:** nothing from outside (videos, creators, thumbnails, titles, examples) reaches a client screen unless the founder picked or approved it. Automatic collection may only feed a private review queue for him, never the client view, and only if he asks for that.

**Why:** the portal is his brand and his taste; random internet content makes it look cheap and puts strangers' work in front of paying clients.

**How to apply:** for any library, gallery or "examples" feature, ask where the content comes from and default to founder-curated. Building a data pipeline is fine; publishing its output is not, without his yes. Related: [[feedback_perfection_standard]], [[project_design_system_2026_10_12]].

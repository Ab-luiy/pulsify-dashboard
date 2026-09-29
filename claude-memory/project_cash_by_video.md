---
name: project_cash_by_video
description: "LIVE 2026-09-29 (pulsify-saas #36): per-video tracked links and the client portal Videos by cash view; how it works, where it lives, what's still open"
metadata:
  node_type: memory
  type: project
  originSessionId: 686a8d25-184a-41e2-ac6a-079473d0fa6f
  modified: 2026-09-29T11:33:55.793Z
---

Shipped 2026-09-29 after the founder called Dustin Varano's UTM tracking "insane, we need that ASAP" (source: [[project_growth_voice_note_2026_09_28]] teardown, wiki/synthesis/dustin-varano-infoos-teardown.md). Spec: wiki/synthesis/cash-by-video-spec.md.

What exists: client portal /app/portal/youtube/cash ranks each client video by cash collected; each video has a description link and a pinned-comment link (pulsify-ai.com/a/{token}) that land on /{client} with utm_source=youtube, utm_medium=placement, utm_content=video id. Credit = first video tag a person ever had; cash = confirmed payment matches only (same as the Payments page), net of refunds. Worker pulsify-sync job `client-videos` (*/30 cron) pulls public uploads with YT_API_KEY for clients with a YouTube handle in integrations; wrong handles back off 6h and show on the client's screen. Code: functions/_shared/video-cash.js, functions/api/video-cash.js, migration 0043; app branch claude/cash-by-video in pulsify-saas.

**Why:** proves the inbound-YouTube doctrine in money: the 500-view video that sold ranks above the viral one.
**How to apply:** no paying client yet, so it shows nothing live. Open founder questions: run it on his own channel first (needs his own landing page on our tracker + a client_config row), and whether supporting videos link to the landing page, a flywheel video, or both. Released app = claude/onboarding-form + this branch; claude/growth-youtube is still NOT released. Related: [[project_growth_service_delivery]], [[project-ticket-board]].

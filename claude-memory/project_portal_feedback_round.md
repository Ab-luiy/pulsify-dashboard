---
name: project_portal_feedback_round
description: "2026-10-03 founder portal review round 1 shipped (Pages 28461892); what moved where, and the open items still owed from his list"
metadata:
  node_type: memory
  type: project
  originSessionId: 3e11548b-8895-4897-9dc8-0792b7b2e00a
  modified: 2026-10-03T14:20:14.798Z
---

Founder sent a long client-portal review on 2026-10-03. Round 1 LIVE as Pages 28461892 (pulsify-saas main 271fef1, Brain 2829b92a).

Shipped: avatar fix (img GET had no operator header, middleware dropped the operator; avatar.js GET now reads the cookie), header back/forward + clock strip (marquee when 3+ cities) + avatar button, Home = This week chart cards, content pipeline, launch steps, Money, week lists, plus a bottom-right dock (Next move with Due today, Pulse). Performance renamed Funnel (Funnel, Video, Applications, Lead Tracker), globe on the page, A/B/C letters replaced by dots + goal. Story stats moved to /portal/instagram/metrics. Shared SectionDeck (components/patterns/section-deck.tsx) on YouTube and Instagram with All my projects. YouTube = Overview (square doors + title formulas), New video, 7-fig packaging (gallery/designer/my thumbnails), Videos by cash. Content calendar = planner (workspace pref `content-plan`, Get started routes to the creator). Brand library folders (pref `media-folders`). SOP at wiki/playbooks/client-app-content-sop.md.

Still owed from his list: carousel SOP + rebuild (Reels and Carousels stay hidden, per 87fa692), reels paths explainer (brain has reel-format-ladder; "5 a day" is not in the brain), story sequences/reels fold into one expandable, angle library and idea inbox redesign, client IG inbound inbox (needs client IG connection, parked until first paying client), email/bell reminders for planned pieces, creators reading `?plan=`.

**Why:** next session should continue from this list, not re-derive it.
**How to apply:** before releasing, check Brain main contains whatever branch is live (Brain claude/copy-chat-gemini had been deployed without merging; fixed by merge d83d879d). Related: [[feedback_main_only_releases]], [[project_mvp_first_client]].

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

Round 2 LIVE same day (Pages 01c091be, worker 2cf0682e, saas 8f59f32): morning reminders for planned pieces, From-your-calendar bar, story type page folded, Reels one page with paths, carousel SOP (wiki/playbooks/carousel-sop.md) + rebuilt builder with designed slides, Reels/Carousels visible again.

Still owed: the high-volume "5 reels a day" path (founder: inspired by Joel Kaplan; I have no solid knowledge of his method, waiting on his source), client IG inbound inbox (needs client IG connection, parked until first paying client), reminders at the planned hour (now 05:00 UTC), proof image upload inside carousel slides.

Founder corrected me 2026-10-03: I stopped after round 1 and reported instead of working the to-do list. Keep going through the whole list in one go unless blocked.

**Why:** next session should continue from this list, not re-derive it.
**How to apply:** before releasing, check Brain main contains whatever branch is live (Brain claude/copy-chat-gemini had been deployed without merging; fixed by merge d83d879d). Related: [[feedback_main_only_releases]], [[project_mvp_first_client]].

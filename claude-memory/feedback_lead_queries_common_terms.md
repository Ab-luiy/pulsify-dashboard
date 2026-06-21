---
name: feedback_lead_queries_common_terms
description: "Lead-scrape queries must LEAD with the immersed practitioner's PAIN points in common title language — not money-curious beginners, offer jargon, or exact-phrase combos"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 68d7d6d7-c15f-4292-b904-4da40219e170
---

YouTube lead-sourcing queries must use **the language creators actually put in their video titles**, not offer jargon (`course`, `mentorship`) or over-specified exact-phrase combos (`"dropshipping" "made $"`). The old combos produced "dog-water" leads.

**Target the IMMERSED practitioner's PAIN, not the money-curious beginner.** User explicitly rejected Rung-0 "how to make money online / passive income / investing for beginners" — that crowd isn't committed. Want the person already in the niche searching to fix what's BROKEN. They search their struggle; the coaches we want built their whole library answering those struggles. Pain also self-filters for buyers (someone searching "why I keep losing money trading" is closer to paying than "investing for beginners").

**Buckets in priority order (same across every niche, swap vocab):**
1. **PAIN (headline)** — the struggle they're solving:
   - trading: revenge trading, no consistency, why you keep losing, can't pass the prop firm challenge, stop loss hunting, no edge
   - fba: product won't sell, won't rank, ppc not converting/high ACOS, margins too low, listing suppressed
   - dropship/ecom: store not selling, traffic but no sales, ads not converting, can't find a winning product, ads stopped working
   - tiktok shop: views but no sales, no orders, can't get affiliates
2. ACHIEVEMENT/MILESTONE — passing a funded account / making 10k a month
3. CRAFT/STRATEGY — how to read trend lines / product research / my X strategy
4. OFFER-INTENT — a couple `mentorship`/`course` terms to catch channels that brand that way

**Why:** breadth in real struggle-language finds the channels; the scorer ([[tools/score_leads.py]]) then filters for coach signals (offer in bio, $ figures, students).

Implemented in `tools/scrape_yt_leads.py` QUERIES (trading/fba/ecom; tiktok shop folded into ecom) and `wiki/content-engine/youtube-lead-sourcing-query-bank.md`. Iterating until results are good, THEN launch the scrape. Related: [[feedback_content_targets_b2c_coaches]] (same craft-not-meta lesson for content titles), [[project_yt_lead_criteria]].

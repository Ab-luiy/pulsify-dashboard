---
name: project_yt_lead_criteria
description: "YouTube lead-gen targeting criteria — sub floor, quality/region filtering; YT prospects rank highest"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0df74847-583b-4e5f-aa01-b5f21152e469
---

YouTubers are the **top of the prospect pyramid** for Pulsify outreach — higher priority than IG. The CRM card now leads with the YouTube channel + the video that flagged them, with IG secondary ([[project_hta_dashboard]], [[project_dashboard_product_vision]]). **The YT Leads tab is gone** — leads ingest into the unified CRM kanban as prospects (`source:"youtube"`). As of 2026-06-16 each YT card shows the **video thumbnail + full title on the card face** (`.kan-vid`, derived from `vu` via `i.ytimg.com`, lazy-loaded) so the operator vets by sight without expanding/clicking.

**ICP (REFRAMED 2026-06-16 — CREATORS, not coaches): people who actually DO the money skill (day trading, e-com/dropshipping/Shopify/TikTok Shop, Amazon FBA), are good at it, and have built a personal reputation/audience around *doing* it.** They are NOT to be found by coach/course/mentorship language — most deliberately AVOID that label now because it's flagged/cringe ("we're not buying your course bro"), so they present as normal creators showing real results/craft. Requiring an offer signal surfaces exactly the obvious gurus nobody wants — invert it.
- **Qualifier = in-niche + visibly doing the craft (real results/process) + has an audience/reputation.** The offer/course signal is NOT the filter — it's our upsell hook.
- **Two monetization paths (the Pulsify pitch):** (1) no offer yet → help them package + teach how they did it (build offer + backend); (2) has a quiet pre-existing course/mentorship → install backend + sales team + content, consult on scaling/"printing more".
- Earlier framing called the ICP "B2C money-skill COACHES (for beginners/course/my students profile)" — **superseded**; that biases toward gurus. Still OUT: operators/SMMA/agency/closers/appt-setters/content+mindset coaches.

**Explicitly OUT** (user named these, all demoted via `OFF_ICP` regex −5000): B2B operators / SMMA / agency owners, closers, appointment setters, YouTube/IG growth & content-creation coaches. Earlier I wrongly pivoted to SMMA/online-business/"get coaching clients from YouTube" — wrong; it pulled in agencies + a Travis Scott music video. Reverted.

**Key nuance:** income figures in titles ("$16k day trading", "my students made $7k") are NORMAL for this niche — do NOT penalize. The scam pond is kept out by QUERY SELECTION + educational framing, not by penalizing dollar signs.

**Title-polish nuance (2026-06-16):** title *polish is NOT a qualifier*, and rewarding it filters out the BEST leads. Two populations: (1) creators who've learned the formulas and title like our client blueprint, (2) oblivious ones just posting "My Trading Strategy That Made Me $10,000" with no course-speak. **Group 2 is the prime ICP** — already doing the craft + posting income proof, zero idea how to package = max room for Pulsify to enhance ("they just start, they just post"). So title regex is a SOFT NUDGE, not a gate: trust YouTube's own query relevance + channel bio/offer signals + size/recency/Western for qualification; titles only hint the niche/angle for the human eyeball.

Scraper (`tools/scrape_yt_leads.py`), niches `trading, ecom, fba`:
- Queries use teaching framing ("day trading for beginners", "amazon fba course", "how to start dropshipping").
- Sub floor 300; **PRIME band 500–15K** (highest score), 15–40K lighter, **≥40K = big fish** (`BIGFISH_SUBS`, demoted −2500). lookback 90 days, `MIN_SCORE=7000`.
- **Sub-band IS the qualifier (2026-06-16):** scraper now emits real subs `sb` + big-fish flag `bf`; `lead_scoring.enrich_leads` ranks on the real sub-band (was buggy — used composite `s` as subs) and sets `bigfish`; legacy leads w/o `sb` are scored neutral, never flagged. Dashboard CRM card shows "<n> subs" + a purple **BIG FISH** badge. DECISION 2026-06-16: big fish are SURFACED-BUT-FLAGGED (not excluded) — scraper big-fish band gives +1500 so they clear the floor, then enrich bottom-ranks them (sub score 8 → tier C, avg score ~34 vs prime ~53). User wants to see/recognize them, not chase them.
- Queries reframed to creator/method ("my trading strategy", "how i find winning products", "how i made $ trading") — NOT course/academy.
- Scoring (rebalanced 2026-06-16): polished packaging now only **+600** (was +1800) + a new `CRAFT_PROOF` **+600** for raw income-proof/craft titles ($Xk, "my strategy", "how i made", "winning product", "funded") so raw and polished rank EQUALLY; −4000 scam/music-junk; −5000 OFF_ICP roles; non-Western −4000 (country) / foreign-word regex −4000 incl. romanized Hindi/Urdu/Pashto + "in india/pakistan/..." (user excludes non-Western, esp. South-Asian-market channels).
- **Merge-don't-overwrite (2026-06-16):** scraper now unions new scrape with existing `yt_leads.json` (dedup by channel, keep higher score) so curated leads survive re-runs; `--overwrite` flag forces a clean rebuild.
- Result: **162 leads** (trading 68, ecom 60, fba 34), 0 off-ICP / 0 region-mismatch. Deployed live.

**CRITICAL PROCESS:** the dashboard reads leads from inline `<script id="ytLeadsData">` baked into `index.html`, NOT from `yt_leads.json` at runtime. After every scrape you MUST run `python tools/inject_yt_leads.py` (enriches + bakes into index.html) and commit index.html — updating yt_leads.json alone does nothing visible. I missed this for 3 deploys.

**Lapsed-creator retarget segment (2026-06-16):** creators who tried content then went quiet — esp. "originally on Instagram → posted on YouTube → quit again" — are a PRIME retarget (they've proven they want to create but couldn't sustain it = the Pulsify sell). A fresh scrape's 90-day lookback will NOT re-surface a dormant creator, so **merge-don't-overwrite is what keeps them in the pile** — this is a key reason merge (not overwrite) is correct. Gap: nothing flags dormancy yet; signal already exists via each lead's last-upload date (`pd`, e.g. >90d old = lapsed). Sharpest version needs cross-platform identity linking (IG handle ↔ YT channel) so the same person isn't two separate CRM cards — not built yet.

Still in force: **English-speaking / Western (US/UK/CA/AU/NZ/IE) market** only.

**Why:** he's filtering for prospects who can actually afford and convert on a $10K system, not spam/reupload churn.
**How to apply:** ethnicity isn't a data field and shouldn't be encoded. Use the implementable proxies the YouTube API exposes — channel `country`, default/audio language (English), plus production-quality and scam-pattern signals in scoring — to approximate "targeted Western, non-scammy." Flag this framing rather than literal nationality filtering ([[feedback_flag_gaps_no_heavy_claims]]).

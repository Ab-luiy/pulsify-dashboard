---
name: project_lead_scraper_saas_idea
description: PARKED future SaaS idea — productize the social lead-scraper + fixed ICP scorer (IG/X/YT) built 2026-06; revive when the time comes
metadata: 
  node_type: memory
  type: project
  originSessionId: 1111c1a0-5390-4338-b475-a0688bc76035
---

Parked 2026-06-21. User is sticking with the YOUTUBE lead pipeline (free official API, no
IP/anti-bot issues) and will source IG leads MANUALLY for now. But the IG/X lead-scraping +
ICP-scoring system we built is a potential SaaS product for later — logged and buried,
revive when building the SaaS.

THE IDEA: a lead-gen SaaS for coaches/creators/agencies that scrapes social platforms for
"creators who DO the craft" in a niche (trading/ecom/FBA/etc.), enriches their profiles,
scores them against an ICP, filters the noise, and drops ranked leads into a CRM. The
dashboard ([[project_dashboard_product_vision]]) is the natural front end.

ALREADY BUILT (prototype, UNCOMMITTED in `awesome-bassi-d88340/tools/` — commit if you want
it preserved long-term):
- `scrape_yt_leads.py` — YouTube via official Data API (free, works).
- `scrape_ig_leads.py` — IG hashtag→authors→enrich→score via Apify. WORKS end-to-end; a
  validation pull on 2026-06-21 returned 10 scored trading leads. (Input must use
  `directUrls` to the tag page, not `search`/`searchType`.)
- `scrape_x_leads.py` — X/Twitter via Apify (not yet run).
- `social_lead_scoring_proto.py` — the FIXED ICP scorer (craft-proof = top lever, mentorship
  ACCEPTED as modest +, geo/English gate, verified bonus; 0/13 on `audit_social_scoring.py`).
- instaloader path (login via browser cookie-import) — free but blocked from this IP/account
  ([[project_ig_free_scrape_blocked]]).

KEY LEARNINGS / the SaaS thesis (where value & cost live):
- The hard part is NOT the code — it's PROXY INFRA + ANTI-BOT MAINTENANCE. IG blocks
  instaloader endpoints (403 graphql) and flags IPs (403/429) regardless of auth; needs
  residential proxies. Apify-style managed actors + proxy pools are exactly what others charge
  for — so a SaaS either resells that infra or eats it.
- The real differentiator is the SCORING / ICP ENGINE — craft-vs-guru, vendor filtering (drop
  signals-services / prop-firms / agencies), Western/English language gate, verified bonus.
- Open quality gaps a real product must close: the keyword geo gate misses non-English-Latin
  accounts (Brazil/Poland) and India (`SEBI`/`.in`/`NSE`) — needs langdetect or an LLM judge;
  and "trading vendors" (signals services, prop firms) ranked high and need an in/out rule.
- YouTube is the easy free win (official API); IG/X are the hard, proxy-dependent ones.

**Why:** real product direction with a working prototype already in hand — don't lose it.

**How to apply:** when the SaaS time comes, start from the prototype in `awesome-bassi-d88340/
tools/` + the scoring engine; budget for proxy infra + ongoing anti-bot maintenance. See
[[project_ig_scorer_prototype]].

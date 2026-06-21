---
name: project_ig_free_scrape_blocked
description: "Free instaloader IG scraping is built + login works, but IG blocks the data endpoints (403/429) — NOT an IP issue (confirmed from 2 IPs); use Apify"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1111c1a0-5390-4338-b475-a0688bc76035
---

As of 2026-06-21 the free in-house IG scraper path is BUILT and the session works,
but Instagram blocks the actual data pull — and it is NOT just the IP:

- instaloader installed; password login is checkpoint-locked (don't retry it).
- Login bypassed via COOKIE-IMPORT: paste the browser `sessionid` into `.env`
  (`IG_SESSIONID`) + run `tools/ig_session_import.py` → authenticates as the burner
  **@luiy.ab**, session saved outside the repo. Auto cookie-grab is blocked by Edge's
  exclusive lock + app-bound encryption, so the manual sessionid paste is the way.
- Data endpoints return **403 (graphql/query) / 429 (web_profile_info)** even while
  authenticated. **Tested from TWO different IPs** — home Atlantis ISP (45.156.x) AND a
  fresh Turkcell MOBILE IP (via phone hotspot, 176.237.x): identical 403/429. So the
  block follows the SESSION/ACCOUNT (likely penalized after the checkpointed logins)
  and/or instaloader's requests are rejected by current IG (the well-known
  "403 graphql/query" breakage = maintenance treadmill). **Switching IP does NOT help.**
  Verify via `tools/ig_endpoint_probe.py` / `tools/ig_smoke_test.py`.

Net: free instaloader IG pulls are blocked at the account/endpoint layer, not the IP.
Use **Apify** (token in `.env`, validated free-tier) — its maintained actors + proxy
pool handle both walls. The instaloader tooling MIGHT work later with a warmer/fresh
burner once IG's penalty clears, but don't count on it.

**Why:** stops a future session from chasing the IP angle (proven dead) or re-running
the instaloader login dance; the blocker is IG's anti-scraping on the session+endpoint.

**How to apply:** for IG lead pulls use Apify (`scrape_ig_leads.py`) pointed at the
FIXED prototype scorer ([[project_ig_scorer_prototype]]). See [[project_composio_ig_bridge]].

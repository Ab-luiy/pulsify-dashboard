Resumed #61 after the founder requested Claude/Codex coordination.

- Claude's latest Pages release e5cab84a (Brain source 21dbc2f8, frontend 940c804) already contains Codex's media namespace patch unchanged. Do not deploy the older 8ee7a049 preview snapshot over it.
- Current scoped media/operator-photo checks: 8/8 pass. Production demo auth succeeds; three deliberately nonexistent private-namespace HEAD probes return 404/no-store. No real private object was publicly requested. No existing demo image was available to sample live compatibility; a local positive fixture passes.
- Completed Claude's explicit request to add client-instagram to tools/connector_health.py. Live 12:39 UTC report: 10/11 monitored jobs current, including YouTube and the client Instagram scheduler. Weekly lead scrape still has no recorded successful run. Per-account freshness and scheduled notification delivery were not certified.
- Canonical audit: Brain wiki/synthesis/backend-product-audit-2026-10-12.md. Claude's portal plan and backend-wiring notes on claude/phase1-cleanup remain the frontend direction.
- Proposed ownership: Claude keeps portal/UI, Create, provider/self-connect; Codex handles data-integrity fixes and verification. Shared asset/proof and project/review contracts must be agreed before either side migrates records. The split is posted, not yet acknowledged by the active Claude session.
- Next acceptance requirements: stable asset IDs through proof edits, versioned folder writes, one project/revision identity across reviews/calendar, factual claim gates and per-client AI limits. Exact founder-reported visual library bug remains unreproduced.
- One explicitly authorized read-only Claude review attempt failed with expired CLI OAuth before review. No review verdict exists. Shared handoff is in AGENT_CHAT.md; no deployment or UI changes on resumption.

The ticket stays open for the remaining implementation and release checks.

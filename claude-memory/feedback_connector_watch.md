---
name: feedback_connector_watch
description: "HARD 2026-10-12: always watch connectors and sync jobs; run tools/connector_health.py at session start and fix or flag anything broken"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 5c21bdf1-a08c-428a-8f2d-72cbdc7eefd4
  modified: 2026-10-12T08:17:41.443Z
---

Founder 2026-10-12: "My IG isn't updating. Can you always keep a watchout on the connectors and whatnot as well."

**Why:** the Instagram tab had been half-frozen since 2026-09-17, YouTube had failed 51 runs since 2026-09-29, the lead scrape had never succeeded, and the lead-models job failed for four days, all silently (sync_runs logs failures but deliberately never pings the founder). He found it before I did.

**How to apply:**
- At the start of any session that touches the app, run `PYTHONIOENCODING=utf-8 python tools/connector_health.py` in the vault (read-only, live D1). Exit 1 = something is failing or overdue. Raise it in the first reply, before other work.
- A "success" run can still hide stale data: the IG job reported success while 7 of 10 tab blocks were frozen. When a screen looks stale, check the snapshot `captured_at` per kind, not just sync_runs.
- Scheduled task `connector-health-daily` (09:40 local) runs the same script and push-notifies him only when something is broken.
- Cloudflare free-plan limits hit so far: 50 outbound requests per run, D1 compound SELECT max 5 terms, 50 D1 calls per run (batch writes).
- Add any new sync job to JOBS in tools/connector_health.py with its cadence. Related: [[project_supabase_realtime]], [[project_composio_ig_bridge]].

---
name: project_ig_dm_bridge
description: "IG DMs are readable on demand via the Composio Instagram toolkit, no browser needed; puller is dm-audit.ts"
metadata: 
  node_type: memory
  type: project
  originSessionId: eb2a5b3a-9f3e-46e1-99fd-e0b1c315de61
  modified: 2026-08-24T13:44:42.453Z
---

The whole IG DM inbox is pullable without a browser. The Composio Instagram connection already used for reel insights also carries the DM tools, and it is already authorized: `INSTAGRAM_LIST_ALL_CONVERSATIONS`, `INSTAGRAM_LIST_ALL_MESSAGES`, `INSTAGRAM_GET_CONVERSATION`, `INSTAGRAM_SEND_TEXT_MESSAGE`, `INSTAGRAM_SEND_IMAGE`, `INSTAGRAM_MARK_SEEN`.

Read-only puller: `npx tsx dm-audit.ts [maxThreads]` in `.claude/worktrees/admiring-hermann-913cc3/ig-report/`. Enumerates every thread, classifies by who spoke last (`delivered-no-reply`, `we-spoke-last`, `awaiting-us`, `inbound-only`), writes `dm-audit.json`. ~175 threads takes about 8 minutes, so background it.

**Why:** this replaces the manual browser inbox audits and it does not depend on Claude-in-Chrome being connected, which it often is not. `outreach/followup-tracker.md` is generated from this output, never hand-maintained.

**How to apply:** two gotchas that cost real time. `INSTAGRAM_GET_USER_INFO` returns the Graph user id (`36083631624614340`), but messaging uses a different id (`17841469568516308` for ab.luiy) - classify against the messaging id derived from a message `from`/`to` field or every thread misreads as inbound. And `INSTAGRAM_LIST_ALL_MESSAGES` needs explicit `fields: "id,created_time,from,to,message"` or message bodies come back empty.

Sending is possible through this bridge. Never send without explicit per-message approval from the founder.

Related: [[project_composio_ig_bridge]], [[project_ig_followup_sequence]], [[project_instagram_parity_priority]]

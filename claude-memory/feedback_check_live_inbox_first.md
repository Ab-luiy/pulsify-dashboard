---
name: feedback-check-live-inbox-first
description: "HARD 2026-10-09 - before any outreach talk, read the live IG inbox from D1 (Zernio webhook), never the vault outreach log/tracker alone"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 3475de35-8590-4508-9e3d-a98ae6f864d0
  modified: 2026-10-09T19:16:58.707Z
---

Founder 2026-10-09: "make sure that whatever comes through you got it." Every IG DM (incl. message requests the Composio pull misses) lands in D1 `pulsify-portal` tables `ig_conversations` / `ig_messages` within seconds via the Zernio webhook.

Before saying anything about outreach state, run:
`py -X utf8 tools/ig_inbox_snapshot.py 45` from the vault root (on brain main since 2026-10-09; verified working from the vault root). Raw fallback: `npx wrangler d1 execute pulsify-portal --remote --json --command "SELECT ... FROM ig_messages ORDER BY sent_at DESC LIMIT 50"`.

Also read the AGENT_CHAT.md tail for Codex handoffs. Media messages show as `[media]` (text null) - e.g. the 10-02 sends to _byron_wilson and nq.nox were media, so "unanswered" can be wrong if you only read text.

**Why:** I opened a session with 6-week-old vault data and called live threads stale; he called it completely wrong.
**How to apply:** live inbox first, vault second. Related: [[project-outreach-sequence-decisions-2026-10-09]], [[project_supabase_realtime]].

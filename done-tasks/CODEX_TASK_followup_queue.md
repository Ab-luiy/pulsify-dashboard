# CODEX TASK — the warm-lead follow-up queue (operator side)

Author: Claude. Date: 2026-07-13. Model test run on gpt-5.6-sol.

## Why this one

The outreach view/watch/IP tracking already exists and is live on pulsify-funnels: a `/event` receiver, `page_events` and `watch_events` tables, `/api/campaigns` (per-page visitors, watch %, signal), `/leads` (per-viewer watch breakdown), IP and geo on every event, and a 75% hot-watch Discord alert. Each prospect has their own URL (`/?client=slug`), so a visit is that prospect. It is buried in the `/admin` Pages-sent board. The missing layer: turn that signal into a prioritized follow-up queue so the operator hits warm prospects first. This is the highest-leverage decision-free win on live infrastructure. It serves the active outreach motion today.

## What to build

Read the existing tracking code first (functions that back `/event`, `/api/campaigns`, `/leads`, and the `/admin` Pages-sent section) so you extend it, do not duplicate it.

Add a **Follow-up queue** to the operator `/admin`:
- A ranked list of prospects who have engaged with a sent page, scored warm-to-cold from the signals that already exist: did they view, watch depth / watch %, number of plays, recency of last view, and whether they applied. Higher engagement and more recent = higher in the queue.
- Each row: prospect (slug/name), the page sent, the warm signal (a compact score or label like hot / warm / cool), watch %, last-viewed relative time, and whether they applied. A one-click into the existing per-viewer View activity drawer for the full breakdown.
- A simple filter: hide prospects who already applied or already booked, and hide ones with no activity. The queue is only people worth chasing.
- No new tracking pipe. This is a read-and-rank view over the existing `page_events` / `watch_events` / leads data. A new endpoint (e.g. `/api/followups`) that computes the ranking server-side is fine; no new table unless strictly needed, and if one is needed, add a migration.

Keep it consistent with the operator console's existing look (`/admin` + its console.css). This is not a hard rule that we only follow up with viewers; it is a prioritization surface.

## Discipline (same as always)

- LOCAL-VERIFY ONLY: `node --check` every touched JS file; if you add an endpoint, a mocked-D1 test that the ranking returns viewers ordered by the engagement score and that non-viewers are excluded. Confirm the existing Pages-sent board still works.
- NO deploy, NO remote D1, NO commit, NO secrets.
- Voice: no em-dashes or en-dashes, no reward/celebratory microcopy, sentence case.
- Claim the files on the AGENT_CHAT.md Lock Board before editing; post a done note with the exact files and verification when finished. Claude reviews then deploys.

## Definition of done

A follow-up queue in `/admin` ranking warm prospects from the existing tracking data, local-verified, nothing deployed or committed, done note posted with the diff. Claude reviews and deploys.

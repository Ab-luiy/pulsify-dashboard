---
type: playbook
tags: [autonomy, agent, exam-mode, queue, founder-offline]
sources: [[wiki/people/abdullah-dagestani]], [[wiki/concepts/pulse-system-mechanism]]
created: 2026-05-10
updated: 2026-05-10
---

# Exam-mode autonomous ops

The protocol for what the agent is authorized to do when the founder is offline for exam season or any other 5–10 day stretch. Defines the green-light lane (do without asking), the queue lane (draft and wait), and the red-light lane (never without explicit approval).

## Why this matters for Pulsify

The founder is a second-year mechanical engineering student. Exam blocks are non-negotiable. Pulsify's positioning — "AI replaces the labor layer" — would be hollow if the founder's own ops collapsed during exams. This page is the live demonstration that the system works on its own creator first.

It also doubles as a sales-call asset: prospects ask "how do you handle X when you're not around?" and the answer is this page.

## The three lanes

### Green-light — do without asking

Internal work that produces no outbound communication and modifies only the vault and internal dashboards.

- Read, summarize, and ingest any source the founder drops into `raw-sources/`.
- Update existing wiki pages with new information from ingested sources.
- Create new wiki pages following the standard structure.
- Update `wiki/index.md` and `wiki/log.md` per ingest rules.
- Run weekly lint reports (file to `wiki/lint-report.md`).
- Refresh `dashboard.html` from `dashboard-data.json`.
- Draft scripts, outreach messages, follow-up replies, video angles, thumbnails, proposals, contracts — and place them in the queue.
- Run research subroutines (competitor scans, lead enrichment, niche analysis).
- Update client-folder docs (`clients/{name}/calls/`, `decisions.md`, `progress.md`, `overview.md`) based on call transcripts the founder has uploaded.
- Flag contradictions in the vault and propose resolutions in `wiki/lint-report.md`.

### Queue lane — draft and wait

Anything that would leave Pulsify or reach a third party. Drafted to the queue, marked unsent, waits for founder approval.

**Queue location:** `queue/` folder in the vault root. One file per item, named `YYYY-MM-DD-{type}-{shortdesc}.md`. Each file ends with a footer:

```
---
status: pending
type: {outreach | follow-up | client-message | video-script | proposal | contract | comment-reply}
target: {handle | client name | platform}
draft-by: agent
ready: {yes | needs-review-first}
notes: {anything the founder needs to know before approving}
```

The founder reviews the queue (UI: just open the folder), edits if needed, and either:
- moves the file to `queue/sent/` after sending it themselves, or
- types `approved — send` in a reply, at which point the agent sends it through the appropriate channel only if the channel is wired (otherwise the founder sends manually).

**Default rule:** if a channel is not wired, the agent does NOT send. It only drafts.

### Red-light — never without explicit approval, even with prior pattern

Even if the founder has approved a similar action before, these always require fresh confirmation:

- Sending money or initiating a payment.
- Signing or sending a contract.
- Making a public commitment on behalf of the founder or Pulsify (announcing a launch date, promising a deliverable timeline to a client, agreeing to a refund).
- Posting public content (YouTube uploads, IG posts, IG stories, X posts, podcast episodes).
- Contacting a current client about a delivery delay or a scope change.
- Modifying anything in `raw-sources/` (immutable).
- Modifying `CLAUDE.md` itself.
- Anything destructive (deleting files, branches, accounts).

If a red-light action is needed, the agent flags it to the **decision queue** (see below) with severity `urgent` and stops.

## The decision queue

Separate from the outbound queue. Lives at `queue/decisions.md`. Single file, append-only. Format per entry:

```
## [YYYY-MM-DD HH:MM] {severity: low | medium | urgent} | {short title}

**Situation:** what happened.
**Why it needs the founder:** what makes this red-light or judgment-only.
**Recommended action:** the agent's proposal.
**Deadline:** when this stops being relevant if untouched.
```

The founder checks `queue/decisions.md` first when returning from exams.

## Severity rubric

- **Urgent** — a current client is blocked, a deadline expires within 24 hours, a public-facing error needs a correction, payment processing failed.
- **Medium** — a prospect has replied with an objection the agent cannot handle, a metric crashed by >30% week-over-week, a scheduled deliverable needs replanning.
- **Low** — a research finding worth flagging, a vault contradiction that needs founder judgment to resolve, a new operator added to the watchlist.

## During exam mode specifically

Trigger: founder messages "exam mode on" or sets a date range. From that moment until "exam mode off":

1. **No new prospects scheduled into sales calls.** Cal.com link is paused or routed to a "back on [date]" booking page. The agent drafts apology+reschedule messages for any inbound that slips through.
2. **Client cadence shifts to async.** Weekly calls are postponed unless the client objects. Slack/Discord async updates substitute. The agent drafts the weekly update from the dashboard data and queues it.
3. **Outreach pauses.** No new DMs sent. The agent continues building the outreach list and drafting messages, but nothing leaves the founder's accounts.
4. **Content production pauses.** No new video shoots scheduled. If a video was pre-recorded and edited, the agent can queue the upload but the upload itself is red-light.
5. **Daily briefing on return.** The agent compiles a single `queue/exam-return-brief.md` with: decisions awaiting, queue size by type, pipeline state changes, dashboard delta. The founder reads this first.

## Exit from exam mode

The founder messages "exam mode off." The agent:
1. Surfaces the decision queue from oldest to newest.
2. Surfaces the outbound queue grouped by urgency.
3. Resumes Cal.com bookings.
4. Resumes outreach drafting against the previously paused list.

## Connections

- [[wiki/people/abdullah-dagestani]] — the constraint this protocol exists to absorb.
- [[wiki/concepts/pulse-system-mechanism]] — the same protocol is what each client's agent runs for them.
- [[wiki/playbooks/pulsify-delivery-sop]] — *pending* — the client-facing version of these lanes.

## Open questions / gaps

- No channel integrations are wired yet (no IG DM auto-send, no Cal.com webhook, no Slack hooks). Until they are, "send" always requires the founder to copy-paste the queued draft. The protocol works regardless; the ergonomics improve with each integration.
- Decision queue severity rubric will tune with use. First five exam-mode runs are the calibration data.

## Source trail

- Founder interview voice note, 2026-05-10 — explicit Q9 clarification on what counts as authorized vs. queue vs. red-light.

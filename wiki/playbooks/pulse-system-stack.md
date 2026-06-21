---
type: playbook
tags: [delivery, pulse-system, automation, stack, tools]
sources: [[wiki/concepts/pulse-system-mechanism]], [[wiki/playbooks/pulsify-delivery-sop]], [[wiki/playbooks/pulsify-offer-v1]]
created: 2026-06-09
updated: 2026-06-09
---

# Pulse System stack

The technical build behind each Pulse System component: what tool runs it, where the data lives, what triggers it, and where the human checkpoint sits. [[concepts/pulse-system-mechanism]] and [[playbooks/pulsify-delivery-sop]] both reference this page as pending; this closes it.

The governing principle for v1: **manual-first, automate what repeats.** No client has run the full system yet, so every flow below ships as an operator-run routine first and gets automated only after it has run manually enough times to prove its shape. Selling "installed infrastructure" does not require n8n on day one; it requires the output arriving on schedule. The client sees outputs and checkpoints, not plumbing.

## Status legend

Each item is tagged:
- **proven** — has run for real (Pulsify's own ops or a past engagement).
- **v1-manual** — ships with the first client as an operator+agent routine.
- **v2-automated** — the automation upgrade, built only after the manual version repeats cleanly.

## Component 1 — Brand Brain

| Layer | Tool | Status |
|---|---|---|
| Knowledge store | Claude project, one per client | proven (Pulsify's own vault is the same pattern) |
| Build protocol | [[playbooks/brand-brain-intake]] | v1-manual |
| File structure | `voice.md`, `audience.md`, `offer.md`, `mechanism-candidates.md`, `proof-inventory.md`, `content-history.md`, `constraints.md` | v1-manual |

Project instructions carry the client's red lines and the voice-guard pass from [[raw-sources/prompts/_voice-guard]]. The client gets query access from day one; everything the agent produces for components 2-5 runs inside this project so the voice context is always loaded.

## Component 2 — Content Engine

| Subroutine | v1-manual flow | v2-automated upgrade |
|---|---|---|
| Research (weekly) | Operator runs the niche scan (pattern: `tools/scrape_yt_leads.py` adapted to the client's top-30 channel list), agent tags hooks and scores angles against positioning, outputs 10 ranked angles | Scheduled weekly scrape + auto-draft of the angle sheet, queued to Slack |
| Scripting | [[raw-sources/prompts/youtube-script-prompt]] inside the Brand Brain project | unchanged — scripting stays human-triggered, founder picks the angle first |
| Packaging | titles-thumbnails skill + [[content-engine/packaging-rules]] | unchanged |

Checkpoint: founder kills 7 of 10 angles, rewrites hooks on the survivors, approves packaging. The checkpoint never automates.

## Component 3 — Funnel Stack

| Piece | Tool | Status |
|---|---|---|
| Landing page | Built from [[raw-sources/prompts/landing-page-design-prompt-auto]], hosted on client's domain (Framer/Carrd/custom — match what they have) | v1-manual |
| VSL script | [[raw-sources/prompts/client-vsl-writer-prompt]] | v1-manual |
| VSL hosting | Wistia preferred (resume-play + analytics per [[frameworks/vsl-framework]]); YouTube unlisted is the zero-budget fallback, accepting the analytics loss | v1-manual |
| Qualification | Typeform, 7-10 questions including the mandatory financial qualification question | proven pattern (Pulsify's own funnel uses it) |
| Booking | Cal.com wired behind the Typeform | proven pattern |
| Pre-call sequence | [[raw-sources/prompts/precall-email-sequence-prompt]] output loaded into the client's email tool | v1-manual |
| Attribution | UTM-tagged links at every step + weekly funnel-numbers pull into the dashboard | v1-manual |

Checkpoint: founder walks the full funnel monthly as a fake lead, finds the leak, fixes it.

## Component 4 — Sales Co-pilot

| Subroutine | v1-manual flow | v2-automated upgrade |
|---|---|---|
| Pre-call brief | Calendar check each morning; 30-60 min before each call, run [[raw-sources/prompts/sales-precall-brief-prompt]] with Typeform answers + 5-min enrichment scan; post to Slack | Cal.com webhook -> n8n/Make -> brief drafted automatically and posted to `#agent-queue` |
| Post-call follow-up | Call notes or recording into the Brand Brain project, agent drafts proposal/follow-up, founder approves | same flow, triggered by CRM stage change |
| CRM | `outreach/lead-crm.md` pattern for Pulsify's own pipeline; client engagements use the client's CRM or a Notion board if none exists | v2: Cal.com webhook auto-advances stages |

Checkpoint: founder (or client's closer) reads the brief, runs the call, approves every outbound message before send.

## Component 5 — Ops Replacement

| Subroutine | v1-manual flow | v2-automated upgrade |
|---|---|---|
| Comment/DM triage | Daily pass: export or screenshot new comments/DMs, agent drafts replies in voice, queued for approval | platform API or browser automation feeding a daily queue |
| Weekly report | [[raw-sources/prompts/weekly-client-report-prompt]] every Monday, posted to `#metrics`, copy filed to `clients/{name}/progress.md` | scheduled task drafts it from the dashboard data, founder approves |
| Dashboard | per-client tab on the Pulsify dashboard (pattern: `dashboard-v3.html` / the canonical worktree build) | v2: client-facing read-only view (deferred, per the HTA dashboard decision) |

## What stays manual forever

The checkpoints. Angle selection, voice approval, call execution, outbound message approval, the monthly funnel walk. The offer sells operator judgment plus agent labor; automating judgment away breaks the mechanism's own framing (operator and coach are human-only, the labor layer is not — see [[concepts/pulse-system-mechanism]]).

## Build order for the first v1 client

1. Week 1: Brand Brain (component 1) — full build, no shortcuts.
2. Weeks 2-4: Content Engine manual loop running weekly.
3. Week 5: Funnel Stack live end to end.
4. Weeks 6-8: Sales Co-pilot manual loop on every booked call.
5. Weeks 9-11: Ops Replacement routines + decide which one flow earns its n8n/Make automation first, based on which ate the most operator hours. Build exactly one automation in the first engagement, not five.

## Connections

- [[concepts/pulse-system-mechanism]] — the five components this page implements.
- [[playbooks/pulsify-delivery-sop]] — the week-by-week schedule these builds slot into.
- [[playbooks/brand-brain-intake]] — component 1's build spec.
- [[frameworks/vsl-framework]] — funnel-stack architecture source, including the Wistia and CAPI notes.
- [[playbooks/pulsify-dashboard-workstream]] — where the per-client dashboard pattern lives.

## Open questions / gaps

- n8n vs Make is undecided; irrelevant until the first automation gets built (week 9+ of the first engagement). Decide then based on what the specific flow needs, not in advance.
- CAPI setup for clients running paid ads is still undocumented (carried over from [[frameworks/vsl-framework]] gaps); v1 excludes paid ads so this stays parked.
- Wistia cost vs YouTube-unlisted fallback needs a real decision at the first Week 5. The analytics loss is real (no resume-play, no engagement graph on the VSL).

## Source trail

- [[concepts/pulse-system-mechanism]] — component definitions and checkpoint rules.
- [[playbooks/pulsify-delivery-sop]], [[playbooks/pulsify-offer-v1]] — delivery schedule and offer scope this stack must serve.
- `tools/scrape_yt_leads.py`, `tools/score_leads.py` — existing code patterns the research subroutine reuses.

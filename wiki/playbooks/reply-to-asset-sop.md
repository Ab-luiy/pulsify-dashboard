---
type: playbook
tags: [outreach, assets, sales, sop, instagram]
sources: [[playbooks/prospect-asset-sop]], [[playbooks/prospect-asset-template]], [[playbooks/ig-followup-sequence]], [[clients/_pipeline/ig-inbox-audit-2026-08-24]], founder directive 2026-10-02
created: 2026-10-02
updated: 2026-10-02
---

# Reply-to-asset SOP

What happens the moment someone on an outbound thread answers and is not a no. The job is to get a finished piece of work in front of them quickly, sized to how interested they actually are, without promising a custom build to everyone who says "sure."

## Why this matters for Pulsify

Replies are the scarce thing. The 2026-07-26 batch returned at most 18%, the 2026-08-22 batch returned one reply on 33 sends. When a reply lands, the failure we have already lived is not the asset, it is the wait: three people said yes in July and two waited over a month. A reply that turns into a delivered asset within a couple of days is worth more than any follow-up copy.

## The trigger

Any inbound message on an outbound thread that is not a clear no and not a peer. A one-word reply, a question, a compliment back, "send it over", an emoji reaction followed by text, all count. A reaction alone does not.

## Step 1: answer within the hour

They are online right now. Send one line back that is not a pitch and does not stall:

> appreciate you replying. give me a bit, i'm putting it together properly and i'll send it here

Never promise a day you cannot hit. State a window only after Step 2 tells you the size of the build. Never apologise for timing and never ask permission to send.

## Step 2: classify the reply, then pick the size of the something

The founder vets every lead already, so the judgement here is about the reply, not the person.

| Reply | Size | What goes back |
|---|---|---|
| Asked for it ("send it over", "sure", "what do you have") on a creator with a real reputation | **Full** | The custom asset page, built from [[playbooks/prospect-asset-template]] |
| Curious or one word ("what's this", "lol thanks", "interesting") | **Medium** | The matching reusable excerpt from `outreach/resources/`, plus one specific line about their channel |
| Warm but thin, or a question about us | **Small** | A voice note with one built thing in it, per [[playbooks/outreach-video-voice-touches]] |
| Objection or price question | **None yet** | Hold the doctrine in `feedback_price_objection_smokescreen`: the price question is a smokescreen, answer the real thing. Do not build for it |
| Not now, no, hostile | **None** | One line of thanks, mark `dormant`, stop |

A full build is expensive and the July batch proved what over-promising does, so Full is earned by the reply and the profile, never granted by default.

## Step 3: build

Full size runs [[playbooks/prospect-asset-sop]] phases 1 and 2 first, then fills the template:

1. Open `outreach/intel/{handle}.md` and log every source as it lands. Nothing guessed: not a handle, a number or a link.
2. `py tools/pull_creator_assets.py @handle slug` for the thumbnails. Look at them at full size.
3. Diagnose: which pillar is broken, the five conversion assets, the idea they own and have not named, the core leak in one sentence. Give the founder the read before the build.
4. Read the vault sources named in [[playbooks/prospect-asset-visual-standard]] before writing a line.
5. Copy `output/prospect-asset-template/data/blank.json` to `data/{slug}.json`, fill it, run `fill.py`. Delete any block the prospect does not need.

Medium and Small sizes skip the template. Medium is a crop and a sentence, Small is a voice note.

## Step 4: check before it goes anywhere

- Run the copy scan: no em dashes, curly quotes, exclamation marks, "health", or AI tells from [[content-engine/copy-voice-guide]].
- Render at 1280 and at phone width and look at every screen. Zero horizontal overflow. Never send a page nobody has looked at.
- Every figure about their business is public and matches. Nothing we cannot see and they can check.
- The four send-link checks from [[playbooks/prospect-asset-visual-standard]]: `og:image` resolves, `noindex`, no "preview" or "test" in the host, every asset and the CTA target return 200.

## Step 5: deliver

One message, no apology, one specific line on what is inside:

> yo, here it is. [one specific line on what is in it]. it's 100% yours, no strings. lmk if any of it's useful

Then a short voice note after the link lands, because a link in an IG DM can sit unopened for days (the `_acetrades_` doc went unopened for three). The voice note says it is there and names the one part to open first. Do not treat a sent link as a delivered asset.

## Step 6: log

- `wiki/playbooks/prospect-asset-library.md` build log: asset, date sent, container.
- `outreach/intel/{handle}.md`: status, the message that carried it, next best step.
- `outreach/outreach-log.md`: row for the send. `outreach/followup-tracker.md`: next touch date.
- Record the outcome when it arrives: opened, replied, what they said. This is the step that keeps getting skipped, and it is why every rule here is craft-validated and none is results-validated.

## Step 7: what comes after

The asset carries its own ask in the close, per the visual standard. Do not add a second pitch in the DM. If they react, answer the reaction. If they go quiet, the next touch is the small question from [[playbooks/ig-followup-sequence]] or the view-once video from [[playbooks/outreach-video-voice-touches]], never "did you see it."

## Non-negotiables

- Voice rules from [[content-engine/cold-dm-formula]] bind every line: lowercase, casual, no emojis as copy, no em dashes.
- Never ask permission to send. Send, or ask a one-word question.
- Inbound and outbound are different footings: they replied to something we sent, so we have no standing to qualify or gate on price at this stage. Sell only the next small thing.
- Never mention a deadline we cannot meet.

## Connections

- [[playbooks/prospect-asset-sop]] — the five phases the Full size runs
- [[playbooks/prospect-asset-template]] — what Step 3 fills
- [[playbooks/outreach-video-voice-touches]] — the Small size and the delivery voice note
- [[playbooks/ig-followup-sequence]] — what happens when they go quiet after this

## Open questions / gaps

- No turnaround target exists. Proposed: Full within 48 hours of the reply, stated only after the read is done. Founder to confirm or change.
- The Medium size depends on `outreach/resources/` excerpts being current for the prospect's niche.
- Zero reply data on any asset. Log outcomes from the first five and revisit the sizing table.

## Source trail

- `outreach/outreach-log.md` and [[clients/_pipeline/ig-inbox-audit-2026-08-24]], the reply-rate numbers and the July wait
- [[playbooks/ig-followup-sequence]], the permission-versus-word rule and the unopened Doc link
- Founder directive, 2026-10-02

---
type: playbook
tags: [outreach, dms, copy, follow-up, instagram]
sources: [[clients/_pipeline/ig-inbox-audit-2026-08-24]], [[clients/_pipeline/ig-inbox-audit-2026-08-26]], [[content-engine/cold-dm-formula]], [[playbooks/pulse-system-outreach]], [[playbooks/prospect-asset-library]]
created: 2026-08-24
updated: 2026-09-07
---

# IG follow-up sequence

The cadence and the copy for every IG thread that went quiet. Built 2026-08-24 off a live inbox pull that found 120 threads sitting on delivered, 80 of them recent. It closes the gap [[content-engine/cold-dm-formula]] flagged as open: that page drafted three follow-up options and refused to invent a cadence without data. There is data now, including one follow-up variant that failed on nine threads and one that got a reply in under a minute.

## Why this matters for Pulsify

Instagram is the active lead channel and it is getting quieter. The 2026-07-26 batch returned at most 18% (44 sends, 8 threads with any inbound). The 2026-08-22 batch returned one reply on 33 sends, and that reply was from someone already known. What has never existed is a second message that gets answered, so the pipeline stalls at the exact point where the money is. Follow-ups recover part of the backlog. They do not fix a first touch that is trending down, and that is a separate piece of work.

Grant's number, already in [[playbooks/pulse-system-outreach]]: one of his biggest ever clients took over a year of follow-up. Most operators stop at message three. Pulsify was stopping at a second permission request.

## What the live data says

Two follow-ups have actually been sent on this account. The results point the same direction.

**Failed.** On 2026-08-22, nine silent threads received:

> do i just fk it and drop it right here anyway?

Zero replies in two days. The opener already asked permission to send. This asks permission again. Nothing new is offered, and the prospect still has to spend a reply before they get anything.

**Worked.** On 2026-08-05, `_acetrades_` received:

> yo did the thumbnail part land or was that too much at once? only asking cause im putting these together for a few people and wanna know what's actually useful

He replied in the same minute: "I haven't even looked at it 💀 / mb". The message got an answer because it asked for a word, not a decision. What it exposed was separate and worth knowing: the Google Doc had never been opened.

**The rule that falls out.** A follow-up that asks for permission gets ignored. A follow-up that hands something over, or asks for one word, gets answered. Every touch below is one or the other, never a request to be allowed to help.

## The capacity constraint

80 people in the working list have been promised a custom brand audit. Fulfilling that is 80 documents. It is not going to happen, and the July batch proves what happens when it does not: three people said yes and two waited over a month.

So the sequence is tiered on purpose.

- **Touch 2 goes to everyone.** It costs about five minutes per prospect because the message *is* the deliverable.
- **The full document is built only for people who respond.** Nobody gets promised one who has not first shown a pulse.

A note against over-reading this. It would be tidy to conclude that the opener should ship the link, the way [[content-engine/cold-dm-formula]] settled on 2026-07-06, and that this whole silent track is caused by asking permission. The data does not support that. The only batch that ever shipped links in the first message, 2026-07-09, went out to four people and none of them replied in 46 days. Four is not a test, so the formula is unproven rather than wrong. What is established is narrower and applies to follow-ups only: asking permission a second time returned nothing on nine sends.

## Thread states

Classify before writing. The state decides the track.

| State | What it means | Track |
|---|---|---|
| **A. Said yes, never delivered** | They asked for it. We never sent it. | Deliver |
| **B. Delivered, no reply** | Opener sent, silence. | Silent |
| **C. Asset delivered, then silence** | They have it, no reaction. | Reopen |
| **D. Not a prospect** | Peer, inbound pitch, personal. | None |

## Deliver track (state A)

One message. No sequence.

The trap is apologising. Explaining a month of silence makes it bigger and hands them a reason to read the whole thing as unreliable. Send it as if it were always coming.

> yo, here it is. went deeper than i planned so it took a minute. [one specific line on what is in it]. it's 100% yours, no strings. lmk if any of it's useful

- Never open with sorry, never count the days.
- The specific line is the whole message. Pull it from `outreach/intel/{handle}.md`, never from memory.
- If the asset is not built, do not send a holding message. Build it first. A second promise is worse than the first silence.

## Silent track (state B)

Four touches, each one complete on its own, each asking less than the last.

### Touch 2 — the small built thing

The pivot, and the message that carries this whole sequence. Stop asking whether to send something. Send something.

Not the full audit. One specific change they can make in under a minute, written as a replacement rather than a critique, with the reason attached.

> [the specific thing, and the reason it matters]. no reply needed, just thought you'd want it

Real examples in this format, both from [[content-engine/cold-dm-formula]]:

> pin that comment where the guy back-tested your setup, it's the only proof on your page you didn't make yourself. no reply needed, just thought you'd want it

> name that first highlight "start here" instead of anything clever, it's the one every new person taps first. no reply needed, just thought you'd want it

Three tests for picking the thing:

1. They can do it in under a minute.
2. It is a replacement, not a verdict. "Pin that comment" is a tip. "Pin that comment, it's the only proof on your page you didn't make yourself" is an insight.
3. The reason is the gift. Without the reason it reads as a tip from a stranger.

Source it by actually opening their profile for five minutes. That is the cost, and it is the reason this message cannot be templated or batched blind. A generic version is worse than sending nothing, because it proves the first DM was mass outreach.

No link, no doc, no ask. This touch closes the loop the opener left open by simply being the thing that was promised, scaled down to what can be delivered 80 times.

### Touch 3 — the small question

Only to people who reacted, opened, or replied to touch 2.

> yo did the [thing] land or was that too much at once? only asking cause im putting these together for a few people and wanna know what's actually useful

One question, answerable in a word, about them rather than us. The stated reason is not a pitch, and "for a few people" carries social proof without a claim. This is the variant with a live reply on record.

### Touch 4 — the document

Only for people who answered touch 3. This is where the full asset goes, and by now it has been earned rather than promised cold.

Delivery note from the `_acetrades_` thread: a Google Doc link in an IG DM went unopened for three days by someone who had explicitly asked for it. Do not treat a sent link as a delivered asset. Test a different container, and check whether it was opened before assuming it was read.

### Touch 5 — the clean exit

> no stress if that wasn't useful. if you did want to run any of it and got stuck, i'll answer anything on it. either way good luck with [the real thing they're working on]

Permission to be done, which draws a reply often enough to be worth sending. It can read slightly wounded, so it goes last and never earlier.

After touch 5 the thread is `dormant`, not `dead`.

## Reopen track (state C)

They have the asset and went quiet. Skip to touch 3. If touch 3 already ran and got a reply that revealed a blocker, as with `_acetrades_`, treat the blocker as the next asset: re-send the substance in the DM itself rather than re-sending the link.

## Cadence

| Touch | When | Gate |
|---|---|---|
| 1 | day 0 | opener, gift included |
| 2 | day 3 | five minutes of profile research done |
| 3 | day 7 | touch 2 got a reaction, open, or reply |
| 4 | day 10 | touch 3 got an answer |
| 5 | day 21 | still silent |

> Proposed 2026-08-24. Touch 3's copy is validated by one reply. Everything else is unproven. Rewrite the moment 20 sends contradict it.

One message per touch. Never two in a row. The inbox currently holds a thread with three unanswered messages stacked on it, `moneymaxtrades`, and that is the pattern to stop.

## The re-entry rule

A thread silent for more than three weeks cannot be picked up mid-sequence. Day-3 copy arriving on day 29 reads as a system, and that is the one impression this whole formula exists to avoid.

Threads over three weeks re-enter cold at touch 2. The elapsed time is accounted for by the work, never excused:

> [the specific thing, and the reason]. been meaning to send you this since i went through your stuff. no reply needed

Then the cadence restarts from that send as day 0.

## Story slide-up

Standing tactic from [[playbooks/pulse-system-outreach]], unchanged. Turn on post notifications for everyone in the sequence. React to a story and follow up in the same breath, because they are provably online. A story slide-up does not consume a numbered touch.

## Non-negotiables

Everything in [[content-engine/cold-dm-formula]] binds. The same person has to have written the opener and the follow-ups.

- Lowercase, casual, peer. No em-dashes, no exclamation marks, emoji only as a reaction.
- Never ask permission to send. Send, or ask a one-word question.
- Never "just following up", "just checking in", "did you see this".
- Never reference their silence. Not once, not lightly, not as a joke.
- One specific detail per message, from their profile or their intel file. A wrong detail is worse than no follow-up.
- No pitch, no call ask, no price, at any touch. The ask is a reply.
- 25 to 45 words. Follow-ups run shorter than the opener.
- Do not send an outreach opener into a thread that already holds a personal conversation. Two of the 08-22 batch went to warm contacts and read as a script.

## Logging

Every touch is a row in `outreach/outreach-log.md` as `follow-up-sent`. State and next-touch date live in `outreach/followup-tracker.md`, which is the queue. This page is the method.

Re-pull the inbox any time with `npm run audit -- 250` from `tools/instagram-dm-audit/`. It is read-only and reclassifies every thread, so the tracker never has to be maintained by hand.

## Connections

- [[clients/_pipeline/ig-inbox-audit-2026-08-24]] — the live pull this page is built on
- [[content-engine/cold-dm-formula]] — the opener standard, and the source of touches 2, 3, 5
- [[playbooks/pulse-system-outreach]] — the wider motion, the story slide-up, AI re-engage
- [[playbooks/prospect-asset-library]] — what asset each wound gets, and what is already built
- [[content-engine/copy-voice-guide]] — the AI-tell kill list

## Open questions / gaps

- Touch 2 is the load-bearing bet and it has never been sent. If it fails, the problem is not the copy, it is that cold traders at this volume do not want anything from a stranger, and the answer moves upstream to targeting.
- Unmeasured: whether a doc link, a PDF, a carousel of images, or plain text in the thread actually gets consumed. The `_acetrades_` thread says a Doc link does not. That is one data point and it decides how every asset ships.
- No trigger defined for bringing a dormant thread back.
- Reply rate per batch is not tracked anywhere yet. `dm-audit.ts` can compute it once follow-ups start landing.

## Source trail

- `raw-sources/instagram-dm-audit/dm-audit-2026-08-24-full.json` — 175 conversations enumerated, 160 thread records retained
- [[clients/_pipeline/ig-inbox-audit-2026-08-24]] — the audit
- [[clients/_pipeline/ig-inbox-audit-2026-08-26]] — the recent-60 delta check recovered from the laptop vault
- [[content-engine/cold-dm-formula]] — the 2026-07-06 link-in-first-message decision and the follow-up options drafted 2026-08-04
- Founder instruction 2026-08-24: log every delivered DM, build a follow-up sequence, IG is the current focus

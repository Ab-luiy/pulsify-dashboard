---
type: playbook
tags: [outreach, crm, intel, follow-up, assets]
sources: [[playbooks/pulse-system-outreach]], [[content-engine/cold-dm-formula]], [[content-engine/copy-voice-guide]]
created: 2026-07-09
updated: 2026-07-09
---

# Lead intel workflow

Every lead that matters should exist in repo memory, not only in chat.

## Why this matters for Pulsify

Outreach breaks when context leaks out of the system. The founder should be able to ask "what did we last do for Grant?" and get an answer from the repo in seconds. Not from guesswork, not from scrolling old chats, and not from whichever model happens to remember it.

This workflow turns each prospect into a persistent operating record: what came in, what leak was diagnosed, what personal detail we are leaning on, what assets were built, what message went out, and what the next highest-value move is.

## Core mechanics

### One lead = one file

Every worked prospect gets a file in `outreach/intel/`.

That file holds:

- source notes or profile references
- the main leak
- one personal detail to use lightly
- assets built
- current best DM/email copy
- last action taken
- next recommended action

### The standard

Every meaningful touch updates the file:

- profile ingested
- landing-page angle set
- page built
- DM drafted
- email drafted
- Typeform drafted
- VSL drafted
- follow-up asset drafted
- message sent
- reply received

If we touched the lead, the file gets updated before the session ends.

### The copy rule

Codex can draft first-pass copy fast, but if the founder wants stronger outbound, Codex should use Claude for the final copy pass and save the improved version back into the same lead file. The stronger copy should become the new default, not disappear into one chat turn.

### The follow-up rule

The lead file should always answer one question fast:

What is the next useful thing to build?

Usually that means the next asset in sequence:

1. landing page
2. DM / email
3. Typeform
4. VSL
5. offer audit
6. next follow-up copy

## How Pulsify uses this

The founder supplies the lead and the notes. The models use that input to diagnose the leak and build assets. The repo stores the state so the next follow-up does not restart from zero.

That means:

- less repeated reasoning
- less lost context
- better follow-up quality
- cleaner handoff between Claude and Codex

## Connections

- [[playbooks/pulse-system-outreach]] — the asset-first outreach motion
- [[content-engine/cold-dm-formula]] — first-touch voice rules
- [[content-engine/copy-voice-guide]] — copy clean-up rules

## Open questions / gaps

- A founder-approved subject-line standard for cold email is still missing.
- The current lead intel lives in markdown, not yet in dashboard UI.
- Grant's record already shows the need for a stronger Claude final-pass on email copy when the founder wants harder hooks.

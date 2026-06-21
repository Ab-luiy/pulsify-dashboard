---
type: playbook
tags: [outreach, ai, dms, looms, rev-share, grant-garcia, pulse-system]
sources: [[raw-sources/scripts/AI-Outreach-Framework-Grant-Garcia.md]]
created: 2026-05-06
updated: 2026-05-06
---

# AI outreach — Grant Garcia method

A 6-step AI-powered outreach system whose central unlock is: build a personalized deliverable for the prospect *before* sending the first message. The deliverable is the message. The DM is just the wrapper.

## Why this matters for Pulsify

Standard outreach in 2026 is saturated and broken — generic DMs, copy-paste templates, "Hey I can help you scale." Saturation is actually a blue ocean because 99% of operators are doing it the same wrong way. Grant's method exploits this directly: instead of pitching, the operator builds a real landing page, VSL script, or Typeform for the prospect using AI in 15–30 minutes, then opens with the asset already attached.

This method maps perfectly onto Pulsify's [[trust-recession]] thesis (lifestyle proof is dead, value-first is the only thing that converts) and onto Pulsify's [[unique-mechanism]] direction — the asset Grant builds in the DM is the same kind of artifact Pulsify can build at scale via [[concepts/pulse-system|The Pulse System]]. Grant's method is the inbound demo of Pulsify's whole offer, compressed into a DM.

## Core mechanics

### The 6-step system

**Step 1 — Find the right prospects.** Creators/coaches who already have an audience and an offer. Monetization is broken or underperforming — they have attention, they lack systems. Best niches: trading, real estate, ecom, dropshipping, Amazon FBA, TikTok Shop. Avoid fitness, dating, woo-woo when starting out — direct-ROI niches close easier. Build the list with an AI prompt that filters by niche, audience size (1K–20K), recent activity (posted in last 30 days), and engagement (>2K avg views).

**Step 2 — The 15-minute research protocol.** This is the moat. Cannot be skipped, cannot be fully AI'd.
- *Funnel hack (5 min):* Submit their funnel as a lead. Stopwatch from submit. If no setter outreach in 5 min, their speed-to-lead is broken. Note landing page quality, VSL presence, Typeform structure, follow-up sequence, confirmation page.
- *Content audit (5 min):* Are they driving traffic to the offer? Do they have TOF/MOF/BOF or only one layer? Pipe a YouTube transcript into Claude with a content-restructure prompt.
- *Specific opportunity (5 min):* Pick one or two concrete fixes — rebuild the lander, script a new VSL, build an optimized Typeform, set up pre-call asset sequence, write a 6-email follow-up cadence.

**Step 3 — Build the asset before reaching out.** The AI advantage. Almost nobody is doing this.
- *Landing page:* Lovable AI, modeled after the top competitor's lander, customized to the prospect's offer.
- *VSL script:* Claude with Jeremy Haynes' 6-step framework (already documented in [[frameworks/vsl-framework]]) + the prospect's story, offer, and results.
- *Typeform:* Claude builds a full UI Typeform that filters unqualified leads and pre-sells on the call.
- *Pre-call asset / confirmation page:* 45-second video scripts handling common objections + Lovable-built confirmation page.

**Step 4 — The actual outreach.** Lead with the deliverable. Skip permission. The two openers:
- *Direct:* "Yo [name], went through your funnel and put together a [VSL script / rebuilt landing page / optimized Typeform] specifically for your offer — sending it over now." Then drop the link.
- *After a casual reply:* "Just went through your entire funnel — not going to lie, [what was broken]. Spent a few minutes putting together [what you built]. Take a look."

**Step 5 — Follow-up.** Most deals don't close on message 1. Most operators give up after 2–3 follow-ups. Three tactics:
- *Story slide-up:* Post-notifications on the prospect. The second they post a story, react and follow up — they're online and active.
- *Win screenshot:* When a current client hits a result, send the screenshot to the entire follow-up pipeline with: "Going to keep hitting you up until you either block me or we start seeing days like this."
- *AI-assisted re-engage:* Feed the conversation history to Claude, ask for three follow-up angles based on what's worked.

The doc's load-bearing fact: one of Grant's biggest clients required over a year of follow-up. The money is in the follow-up.

**Step 6 — The consultation call / close.** Five-part structure: rapport (3–5 min) → diagnose with notes → present the asset built in Step 3 (now expanded into the full picture) → project conservative revenue based on their current audience → structure the deal. For new operators, lead with rev-share: "Worst case you lose 20% margin for one month and tell me to go away. Best case you make way more money and we work together long-term."

### Proof from the doc

- Sire Abram (Vantage Education) — $400K in 5 days on a webinar launch, delivered entirely with AI.
- Aiden — $24K personal profit from 2 clients.
- Sammy — $10K/day consistent for one signed client.
- Gus — $235K cash collected for a client in 4 days.

### Tools and cost

| Tool | Use | Cost |
|---|---|---|
| Claude | Deep thinking, prompts, scripts, project management | $20/mo |
| ChatGPT | Quick tasks | Free tier |
| Lovable AI | Landing pages, confirmation pages, Typeforms with UI | Subscription tier |
| Poppy | Transcripts | ~$50/mo |
| Google Sheets | Pipeline tracking | Free |

The whole stack runs under $80/mo. This validates the "$20/mo VSL machine" thumbnail and the broader "AI infrastructure under $80/mo" content angle.

## How Pulsify uses this

Grant's method is the operational blueprint for Pulsify's outreach until the inbound content engine is compounding (per the [[playbooks/lead-sourcing-outreach]] decision logged 2026-05-04: outreach is the bridge, content is the engine). Run as follows:

1. Use AI to build a 30-prospect list per week (trading, ecom, FBA, Airbnb, TikTok Shop coaches with broken monetization).
2. Run the 15-minute research protocol on the top 10 each week.
3. Build one asset per prospect using the [[ai-launch-prompt-pack]] prompts (specifically: VSL prompt, lander prompt, or Typeform prompt depending on the diagnosed gap).
4. DM with the asset attached, no permission asked.
5. Follow up with the three tactics above for as long as it takes.
6. On the call, the asset already shown becomes the proof of [[concepts/pulse-system|The Pulse System]] — Pulsify's mechanism.

The asset Grant builds in 15–30 min is *exactly* what Pulse Engine produces at scale. Every cold DM doubles as a Pulse Engine demo.

## Connections

- [[playbooks/lead-sourcing-outreach]] — the broader outreach context Grant's method now anchors
- [[playbooks/pulse-system-outreach]] — the Pulsify-voiced playbook that fuses Grant's method with The Pulse System
- [[frameworks/ai-launch-prompt-pack]] — the 9 prompts used to build the assets in Step 3
- [[frameworks/vsl-framework]] — Jeremy Haynes' VSL structure that the AI VSL prompt invokes
- [[people/marcus-avatar]] — speed-to-lead stopwatch and content audit map directly onto Marcus's five wounds
- [[concepts/trust-recession]] — explains why showing up with an asset breaks through where pitches don't
- [[concepts/unique-mechanism]] — the asset itself is a mini-mechanism demo

## Open questions / gaps

- Source spelling discrepancy: the framework header reads "Grant Wantgarcia"; the actual operator is Grant Garcia (referenced in the [[content-engine/packaging-rules]] competitor list). Treat as Grant Garcia.
- Claude Dispatch is referenced as a 2026 feature for autonomous prospect-list building. Worth a follow-up test to confirm current capability and add to the SOP.
- The doc cites Sire's $400K/5-day result but doesn't break down the launch sequence — useful detail to capture if Grant publishes the breakdown.

## Source trail

- [[raw-sources/scripts/AI-Outreach-Framework-Grant-Garcia.md]]

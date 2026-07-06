---
type: playbook
tags: [outreach, ai, pulse-system, dms, looms, assets, marcus, rev-share]
sources: [[raw-sources/scripts/AI-Outreach-Framework-Grant-Garcia.md]], [[raw-sources/scripts/AI-Launch-Prompt-Pack-Grant-Garcia.md]], [[raw-sources/sops/Lead Sourcing & Outreach SOP.pdf]], [[raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30]]
created: 2026-05-06
updated: 2026-06-30
---

# Pulse System outreach (Pulsify's voiced playbook)

The outreach motion Pulsify runs while the YouTube channel compounds. Built on Grant Garcia's "build before you DM" method, voiced for Pulsify, anchored on [[concepts/pulse-system|The Pulse System]] as the named mechanism, targeting Marcus across all five wounds.

## Why this matters for Pulsify

Pulsify's primary revenue engine is inbound content (per the 2026-05-04 decision). But the engine takes 60–90 days to compound. Outreach is the bridge — and historically, Pulsify's outreach has looked like everyone else's: cold DMs, Looms, audits. Grant Garcia's method changes the bridge into a demo: every cold DM ships a working AI-built asset to the prospect, which is also a live demo of [[concepts/pulse-system|The Pulse System]].

This collapses outreach and proof-of-mechanism into one motion. The prospect doesn't read a pitch — they receive a working VSL script for their offer, or a rebuilt landing page for their funnel, or a Typeform that actually filters. Then the call is just a walkthrough of what Pulse Engine and Pulse Brain would do at scale.

## The five-wound diagnostic (which asset to build per prospect)

Marcus arrives with one or more of five wounds (per [[people/marcus-avatar]]). The 15-minute research protocol determines which wound to lead with, and which asset to build.

| Wound | What you'll see in research | Asset to build | Prompt to use |
|---|---|---|---|
| **Content stall** | YouTube abandoned, IG content gets engagement no leads, no pillars | A 5-video pillar map + 3 packaged title/thumb pairs for their next videos | Pulse Engine title-thumb generator + pillar-mapping prompt |
| **Lead-flow stall** | No profile funnel, no ManyChat, dry pipeline panic visible in their content cadence | Rebuilt IG bio + story sequence (7-day arc) + ManyChat trigger flow | Prompt 8 from the [[frameworks/ai-launch-prompt-pack]] (story sequences) + bio rewrite |
| **Program stall** | Vague offer, no curriculum, "DM me" CTAs everywhere | A productized offer doc (3 variants with bonuses, guarantee, hook) | Prompt 1 from [[frameworks/ai-launch-prompt-pack]] (offer creation) |
| **Backend stall** | No VSL, weak lander, no email sequence, manual everything | Rebuilt landing page (Lovable AI) + 6-email pre-call sequence | Prompts 3 + 6 from [[frameworks/ai-launch-prompt-pack]] |
| **Sales-infrastructure stall** | Slow speed-to-lead, no Typeform or weak one, no pre-call asset | Optimized Typeform + pre-call asset page (45-sec objection videos) | Prompts 4 + 6 from [[frameworks/ai-launch-prompt-pack]] |

Pick one dominant wound before the first touch. Build one asset per message. Do
not ship a "full audit" — that signals consultant, not operator.

> Contradiction resolved: the earlier rule said "pick one wound per prospect,
> build one asset." The 2026-06-30 founder decision expands this into consecutive
> value follow-ups. The operative rule is now one diagnosed wound to open and one
> finished asset per touch. The prospect may receive a connected sequence of
> assets as the conversation continues.

## Default prospect value sequence

For qualified prospects with a weak or missing website/funnel, the default
sequence is now:

1. **Landing page first.** Send a working, prospect-branded conversion page built
   from [[synthesis/prospect-funnel-reference-library]]. Mason Bowstead is the
   default design skeleton. Luke Alexander's AI-native layer is added for AI,
   automation, software, or technology-led creators.
2. **VSL script second.** Follow up with a finished VSL written from the creator's
   transcripts, voice, unique mechanism, proof, and offer.
3. **Typeform third.** Follow up with the application questions, qualification
   logic, and booking handoff the VSL needs.
4. **Keep adding the next useful asset.** Pre-call emails, confirmation page,
   content angles, ad scripts, or tracking plan are chosen from the next diagnosed
   leak.

No message exists only to remind them that Pulsify exists. Every follow-up ships
new value. The sequence demonstrates the Funnel Stack being assembled around
their business.

## The 6-step Pulsify outreach loop

### Step 1 — Sourcing (30 min/day, AI-led)

Daily target: 30 new prospects added to the pipeline. Niches in priority order: trading, ecom/dropshipping, Amazon FBA, Airbnb hosting, TikTok Shop, agency owners (SMMA, copywriting). Avoid life coaching, wellness, fitness for now — the financial-return mindset is weaker.

Prompt to run daily:
> Search YouTube and Instagram for coaches selling [niche] mentorships, posted in the last 30 days, 1K–20K followers, averaging 2K+ views per piece. Return 30 prospects with: name, handle, audience size, niche specifics, what they're currently selling, and one observable gap in their funnel or content. Format as a markdown table I can paste into Sheets.

Refine with: "What would make these results more accurate? Ask me the questions you need." Iterate twice. Save the table to `clients/_pipeline/sourcing-{date}.md`.

### Step 2 — The 15-minute research protocol (top 10 prospects/day)

Per the Grant method, run on each top-10 prospect:
- **Funnel hack (5 min):** Submit their funnel as a lead. Stopwatch. Note speed-to-lead, lander quality, VSL presence, Typeform/form structure, follow-up sequence, confirmation page.
- **Content audit (5 min):** Pull a YouTube transcript or scroll their IG feed. Pipe into Claude with: "Analyze their content strategy. What's missing across TOF/MOF/BOF? What is broken? Specific to my [Pulse System] mechanism, what would I rebuild for them?"
- **Wound diagnosis (5 min):** Identify which of the five wounds is dominant. Pick the asset from the table above. Write one sentence describing the specific opportunity.

### Step 3 — Build the asset (15–30 min per prospect)

Pull the matching prompt from [[frameworks/ai-launch-prompt-pack]] or the Pulse Engine library. Feed it: niche, the prospect's offer details, what you found broken, the relevant reference asset (Sire's VSL, a competitor lander URL, etc.). Build the asset. Host it somewhere shareable — Lovable for landers, Notion for docs, Loom for video walkthroughs.

The asset must:
- Be specifically named for the prospect (their handle in the doc title, their niche language throughout)
- Reference one specific thing from their actual content/funnel — not generic
- Be a real, usable artifact — not a "we could build this" mockup
- Take under 30 minutes once you've done it 3 times

When the website is the diagnosed leak, the landing page is always the first
asset. Build it as a real handoff, not a design moodboard: VSL slot, application
preview, proof placeholders, and one CTA must already exist.

### Step 4 — The DM (the asset is the message)

> ⚠️ Superseded for DM voice (2026-07-06): the founder moved cold DMs to a warmer casual-peer voice with a genuine content compliment and a soft reply-inviting close. Use [[content-engine/cold-dm-formula]] as the current standard for first-touch DMs. The diagnostic Format A / Format B copy below is retired for DMs; the surrounding research, follow-up, and call steps in this playbook still stand.

No permission asked. No "want me to send it over?" The opener is the asset link. Two formats — pick by prospect temperature.

**Format A — Direct (cold prospects):**
> Yo [name], went through your funnel and built you a [VSL script / rebuilt landing page / Typeform / pillar map] specifically for your [niche] offer. Sending it now → [link]

**Format B — After a casual reply (warm prospects):**
> Just went through your whole funnel — not gonna lie, [specific thing that's broken]. Spent 20 min on this [asset], built it around your [offer/audience/results]. Take a look → [link]

Voice rules — non-negotiable, per Pulsify CLAUDE.md:
- No "bro," no "G," no compliments-on-the-account opener
- No fake guarantees, no "$50K/mo in 90 days"
- No emojis
- Diagnostic, not pitch
- One observation, one asset, one link

Never send the same opener to two prospects. The asset is the personalization — but the DM around it should also feel one-to-one.

### Step 5 — Follow-up by shipping the next asset

If a prospect replies once, they are interested. Do not stop until you've booked
the call or exhausted every angle. The primary follow-up is the next finished
asset in the sequence: landing page -> voice-matched VSL -> Typeform -> next
diagnosed conversion asset.

The rule: never send "just following up." Send, "I kept working on this and built
the next piece."

Supporting tactics can still be used between asset drops:

**Story slide-up:** Turn on post-notifications for the prospect on IG. The second they post a story, react and follow up. They're online, they'll see it.

**Win screenshot:** When a Pulsify client (or your own channel) hits a result — a $20K month, a $400-view video that booked a call, a launch that closed — screenshot it. Send to everyone in the cold pipeline with: "Going to keep hitting you up until you either block me or we start seeing days like this for your offer."

**AI re-engage:** Paste the conversation history into Claude with: "Here's my conversation with [prospect]. They went cold after [last reply]. Give me three follow-up angles based on what worked in the thread, ranked by likelihood of reply." Test one, iterate.

The load-bearing fact from Grant: one of his biggest ever clients required over a year of follow-up. Most operators give up at message 3. The money is in messages 4 through 40.

### Step 6 — The call (diagnose, demo, structure)

Five-part structure. Total time: 45–60 min.

1. **Rapport (3–5 min)** — Casual. You're a partner, not a salesperson. Ask about their week, their last launch, their wins.
2. **Diagnose (10–15 min)** — You already know the wound from research. Confirm it. Ask: "What's working right now? What numbers are you hitting? What's the single thing holding you back from where you want to be?" Take notes visibly. Let them talk.
3. **Walk through the asset (10–15 min)** — Open the artifact you sent in the DM. Walk them through every decision: why the headline says that, why the Typeform asks that question, why the VSL hook lands that way. This is the Pulse Engine demo. They've seen the preview. Now they see the full picture of their business when [[concepts/pulse-system|The Pulse System]] is running it.
4. **Project conservative numbers (5–10 min)** — "You're at $20K/mo. Your audience is X. With Pulse Engine producing 2 videos/week + Pulse Brain wired to your inbound + Pulse Loop hammering every booked call, conservative path to $60K/mo in 90 days." Show the math.
5. **Structure the deal (5–10 min)** — For new clients (and for any prospect with friction): rev-share frame. "Worst case: you give up 20% margin for one month and tell me to walk. Best case: we build your AI infrastructure together and you scale predictably. It's a no-brainer if you know there's money on the table." Don't sell. Diagnose. Frame. Wait.

## How Pulsify uses this

This is the active outreach SOP starting 2026-05-06. Every prospect in the Pulsify pipeline runs through this loop. Daily targets:
- 30 new prospects added to sourcing list
- 10 prospects through 15-min research protocol
- 5 assets built and shipped in DM
- All replied prospects worked through Step 5 follow-up rotation
- 2–4 booked calls per week target (rising as inbound compounds)

Hard constraint: outreach hours per day are capped at 4. Pulsify is content-first. If outreach starts cannibalizing video production, outreach loses. The bridge cannot eat the engine.

When Pulsify hires a setter (per [[playbooks/lead-sourcing-outreach]]), the setter runs Steps 1, 2, and 5. Asset-building (Step 3) and the call (Step 6) stay with the operator until the setter has shipped 30 assets reviewed and approved.

## Voice templates (ready to deploy)

### DM Format A — VSL asset
> Yo [name], went through your funnel for [offer name]. Your hook is solid but the proof loop is missing — built you a rewritten VSL script using Jeremy Haynes' framework, anchored on your $X student result. Sending now → [link]

### DM Format A — Lander asset
> [Name], submitted your [offer] funnel. Your lander loads fast but the Typeform's letting unqualified leads through and the headline doesn't pre-qualify. Rebuilt the lander with Lovable, modeled on [top competitor in their niche]. Live preview here → [link]

### DM Format A — Pillar/content asset
> [Name], pulled the last 6 of your YouTube videos through Claude. You're posting Pillar 2 content (case studies) but no Pillar 1 (concept breakdowns) which is why your search traffic is flat. Mapped 5 TOF videos for your next month, packaged with titles and thumb specs → [link]

### Follow-up — story slide-up
> Saw your story. The thing I sent over — did it land? If the asset isn't useful I'd rather know than keep following up.

### Follow-up — win screenshot
> [Screenshot of recent client/channel result.] Going to keep hitting you up until you either block me or we start seeing weeks like this for [their offer]. Worth 30 min on Friday?

### Follow-up — re-engage
> [Name], a month back I sent you a [asset]. You said [their reply]. Three things have shipped since — happy to walk you through what we'd do differently for your funnel given [recent thing they posted]. Worth a quick call?

### Call closer — rev-share
> Here's the simplest version. I run Pulse Engine on your channel for the next 30 days — content, packaging, the whole machine. Pulse Brain wires your sales infrastructure. We split new revenue 80/20 in your favor for month one. If you don't see [conservative number] hit, you walk and I keep nothing. If you do, we lock a 90-day engagement at the standard rate. Worst case you lose 20% margin for one month. Best case you stop guessing forever.

## Connections

- [[playbooks/ai-outreach-grant-method]] — the source method this playbook adapts
- [[frameworks/ai-launch-prompt-pack]] — the prompt library Step 3 pulls from
- [[playbooks/lead-sourcing-outreach]] — the broader outreach context (sourcing platforms, follow-up sequence, setter hiring)
- [[people/marcus-avatar]] — the five wounds the diagnostic table maps to
- [[concepts/pulse-system|The Pulse System]] — the named mechanism every asset demonstrates
- [[concepts/trust-recession]] — explains why building before pitching breaks through
- [[concepts/hammer-them-strategy]] — what Step 6's pre-call asset prompt operationalizes
- [[frameworks/vsl-framework]] — invoked inside the VSL asset prompt
- [[content-engine/packaging-rules]] — used when the asset built is a content/packaging deliverable
- [[synthesis/prospect-funnel-reference-library]] — Mason-first/Luke-second design hierarchy and the consecutive value sequence

## Open questions / gaps

- Pulse System is still working-state name (locked 2026-05-06). When [[concepts/pulse-system]] page is created, link target above resolves.
- Asset-build-time of "15–30 min" assumes the operator has run the prompts 3+ times. First 5 prospects will take 60+ min each. Plan for the curve.
- Tracking: no pipeline template exists yet for the Pulsify outreach run. Build a Sheets template tracking: prospect, niche, wound, asset built, DM sent date, replies, follow-up cadence, call booked, call outcome.
- Story slide-up tactic requires post-notifications on 30+ prospects. IG may rate-limit. Test and adjust the per-day target if it triggers.
- AI setter (per the Pulse Brain backend roadmap) is not yet built. When it ships, Steps 1, 2, and 5 of this playbook get progressively automated.
- Follow-up cadence between the landing page, VSL, Typeform, and later assets is not yet locked. Do not invent one until Abdul sets it or response data establishes it.

## Source trail

- [[raw-sources/scripts/AI-Outreach-Framework-Grant-Garcia.md]]
- [[raw-sources/scripts/AI-Launch-Prompt-Pack-Grant-Garcia.md]]
- [[raw-sources/sops/Lead Sourcing & Outreach SOP.pdf]]
- [[raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30]]

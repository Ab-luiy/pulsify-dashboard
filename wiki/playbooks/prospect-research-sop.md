---
type: playbook
tags: [outreach, content, vsl, funnel, sales]
sources: [[raw-sources/sops]], [[wiki/playbooks/vsl-transcript-extraction-prompt]]
created: 2026-05-24
updated: 2026-05-24
---

# Prospect research SOP

Before any asset gets built for a prospect — VSL, landing page, Typeform, email sequence, outreach DM — this SOP runs first. Every asset is only as good as the context it was built on. This process extracts that context systematically.

## Why this matters for Pulsify

Pulsify's positioning is that we understand a creator's audience better than most agencies because we build from the creator's own language, not generic copywriting. The only way to do that is to actually study the creator. This SOP is how that study gets done. It replicates what a tool like Poppy AI does — connecting a creator's video content to an LLM to extract who they are, how they speak, what they teach, and what their audience responds to — then outputs a Creator Profile that every downstream asset pulls from.

## Who this applies to

Any prospect being considered for outreach, any new client before asset production begins, any creator whose VSL, landing page, or email sequence Pulsify is writing.

## Step 1 — Qualify before you scrape

Do not run this SOP on every prospect. Confirm first:

- They are in a biz-op niche (trading, ecom, dropshipping, Amazon FBA, Airbnb, TikTok Shop, or adjacent)
- They have an audience (minimum 1k followers anywhere, ideally 3k+)
- There is evidence of a monetizable offer — a coaching program, a mentorship, a course, or strong signals they want to build one
- They are active — content posted within the last 60 days

If they pass, open their Creator Profile template (see [[raw-sources/prompts/creator-profile-template]]) and begin filling it.

## Step 2 — YouTube scrape

YouTube is the primary source. It has the most transcript-dense, long-form content available. Run the [[playbooks/vsl-transcript-extraction-prompt]] against their channel using Perplexity. That prompt extracts:

- Voice and language (exact phrases, sentence structure, recurring words)
- The mechanism (what they teach, their proprietary framework or method)
- Avatar pain points (what their audience struggles with)
- Proof and results (student wins, their own numbers)
- Objections they address
- Their origin story
- What makes them different
- Which content performs best and why

Minimum video coverage: 5 videos. Prioritize in this order:

1. Any video that is explicitly a sales video, offer breakdown, or "work with me" content
2. Their highest-view videos (most validated content)
3. Their longest videos (most voice data)
4. Their most recent videos (current positioning)

If Perplexity returns thin output (YouTube blocked transcripts), go to ytranscript.com or tactiq.io, pull transcripts manually, and paste them directly into Claude with the synthesis prompt from [[raw-sources/prompts/prospect-profile-synthesis-prompt]].

## Step 3 — Instagram scrape

Go to their Instagram profile manually. Extract:

- Bio: exact words, how they describe themselves, what they claim, what CTA they use
- Highlights: what categories exist, what they chose to keep permanent (this is deliberate positioning)
- Last 9-12 feed posts: captions — note recurring phrases, what topics they push, how they open captions, how they close
- Reels: watch the first 3-5 seconds of their top-performing reels. What hook do they use? What energy level?
- Story CTAs if visible: what are they asking people to do right now

Paste all of this into the Creator Profile under the Instagram section.

## Step 4 — Sales funnel scrape

If they have a public funnel — landing page, VSL, Typeform, booking page — capture it. This is the most valuable source because it shows how they already convert.

- Screenshot the landing page in full
- Watch the full VSL if one exists. Note the structure: how they open, when they introduce their mechanism, when they drop proof, when they make the ask
- Read every Typeform question if visible — tells you exactly who they think their buyer is
- Note what the booking page says — framing, what they promise before the call

File screenshots under `clients/{name}/calls/` or `raw-sources/client-raw/{name}/` depending on whether they are a prospect or an active client.

## Step 5 — Podcast and interview scrape

If they have appeared on podcasts or YouTube interviews (their own or others'), pull one. Podcast content is often more candid than scripted videos — the creator's real voice, real beliefs, and real story come through more clearly.

Search: `"{name}" podcast` or `"{name}" interview` on YouTube. Pull one 30-60 minute appearance. Use the Perplexity prompt or a manual transcript paste.

## Step 6 — Synthesize into the Creator Profile

Take everything gathered in Steps 2-5 and run it through the synthesis prompt at [[raw-sources/prompts/prospect-profile-synthesis-prompt]].

Paste all raw transcript content and scraped notes into Claude. The synthesis prompt instructs Claude to output a complete Creator Profile covering:

- Who they are in one paragraph
- Their tone fingerprint (top 20 words and phrases they actually use)
- What they teach and their unique mechanism
- Their audience and the primary pain points
- Their proof stack
- Their offer (if known) and price point (if visible)
- Their content patterns — what performs, what topics dominate
- Gaps: what is missing or unclear that would block asset production

Save the output as `clients/{name}/overview.md` if they become a client, or `raw-sources/client-raw/{name}/profile.md` if still a prospect.

## Step 7 — Asset production

The Creator Profile is now the single source of truth for every asset. Feed it into:

- VSL: use [[playbooks/vsl-transcript-extraction-prompt]] output + Creator Profile as Claude context
- Landing page: paste into the context block of [[raw-sources/prompts/landing-page-design-prompt-auto]]
- Typeform: pull the avatar pain points and 3-month target language directly from the profile
- Email sequence: the tone fingerprint section feeds directly into email copy
- Outreach DM: the "who they are" paragraph tells you exactly what angle to lead with

## What makes this fail

- Skipping Step 1 and researching prospects who are not a fit wastes the whole cycle
- Thin transcript output from Perplexity without manual backup leads to generic profiles
- Not watching any video content personally — transcripts miss energy, pacing, and emotional delivery that affects tone accuracy
- Building assets before the Creator Profile is complete and signed off

## Connections

- [[playbooks/vsl-transcript-extraction-prompt]] — the YouTube scrape prompt this SOP calls
- [[raw-sources/prompts/prospect-profile-synthesis-prompt]] — the synthesis prompt for Step 6
- [[raw-sources/prompts/landing-page-design-prompt-auto]] — landing page prompt fed by the profile
- [[playbooks/lead-sourcing-outreach]] — upstream process that identifies who enters this SOP
- [[people/marcus-avatar]] — ICP reference for qualifying in Step 1

## Open questions / gaps

- No automated transcript pull tool is connected yet. Currently manual via Perplexity or ytranscript.com. A YouTube Data API integration would speed this up significantly — see the lead sourcer script in Projects/Pulsify.
- Instagram scrape is still fully manual. No tool connected.
- No standardized rubric for scoring a Creator Profile as complete vs. incomplete before asset production starts.

## Source trail

Built 2026-05-24 based on the Poppy AI workflow concept — connecting video content to an LLM to extract creator identity, tone, and mechanism before writing any conversion asset.

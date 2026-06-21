---
type: prompt
category: prospect-research
use: Step 6 of prospect-research-sop — synthesize all scraped content into a unified Creator Profile
feeds-into: VSL, landing page, Typeform, email sequences, outreach DMs
created: 2026-05-24
---

# Prospect profile synthesis prompt

## How to use

Run this after completing Steps 2-5 of [[wiki/playbooks/prospect-research-sop]]. Paste all raw content — YouTube transcripts, Instagram notes, sales page screenshots or text, podcast notes — into the context block below. Claude outputs a complete Creator Profile ready to feed into any asset.

---

## The prompt

You are building a Creator Profile for a prospect Pulsify is about to create outreach and conversion assets for. Every asset — VSL, landing page, Typeform, email sequence, outreach DM — will be built from this profile. If the profile is incomplete, the assets will be generic. Do not guess or fill gaps with assumptions. Flag every gap explicitly.

**Raw content block:**

[PASTE ALL SCRAPED CONTENT HERE — YouTube transcripts, Instagram bio and captions, sales page copy, podcast notes, anything gathered about this person]

---

Once you have read everything above, output the Creator Profile in the exact structure below. Do not skip any section. Where data is missing, write "GAP — [describe what is missing and where to find it]" rather than inventing a plausible answer.

---

### 1. Who they are

One paragraph. Who is this person, what do they do, what space are they in, what is the core promise they make to their audience. Write it in plain language as if briefing a copywriter who has never heard of them.

### 2. Tone fingerprint

List the top 20-30 words and phrases this person actually uses — pulled verbatim from the transcripts and content. Include: recurring openers, recurring closers, filler phrases, niche jargon, how they address their audience, how they talk about money, how they talk about failure, how they talk about success. This section should read like a vocabulary list a ghostwriter would keep open while writing.

Also describe in 2-3 sentences: what is their energy level (calm and analytical, high energy, conversational, authoritative), what is their sentence structure (short and punchy, long and explanatory), and what do they never say (what language feels out of character for them).

### 3. What they teach — the mechanism

What is the core thing they teach? Give it the name they use. Describe the mechanism in their own words as best the transcripts allow. If they have a proprietary framework, name it and explain the steps as they describe them. If they do not have a named mechanism yet, describe what they do and flag it as unnamed.

### 4. Their audience

Who is watching and buying. Describe the avatar in terms of: where they are right now (situation, income level if mentioned, frustrations), what they want (the 3-month target, the dream outcome), and what has already failed them (what they've tried that did not work). Pull this from the pain points the creator repeatedly addresses and the comments or questions they reference.

### 5. Proof stack

Every result mentioned — student result, personal result, account milestone, income figure, percentage return, transformation story. Write each one in a single line: [Source] [Result] [Context]. If the creator references a result vaguely without numbers, note it as unverified. If no proof is visible, write GAP and flag it — proof gaps block VSL and landing page production.

### 6. Their offer

What are they selling, at what price, and how do they currently sell it (DMs, landing page, VSL, booking link). If the price is not public, note that. If there is no visible offer yet, flag it — this affects which assets to build first.

### 7. Content patterns

Which topics dominate their channel. Which videos get the most views or engagement. What does that tell you about what their audience responds to most. Any content formats they use that are worth noting (talking head, screen share, case study breakdowns, etc.).

### 8. Competitive positioning

How do they differentiate themselves from other educators in their niche. What do they say is wrong with how most people teach this. What do they claim to do differently. Note if this is explicit (they say it directly) or implied (observable from their content but not stated).

### 9. Gaps and blockers

List every piece of information that is missing and would block or weaken an asset. For each gap: name what is missing, explain which asset it blocks, and suggest where to find it (which video, which platform, what to ask them directly if they become a client).

---

After outputting the Creator Profile, give me one paragraph on which asset to build first based on what is available and what is missing. If proof is thin, the VSL needs a different structure. If the offer is invisible, the landing page cannot be built yet. Tell me the most logical starting point.

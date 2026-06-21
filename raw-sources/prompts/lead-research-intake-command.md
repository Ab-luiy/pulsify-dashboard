---
type: prompt
category: prospect-research
use: Master intake command — fill in lead details, get a full pre-configured research prompt pack back
feeds-into: prospect-profile-synthesis-prompt, landing-page-design-prompt-auto, VSL, Typeform, email sequences, outreach DMs
created: 2026-05-24
---

# Lead research intake command

## How to use

Paste the prompt below into Claude. Fill in the lead details at the top — that is the only thing you ever touch. Claude generates a numbered prompt pack, fully pre-filled, in the exact order you run them. Each prompt is ready to copy and paste with zero editing.

Minimum required fields: Name + YouTube URL. Everything else improves output quality but is optional.

---

## The prompt

I need you to generate a fully pre-filled research prompt pack for a prospect I am about to research. Read the lead details below, then output each prompt in the pack fully written out and ready to paste — no placeholders left unfilled, no instructions to "insert X here." Every prompt should be copy-paste ready.

**Lead details:**

- Name: [their name or channel name]
- YouTube channel URL: [full URL]
- Instagram handle: [@handle]
- Niche: [trading / ecom / dropshipping / Amazon FBA / Airbnb / TikTok Shop / other — leave blank if unknown]
- Estimated audience size: [number or range — leave blank if unknown]
- Known offer: [what they sell and at what price — leave blank if unknown]
- Any other context: [anything else relevant — mutual connections, how you found them, what made them stand out]

---

Once you have read the lead details above, output the following prompt pack. Use the lead's actual name, URL, handle, and niche everywhere they appear. Do not leave any field as a placeholder — if a detail was not provided, write around it naturally.

---

### PROMPT 1 — YouTube deep scrape (paste into Perplexity)

Write the full Perplexity prompt for this specific creator. Insert their YouTube channel URL directly into the prompt. The prompt must extract:

- Voice and language: exact words, phrases, sentence structure, recurring openers and closers, how they address their audience, any slang or niche jargon — verbatim, not described
- The mechanism: what they teach, the name they use for it, how they explain why it works, any proprietary terminology
- Avatar pain points: every problem, frustration, and failure their audience has — pulled from what the creator repeatedly addresses, comments they reference, questions they keep getting
- Proof and results: every result mentioned — student wins, personal results, income figures, percentage returns, milestones — verbatim with context
- Objections they address: every time the creator pushes back on a skeptical belief or reframes a common assumption
- Their origin story: when they started, what failure looked like, the turning point, specific numbers or timelines
- What makes them different: how they position against other educators in their niche, what they say is wrong with the industry
- Content patterns: which topics dominate, which videos perform best by view count or comment volume

Instruct Perplexity to go through as many videos as possible, to prioritize sales content and high-view videos first, to give verbatim quotes not summaries, and to flag if transcript access was limited.

---

### PROMPT 2 — Instagram scrape checklist (use this yourself, takes 10 minutes)

Output a clean checklist for manually scraping this creator's Instagram. Pre-fill their handle. The checklist must cover:

- Bio: exact words, self-description, claims made, CTA used
- Highlights: what categories exist, what they chose to keep permanent
- Last 9-12 feed posts: recurring phrases, topic patterns, how they open and close captions
- Top reels: hook used in the first 3 seconds, energy level, topic
- Any visible story CTAs

Format it as a checklist the user fills in while scrolling the profile. Leave a blank line after each item for notes.

---

### PROMPT 3 — Sales funnel capture checklist (use this yourself, 5-10 minutes)

Output a checklist for capturing this creator's public sales funnel — landing page, VSL, Typeform, booking page. Pre-fill their name. Cover:

- Landing page: headline, subhead, CTA text, social proof visible above fold, page length
- VSL: does one exist, where it sits, approximate length, whether it autoplays
- Application form or Typeform: every question asked, in order
- Booking page: framing copy, what is promised before the call, any pre-call instructions

If no public funnel is found, note what that signals about where they are in their business.

---

### PROMPT 4 — Creator Profile synthesis (paste into Claude after completing Prompts 1-3)

Write the full synthesis prompt for this specific creator. Pre-fill their name and niche throughout. The prompt must instruct Claude to take all pasted research and output a Creator Profile covering:

- Who they are: one paragraph, plain language, as if briefing a copywriter
- Tone fingerprint: top 20-30 verbatim phrases and words, energy level, sentence structure, what language feels out of character for them
- Mechanism: what they teach, their named method, described in their own terms
- Audience: avatar situation, desired outcome, what has already failed them
- Proof stack: every result in [Source] [Result] [Context] format, unverified results flagged
- Offer: what they sell, price point if known, how they currently sell it
- Content patterns: dominant topics, best-performing formats
- Competitive positioning: how they differentiate, explicit vs. implied
- Gaps and blockers: every missing piece flagged with which asset it blocks and where to find it

End the synthesis prompt with an instruction for Claude to recommend which asset to build first based on what is available and what is missing.

---

### PROMPT 5 — Asset generation command (paste into Claude after the Creator Profile is complete)

Write a short command that takes the completed Creator Profile and tells Claude which assets to queue up. Pre-fill the creator's name and niche. The command should:

- Confirm the Creator Profile has been read in full
- List the assets Pulsify can now build from it: VSL script, landing page (structure pass), Typeform questions, outreach DM angle, email sequence opener
- Ask the user which asset they want to start with
- Note any assets that are blocked due to gaps flagged in the profile, and what is needed to unblock them

---

After outputting all five prompts, give me a one-line status summary: what is ready to run immediately, and what depends on completing earlier steps first.

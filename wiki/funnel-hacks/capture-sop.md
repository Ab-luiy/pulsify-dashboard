---
type: playbook
tags: [funnel-hacking, sop, capture]
sources: []
created: 2026-05-15
updated: 2026-05-15
---

# Capture SOP — funnel hacking a creator end to end

The protocol Claude follows when funnel-hacking a creator. Every step gets executed. Nothing skipped. Output goes into the creator's folder using [[creator-template]].

## Prerequisites

Before starting a capture, confirm:

- Creator name and handle on each major platform (user provides, or Claude searches)
- Burner email user has set up for opt-ins (rotate per creator if possible to keep email sequences clean)
- Burner phone number for SMS sequences (Google Voice or similar)
- Burner name to use on forms (consistent across all opt-ins for a single creator)
- Permission to use computer-use and claude-in-chrome MCPs for the capture

Claude requests application access (Chrome at minimum) before starting. If the Chrome extension MCP is connected, use it for all browser work. Otherwise use computer-use with the chrome browser at the appropriate tier.

## Phase 1 — Attention layer (research, no opt-in needed yet)

### 1.1 YouTube long-form
- Open channel
- Screenshot channel homepage
- Note: subscriber count, total views, channel age, upload cadence
- Screenshot the videos tab sorted by "most popular" — capture top 20
- For each of the top 10 videos, log: title, thumbnail (screenshot), view count, upload date, duration
- Open the top 3 most-viewed videos. For each:
  - Log the first 30 seconds of hook structure (transcribe or summarize)
  - Note CTA placement (when does first CTA appear, what is it, where does it point)
  - Note any pinned comment with links
  - Note description copy and links
- Identify title pattern (curiosity gap, listicle, contrarian claim, case study, etc.)
- Identify thumbnail pattern (face yes/no, text overlay style, color palette, expression)

### 1.2 YouTube Shorts
- Check shorts tab
- Posting frequency
- Top 5 shorts: hook, CTA, view count
- Are shorts clipped from long-form or native shot?

### 1.3 Instagram
- Open profile
- Screenshot full profile (bio, link in bio, highlights, first 9 posts)
- Log: follower count, follow count, post count, name field, bio copy, link destination
- Screenshot every highlight cover
- Open each highlight and screenshot every frame, log content
- Posts: scroll first 30 posts, classify each (reel / carousel / single photo), screenshot the grid
- Reels: open top 5 most-viewed reels, log hook, CTA, view count
- Story sequence (if any active): screenshot every story frame

### 1.4 TikTok
- Same protocol as IG: profile screenshot, follower count, bio, link, top 5 videos with hook + CTA + view count
- Identify cross-posting from IG vs native

### 1.5 Clipping accounts
- Search format: `{creator name} clips` on IG, TikTok, YouTube
- For each clipping account found: handle, follower count, link in bio (does it point to creator's funnel?), watermark style, post frequency
- Distinguish creator-run / agency-run / fan-run (link destination is the tell)
- Search for clipping agency mentions in bios (e.g., "managed by X", "@agency")

### 1.6 Republishing patterns
- Pick one piece of content. Does it appear on YouTube shorts, IG reels, and TikTok? Same edit or platform-specific?
- Note posting time gaps between platforms

### 1.7 Paid ads (if traceable)
- Check Meta Ads Library for the creator's page
- Screenshot all active ad creatives
- Note ad copy patterns, video length, CTA buttons

## Phase 2 — Funnel layer (this is where opt-ins start)

### 2.1 Entry points
- Map every link in bio across every platform to its destination URL
- Note which platforms point to which funnel (some creators run different funnels per platform)

### 2.2 Landing page
- Visit each destination
- Full-page screenshot
- Capture every section: headline, subheadline, video/VSL, social proof, body copy, CTA buttons (count and placement), footer
- Note any exit-intent popups (close the tab and reopen to trigger)

### 2.3 Opt-in
- Fill the opt-in form using the burner identity
- Screenshot the form fields (what they collect)
- Note: are there qualification questions before access? After?
- Submit. Screenshot the thank-you / next page.

### 2.4 Email nurture sequence
- Log into burner inbox
- Wait window: 24h, 48h, 72h, 7d, 14d, 30d
- For every email received: timestamp (and time-since-opt-in), subject line, sender name, preview text, full body screenshot, all CTAs, links
- Tag each email by purpose: welcome, content delivery, soft pitch, hard pitch, urgency, social proof, case study, objection handling, reactivation
- Note frequency pattern (daily? every other day? broadcast vs sequence?)

### 2.5 SMS sequence
- If phone was collected, log every SMS the same way: timestamp, body, CTA, link

### 2.6 VSL
- If a VSL appears anywhere in the funnel, log:
  - Length
  - Where it sits (landing? post-opt-in? in email?)
  - Hook (first 60 seconds — what claim / promise / pattern interrupt)
  - Structure: problem → agitation → unique mechanism → proof → offer → CTA (note actual structure used)
  - Pitch moment (timestamp where offer is first revealed)
  - Price reveal (yes/no, when, how)
  - CTA mechanics (button under video, opens when, what comes next)
- Attempt a transcript or detailed outline

### 2.7 Webinar
- If a webinar is part of the funnel:
  - Live or evergreen
  - Registration page screenshot
  - Length
  - Pitch structure
  - Replay availability
  - Bonus / urgency stacking

### 2.8 Application form
- If gated by application:
  - Every question asked (screenshot)
  - Qualification criteria implied by questions (income, role, business stage)
  - Submission outcome (auto-call-booking? manual review?)

### 2.9 Call booking
- Calendar tool used (Calendly, custom, etc.)
- Time slots available (length, frequency, lead time)
- Reminder sequence (email, SMS, both)
- Pre-call homework or questionnaire

### 2.10 Pricing reveal
- Where is price revealed: VSL, application, sales call only?
- If on a call, leave that part to user judgement — don't book the call unless user wants to capture it

### 2.11 Sales call structure
- If user wants to capture this layer, book the call
- Otherwise infer from public content (creators sometimes reveal their call structure in YouTube videos)
- Tag the framework if recognizable (Jeremy Haynes call funnel patterns, traditional consultative, hard close, etc.)

### 2.12 DM closing
- Check if creator's IG / TikTok auto-DMs on engagement (test by commenting a trigger word from a recent post)
- Log any auto-DM sequence
- Note if they appear to do manual closing in DMs (case studies in their content where they say "DM me X")

### 2.13 Retargeting ads
- After opting in, browse the web normally for a few days
- Screenshot any retargeting ad from the creator on FB / IG / YouTube
- Note creative type, copy, CTA

## Phase 3 — Content breakdown

Synthesize from Phase 1 data:

- **Pillars**: 3-5 content themes they cycle through
- **Title formulas**: extract patterns (Listicle, Case Study, Contrarian, Curiosity Gap, Transformation, etc.)
- **Thumbnail rules**: face expressions, text style, color, props
- **Hook patterns**: how they open videos / reels — pattern interrupt? statistic? story?
- **Production style**: shot list, lighting, B-roll density, captions, music
- **Authority signals**: what makes them feel like an expert — specific numbers, named clients, screenshots, behind-the-scenes

## Phase 4 — Output

For the captured creator:

1. Fill out the [[creator-template]] structure into `creators/{creator-name}/`
2. All screenshots into `creators/{creator-name}/assets/{attention|funnel|content}/`
3. Draft the A-to-Z miro-board map in `miro-board.md` — as a markdown flowchart or mermaid diagram first, with an option to render in actual Miro later
4. Propose 1-2 YouTube video angles for Pulsify based on the breakdown
5. Update `wiki/funnel-hacks/synthesis/` if patterns emerge that cross creators

## What Claude does vs what the user does

Claude does:
- All browsing, scrolling, screenshotting via Chrome MCP / computer-use
- All form filling with burner identity
- All inbox monitoring and email logging
- All transcription and pattern analysis
- All wiki writing

User does:
- Provides burner email, burner phone, burner name
- Decides whether to book sales calls (since that requires real human presence)
- Approves the YouTube script angle before scripting

## Source trail

Brief delivered by user 2026-05-15. SOP is v1 — will iterate after the first capture surfaces gaps.

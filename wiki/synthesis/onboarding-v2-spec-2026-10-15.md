---
type: synthesis
tags: [onboarding, product, client-portal]
sources: [[synthesis/mvp-readiness-and-pricing-2026-10-12]], [[synthesis/client-portal-product-spec]]
created: 2026-10-15
updated: 2026-10-15
status: DRAFT for founder review, nothing built yet
---

# Onboarding v2: the spec to review together

Founder, 2026-10-15: onboarding is the strongest asset in the app. Everything we write for a client is built from it, so it has to pull out everything we need, feel easy and even fun, and never ask the same thing twice. We go through this together before anything goes live.

## What's there today

One fixed form at `/app/portal/onboarding` (pulsify-saas `src/features/onboarding/`): 16 screens in 7 parts (about you, offer, buyer, story, voice, funnel, proof). Every answer saves straight into the client's brain as they go. A voice note already works: it uploads and gets turned into text for free (Workers AI Whisper, `functions/api/voice-note.js`). There's no money, no "why did you join", no content habits, no multiple choice and no follow-up questions.

## How the new one feels

- **One question per screen**, big and calm (design kit: Geist, black gradient, their glow colour).
- **Talk or type, their choice, on every question.** A mic button records them, and the text appears so they can fix it. The free speech-to-text we already run does the conversion.
- **Questions can be read out loud.** A speaker button, plus a "read questions to me" switch on the first screen. Version one uses the browser's built-in voice, which is free. A nicer voice can come later once we pick a provider.
- **Multiple choice wherever it fits.** Tap a chip, or press 1-9 on the keyboard. There's always an "Other" chip that opens a text box.
- **Short, punchy helper line** under each question, like "Rough numbers are fine." or "Say it like you'd say it to a friend."
- **Progress bar on top** split by part, plus "about 8 min left", which counts down as they go.
- **Buttons and shortcuts:** Enter to continue, Back always works, Skip on optional questions, and it saves after every answer so they can leave and come back.
- **Glowing cursor** on the onboarding page only. It's off on phones and for people who turn off motion.
- **Glowing Pulsify logo** whenever anything loads.
- **Digging deeper instead of repeating.** Every answer is asked once. If an answer is thin, the next screen builds on it ("You said X. What does that look like on a normal day?") instead of asking a new question about the same thing.
- **Read-back at the end:** "Here's what we heard", a short summary per part, each with an Edit button. This catches mistakes and makes the client feel heard.

## The question flow

Rough time: 14-17 minutes (the "How you found us" part adds about 2). (F) means a follow-up that appears based on the answer before it.

**0. Welcome** (no questions)
"Let's get you set up. Talk or type, whatever's easier." Two toggles: read questions to me, and I'd rather talk.

**1. You**
1. What should we call you?
2. Where are you posting? Tap the chips (YouTube, Instagram, TikTok, X, Other), and a handle box opens for each one picked.
3. What do you teach? Chips: Trading, E-commerce, Fitness, Business, Real estate, Other. Then (F) "In one line, what do people learn from you?"

**2. Why now** (new)
4. What made you say yes to this? Multi-pick chips: My content isn't bringing in buyers / No time to make content / I'm stuck at the same income / An agency let me down / I want a system, not guesswork / Other.
5. (F) "Tell me about the moment you decided." Talking works best here.
6. What was the ONE thing that almost made you not buy? Chips: Price / Trust / Timing / Tried something before / Nothing / Other. (F) "Tell me more about that."
7. What would make the next 90 days a win? There's a number box ("$/month") plus a free line.

**2b. How you found us** (new, from the founder's Typeform `vCwxUyWv`, 2026-10-15)
These answers are about how *we* sold them, not about their business. They are stored apart from their brain (see "Where the answers go"), so the AI never writes their content from them, and they're added up across clients to improve our own outreach.
7a. What made you believe we could actually solve your problem?
7b. How long did it take you to decide? Chips: Same day / A few days / 1-2 weeks / Over a month / I'd followed you for a while.
7c. (F) What could we have done to get you to say yes sooner?
7d. Which video made you want to book a call? Paste the link. Chips if they don't have one: Saw it on YouTube / Instagram / It was the DM / Someone referred me / Other.
7e. Before the call, how sure were you that you'd sign up? Tap 1-10. (F) "What made you unsure, or so sure?"
7f. What did you see from us before booking? Multi-pick: The DM / A voice note / A custom video or asset we made for you / Our YouTube / Our stories / Other. (F) for each one picked: "How much did it help?" Tap 1-5, with a line for honest thoughts.

**3. Money** (new, "rough is fine" line; Q8 is required because the 30% fee is measured from it)
8. Roughly what do you make a month right now, and how much of that comes from your content? Range chips for each: Under $5k / $5-10k / $10-20k / $20-50k / $50k+, then an exact-number box. This is their starting point and must match the number in the contract.
9. What do you sell and for how much? Main offer name and price.
10. How do people buy? Chips: Sales call / DMs / Checkout page / Mix.
11. Where do most buyers find you? Multi-pick: YouTube / Instagram / Referrals / Ads / Not sure.

**4. Your offer**
12. Walk me through what someone gets when they buy. Voice note encouraged; this replaces the old voice-note screen.
13. (F) "What's the result they walk away with?"

**5. Your buyer**
14. Describe your best client ever. Who were they before they bought?
15. (F) "What were they stuck on right before they found you?"
16. When someone says no, what do they usually say? Chips: Too expensive / Need to think / Not the right time / Ask my partner / Other.

**6. Your story**
17. Where does your story start? Chips: Broke and figured it out / Had a job and left it / Failed first, then cracked it / Learned from a mentor / Other.
18. (F) "Tell it like you would on camera." Talking is suggested here.

**7. How you sound**
19. Slide it: Calm ↔ Hype. Then Teacher ↔ Friend. Then Polished ↔ Raw.
20. Swearing and slang? Chips: Never / A little / It's how I talk.
21. Any words or phrases you'd never say?
22. Drop 1-3 links where you sound most like you. (optional)

**8. Your content today** (new)
23. How often do you post right now? There's a row per platform picked in Q2, with chips: Rarely / Weekly / Few times a week / Daily. Reels get their own row. We plan the reel cadence (2-5 a day), but we never script reels: they stay raw and natural, so no reel-writing questions.
24. What's your best-performing post or video ever? Paste a link.
25. Which parts do you hate doing? Multi-pick: Ideas / Scripting / Filming / Editing / Thumbnails / Captions / Posting.
26. How many hours a week can you give to filming? Chips: 1-2 / 3-5 / 5-10 / 10+.

**9. Your funnel**
27. Link in bio, booking link, and where your email list lives. Chips for the email tool: Kit / Mailchimp / Beehiiv / None / Other. All optional.

**10. Your proof**
28. Do you have client results we can show? Yes / Not yet. If yes (F): drop links, screenshots or names.

**10b. Your program** (new, optional; we build programs as part of delivery)
28b. Do you have a paid program or mentorship yet? Chips: Yes, it runs well / Yes, but it's messy / Not yet. If not "runs well" (F): "What's missing?" Multi-pick: Curriculum / How to run 1-1 calls / Teaching material / Tracking who paid / Whop setup / Other.

**11. Connect** (optional, skippable)
29. Connect YouTube and Instagram now so your numbers fill in. Same blurred preview cards as [#63](https://github.com/Ab-luiy/pulsify-saas/issues/63).

**12. Read-back** - "Here's what we heard", with an Edit button per part, then Finish.

## Rules so it never repeats itself

- **Ask once.** Each brain field is asked once. A follow-up adds to the same field, it doesn't ask again.
- **Don't re-ask what we know.** If we already know something (handles from the lead sheet, niche from research), we show it as "Is this right?" with Yes / Fix.
- **Rule-based follow-ups for now.** A short answer (under about 8 words) on an open question gets one "say more" nudge, written for that question. No AI cost.
- **AI follow-ups later.** Once we pick the cheap model, it chooses the sharpest follow-up from the answer. That step only goes live if it passes the same review.

## Where the answers go

Into the app's client brain, the same database the portal already reads from (the `client_brain` table behind `functions/api/client-brain.js`). That's the right home: everything in the app, and later the AI, reads from it. Our vault (Pulsify-Brain) is our own know-how, not client data. Operators can still export a client's brain into the vault when needed.

The "How you found us" answers (2b) go to a separate record for us (`sale_story.believed_because`, `sale_story.decision_time`, `sale_story.sooner_if`, `sale_story.converting_video`, `sale_story.pre_call_confidence`, `sale_story.touchpoints`). They are kept out of anything the client's AI reads, and summed across clients on the operator side ("which video books calls", "what almost stops people").

New brain fields this needs (added to the allowed client fields): `intent.why_joined`, `intent.decision_story`, `intent.almost_stopped`, `intent.win_90d`, `money.monthly_range`, `money.content_revenue_baseline`, `money.offer_price`, `money.sales_method`, `money.lead_sources`, `offer.result`, `icp.before_state`, `icp.objections`, `story.start_type`, `voice.sliders`, `voice.never_say`, `content.cadence`, `content.best_post`, `content.hates`, `content.film_hours`, `program.status`, `program.missing`.

## Decided 2026-10-15

- Glowing logo loader across the whole app, a little bigger than now (not huge). pulsify-saas #65.
- Glowing cursor on onboarding only.

## Points to settle in review

1. Are the money questions OK to ask straight out? Each has "rough is fine"; only the starting revenue is required.
2. Is 12-15 minutes the right length? We could cut it by moving the funnel and proof parts to a later "finish your setup" step.
3. Should the read-back step send you a notification so you see each new client's summary?

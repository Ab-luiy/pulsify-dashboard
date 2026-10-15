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
- **Buttons and shortcuts:** Enter to continue, Back always works, Skip on optional questions, and everything saves as they type (see below).
- **Glowing cursor** on the onboarding page only. It's off on phones and for people who turn off motion.
- **Glowing Pulsify logo** whenever anything loads.
- **Digging deeper instead of repeating.** Every answer is asked once. If an answer is thin, the next screen builds on it ("You said X. What does that look like on a normal day?") instead of asking a new question about the same thing.
- **Read-back at the end:** "Here's what we heard", a short summary per part, each with an Edit button. This catches mistakes and makes the client feel heard.

## Nothing they write is ever lost (founder 2026-10-15: "very important across the entire app")

Today an answer only saves when they press Continue. If they type half an answer and leave, it's gone. The new rule:

- **Saves while they type.** Every field saves a second or so after they stop typing, including half-finished sentences, chip picks, slider positions, and voice-note text before they've confirmed it. They never have to press anything to keep their work.
- **Saved on our side, not just their browser.** Drafts go to their account, so they're still there on another device or after clearing the browser. A copy is also kept in the browser, so nothing is lost if the internet drops mid-sentence. It syncs when they're back online.
- **Comes back exactly where they left.** On return: "Welcome back. You were on *Your story*." It opens that question with their text in place and the cursor at the end, so they can keep their train of thought.
- **Back and forth is safe.** Going back to an earlier question shows what they wrote. Going forward again keeps the later answers too.
- **Drafts aren't final.** A half-typed draft never counts as an answer and never feeds the AI until they continue past it. Part A drafts are kept the same way, but only become our record once its last question is answered.
- **A small "Saved" tick** near the field shows it's safe. It never pops up anything in their way.

This is an app-wide rule, not just for onboarding: every text box, form and editor in the portal works this way (pulsify-saas #67).

## The question flow

Rough time: 20-25 minutes (about 3 less without a funnel) (the "How you found us" part adds about 2). (F) means a follow-up that appears based on the answer before it.

**0. Welcome** (no questions)
"Let's get you set up. Talk or type, whatever's easier." Two toggles: read questions to me, and I'd rather talk.

**A. How you found us** (comes first, while buying is fresh; from the founder's Typeform `vCwxUyWv`, 2026-10-15)
These answers are about how *we* sold to them. When they answer the last question in this part, the whole part is saved as Pulsify's own record (see "Where the answers go"), then a short transition screen ("Thanks. Now let's get to you.") leads into the normal onboarding. The client's AI never reads this part.
A1. What made you believe we could actually solve your problem?
A2. How long did it take you to decide? Chips: Same day / A few days / 1-2 weeks / Over a month / I'd followed you for a while.
A3. (F) What could we have done to get you to say yes sooner?
A4. What was the ONE thing that almost made you not buy? Chips: Price / Trust / Timing / Tried something before / Nothing / Other. (F) "Tell me more about that."
A5. Which video made you want to book a call? Paste the link. Chips if they don't have one: Saw it on YouTube / Instagram / It was the DM / Someone referred me / Other.
A6. Before the call, how sure were you that you'd sign up? Tap 1-10. (F) "What made you unsure, or so sure?"
A7. What did you see from us before booking? Multi-pick: The DM / A voice note / A custom video or asset we made for you / Our YouTube / Our stories / Other. (F) for each one picked: "How much did it help?" Tap 1-5, with a line for honest thoughts. **Last question: saving here closes part A.**

**1. You** (personal; everything past the name is optional, helper line: "This is how we make your content sound like your life, not a template.")
1. What should we call you? First name, plus what people actually call you if it's different.
2. How old are you?
3. Relationship status? Chips: Single / In a relationship / Married / Rather not say.
4. Where are you posting? Tap the chips (YouTube, Instagram, TikTok, X, Other), and a handle box opens for each one picked.
5. What do you teach? Chips are our own make-money-online niches, taken from the lead-sourcing niche list ([[content-engine/youtube-lead-sourcing-query-bank]]) and the YouTube scraper (`tools/scrape_yt_leads.py`): Trading / Ecommerce & dropshipping / TikTok Shop / Amazon FBA / Airbnb & short-term rental / General make money online / Other. Then (F) "In one line, what do people learn from you?" (for example "prop firm challenges" or "dropshipping with organic TikTok"). Saved as its own field, which ticket #62 needs.

**2. Why now**
6. What made you say yes to this? Multi-pick chips: My content isn't bringing in buyers / No time to make content / I'm stuck at the same income / An agency let me down / I want a system, not guesswork / Other.
7. (F) "Tell me about the moment you decided." Talking works best here.
8. What would make the next 90 days a win? There's a number box ("$/month") plus a free line.

**3. Money** (new. Founder 2026-10-15: exact numbers, can't be skipped. Helper line: "Exact numbers. This is the starting line we measure your growth from.")
9. What did you make in each of the last 3 months? Three rows, one per month (named, e.g. July / August / September), each with two exact-number boxes: **revenue** and **profit** (what's left after costs). Required, no Skip. The app shows the profit margin for each month and the 3-month average as they type, so they can check it looks right.
9b. What's your monthly income right now, exactly? Pre-filled with the latest month from question 9; they confirm or correct it. Required.
9c. How much of that comes from your content? An exact number or a percent. Required. This is the starting point the 30% fee is measured from, and it must match the number in the contract.
10. What do you sell and for how much? Main offer name and price.

**4. Your offer**
11. Walk me through what someone gets when they buy. Voice note encouraged; this replaces the old voice-note screen.
12. (F) "What's the result they walk away with?"

**5. Your buyer** (founder 2026-10-15: find out if they know their ICP; if yes, get the full breakdown; if not, we build it with them)
13. Do you know who your buyers are, and who's actually interacting with your content? Chips: Yes, I know them well / Kind of / Not really.

*If "Yes" or "Kind of", the full breakdown.* Every screen has chips plus a free line, and "Not sure" is always an option, so "Kind of" never gets stuck:
14. Describe your best client ever. Who were they before they bought from you?
15. How old are most of your buyers? Multi-pick: Under 18 / 18-24 / 25-34 / 35-44 / 45+. Then: Mostly men / Mostly women / Mixed.
16. What kind of life do they lead? Multi-pick: Student / 9-5 job / Own business / Between jobs / Parents / Other. (F) "Walk me through a normal day for them."
17. What do they earn, roughly, and how do they pay for your offer? Chips for income, then: Pay in full / Payment plan / Stretch to afford it / Not sure.
18. Who comments and DMs you most: the people who buy, or someone else? Chips: Mostly buyers / Lots of beginners and freebie seekers / Other creators / Mix / Don't know.
19. What were they stuck on right before they found you? (F) "What have they already tried that didn't work?"
20. How do they act before buying? Multi-pick: Buy fast / Watch for months, then buy / Ask lots of questions in DMs / Book a call, then go quiet / Need a partner's OK / Always on the fence. (F) "What finally tips them into buying?"
21. When someone says no, what do they usually say? Chips: Too expensive / Need to think / Not the right time / Ask my partner / Other.
22. What do they say when they describe their problem, in their own words? Talking works best here. These exact phrases go into their hooks and titles.

*If "Not really", we build it with them.* "No problem. Most creators don't have this written down. Let's build it together."
14n. Who do you most want to help? Or describe the best client you've had so far.
15n. Who comments and DMs you most right now? (same chips as question 18)
16n. Who would you never want as a client?
17n. **Starter buyer profile.** The app shows a first draft of their buyer for their niche, one card at a time: age range, daily life, money, what they're stuck on, how they act before buying, objections, the words they use. Each card has "Sounds like my buyers" / "Not quite" (fix it in a line). The draft is built from our ICP framework (the 28-point avatar breakdown in [[people/marcus-avatar]] and the avatar research fields in [[synthesis/client-brain-spec]]: daily frustrations, secret desires, the language they use, objections, false beliefs, emotional triggers) and our niche pain language ([[content-engine/youtube-lead-sourcing-query-bank]]). It uses the framework, never Marcus's own details: Marcus is *our* buyer, not theirs.
18n. After onboarding, we run the full buyer research for them as part of the service, and it lands in their portal for them to confirm. Their answers here are the starting point.

**6. Your story**
23. Where does your story start? Chips: Broke and figured it out / Had a job and left it / Failed first, then cracked it / Learned from a mentor / Other.
24. (F) "Tell it like you would on camera." Talking is suggested here.

**7. Who you are on camera** (replaces the old "How you sound"; helper line: "No wrong answers. The more honest, the more it sounds like you.")
25. How do you want your audience to see you? Pick one, then optionally a second. Each card has a name and one line:
   - **Big brother:** looks out for you, tells it straight, has been where you are.
   - **The authority:** knows the numbers, speaks with certainty, people come to learn.
   - **The friend:** on your level, warm, figures it out with you.
   - **One of the bros:** banter, jokes, feels like the group chat.
   - **Hardass mentor:** tough love, calls out excuses, demands results.
   - **Calm teacher:** patient, clear, step by step.
   - **The rebel:** says what others won't, divides people on purpose.
   - **Other:** describe it in your own words.
26. How unhinged are you on camera? Tap 1-5: 1 Buttoned-up / 3 Some edge / 5 Completely unhinged.
27. When you talk, do you think first or say whatever comes to mind? Chips: Very careful / Mostly careful / Depends on the day / Whatever comes to mind.
28. Do you swear? Chips: Never / A little / It's how I talk.
29. Do you use slang or words that could get flagged? Chips: No / Some slang / Yes, a lot. (F) if not "No": "Which words are fine for us to use, and which should we never write for you?" We match their voice but keep words platforms punish out of titles, captions and thumbnails by default; they confirm.
30. Slide it: Calm ↔ Hype, then Polished ↔ Raw.
31. Any words or phrases you'd never say?
32. Drop 1-3 links where you sound most like you. (optional)

**8. Your content today** (new)
33. How often do you post right now? There's a row per platform picked in question 4, with chips: Rarely / Weekly / Few times a week / Daily. Reels get their own row. We plan the reel cadence (2-5 a day), but we never script reels: they stay raw and natural, so no reel-writing questions.
34. What's your best-performing post or video ever? Paste a link.
35. Which parts do you hate doing? Multi-pick: Ideas / Scripting / Filming / Editing / Thumbnails / Captions / Posting.
36. How many hours a week can you give to filming? Chips: 1-2 / 3-5 / 5-10 / 10+.

**9. Your funnel** (founder 2026-10-15: ask if they have one; if yes, go deep, metrics included; if no, keep it short)
Helper line on every metric screen: "Ranges are fine. 'I don't know' is a real answer, and it tells us what to set up first." Nobody is forced to give exact rates.

37. Do you have a funnel? In plain words: a set path that takes someone from watching you to paying you. Chips: Yes / Kind of (people DM me and I sell them) / No.

*If "No"* (short, three screens, then on to proof):
38n. "No problem. Building it is part of what we do." How do people buy from you today, if at all? Chips: DMs / Calls / A checkout link / Word of mouth / Nobody yet.
39n. Where do most buyers find you? Multi-pick: YouTube / Instagram / TikTok / Referrals / Not sure.
40n. Links you already have: link in bio, booking page, anything you send people. All optional.

*If "Yes" or "Kind of"* (the deep dive):
38. **Build your funnel.** They tap the steps in the order a buyer goes through them, and the app draws their path as they go: YouTube video / Reel / Story / Bio link / Comment or DM trigger word / Free guide or lead magnet / Email list / Landing page / VSL / Application form / Booking page / Setter conversation / Sales call / Checkout page / Webinar / Ads / Other. Most "Kind of" funnels come out as something like Reel -> DM -> Call.
39. (F) For each step picked that has a link, a box for it: bio link, landing page, VSL, application form, booking page, checkout, lead magnet.
40. What runs it behind the scenes? Multi-pick: Calendly / Cal.com / Typeform / Kit / Mailchimp / Beehiiv / GoHighLevel / ManyChat / Whop / Stan / Stripe / Other / Nothing, I do it by hand.
41. Who handles each part? One row each for DMs, calls and follow-ups, with chips: Me / Setter / Closer / VA / Automated / Nobody yet.
42. Do you track your numbers? Chips: Yes, in a sheet or CRM / Roughly, in my head / No.
43. **Your numbers.** Only the ones that match the steps they picked are shown, one per screen, each with a one-line plain explanation and range chips plus "I don't know":
   - Leads a month (DMs, opt-ins, applications): Under 20 / 20-50 / 50-150 / 150+.
   - Calls booked a month: Under 5 / 5-15 / 15-40 / 40+.
   - Show rate ("out of 10 booked calls, how many turn up?"): Under 4 / 4-6 / 6-8 / 8+.
   - Close rate ("out of 10 calls that happen, how many buy?"): Under 1 / 1-2 / 2-3 / 3+.
   - Average deal size: exact number box (matches their price from question 10 unless they offer payment plans).
   - How fast a new lead hears back: Minutes / Within the hour / Same day / Next day or later.
   - First message to paid, usually: Same day / Within a week / 1-4 weeks / Longer.
   The metric names and what counts as healthy come from [[frameworks/call-funnel-framework]] (show rate, close rate, cost per booked call) and [[concepts/profile-funnel]] (DM reply speed, the 24h-7d cycle). The healthy ranges are never shown to the client as a grade during onboarding.
44. Where do you think it leaks? Chips: Not enough leads / Wrong leads / They book but don't show / They show but don't buy / I'm slow to reply / I don't know. (F) "What's your guess why?"
45. What happens to people who don't buy? Multi-pick: Nothing / I follow up in DMs / Email sequence / Setter follows up / Retargeting ads.
46. Have you run ads? Chips: Never / Tried and stopped / Running now. (F) if "Tried" or "Running": monthly spend range, and cost per booked call if they know it. (F) if "Tried and stopped": "Why did you stop?"
47. (F) only if they picked a VSL, webinar or lead magnet: "How is it doing?" Chips: Working / Not sure / Not working, then one line on why.

What it gives us: the app draws their funnel on their Funnel page from question 38, marks each number as known or unknown, and points the first piece of work at the leak they named. Unknown numbers become the first thing we set up tracking for.

**10. Your proof**
48. Do you have client results we can show? Yes / Not yet. If yes (F): drop links, screenshots or names.

**11. Your program** (new, optional; we build programs as part of delivery)
49. Do you have a paid program or mentorship yet? Chips: Yes, it runs well / Yes, but it's messy / Not yet. If not "runs well" (F): "What's missing?" Multi-pick: Curriculum / How to run 1-1 calls / Teaching material / Tracking who paid / Whop setup / Other.

**12. Connect** (optional, skippable)
50. Connect YouTube and Instagram now so your numbers fill in. Same blurred preview cards as [#63](https://github.com/Ab-luiy/pulsify-saas/issues/63).

**13. Read-back** - "Here's what we heard", with an Edit button per part, then Finish.

## Rules so it never repeats itself

- **Ask once.** Each brain field is asked once. A follow-up adds to the same field, it doesn't ask again.
- **Don't re-ask what we know.** If we already know something (handles from the lead sheet, niche from research), we show it as "Is this right?" with Yes / Fix.
- **Rule-based follow-ups for now.** A short answer (under about 8 words) on an open question gets one "say more" nudge, written for that question. No AI cost.
- **AI follow-ups later.** Once we pick the cheap model, it chooses the sharpest follow-up from the answer. That step only goes live if it passes the same review.

## Where the answers go

Into the app's client brain, the same database the portal already reads from (the `client_brain` table behind `functions/api/client-brain.js`). That's the right home: everything in the app, and later the AI, reads from it. Our vault (Pulsify-Brain) is our own know-how, not client data. Operators can still export a client's brain into the vault when needed.

The "How you found us" answers (part A) are saved the moment its last question is answered, to a separate record that belongs to Pulsify (`sale_story.believed_because`, `sale_story.decision_time`, `sale_story.sooner_if`, `sale_story.converting_video`, `sale_story.pre_call_confidence`, `sale_story.almost_stopped`, `sale_story.touchpoints`). They are kept out of anything the client's AI reads, and summed across clients on the operator side ("which video books calls", "what almost stops people").

New brain fields this needs (added to the allowed client fields): `intent.why_joined`, `intent.decision_story`, `intent.win_90d`, `money.last_3_months` (revenue + profit per month), `money.monthly_income`, `money.content_revenue_baseline`, `money.offer_price`, `offer.result`, `icp.known`, `icp.best_client`, `icp.age_range`, `icp.gender_mix`, `icp.life_stage`, `icp.daily_life`, `icp.income`, `icp.payment_style`, `icp.engagers`, `icp.before_state`, `icp.tried_before`, `icp.buying_behaviour`, `icp.tipping_point`, `icp.objections`, `icp.language`, `icp.never_client`, `icp.starter_profile` (each card with confirmed or fixed), `story.start_type`, `identity.age`, `identity.relationship_status`, `voice.persona`, `voice.persona_second`, `voice.unhinged_level`, `voice.filter`, `voice.flagged_words`, `voice.sliders`, `voice.never_say`, `content.cadence`, `content.best_post`, `content.hates`, `content.film_hours`, `program.status`, `program.missing`, `funnel.has_funnel`, `funnel.path` (ordered steps), `funnel.step_links`, `funnel.tools`, `funnel.owners`, `funnel.tracks_numbers`, `funnel.metrics` (each with value or range, or unknown), `funnel.leak`, `funnel.leak_guess`, `funnel.non_buyer_followup`, `funnel.ads`, `funnel.asset_status`, `funnel.sales_method`, `funnel.lead_sources`.

## Decided 2026-10-15

- Glowing logo loader across the whole app, a little bigger than now (not huge). pulsify-saas #65.
- Glowing cursor on onboarding only.

## Points to settle in review

1. Settled: money questions are exact and required (last 3 months revenue + profit, current monthly income, content share).
2. Is 20-25 minutes the right length? We could cut it by moving proof and program to a later "finish your setup" step.
3. Should the read-back step send you a notification so you see each new client's summary?

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

Rough time: 35-45 minutes, done in as many sittings as they like (everything autosaves, and the progress bar shows each part). Without a funnel or student results it's about 8 minutes shorter. Questions are numbered by part (5.3 is part 5, question 3). (F) means a follow-up that appears based on the answer before it.

**Before onboarding: paid, then connect** (founder 2026-10-15: "as soon as they pay us... automatically wire everything", the most important thing)
The moment a payment is recorded, everything sets itself up with no manual wiring:
1. **Payment recorded.** Clients pay in crypto, so today the founder presses "Mark paid" (the existing payment trigger, `/api/payment`). That one press does the rest automatically.
2. **Workspace created and signed in.** Their account, private link and welcome message go out right away, the same flow that's live now.
3. **The first screen they see is Connect.** "Connect your YouTube" and "Connect your Instagram", each shown as the blurred preview of what their numbers will look like ([#63](https://github.com/Ab-luiy/pulsify-saas/issues/63)). Then booking page, email tool and payments if they use them. One tap each, and they can skip and come back.
4. **Then onboarding starts** (Welcome, then part A).

Honest status: the payment trigger and auto-setup exist. Real one-tap YouTube and Instagram sign-in for clients isn't proven yet. Today those two are "mark as done" steps, and making them real is ticket #15. That ticket was waiting for the first paying client, so it moves to the top the day one signs.

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
1.1 What should we call you? First name, plus what people actually call you if it's different.
1.2 How old are you?
1.3 Relationship status? Chips: Single / In a relationship / Married / Rather not say.
1.4 Where are you posting? Tap the chips (YouTube, Instagram, TikTok, X, Other), and a handle box opens for each one picked.
1.5 What do you teach? Chips are our own make-money-online niches, taken from the lead-sourcing niche list ([[content-engine/youtube-lead-sourcing-query-bank]]) and the YouTube scraper (`tools/scrape_yt_leads.py`): Trading / Ecommerce & dropshipping / TikTok Shop / Amazon FBA / Airbnb & short-term rental / General make money online / Other. Then (F) "In one line, what do people learn from you?" (for example "prop firm challenges" or "dropshipping with organic TikTok"). Saved as its own field, which ticket #62 needs.

**2. Why now**
2.1 What made you say yes to this? Multi-pick chips: My content isn't bringing in buyers / No time to make content / I'm stuck at the same income / An agency let me down / I want a system, not guesswork / Other.
2.2 (F) "Tell me about the moment you decided." Talking works best here.
2.3 What would make the next 90 days a win? There's a number box ("$/month") plus a free line.

**3. Money** (founder 2026-10-15: exact numbers, can't be skipped. Helper line: "Exact numbers. This is the starting line we measure your growth from.")
3.1 What did you make in each of the last 3 months? Three rows, one per month (named, e.g. July / August / September), each with two exact-number boxes: **revenue** and **profit** (what's left after costs). Required, no Skip. The app shows the profit margin for each month and the 3-month average as they type, so they can check it looks right.
3.2 What's your monthly income right now, exactly? Pre-filled with the latest month from 3.1; they confirm or correct it. Required.
3.3 How much of that comes from your content? An exact number or a percent. Required. This is the starting point the 30% fee is measured from, and it must match the number in the contract.

**4. Your offer** (founder 2026-10-15: offer history, what they want to sell, payments, who they've worked with before)
4.1 Have you had an offer before? Chips: Yes, I'm selling one now / I had one, but stopped / Never had one.

*If "selling one now":*
4.2 What is it and how much is it? Name and exact price.
4.3 Walk me through what someone gets when they buy. Voice note encouraged.
4.4 (F) "What's the result they walk away with?"
4.5 What kind of offer is it? Chips: 1-1 mentorship / Group program / Course / Community / A mix.

*If "had one, but stopped":* 4.2s "What was it, what did it cost, and why did it stop?"

*Everyone:*
4.6 What do you want to sell from here? Chips: 1-1 mentorship / Group program / Course / Community / Not sure, help me decide. Helper line: "Most creators we work with start with high-ticket 1-1 mentorship. It gets cash and proof in fastest." (This vault's default offer is high-ticket 1-on-1 mentoring.)
4.7 What price do you want to sell at? Chips: Under $1k / $1-3k / $3-5k / $5-10k / $10k+ / Not sure.
4.8 How do you take payments? Multi-pick: Whop / Fanbasis / Stripe / Crypto / PayPal / Bank transfer / None yet. Asked once here; the funnel part doesn't ask again.
4.9 Have you worked with anyone on your growth before? Multi-pick: An agency / A growth operator / Someone who ran my offer / A coach or mentor / Freelancers (editor, setter, closer) / Never. (F) for each one picked: "What did they do, what came of it, and why did it end?" If they picked "Tried something before" in A4, this screen opens with "You said trying something before almost stopped you. Was it one of these?"

**5. Your buyer** (founder 2026-10-15: find out if they know their ICP; if yes, get the full breakdown; if not, we build it with them)
5.1 Do you know who your buyers are, and who's actually interacting with your content? Chips: Yes, I know them well / Kind of / Not really.

*If "Yes" or "Kind of", the full breakdown.* Every screen has chips plus a free line, and "Not sure" is always an option, so "Kind of" never gets stuck:
5.2 Describe your best client ever. Who were they before they bought from you?
5.3 How old are most of your buyers? Multi-pick: Under 18 / 18-24 / 25-34 / 35-44 / 45+. Then: Mostly men / Mostly women / Mixed.
5.4 What kind of life do they lead? Multi-pick: Student / 9-5 job / Own business / Between jobs / Parents / Other. (F) "Walk me through a normal day for them."
5.5 What do they earn, roughly, and how do they pay for your offer? Chips for income, then: Pay in full / Payment plan / Stretch to afford it / Not sure.
5.6 Who comments and DMs you most: the people who buy, or someone else? Chips: Mostly buyers / Lots of beginners and freebie seekers / Other creators / Mix / Don't know.
5.7 What were they stuck on right before they found you? (F) "What have they already tried that didn't work?"
5.8 How do they act before buying? Multi-pick: Buy fast / Watch for months, then buy / Ask lots of questions in DMs / Book a call, then go quiet / Need a partner's OK / Always on the fence. (F) "What finally tips them into buying?"
5.9 When someone says no, what do they usually say? Chips: Too expensive / Need to think / Not the right time / Ask my partner / Other.
5.10 What do they say when they describe their problem, in their own words? Talking works best here. These exact phrases go into their hooks and titles.

*If "Not really", we build it with them.* "No problem. Most creators don't have this written down. Let's build it together."
5.2n Who do you most want to help? Or describe the best client you've had so far.
5.3n Who comments and DMs you most right now? (same chips as 5.6)
5.4n Who would you never want as a client?
5.5n **Starter buyer profile.** The app shows a first draft of their buyer for their niche, one card at a time: age range, daily life, money, what they're stuck on, how they act before buying, objections, the words they use. Each card has "Sounds like my buyers" / "Not quite" (fix it in a line). The draft is built from our ICP framework (the 28-point avatar breakdown in [[people/marcus-avatar]] and the avatar research fields in [[synthesis/client-brain-spec]]: daily frustrations, secret desires, the language they use, objections, false beliefs, emotional triggers) and our niche pain language ([[content-engine/youtube-lead-sourcing-query-bank]]). It uses the framework, never Marcus's own details: Marcus is *our* buyer, not theirs.
5.6n After onboarding, we run the full buyer research for them as part of the service, and it lands in their portal for them to confirm. Their answers here are the starting point.

**6. Your story**
6.1 Where does your story start? Chips: Broke and figured it out / Had a job and left it / Failed first, then cracked it / Learned from a mentor / Other.
6.2 (F) "Tell it like you would on camera." Talking is suggested here.

**7. Your positioning** (new, founder 2026-10-15. Helper line: "Most creators haven't nailed this yet. That's fine, it's the first thing we build.")
7.1 Do you have a unique mechanism? Plain explanation on screen: "Your own named method. The reason your way works when other ways don't." Chips: Yes, and it has a name / I have a method, but no name / No.
   - (F) "Yes": "What's it called, and what are its steps?"
   - (F) "Method, no name": "Walk me through how you get someone a result, step by step." This is the raw material we name it from.
   - (F) "No": "No problem. We build it with you, and it comes before the content." (Per [[concepts/unique-mechanism]] and [[concepts/pulsify-order-of-operations]], the mechanism comes before offer, content and funnel.)
7.2 Do you know what makes you different from everyone else in your niche? Chips: Yes / Kind of / No. (F) "In one line: why you and not them?"
7.3 Who do you see as your competition? Names or handles. (F) "What do they do that you don't, and what do you do that they don't?"
7.4 Does your content show that difference? Chips: Yes, clearly / Sometimes / No, my content could be anyone's / Not sure.
7.5 What do you love talking about? Talking works best. (F) "What could you talk about for an hour with no notes?"
7.6 Anything you never want to talk about on camera?

**8. Who you are on camera** (helper line: "No wrong answers. The more honest, the more it sounds like you.")
8.1 How do you want your audience to see you? Pick one, then optionally a second. Each card has a name and one line:
   - **Big brother:** looks out for you, tells it straight, has been where you are.
   - **The authority:** knows the numbers, speaks with certainty, people come to learn.
   - **The friend:** on your level, warm, figures it out with you.
   - **One of the bros:** banter, jokes, feels like the group chat.
   - **Hardass mentor:** tough love, calls out excuses, demands results.
   - **Calm teacher:** patient, clear, step by step.
   - **The rebel:** says what others won't, divides people on purpose.
   - **Other:** describe it in your own words.
8.2 How unhinged are you on camera? Tap 1-5: 1 Buttoned-up / 3 Some edge / 5 Completely unhinged.
8.3 When you talk, do you think first or say whatever comes to mind? Chips: Very careful / Mostly careful / Depends on the day / Whatever comes to mind.
8.4 Do you swear? Chips: Never / A little / It's how I talk.
8.5 Do you use slang or words that could get flagged? Chips: No / Some slang / Yes, a lot. (F) if not "No": "Which words are fine for us to use, and which should we never write for you?" We match their voice but keep words platforms punish out of titles, captions and thumbnails by default; they confirm.
8.6 Slide it: Calm <-> Hype, then Polished <-> Raw.
8.7 Any words or phrases you'd never say?
8.8 Drop 1-3 links where you sound most like you. (optional)

**9. Your content** (expanded, founder 2026-10-15: formats, how they make content, how long it takes, what they know)
9.1 **What each one does.** One screen of four short fact cards they swipe through before any question. Each fact comes from our own playbooks:
   - **YouTube long form** is the main asset. About one a week, and everything else is cut from it. People who've watched 3-5 of your videos before a call are the easiest buyers there are. ([[playbooks/content-operating-rhythm]] and this vault's core rule that long form is the main revenue engine)
   - **Reels** are cut from your long form. They reach new people. They come after long form, not instead of it. ([[playbooks/content-operating-rhythm]])
   - **Story sequences** are what closes. Most creators skip them. ([[playbooks/content-operating-rhythm]])
   - **Carousels** are for proof and breakdowns, mostly when something big happens. (founder 2026-10-15)
9.2 Where are you more at home right now? Chips: YouTube / Reels / Both / Neither yet.
9.3 Before today, did you know long form should come before short form? Chips: Yes, and I do it / Yes, but I don't do it / No, that's new to me. No judgement; it tells us where to start.
9.4 What feels hard? Multi-pick: Starting long form / Staying consistent with long form / Short form / Being on camera / Coming up with ideas / Nothing, I just need time. (F) "What makes it hard?"
9.5 Have you picked a YouTube format? Chips (the founder's format list, 2026-09-28): Miro board / Face to camera / Both / Student call / Group coaching call / In-person student video / Not yet. (F) "Why that one?"
9.6 How often do you post right now? A row per platform picked in 1.4, with chips: Rarely / Weekly / Few times a week / Daily. Reels get their own row. We plan the reel cadence (2-5 a day), but we never script reels: they stay raw and natural.
9.7 Walk me through how you make a YouTube video, from idea to upload. Talking works best.
9.8 How long does one video take you, start to finish? Chips: Under 3 hours / 3-6 hours / 6-12 hours / 1-2 days / Longer / I haven't made one. Then: "How much of that is scripting?" Chips: Hardly any, I wing it / Under an hour / 1-3 hours / Most of it.
9.9 How much time a day goes into content overall? Chips: Under 30 min / 30-60 min / 1-2 hours / 2-4 hours / More.
9.10 When do you make content? Chips: Set days every week / Weekends / Whenever I feel like it / One big batch a month / I don't right now.
9.11 How many hours a week can you give to filming? Chips: 1-2 / 3-5 / 5-10 / 10+.
9.12 What's your best-performing post or video ever? Paste a link.
9.13 **What you already know.** One screen, a row each for: Writing copy / Scripting videos / Titles / Thumbnails / Story sequences / Carousels / Editing. Tap one level per row: Never done it / I've tried / I'm good at it. Rows covered by 9.1 have an "i" with that fact.
9.14 Which parts do you hate doing? Multi-pick: Ideas / Scripting / Filming / Editing / Thumbnails / Captions / Posting.
9.15 Who helps you right now? Multi-pick: Copywriter / Editor / Thumbnail designer / VA / Setter / Closer / Nobody.

**10. Your funnel** (founder 2026-10-15: what they know, what they've tried, then their funnel; deep if they have one, short if not)
Helper line on every metric screen: "Ranges are fine. 'I don't know' is a real answer, and it tells us what to set up first." Nobody is forced to give exact rates.

10.1 **How a funnel works.** A simple drawing: top (content that brings new people in) -> middle (content that builds trust) -> bottom (landing page, VSL, booking, call: where people buy). Per [[concepts/content-funnel-tof-mof-bof]], with the founder's rule that the bottom is the landing page and VSL, not videos (2026-09-28). Then: "Which of these are you working on right now?" Multi-pick: Top / Middle / Bottom / None / Not sure.
10.2 **Words check.** "Tap the ones you know. It's not a test." Chips: Funnel / Lead magnet / VSL / Show rate / Close rate / High-ticket / Setter / Closer / Retargeting / Unique mechanism / ICP / Top, middle and bottom of funnel. Whatever they don't tap gets a plain "i" explainer wherever it shows up in their portal. Helper line: "Whatever you don't know, we handle."
10.3 Which funnels have you tried, now or before? Multi-pick: Profile funnel (bio, DMs, stories) / Landing page + VSL / Application funnel / Lead magnet + emails / Webinar / Challenge / None. (F) for each: "Did it work?" Worked / Kind of / Didn't, then one line on why.
10.4 What kind of funnel do you want? Same list plus "Whatever works, you pick."
10.5 Do you have a funnel running now? In plain words: a set path that takes someone from watching you to paying you. Chips: Yes / Kind of (people DM me and I sell them) / No.

*If "No"* (short, then on to ads):
10.6n "No problem. Building it is part of what we do." How do people buy from you today, if at all? Chips: DMs / Calls / A checkout link / Word of mouth / Nobody yet.
10.7n Where do most buyers find you? Multi-pick: YouTube / Instagram / TikTok / Referrals / Not sure.
10.8n Links you already have: link in bio, booking page, anything you send people. All optional.

*If "Yes" or "Kind of"* (the deep dive):
10.6 **Build your funnel.** They tap the steps in the order a buyer goes through them, and the app draws their path as they go: YouTube video / Reel / Story / Bio link / Comment or DM trigger word / Free guide or lead magnet / Email list / Landing page / VSL / Application form / Booking page / Setter conversation / Sales call / Checkout page / Webinar / Ads / Other. Most "Kind of" funnels come out as something like Reel -> DM -> Call.
10.7 (F) For each step picked that has a link, a box for it: bio link, landing page, VSL, application form, booking page, checkout, lead magnet.
10.8 What runs it behind the scenes? Multi-pick: Calendly / Cal.com / Typeform / Kit / Mailchimp / Beehiiv / GoHighLevel / ManyChat / Stan / Other / Nothing, I do it by hand. (Payment platforms were asked in 4.8.)
10.9 Who handles each part? One row each for DMs, calls and follow-ups, with chips: Me / Setter / Closer / VA / Automated / Nobody yet. Pre-filled from 9.15.
10.10 Do you track your numbers? Chips: Yes, in a sheet or CRM / Roughly, in my head / No.
10.11 **Your numbers.** Only the ones that match the steps they picked are shown, one per screen, each with a one-line plain explanation and range chips plus "I don't know":
   - Leads a month (DMs, opt-ins, applications): Under 20 / 20-50 / 50-150 / 150+.
   - Calls booked a month: Under 5 / 5-15 / 15-40 / 40+.
   - Show rate ("out of 10 booked calls, how many turn up?"): Under 4 / 4-6 / 6-8 / 8+.
   - Close rate ("out of 10 calls that happen, how many buy?"): Under 1 / 1-2 / 2-3 / 3+.
   - Average deal size: exact number box (pre-filled from the price in 4.2 unless they offer payment plans).
   - How fast a new lead hears back: Minutes / Within the hour / Same day / Next day or later.
   - First message to paid, usually: Same day / Within a week / 1-4 weeks / Longer.
   The metric names and what counts as healthy come from [[frameworks/call-funnel-framework]] (show rate, close rate, cost per booked call) and [[concepts/profile-funnel]] (DM reply speed, the 24h-7d cycle). The healthy ranges are never shown to the client as a grade during onboarding.
10.12 Where do you think it leaks? Chips: Not enough leads / Wrong leads / They book but don't show / They show but don't buy / I'm slow to reply / I don't know. (F) "What's your guess why?"
10.13 What happens to people who don't buy? Multi-pick: Nothing / I follow up in DMs / Email sequence / Setter follows up / Retargeting ads.

*Everyone:*
10.14 Have you run ads? Chips: Never / Tried and stopped / Running now. (F) if "Tried" or "Running": monthly spend range, and cost per booked call if they know it. (F) if "Tried and stopped": "Why did you stop?"

What it gives us: the app draws their funnel on their Funnel page from 10.6, marks each number as known or unknown, and points the first piece of work at the leak they named. Unknown numbers become the first thing we set up tracking for.

**11. Your proof** (founder 2026-10-15: their own results count, no glazing, link back instead of contradicting. Helper line: "Results are what sell you. Give it to us straight. Small and real beats big and made up.")
11.1 What's the best result you've gotten yourself? Your own account, store, payouts or income. Talking works best. (F) "How did you do it, and how long did it take?"
11.2 Do you have proof of it? Chips: Screenshot / Payment or revenue screenshot / Video / Nothing I can show yet. Upload box opens for each type picked.
11.3 Do you have client or student results? Chips: Yes, plenty / A few / Not yet.

*If "Yes" or "A few":*
11.4 What's the best result you've gotten someone else? If they described a best client in 5.2, the screen opens with it: "Earlier you told us about [their words]. Is that your best result?" Yes / No, someone else. (F) "Who were they before, what did they do, and what happened after?"
11.5 Do you have proof of that one? Chips: Screenshot / Video testimonial / Written testimonial / Payment or revenue screenshot / DM or chat screenshot / No proof yet. Upload box for each type picked.
11.6 (F) "Tell us more about it." How long it took, the exact number (money made, payout, first sale, followers), what made it work. This is the story we turn into content.
11.7 Can we use their name and face? Chips: Yes / First name only / No names, results only / I need to ask them.
11.8 **Your top results.** How many results can you show? Chips: 1-2 / 3-5 / 6-10 / 10+. Then a card for each of their top 3 (top 5 if they picked 6 or more), with the same short fields as the best one: who they were before, the result and number, how long it took, the proof upload, and whether we can use their name.
11.9 Where does proof live right now? Multi-pick: Phone screenshots / A Google Drive folder / Discord / Whop / Instagram highlights / Nowhere organised. (F) for a folder or Discord: share link.

*If "Not yet":*
11.4n Links back to 11.1 instead of asking again: "You told us about [their own result]. Do you think that's enough to show people you can get them there?" Chips: Yes / Partly / No, I need student results. (F) "Why?" If 11.2 was "Nothing I can show yet", this screen is skipped.
11.5n What's the closest thing to a student result you have? Chips: A free student or beta client / Someone who's halfway there / Nothing yet. (F) "Tell us about it." Upload box.
11.6n "That's normal. Getting your first proof is part of the plan." Their portal gets a "first proof" step, and the plan aims early work at getting one result on record.

Every result, their own and their students', saves as its own item in their proof vault (tagged by type, number, name permission and the claim it backs, as the [[synthesis/client-brain-spec]] proof vault describes). Content, the funnel and sales calls pull from it.

**12. Your program** (optional; we build programs as part of delivery)
12.1 Do you have a paid program or mentorship yet? Chips: Yes, it runs well / Yes, but it's messy / Not yet. If not "runs well" (F): "What's missing?" Multi-pick: Curriculum / How to run 1-1 calls / Teaching material / Tracking who paid / Whop setup / Other.

**13. The deal** (new, founder 2026-10-15: set the frame and expectations before they finish. We don't ask "how determined are you", because words are cheap. We ask them to confirm they understand, twice.)
13.1 **How this works.** One screen, plain words:
   - "We give you the system: the plan, the tools, the drafts, the funnel and a weekly review."
   - "You do the parts only you can do: record your videos (1-2 a week), post your own reels (2-5 a day, raw, unscripted), show up to the weekly review, approve drafts, reply to your leads, take your calls and look after your students."
   - "If the content doesn't go out, nothing we build can work. Pulsify isn't responsible for results from work that never gets posted."
   - "Our side: if anything we promised isn't delivered, we keep working at no extra cost until it is." (The approved guarantee in [[synthesis/mvp-readiness-and-pricing-2026-10-12]].)
13.2 "Do you understand this?" Yes / No, explain it again. "No" shows the same points in shorter words, with a "Message us" button, and flags it to the founder.
13.3 "And do you promise yourself you'll put in the work to make this work?" Yes, I'm in / Not sure yet. "Not sure yet" still lets them finish, and flags it to the founder.
Both answers are saved with the date and time, next to the signed contract.

**14. Read-back** - "Here's what we heard", with an Edit button per part, then Finish.

## Every answer is something they build on (founder 2026-10-15)

Nothing in onboarding is a one-time form. Every answer becomes a card in their portal (Brand Brain) that they can open later and expand: add a new result to their proof, update their numbers, rewrite their story, refine their buyer. The read-back screen ends with "You can add to any of this later from your Brand Brain." When something new happens (a new student result, a new offer), the app nudges them to add it, and everything that writes for them picks it up straight away.

## Rules so it never repeats itself

- **Ask once.** Each brain field is asked once. A follow-up adds to the same field, it doesn't ask again.
- **Link back instead of asking again, and never contradict an earlier answer.** When a later question touches something they already said, it opens with their earlier words and builds on them. The links built in so far: A4 "tried something before" -> 4.9 who they worked with; 5.2 best client -> 11.4 best student result; 11.1 their own result -> 11.4n "is that enough to bring people in?"; 9.15 who helps -> 10.9 who handles each part; 4.2 price -> 10.11 deal size; 1.4 platforms -> 9.6 posting rows.
- **Don't re-ask what we know.** If we already know something (handles from the lead sheet, niche from research), we show it as "Is this right?" with Yes / Fix.
- **Rule-based follow-ups for now.** A short answer (under about 8 words) on an open question gets one "say more" nudge, written for that question. No AI cost.
- **AI follow-ups later.** Once we pick the cheap model, it chooses the sharpest follow-up from the answer. That step only goes live if it passes the same review.

## Where the answers go

Into the app's client brain, the same database the portal already reads from (the `client_brain` table behind `functions/api/client-brain.js`). That's the right home: everything in the app, and later the AI, reads from it. Our vault (Pulsify-Brain) is our own know-how, not client data. Operators can still export a client's brain into the vault when needed.

The "How you found us" answers (part A) are saved the moment its last question is answered, to a separate record that belongs to Pulsify (`sale_story.believed_because`, `sale_story.decision_time`, `sale_story.sooner_if`, `sale_story.converting_video`, `sale_story.pre_call_confidence`, `sale_story.almost_stopped`, `sale_story.touchpoints`). They are kept out of anything the client's AI reads, and summed across clients on the operator side ("which video books calls", "what almost stops people").

Parts 7, 9 and 10 (positioning, content habits, funnel knowledge) also tell us about our own buyers. Across clients we add them up as patterns only, never one client's details: how many have no mechanism, how many find long form hard, how long a video takes them, which funnels failed them. Those patterns become our outreach and content angles, because they're the problems we fix (founder 2026-10-15).

New brain fields this needs (added to the allowed client fields), by part: identity: `identity.age`, `identity.relationship_status`; intent: `intent.why_joined`, `intent.decision_story`, `intent.win_90d`; money: `money.last_3_months` (revenue + profit per month), `money.monthly_income`, `money.content_revenue_baseline`; offer: `offer.history`, `offer.price`, `offer.result`, `offer.type`, `offer.past_offer`, `offer.target_type`, `offer.target_price`, `offer.payment_platforms`, `offer.past_growth_help` (who, result, why it ended); icp: `icp.known`, `icp.best_client`, `icp.age_range`, `icp.gender_mix`, `icp.life_stage`, `icp.daily_life`, `icp.income`, `icp.payment_style`, `icp.engagers`, `icp.before_state`, `icp.tried_before`, `icp.buying_behaviour`, `icp.tipping_point`, `icp.objections`, `icp.language`, `icp.never_client`, `icp.starter_profile` (each card confirmed or fixed); story: `story.start_type`; positioning: `positioning.mechanism_status`, `positioning.mechanism` (name and steps, or the step-by-step walkthrough), `positioning.difference`, `positioning.competitors`, `positioning.content_shows_it`, `positioning.love_topics`, `positioning.avoid_topics`; voice: `voice.persona`, `voice.persona_second`, `voice.unhinged_level`, `voice.filter`, `voice.flagged_words`, `voice.sliders`, `voice.never_say`; content: `content.home_platform`, `content.longform_awareness`, `content.hard_parts`, `content.yt_format`, `content.cadence`, `content.process`, `content.video_time`, `content.script_time`, `content.daily_time`, `content.schedule`, `content.film_hours`, `content.best_post`, `content.skills` (level per skill), `content.hates`, `content.helpers`; funnel: `funnel.stage_focus`, `funnel.terms_known`, `funnel.tried` (with outcome), `funnel.wanted`, `funnel.has_funnel`, `funnel.sales_method`, `funnel.lead_sources`, `funnel.path` (ordered steps), `funnel.step_links`, `funnel.tools`, `funnel.owners`, `funnel.tracks_numbers`, `funnel.metrics` (each a value, a range or unknown), `funnel.leak`, `funnel.leak_guess`, `funnel.non_buyer_followup`, `funnel.ads`; proof: `proof.own_best` (story, number, timeframe, proof files), `proof.level`, `proof.best_result` (story, number, timeframe, proof files, name permission), `proof.top_results` (3-5 items, same fields), `proof.own_enough`, `proof.closest_thing`, `proof.storage`; program: `program.status`, `program.missing`; commitment: `commitment.understood`, `commitment.promised` (each with date and time).

## Decided 2026-10-15

- Glowing logo loader across the whole app, a little bigger than now (not huge). pulsify-saas #65.
- Glowing cursor on onboarding only.

## Points to settle in review

1. Settled: money questions are exact and required (last 3 months revenue + profit, current monthly income, content share).
2. It's now 35-45 minutes. It autosaves and can be done in sittings. Is that OK, or should proof uploads and the program part move to a "finish your setup" step in the first week?
3. Should the read-back step send you a notification so you see each new client's summary?
4. Should "The deal" (13) come at the end as it is now, or right after part A so the frame is set before they answer anything?

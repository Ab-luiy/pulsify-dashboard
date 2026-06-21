---
name: vsl-copywriting-framework
description: Master instruction file for writing high-converting Video Sales Letters (VSLs) using specific brand voices, deep market research, and structured conversion frameworks.
---

# VSL Copywriting Framework

This file contains the complete step-by-step process for researching, priming, and writing a Video Sales Letter (VSL).

## METHOD A - AI-Powered Research (Fast, Good)

Use AI tools to do deep market research quickly.
This gets you 70-80% of what you need in a fraction of the time.

### Tool 1: Gemini Deep Research

**SCENARIO:** Need to understand a target market's pain points, desires, objections, and language

**COMMAND:**
"Do deep research on [target audience — e.g. 'online coaches who are stuck at $5K-10K/month']. I need to understand: their biggest daily frustrations, the language they use to describe their problems, what they've already tried that hasn't worked, what they secretly desire but won't admit, what objections they have to investing in coaching programs, and what emotional triggers drive their purchasing decisions. Pull from forums, Reddit, reviews, testimonials, and anywhere people talk about this honestly."

**RESULT:**
→ Comprehensive audience psychology document
→ Real language pulled from where your audience actually vents
→ Objection map you can pre-handle in the VSL
→ Emotional trigger list for hooks and agitation

**TIME:** 20-30 minutes (vs. 20-30 hours manually)

### Tool 2: Manus (For Deeper Autonomous Research)

**SCENARIO:** Need full competitive landscape + audience sentiment analysis

**COMMAND:**
"Research the [niche] market. I need: (1) analysis of the top 5 competitors' VSLs and sales pages — what promises they make, what proof they show, how they position their offer. (2) Common customer complaints about existing programs in this space (pull from Reddit, Trustpilot, course review sites). (3) The specific transformation language buyers use when they talk about success in this space. (4) The main false beliefs the audience holds that keep them stuck. Compile everything into a research document with direct quotes wherever possible."

**RESULT:**
→ Competitive intelligence on every major player
→ Real customer quotes you can mirror in the VSL
→ False belief map for your "mechanism" section
→ Positioning gaps you can own

**TIME:** 45-60 minutes autonomous
→ you review the finished doc

**Where to Pull Raw Research From:**
- Reddit threads (r/entrepreneur, r/[niche]-specific subs)

---

## STEP 2 — BUILD YOUR CONTEXT FILES

Most people skip straight to prompting AI and wonder why the output is generic.

The output is generic because the **input was generic.**

Claude can only write as well as the context you give it.

Step 2 is about building four documents that transform Claude from a generic AI into a specialized VSL writer who knows this brand, this audience, and this offer cold.

### FILE 1 -- The Offer Document

Everything Claude needs to know about what's being sold.

**What to include:**

"OFFER NAME: [Name of the program/product/service]

WHAT IT IS: [Clear, plain-English description]

WHO IT'S FOR: [Specific person with specific situation]

WHO IT'S NOT FOR: [Be honest — this builds trust in the VSL]

THE CORE PROMISE: [The single transformation — from X to Y in Z timeframe]

WHAT'S INCLUDED:
- [Module/component 1 + what it does for them]
- [Module/component 2 + what it does for them]
- [Continue for all inclusions]

BONUSES:
- [Bonus 1: Name + value + why it matters]
- [Bonus 2: Name + value + why it matters]

PRICE: [Actual price]

VALUE STACK: [Break down how you'd justify 10x the price]

THE UNIQUE MECHANISM: [Why this works when other things haven't — the "secret"]

GUARANTEE: [What happens if it doesn't work for them]

URGENCY/SCARCITY: [Why they should act now — real reasons only]"

### FILE 2 -- The Brand Voice Document

This is what makes the VSL sound like the **client**, not like generic AI.

**How to Build It:**

**Step 1: Collect raw content**
→ Pull 10-15 pieces of their best content: YouTube transcripts, podcast transcripts, emails, social posts, sales calls recordings (transcribed)
→ Focus on content where they sound MOST like themselves - raw, unscripted moments work best

**Step 2: Transcribe everything**
→ Use Descript, Otter.ai, or YouTube's auto-transcription
→ The messier and more natural, the better
→ You want their run-on sentences, their filler words, their specific phrases

**Step 3: Feed to Claude with this prompt:**
"Analyze all of this content and extract a detailed brand voice profile. I need:
(1) vocabulary — specific words and phrases they use repeatedly,
(2) sentence structure — how long are their sentences, do they use fragments, how do they build arguments,
(3) tonality — are they aggressive, warm, direct, analytical, funny, etc.,
(4) storytelling patterns — how do they open stories, how do they close them,
(5) their 'isms' — phrases or expressions unique to them,
(6) what they NEVER say — words or tones that would feel out of character,
(7) their relationship with the reader — are they a mentor, a peer, a provocateur? Give me this as a JSON profile I can reference when writing copy."

**Output:** A structured brand voice JSON that gets uploaded to the Claude project

**Why This Matters:**
Without this, Claude writes in a neutral, professional tone that sounds like no one.
With it, Claude writes copy that the client reads and says "this sounds exactly like me"

### FILE 3 -- ICP Research Document (JSON)

The research from Step 1 organized into a clean profile Claude can reference instantly.

**Format:**
```json
{
  "audience_name": "Online coaches stuck at $5-10K/month",
  "daily_frustrations": [
    "Spending hours on content that doesn't convert",
    "Inconsistent income - feast or famine every month",
    "Attracting clients who can't afford them"
  ],
  "secret_desires": [
    "Consistent $30K+ months without working weekends",
    "To be seen as the go-to expert in their niche",
    "Freedom to turn down clients they don't want"
  ],
  "language_they_use": [
    "I'm doing everything right but nothing is working",
    "I know my stuff but I can't figure out the business side",
    "I'm tired of trading time for money"
  ],
  "objections": [
    "I've bought programs before and they didn't work",
    "I don't have time to add another thing right now",
    "I need to make more money before I can invest in this"
  ],
  "false_beliefs": [
    "If I just create better content, clients will come",
    "I need more followers before I can charge premium prices",
    "Sales is pushy and I don't want to be that person"
  ],
  "emotional_triggers": [
    "Fear of wasting more years stuck at the same income",
    "Desire for recognition and respect in their market",
    "Frustration with the gap between their skills and their results"
  ]
}
```

### FILE 4 -- Case Studies Document

Every result, transformation, and testimonial the client has. This is the proof section of the VSL.

**What to collect:**
- Specific before/after results with numbers ("went from $3K/month to $28K/month in 90 days")
- Client quotes (verbatim — do not paraphrase)
- Transformation stories (what was their life like before, what is it like now)
- Screenshots of wins (describe them in text for Claude)
- Time-to-result data ("most clients see X within Y weeks")

**Format each case study like this:**
CLIENT: [First name or initials]
STARTING POINT: [Where they were when they started]
WHAT THEY DID: [Which part of the program/offer helped most]
RESULT: [Specific outcome with numbers and timeframe]
THEIR WORDS: "[Direct quote]"

**More case studies = better VSL.**
Claude will select the most relevant ones for each section. Give it 10-20 to work from.

---

## STEP 3 -- SET UP YOUR CLAUDE PROJECT

**Why a Project (Not Just a Chat)**
A regular Claude chat forgets everything the moment you close it.
A Claude Project keeps all your context files permanently loaded -- so every conversation starts with Claude already knowing the brand, the audience, the offer, and the proof.

### STEP-BY-STEP PROJECT SETUP

**STEP 1: Create New Project**
1. Open Claude (claude.ai)
2. Click "Projects" in the left sidebar
3. Click "Create Project"
4. Name it: "[Client Name] — VSL"

**STEP 2: Upload Your 4 Context Files**
1. Inside the project, click "Project Knowledge"
2. Click "Add Content"
3. Upload all four files:
   - ① Brand Voice Profile (JSON)
   - ② ICP Research Document (JSON)
   - ③ Offer/Product Information Document
   - ④ Case Studies Document
Claude now has instant access to all of this in every conversation -- permanently.

**STEP 3: Prime Claude With Deep Analysis**
Start a new chat inside the project. Send this exact prompt first:
*"Before we write anything, I want you to deeply analyze everything in your project knowledge. Study the brand voice profile and understand exactly how [client name] communicates. Study the ICP research and internalize what this audience feels, fears, and wants. Study the offer document and understand every component of what we're selling and why it's valuable. Study the case studies and note the strongest proof points and transformations. When you're done, tell me: what are the 3 most powerful emotional triggers we should lead with in this VSL, and what's the single biggest objection we need to pre-handle? This analysis will drive everything we write."*

**What this does:**
Forces Claude to synthesize everything before writing a single word.
The analysis it gives back will tell you exactly what it absorbed and surface insights you might have missed.
This priming step is what separates a good VSL from a great one.

**STEP 4: Confirm Claude Is Ready**
Claude will respond with its analysis.
Check:
□ Does it understand the client's voice accurately?
□ Did it identify the right pain points?
□ Are the objections it flagged the real ones?
□ Did it pull specific language from the ICP research?
If something's off, correct it before writing. This is your last quality check before the draft.

---

## STEP 4 -- WRITE THE VSL

Once Claude has analyzed the project knowledge, use this prompt to generate the first draft:
*"Now write a complete VSL script for [Client Name]'s [Offer Name].*

### STRUCTURE TO FOLLOW

1. **HOOK (30-60 seconds):** Open with a pattern interrupt that speaks directly to the #1 pain point we identified. Use the exact language from our ICP research — the words they use, not corporate language. The viewer should feel like you're reading their mind.
2. **PROBLEM + AGITATION (2-3 minutes):** Name the problem clearly. Then twist the knife — what does staying stuck actually cost them? Use specific, concrete scenarios from their daily life. Make them feel the pain of inaction.
3. **THE FAILED SOLUTIONS (1-2 minutes):** Acknowledge everything they've already tried. Validate that those things didn't work and explain WHY — not because they failed, but because those approaches were missing [the mechanism]. This builds credibility and clears the path for our solution.
4. **STORY/CREDIBILITY (2-3 minutes):** Introduce [client name]. Tell the origin story — where they were before, what they discovered, what changed. Keep it human, specific, and tied directly to the audience's situation. This is not a resume — it's a transformation story.
5. **THE MECHANISM (2-3 minutes):** Introduce the unique approach — what makes this different from everything else they've tried. Give it a name if possible. Explain WHY it works. Use an analogy if it helps. This is the 'aha moment' of the VSL.
6. **SOCIAL PROOF (2-3 minutes):** Pull the 3-4 strongest case studies from the project knowledge. Lead with results, then tell the story behind them. Use specific numbers, specific timeframes, specific before/after scenarios. Include direct quotes where available.
7. **OFFER REVEAL (3-4 minutes):** Present the offer. Walk through each component and tie it to a specific outcome — not just what it is, but what it DOES for them. Stack the value. Name a 'real world' price for each component. Build to a value stack total before revealing the actual price.
8. **PRICE JUSTIFICATION + GUARANTEE (1-2 minutes):** Anchor the price against the cost of the problem. Use the ROI framing. Present the guarantee in a way that removes risk entirely.
9. **URGENCY + SCARCITY (1 minute):** Give them a real reason to act now. Closing soon, price going up, spots limited — whatever is true. Never manufacture false urgency.
10. **CTA (30-60 seconds):** One clear instruction. Tell them exactly what to click, what happens next, and what they'll get on the other side. Reassure them one final time.

### TONE REQUIREMENTS

- Write entirely in [client name]'s brand voice as defined in the project knowledge. If they speak casually, write casually. If they're direct and aggressive, write that way.
- Speak directly to ONE person — the specific ICP we defined. Use 'you' constantly. Never 'our customers' or 'people like you.'
- Short sentences. Varied rhythm. Conversational. This will be spoken out loud, not read on a page.
- No corporate language, no buzzwords, no abstract promises. Every claim should be tied to a specific, concrete outcome.
- Open loops throughout — create curiosity that keeps people watching.

**LENGTH:** Aim for 15-20 minutes of spoken content (approximately 2,500-3,500 words).

**IMPORTANT:** After every major section, add a brief [SECTION NOTE] explaining the psychological purpose of what you just wrote and what to watch for during editing. This helps me understand the intent so I can refine it intelligently.

---

## Editing The VSL Script

### What to Expect From the First Draft

The first draft will be **60-75% of the way there.**
That's the goal.
Don't expect perfection, expect a structured, contextually accurate foundation that would have taken a human copywriter a week to produce.

**What will be strong:**
→ Structure and flow (Claude follows the formula well)
→ Research integration (it'll use your ICP language naturally)
→ Offer presentation (it knows the product cold from your doc)
→ Proof sections (it'll pull the strongest case studies)

**What will need work:**
→ Specific moments that feel "AI polished" vs. raw and human
→ Places where the voice drifts toward generic
→ Transitions that are too smooth (real speech has more texture)
→ Any section where it defaults to abstract rather than concrete

### The Golden Rule of Editing AI Copy
The AI gives you **scaffolding**. You give it **soul**.
Every edit is either adding something true and specific, or removing something generic and hollow. That's the entire job.

### THE EDITING WORKFLOW

**Round 1 — Read it cold (don't edit yet)**
Read the full draft out loud as if you're the viewer. Note only the sections where you mentally checked out or something felt off. These are your priority fixes.

**Round 2 — The "would a human say this?" pass**
Go line by line. For anything that sounds slightly formal, over-polished, or generic → rewrite it in the client's actual voice. Cut ruthlessly. Specificity over completeness.

**Round 3 — The proof and pain injection pass**
Go through every pain point and case study. Replace every generalized version with a specific real one. This is where you insert the raw research language and actual client stories.

**Round 4 — The read-aloud pass**
Read the whole thing out loud one more time. Mark anywhere you stumble -- those are the awkward spots. Rewrite until you can read it smoothly at conversational speed.

**Round 5 — The feedback loop**
Paste sections back to Claude with this prompt:
*"This section feels generic/AI-y. Here's the original: [paste]. Rewrite it to be rawer, more conversational, and more specific. The client's voice is [describe one key trait]. Make it feel like they're speaking off the cuff, not reading a script."*
→ Iterate until it sounds right

### WHAT TO LEAVE ALONE
Not everything needs editing. So leave out the:

**✓ The structure**
The hook → problem → mechanism → proof → offer flow is usually solid.
Don't restructure unless something is genuinely in the wrong place.

**✓ The value stack section**
Claude is good at breaking down components and framing value. Usually just needs specific numbers inserted.

**✓ Objection handling**
If you gave it a good objections list in the ICP doc, the objection pre-handling tends to be accurate and well-placed.

**✓ The CTA**
Simple and direct tends to be Claude's default for CTAs. That's usually right.

---

## 7 Fixes to Make AI Copy Sound Human

**① Kill the "polish words"**
AI writes in a tone that's smooth and confident in a way no real human is. It over-uses transition phrases like:
- "In today's fast-paced world..."
- "It's important to note that..."
- "This is where [X] comes in..."
- "At the end of the day..."
- "The bottom line is..."
- "Unlock the power of..."
- "Game-changing" / "Revolutionary" / "Transform your life"
**The fix:** Delete them entirely OR replace with blunter, more specific language. "Here's what that actually means for you" beats "This is where the magic happens" every time.

**② Break the rhythm**
AI writes in suspiciously uniform sentence lengths. Everything sounds vaguely the same pace.
Real spoken copy has texture -- punchy short lines followed by longer explanations, fragments for emphasis, questions that interrupt the flow.
**The fix:** Read every paragraph out loud. Where it sounds like a robot → rewrite it. Add some 3-word sentences. Let some sentences run. Start some sentences with "And." Or "But." Because that's how people actually talk.

**③ Replace abstractions with specifics**
AI loves abstract language: "achieve your goals," "create financial freedom," "build the life you want." These phrases mean nothing because they mean everything.
**The fix:** Every abstract → concrete.
- ❌ "achieve financial freedom" → ✅ "stop checking your bank account before you buy groceries"
- ❌ "grow your business" → ✅ "add $15K/month without touching cold outreach"
- ❌ "transform your relationships" → ✅ "stop walking on eggshells every Sunday night"

**④ Add the client's actual stories and phrases**
The brand voice doc helps but Claude still writes approximations of the client's voice, not the real thing. The best edit you can make is inserting actual things the client says.
**The fix:**
→ Go back to the raw transcripts you used to build the brand voice doc
→ Pull specific phrases, expressions, or mini-stories the client actually uses
→ Drop them directly into the VSL in the right spots
→ A single authentic phrase can make an entire section feel real

**⑤ Inject the client's specific numbers and stories**
AI generates plausible-sounding proof but it can't invent real specifics. Wherever it writes something vague like "many clients have seen dramatic results" or assumes stuff that isn't real, replace it with a real story.
**The fix:**
Go to your case studies doc. Find the actual story that belongs in that section. Replace Claude's placeholder language with the real name, real number, real before/after. Specificity = credibility.

**⑥ Make the pain section meaner**
AI is uncomfortable writing truly uncomfortable copy. It softens the pain section, hedges the agitation, pulls its punches. But viewers stop watching when they don't feel seen. The pain section needs to make people think "how did you know?"
**The fix:**
Go back to your Reddit/Amazon review research. Find the most raw, specific, frustrated things people write about this problem. Not your paraphrase... but their actual words. Use them. It'll feel like a violation of politeness and it'll convert better than anything Claude wrote.

**⑦ Tighten the transitions**
AI writes transitions that are too tidy. "Now that we've covered X, let's talk about Y." Real VSLs cut faster. The best transition is a hook that makes them need to hear the next section.
**The fix:**
Replace explanation-transitions with curiosity-transitions.
- ❌ "Now that you understand the problem, let me tell you about the solution."
- ✅ "But here's what none of those other programs ever told you."

---

## What a VSL is worth to a client

A VSL converting at 3% on 1,000 visitors/month:
→ 30 buyers/month
→ At $997 offer: **$29,910/month**

That same VSL converting at 5% (better research + copy):
→ 50 buyers/month
→ At $997 offer: **$49,850/month**

**The difference between a 3% and 5% VSL = $19,940/month to the client.**

What you charge for a VSL:
$3,000-15,000 (depending on how big the client is)

What a great VSL generates: $30,000-100,000+/month for the client

**The ROI the client gets: 10x-30x their investment**

That's why VSL copywriting is one of the highest-paid skills in the online business world.
And that's why being able to produce them in days instead of weeks, with AI doing the heavy lifting, is a category-defining advantage.

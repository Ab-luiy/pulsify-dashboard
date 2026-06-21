---
type: playbook
tags: [vsl, content, outreach, sales, frameworks]
sources: []
created: 2026-05-19
updated: 2026-05-19
---

# VSL transcript extraction prompt (Perplexity)

Use this prompt every time you need to extract voice, mechanism, proof, and avatar data from a creator's YouTube channel before writing their VSL. Send to Perplexity. Paste the output back into Claude for grading and VSL production.

## Why this matters for Pulsify

Pulsify writes VSLs for clients in the biz-op coaching space. A VSL written without the creator's actual voice and mechanism is a template, not a conversion asset. This prompt pulls everything Claude needs from a channel to write the script in the creator's own language, not generic copywriting language. It also surfaces the proof points and objections that are already validated with that specific audience.

## The prompt

Paste this into Perplexity. Replace [PASTE CHANNEL URL] with the target YouTube channel URL.

---

I need you to analyze the YouTube channel at [PASTE CHANNEL URL] and extract everything relevant for writing a high-converting Video Sales Letter for this creator's high-ticket 1-on-1 mentorship offer. Go through as many videos as you can access.

Extract and organize the following:

**1. VOICE & LANGUAGE**
Pull the exact words, phrases, and sentences this creator uses repeatedly. How do they open videos? How do they close? What is their natural sentence structure — short and punchy, or long and explanatory? Do they use slang, niche jargon, or plain language? Write down specific recurring phrases verbatim. The goal is to capture how they actually speak, not a description of it.

**2. THE MECHANISM**
What is the core trading strategy or framework this person teaches? Give me the name they use for it, how they describe it in their own words, the specific conditions or patterns they look for, and how they explain why it works. Include any proprietary terminology they use. If they explain it multiple times across videos, compile all versions.

**3. AVATAR PAIN POINTS**
What problems, frustrations, and failures does this creator repeatedly address? What does their audience struggle with? What questions do they keep getting asked in comments? What does the creator say their audience was doing wrong before finding them? Be exhaustive — list every pain point mentioned across all videos.

**4. PROOF & RESULTS**
Every time a result is mentioned — student result, their own trading result, account milestone, funded account pass, income figure, percentage return — write it down verbatim with context. Include any screenshots, case studies, or before/after stories referenced even if the numbers are not given.

**5. OBJECTIONS THEY ADDRESS**
Every time the creator pushes back on a skeptical belief — "most people think X but actually Y", "you don't need X to succeed", "the reason you're failing isn't what you think" — write it down. These are the objections their audience carries and the creator has already figured out how to handle them.

**6. THEIR STORY**
Compile everything shared about their personal journey. When did they start? What did failure look like for them? What was the turning point? What do they do differently now? Any specific numbers, timelines, or emotional beats.

**7. WHAT MAKES THEM DIFFERENT**
How do they position themselves against other trading educators, courses, and communities? What do they say is wrong with the industry? What do they claim to do that others don't?

**8. CONTENT PATTERNS**
What topics get the most engagement based on view counts or comment volume? Which videos perform best? What does that tell you about what their audience cares about most?

Output everything in the exact categories above. Do not summarize their personality — give me their actual words. Do not paraphrase their mechanism — describe it in their terms. If something appears across multiple videos, note that it is recurring. Length does not matter. Thoroughness does.

---

## After you get the output

Paste the Perplexity output directly into a Claude conversation and say: "Grade this transcript extraction out of 100 and tell me what's missing."

Claude will score each of the 8 categories, identify gaps, and either ask for additional videos to fill them or flag which sections of the VSL will need Philip to fill in manually before filming.

## Connections

- [[frameworks/vsl-framework]] — the framework this data feeds into
- [[people/jeremy-haynes]] — VSL structure source
- [[playbooks/pulsify-funnel-v1]] — where the VSL sits in the funnel

## Open questions / gaps

- Prompt is tuned for trading coaches by default (mentions trading-specific proof like funded account passes). If used for ecom, dropshipping, or other biz-op niches, swap section 4 examples to match the niche.
- Perplexity's access to YouTube transcripts varies by video age and privacy settings. If output is thin, supplement with manual transcript pulls from ytranscript.com or similar.

## Source trail

Developed in session 2026-05-19 after YouTube blocked direct transcript pulls for @TheAnomalyTrader.

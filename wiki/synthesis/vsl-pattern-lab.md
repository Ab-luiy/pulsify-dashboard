---
type: synthesis
tags: [vsl, copywriting, offer, funnel, content, pattern-analysis]
sources: [[frameworks/vsl-framework]], [[frameworks/ai-launch-prompt-pack]], [[content-engine/pulsify-vsl-v1]], [[content-engine/pulsify-vsl-v2]], [[content-engine/pulsify-vsl-v3]], [[content-engine/evan-vsl-rebuilt]], [[content-engine/evan-vsl-v2]], [[raw-sources/inspiration/vsl-operator-study-source-list]], [[raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30]], [[synthesis/operator-vsl-study-map]], [[synthesis/vsl-patterns/imperium-agency-vsl-analysis]], [[synthesis/vsl-patterns/daniel-fazio-get-clients-challenge-analysis]], [[synthesis/vsl-patterns/serge-gatari-ai-infrastructure-vsl-analysis]], [[synthesis/personalized-cold-outreach-vsl-architecture]], [[synthesis/prospect-funnel-reference-library]]
created: 2026-05-09
updated: 2026-06-30
---

# VSL pattern lab

The VSL pattern lab is where Pulsify turns downloaded VSLs into reusable structure. The goal is not to copy a winning VSL. The goal is to extract the persuasion pattern, map it against [[people/marcus-avatar]], and rebuild it in Pulsify's voice.

## Why this matters for Pulsify

VSLs sit directly inside the funnel pillar. A good VSL turns attention into qualified demand. A bad VSL explains the offer without creating enough tension, belief, or urgency to move Marcus to the application.

Pulsify needs a library of proven VSL patterns because its offer is still being sharpened. The current drafts in [[content-engine/pulsify-vsl-v1]], [[content-engine/pulsify-vsl-v2]], and [[content-engine/pulsify-vsl-v3]] already point at the right mechanism: the [[concepts/pulse-system|Pulse System]]. The missing layer is comparative pattern data from outside VSLs.

That outside data is now filtered through [[synthesis/operator-vsl-study-map]]. The core study cluster is Charlie Morgan, Daniel Fazio, Serge Gatari, Jordan Platten, and Jeremy Haynes. Secondary operators stay limited to specific layers so the vault does not turn into strategy soup.

## The workflow

### Step 1 - Capture the raw transcript

Downloaded VSLs should be transcribed first, then saved as raw source files. Use one file per VSL.

Recommended location:

`raw-sources/vsls/{person-or-offer-name}-vsl-transcript.md`

Required metadata at the top:

```markdown
---
source_type: vsl-transcript
offer:
market:
speaker:
url:
downloaded: YYYY-MM-DD
transcribed: YYYY-MM-DD
transcription_tool:
notes:
---
```

Do not clean the transcript too aggressively. Keep the natural phrasing, but remove obvious transcription noise, timestamps, repeated filler, and irrelevant platform artifacts.

### Step 2 - Segment the VSL

Every transcript gets broken into persuasion blocks:

- Hook
- Problem recognition
- Agitation
- Failed solutions
- Mechanism reveal
- Proof
- Offer
- Objection handling
- Qualification
- Urgency
- CTA

If the VSL uses a different structure, keep the actual structure and note the deviation. The deviation is often the lesson.

### Step 3 - Extract the pattern

For each segment, identify:

- What belief it creates or destroys
- What emotion it intensifies
- What objection it pre-handles
- What proof it uses
- What transition moves the viewer forward
- What would fail if Pulsify copied it directly
- What Pulsify can adapt without stealing the surface

The point is to extract mechanics, not language.

### Step 4 - Map against Marcus

Every useful pattern gets mapped against [[people/marcus-avatar]].

Ask:

- Which Marcus wound does this hit: content stall, lead-flow stall, program stall, backend stall, sales-infrastructure stall, or launch plateau?
- Is this aimed at a beginner, a stalled operator, or a sophisticated buyer?
- Does the VSL sell information, implementation, infrastructure, status, speed, certainty, or relief?
- Would Marcus believe this from Pulsify?
- What proof would Pulsify need to make the same claim credible?

If the answer is "Pulsify cannot credibly say this yet," mark it as a proof gap, not a copy idea.

### Step 5 - Build the pattern library

Each analyzed VSL should produce a reusable pattern card:

```markdown
## {VSL name} - pattern card

Core promise:

Dominant wound:

Buyer sophistication:

Mechanism:

Best segment:

Why it works:

What Pulsify can adapt:

What Pulsify should not copy:

Proof gap:

Related Pulsify pages:
```

Pattern cards belong in this page until there are enough to split into dedicated pages.

## What to look for

The best VSLs usually do at least five things well:

1. They make the viewer feel diagnosed before they feel sold.
2. They collapse the problem into one named mechanism.
3. They show why previous solutions failed without sounding bitter.
4. They make proof feel inevitable, not pasted on.
5. They qualify hard enough that the wrong buyer leaves and the right buyer leans in.

For Pulsify, the winning VSL should not sound like a generic AI agency pitch. It should sound like an operator showing Marcus the machine underneath his stalled business.

## Current Pulsify application

The current Pulsify VSL drafts have the right strategic spine:

- Marcus is stuck because the machine underneath the offer is missing.
- The market is sick of disconnected service providers.
- AI matters because it compresses implementation time, not because it writes captions.
- The Pulse System is the mechanism.
- The offer is done-for-you infrastructure, not advice.

The current gap is proof density. [[clients/nick/overview]] gives one usable trading coach proof point. The fitness creator proof needs a hard metric beyond follower growth before it can carry a serious VSL.

## Current source library

The library now has three tracks:

- Raw transcript track: `raw-sources/vsls/imperium-agency-vsl-transcript.md` is the first stored VSL transcript and has been analyzed in [[synthesis/vsl-patterns/imperium-agency-vsl-analysis]].
- Transcript-derived notes track: Daniel's Get Clients Challenge, Serge's AI infrastructure video, and Jordan's 2025 agency interview are stored as paraphrased source notes in `raw-sources/inspiration/`, with analyses in [[synthesis/vsl-patterns/daniel-fazio-get-clients-challenge-analysis]], [[synthesis/vsl-patterns/serge-gatari-ai-infrastructure-vsl-analysis]], and [[synthesis/jordan-platten-agency-systems-patterns]].
- External source registry: [[raw-sources/inspiration/vsl-operator-study-source-list]] stores approved public VSL pages, webinar pages, opt-ins, and closest public equivalents for the operator study pack.
- Live funnel design track: [[synthesis/prospect-funnel-reference-library]] compares Mason Bowstead, Charlie Morgan, Grant Garcia, Luke Alexander, and Ayman Arab as landing-page/VSL wrappers for prospect builds. Mason is the default conversion skeleton. Luke is the AI-native visual overlay. Charlie, Grant, and Ayman contribute bounded structural mechanics.

Do not treat the source registry as a substitute for transcripts. It is enough for source mapping and high-level pattern extraction. It is not enough for line-level VSL analysis. Also do not store full third-party transcripts unless Abdul provides them directly. Use transcript-derived notes and analysis to keep the vault useful without reproducing copyrighted source material.

## Open questions / gaps

- Local transcription tooling is not installed in the current workspace. VSLs need to be transcribed externally or transcription tooling needs to be added.
- Only one full raw VSL transcript exists locally. More user-provided transcripts are needed for line-level comparison.
- Daniel Fazio and Serge Gatari now have transcript-derived analysis pages. Their full transcripts are not stored.
- Jordan Platten's public interview has transcript-derived notes, but the Elite Agency embedded VSL still needs transcript capture.
- The dedicated [[concepts/pulse-system]] page still needs to be created so the mechanism has a canonical home.
- The VSL drafts have not been graded against the new personalized cold outreach VSL architecture yet.
- The standard time cadence for the new landing page -> VSL -> Typeform value sequence is not locked.

## Source trail

- [[frameworks/vsl-framework]]
- [[frameworks/ai-launch-prompt-pack]]
- [[content-engine/pulsify-vsl-v1]]
- [[content-engine/pulsify-vsl-v2]]
- [[content-engine/pulsify-vsl-v3]]
- [[content-engine/evan-vsl-rebuilt]]
- [[content-engine/evan-vsl-v2]]
- [[raw-sources/inspiration/vsl-operator-study-source-list]]
- [[synthesis/operator-vsl-study-map]]
- [[synthesis/vsl-patterns/imperium-agency-vsl-analysis]]
- [[synthesis/vsl-patterns/daniel-fazio-get-clients-challenge-analysis]]
- [[synthesis/vsl-patterns/serge-gatari-ai-infrastructure-vsl-analysis]]
- [[synthesis/personalized-cold-outreach-vsl-architecture]]
- [[synthesis/prospect-funnel-reference-library]]
- [[raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30]]

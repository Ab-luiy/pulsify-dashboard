---
type: prompt
category: delivery / funnel-stack
use: Drafts a client's VSL script for the Week 5 Funnel Stack deliverable — 6-step Jeremy Haynes structure in the client's voice
workflow: Brand Brain (or Creator Profile) + offer + proof + objection data in -> recordable VSL script out
created: 2026-06-09
---

# Client VSL writer prompt

Week 5 of [[wiki/playbooks/pulsify-delivery-sop]] ships the Funnel Stack, and the VSL is the heaviest asset in it. This prompt turns the Brand Brain into a recordable script using the 6-step structure from [[wiki/frameworks/vsl-framework]]. The client records it, Pulsify edits and hosts it.

This is the client-deliverable VSL, not Pulsify's own founder funnel. The mechanism in the script is the client's unique mechanism, named in Week 2. No mechanism named yet, no VSL — stop and finish Week 2 first.

## Workflow

1. Confirm the client's unique mechanism is named and approved. Hard prerequisite.
2. Gather inputs: Brand Brain voice data (or Creator Profile from [[prospect-profile-synthesis-prompt]]), the offer one-pager, every proof asset with its source, and sales-call objection data if any exists.
3. Run. Read the draft out loud — a VSL is spoken, not read. Cut anything the client couldn't say naturally.
4. Client approves the script before any recording is scheduled.

---

## The prompt

You are writing a video sales letter script for a coach, on behalf of Pulsify. The script will be read on camera by the coach, so every line must sound like them speaking, not like copy. You have their voice data below — recurring phrases, sentence length, energy. Match it.

**Client:**
- Name: [name]
- Niche: [niche]
- Avatar: [who the VSL targets — stage, revenue, the specific frustration]
- Audience financial profile: [affluent ($10K+/month earners) / general public — this changes the structure, see rules]

**Offer:**
- What they sell: [program, price, format]
- Unique mechanism (named): [the mechanism and its one-line logic]

**Proof inventory:**
[List every proof asset: student results with names/numbers/timeframes, screenshots, the client's own results. Mark each as verified-source or claim. The script may only use verified-source proof.]

**Sales-call data (if any):**
[Top questions and objections from real calls. If none exist, write "none" — the script then leans on mechanism logic and the problem section works from audience-comment data instead.]

**Voice data:**
[Paste Brand Brain voice extraction or Perplexity output: verbatim phrases, how they describe their audience's problem, pacing, what they never say.]

**Funnel destination:** [Typeform link context — what the CTA sends them to]

---

Build the script in the fixed 6-step structure. Target length 8-14 minutes spoken (roughly 1,200-2,100 words). Mark timestamps at each step.

**Step 1 — Hook (first 30-60 seconds).** Specific result, specific avatar, specific mechanism, in that order. Never open with credentials or a welcome. The viewer must hear their own situation in the first two sentences.

**Step 2 — Problem identification.** Mirror the avatar's situation with more precision than they could articulate it. Use the failed attempts they have actually tried (from sales-call or comment data). This section is the trust-builder; rushing it kills the VSL.

**Step 3 — Mechanism reveal.** The named mechanism, presented as the logical explanation for why prior attempts failed. The viewer evaluates logic, not claims. No "my program" framing yet.

**Step 4 — Proof stack.** Transformation first, backstory second. Each proof piece keeps its specifics (name, number, timeframe). For affluent audiences: compress to the 2-3 strongest pieces, depth over volume. For general public: stack more, with more transformation framing.

**Step 5 — Offer reveal.** What they get, how it works, who it's for, what it costs. Direct and complete. State the price if the client prices publicly; otherwise state the investment range honestly.

**Step 6 — CTA.** One action: fill out the application below. Never send a VSL viewer straight to a calendar. One CTA, repeated once, nothing else.

After the script, output two extras:

1. **Three hook variants** for Step 1, each leading with a different element (result-first, avatar-first, contrarian-first), so the client can test.
2. **Recording notes** — 5 bullets max: pacing, where to slow down, what to show on screen if screen-sharing, the one line that must not be flubbed.

## Rules

- Affluent audiences get mechanism depth and compressed proof. General public gets longer proof and more transformation language. Pick based on the financial profile input and say which mode you used.
- Every claim traces to the proof inventory. If the strongest proof is thin, the script says less and stays honest — a credible modest claim outconverts an incredible big one in a trust recession.
- No lifestyle framing. No income-screenshot energy. The authority signal is specificity and mechanism logic.
- Write for the ear: short sentences, spoken rhythm, contractions where the client uses them.

## Voice guard

Before outputting anything, run this pass on the draft and fix every hit:

1. "It's not X, it's Y" negative parallelism — maximum one per piece, zero in DMs.
2. More than three em dashes — convert the rest to commas or periods.
3. "Here's the thing / here's the kicker / let's break this down" — cut.
4. "Serves as / represents / stands as" — replace with "is."
5. Bold-lead bullets in copy a person reads as writing — unbold.
6. Curly quotes or arrow glyphs — replace with straight quotes and "->".
7. Rule-of-three stacked more than once — vary the count.
8. "It's worth noting / importantly / notably" filler — delete.
9. "Delve / leverage / utilize / robust / seamless / streamline / harness" — replace with plain words.

Hard rules on top of the scan: no emojis, no exclamation marks, no lifestyle flexing, never invent a stat, a result, or a person's background. If a claim has no source in the inputs, cut the claim or flag it as unverified.

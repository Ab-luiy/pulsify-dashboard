---
type: playbook
tags: [funnel, vsl, profile-funnel, inbound, pulsify-own]
sources: [[wiki/concepts/pulse-system-mechanism]], [[wiki/playbooks/pulsify-offer-v1]], [[wiki/concepts/profile-funnel]], [[wiki/frameworks/vsl-framework]]
created: 2026-05-10
updated: 2026-05-10
---

# Pulsify funnel v1

The inbound funnel Pulsify builds for Pulsify itself. The thing prospects move through before they sit on a sales call. v1 is what's getting built first — minimal, high-leverage, revisable. The founder runs sales; the agent runs everything else.

## Why this matters for Pulsify

Pulsify sells "we install your inbound funnel" as a deliverable. If Pulsify's own funnel is broken or absent, the entire pitch collapses. v1 of the funnel exists so Pulsify can both (a) produce inbound calls and (b) screenshot every layer of it on a sales call as proof of concept.

## Architecture

```
YouTube long-form
  → IG profile (the profile funnel: bio + highlights + grid)
  → link in bio  →  Pulsify VSL  →  Typeform  →  Cal.com  →  founder sales call
                          ↓ (if not booking)
                          email/DM nurture → re-pitch
```

The same architecture Pulsify sells. Eat your own cooking.

## Layer-by-layer

### Layer 1 — YouTube long-form

The trust engine. One long-form video per week, founder face on camera, value-first, no flexing per [[concepts/trust-recession]] and [[content-engine/packaging-rules]]. Three video archetypes per [[content-engine/content-pillars]]:

1. **Coaching-content concept breakdown** — taking one named concept (unique mechanism, profile funnel, hammer-them, AI agent replacing VAs) and showing how it works, ideally with a Miro/Gamma demo.
2. **Arbitrary case study** — how a coach achieved X, demoed visually rather than verbally.
3. **Common-belief breakdown** — challenging a default assumption coaches hold.

Description of every video ends with the same CTA: *"If you want the system that makes this work for your offer, the link is in my Instagram bio."*

YT description never links direct to VSL — IG is the qualification step. Going IG first lets the prospect verify the founder is a real person, builds trust, and gives the agent a chance to qualify before booking.

### Layer 2 — Instagram profile funnel

Per [[concepts/profile-funnel]] applied to Pulsify itself.

**Bio:** one-line offer + link.
*"AI growth operator for trading coaches. $100k in 90 days or free. ↓"*

**Highlights, in order, left to right:**
1. **Start here** — 30-second intro to who Abdullah is, what Pulsify does, what to do next.
2. **Results** — the authority anchors from [[wiki/people/abdullah-dagestani]]: $18k/2 days, $96k/90 days, Nick case, Mason podcast.
3. **Mechanism** — 60-second walkthrough of the Pulse System, framed as "what we install."
4. **Demo** — screen-recorded 60–90 seconds of the agent working on a real task.
5. **Testimonials** — when they exist, video-only.
6. **Apply** — link instructions: "Click the link in bio. Watch the VSL. Book if it's a fit."

**Grid:** mix of three things, never more:
- founder-face talking-head clips,
- on-screen Miro/Gamma demos,
- proof screenshots (revenue, dashboards, case-study slices).

**Link in bio:** single tracked link to the VSL page. No Linktree, no menu — one destination.

### Layer 3 — VSL

Built using [[frameworks/vsl-framework]] (Jeremy Haynes 6-step) cross-referenced with [[content-engine/pulsify-vsl-v3]] as the latest draft.

The page hosts the video, the Typeform CTA below, and nothing else. No nav, no footer links, no testimonials grid (testimonials live in the IG highlights instead — VSL page exists to convert, not to browse).

### Layer 4 — Typeform

Qualification gate. 7–10 questions, in this order:

1. Name + IG handle.
2. What's your offer (one line).
3. Current monthly revenue band ($0–10k / $10–30k / $30–60k / $60k+).
4. Audience size on your primary channel.
5. What's working / what's broken (free text).
6. What does $100k in the next 90 days mean for your business.
7. Are you willing to integrate Pulsify into your CRM and payment processor.
8. Email + best phone for the calendar invite.

Fail conditions (auto-disqualify, send to nurture):
- Refuses integration (Q7).
- No offer at all (Q2 blank or non-coaching).
- Demands lifestyle/faceless content (free-text flags).

Pass conditions: route to Cal.com.

### Layer 5 — Cal.com

30-minute discovery slot. Founder's calendar. Auto-generated Zoom or Google Meet link. Pre-call email triggered immediately:

- 1-minute pre-call video from founder.
- One paragraph on what to bring (working offer details, current revenue, current funnel).
- "If you can't make it, reschedule from this link."

48-hour reminder email. 1-hour reminder SMS where possible.

### Layer 6 — The call

Per [[frameworks/call-funnel-framework]]. 30 minutes. Pre-call brief read by founder in the 60 seconds before. Live agent demo at minute 20. Pricing pitch at minute 24 per [[playbooks/pulsify-offer-v1|the offer page]]. Close or schedule follow-up by minute 30.

### Layer 7 — Follow-up nurture

For prospects who:
- booked but no-showed,
- showed but didn't close,
- failed Typeform.

Sales Co-pilot drafts a 5-touch sequence over 30 days. Specific, references what was discussed (or what they answered on Typeform). Each touch is queued, founder approves, sends. After 30 days, prospect drops to a long-tail email list that gets the weekly YouTube notification only.

## Tracking

Every layer has a tracked link or analytic source. The agent compiles weekly:

| Layer | Metric | Source |
|---|---|---|
| YouTube | views, retention, CTR on description link | YouTube Studio |
| IG | profile visits, link-in-bio clicks | IG Insights |
| VSL | video plays, watch-through rate, Typeform start rate | Wistia / VSL host analytics |
| Typeform | completion rate, qualification pass rate | Typeform |
| Cal.com | calls booked, calls held, no-show rate | Cal.com webhooks |
| Sales call | close rate, average deal size | Founder log + payment processor |

The dashboard surface (currently `dashboard.html`) reads from this. v2 of the dashboard is a separate workstream.

## What's live vs. pending

| Layer | Status |
|---|---|
| YouTube channel | live, 17 subs, 4–5 videos shipped |
| IG profile | exists, mostly bot followers, profile-funnel renovation pending |
| VSL | drafted (v1, v2, v3 in `wiki/content-engine/`), not recorded, not hosted |
| Typeform | not built |
| Cal.com | account level set, not wired into Typeform flow |
| Pre-call email | not built |
| Follow-up nurture | not built |

Build order is the order above. The IG renovation is the cheapest layer to ship and unlocks measurable engagement on every video already posted.

## Connections

- [[concepts/pulse-system-mechanism]] — the funnel layer of the mechanism, applied to Pulsify itself.
- [[concepts/profile-funnel]] — the IG layer methodology.
- [[frameworks/vsl-framework]] — the VSL layer methodology.
- [[frameworks/call-funnel-framework]] — the call layer methodology.
- [[playbooks/pulsify-offer-v1]] — what gets pitched on the call.
- [[content-engine/pulsify-vsl-v3]] — the latest VSL script draft.
- [[content-engine/content-pillars]] — what feeds the YouTube layer.
- [[concepts/hammer-them-strategy]] — applies in v2 once outbound paid traffic begins.

## Open questions / gaps

- VSL recording: founder-face vs. screen-share format not yet decided. Recommended: founder-face cold open + screen-share demo middle + founder-face close.
- Cal.com vs. Calendly already chosen as Cal.com — confirm payment processor and SMS reminder integrations exist on the free plan.
- IG profile bot-followers will drag organic reach. Decision pending: clean (cull bot followers, lose count but gain algorithm) vs. accept (keep count for social proof, lose reach). Recommendation: clean — vanity follower count under 10k doesn't sell.
- No paid traffic in v1 by design. Hammer them retargeting is documented in [[concepts/hammer-them-strategy]] for the v2 add-on.

## Source trail

- Founder voice notes, 2026-05-10.
- [[concepts/profile-funnel]], [[frameworks/vsl-framework]], [[frameworks/call-funnel-framework]].
- [[content-engine/content-pillars]], [[content-engine/packaging-rules]].

---
type: synthesis
tags: [funnel-hack, iman-gadzhi, funnel-layer]
sources: []
created: 2026-05-15
updated: 2026-05-15
---

# Iman Gadzhi — funnel layer

The conversion machine behind Consulting.com's Quantum Mastermind. Captured 2026-05-15 via Chrome MCP text + structure extraction. Screenshots pending (CDP renderer freeze on the debugger-attached tab; manual capture noted in screenshot brief).

## Entry points

Single dominant path observed:

```
@imangadzhi (2.7M, no external link)
  └── @consulting (10.1K brand handle, link in bio)
        └── consulting.com/andalusia-mastermind   (sales page)
              └── Apply Now → consulting.com/mastermind-call   (call booking)
                    └── application call → sales close
```

The personal brand never links out. The brand handle holds the only link. The link goes straight to a long-form sales page, not a lead magnet or opt-in — this is a warm-traffic funnel. There is no email opt-in step before the offer. The "opt-in" is the application call booking itself. This is a pure application + call funnel, not a lead-nurture funnel. Maps directly to [[frameworks/call-funnel-framework]] (Jeremy Haynes).

## The offer

**Quantum Mastermind — Andalusia, Spain**
- Dates: September 1–3, 2026 (3 days)
- Venue: Finca La Bobadilla, Sierra de Loja, Andalusia
- Capacity: 60 clients
- Price: **$28,800**
- Format: 9 hours of strategy sessions, 10 speakers, networking, curated experiences, gourmet meals, special guests
- Access: application-gated. No public buy button — every CTA is "Apply Now" → book a call.

This is a recurring event product. Prior editions referenced on the page as social proof:
- Dubai — Al Maha Desert Resort, Q1 2026
- Cape Town — Lanzerac Estate, Stellenbosch, Q4 2025 (70+ founders)
- London — Coworth Park, Q2 2025 (80+ founders)

A new Quantum Mastermind every quarter, each in a different iconic location. The location rotation is the product novelty engine — it gives a reason to re-promote and re-sell to the same audience every quarter.

## Landing page anatomy (consulting.com/andalusia-mastermind)

Built on Framer. Long-form sales page, no video gate (no VSL). Section order:

1. **Hero** — "CONSULTING.COM PRESENTS / QUANTUM MASTERMIND / ANDALUSIA, SPAIN | SEPTEMBER 1-3, 2026" + Apply Now
2. **What it is** — "A Mastermind Unlike Any Other." Anti-Zoom framing: "The best breakthroughs don't happen on Zoom calls." Scarcity stated immediately: "3 days. 60 clients. No distractions."
3. **Where it's held** — heavy environment/luxury copy. The venue is sold as hard as the content. Sensory language: olive groves, candlelit dinners, hacienda suites, 5-star seclusion.
4. **Positioning against category** — "Most Masterminds Are Forgettable. Ours Aren't." Names the enemy: hotel ballrooms, surface-level talks, hidden agendas, networking mixers.
5. **3 Core Pillars** — Experience / Information / Connections. "Information" pillar explicitly promises open books — campaign performance, event ROI, real metrics. Transparency as differentiator.
6. **Past-event proof** — Dubai / Cape Town / London with named venues and founder counts.
7. **What's included** — six stacked "Included" blocks (stay, strategy sessions, networking, experiences, meals, special guests). Value stack framing.
8. **Price + inclusions** — $28,800, bulleted what's-included, Apply Now.
9. **Testimonials** — 6, each with full name + company + a specific revenue claim ($2.8M→$5.8M launch, $70k/day x3, $373/day, made investment back in month one).
10. **Close** — "Most will never make it here. And that's exactly the point." Exclusivity as the final lever. Apply Now.
11. **Footer** — FB disclaimer ("not a part of the Facebook website... NOT endorsed by Facebook"), income disclaimer ("results are not typical"), privacy/terms.

### Read on the landing page
- The FB disclaimer is the tell that this same page is also a **paid Facebook/Instagram ad destination**, not only an organic-social destination. Confirm in Phase 1.6 via Meta Ads Library.
- No VSL anywhere. The sales mechanism is long-form copy + environment aspiration + named social proof, not a video. This is a deliberate choice for a high-status event offer — the "video" is the past-event imagery.
- Status/exclusivity is the dominant persuasion lever, not income claims. Income claims are present but delivered through third-party testimonials, never first-person promises (keeps the income disclaimer clean).
- Price is shown openly ($28,800) before the call. Unusual for a call funnel — most hide price until the call. Showing it pre-qualifies hard and filters the application pool to people who can afford it. The call is a fit/closing call, not a price-reveal call.

## Step 2 — application call booking (consulting.com/mastermind-call)

- Page headline: "Schedule Your Quantum Mastermind Application Call"
- Single testimonial repeated at top (Jean Hollaender, $2.8M→$5.8M) for reassurance at the commitment moment
- Booking widget loads in an embedded iframe (Framer page; scheduler vendor not yet identified — iframe did not render through the debugger-attached tab)
- No long form observed pre-booking on this page; the qualification likely happens inside the scheduler or on the call itself

### Still to capture on this step
- Scheduler vendor (Calendly / Cal.com / SavvyCal / custom) — needs a manual visit or a non-debugger browser
- Application questions (if any) inside the booking flow
- Confirmation page copy
- Reminder sequence (email/SMS) after booking — requires completing a booking with the burner identity (`buffer.sy@gmail.com`, name "AB"); no burner phone available so SMS leg can't be captured

## VSL
**None in the funnel.** No video sales letter on landing or booking page. The offer sells through long-form copy + environment + social proof.

## Webinar
**None observed.** This is an event/mastermind offer sold via application call, not a webinar funnel.

## Email / SMS sequences
**Not yet captured.** No email opt-in exists before the offer, so the only sequence available to capture is the post-booking reminder sequence. Requires booking a call with the burner identity. Flagging for user decision: booking a real call slot on Consulting.com's calendar to capture the reminder sequence puts a fake application into their pipeline. Recommend we capture this only if you want it — otherwise the funnel map is complete without it.

## DM closing
Not observed from the public funnel. @consulting and @imangadzhi may run manual or automated DM flows on engagement — needs the IG Reels/engagement pass (Phase 1.3b) to test.

## Pricing reveal
Open on the landing page: **$28,800**, stated before any call. Deliberate pre-qualification.

## Paid ads (Meta Ad Library — captured)

Searched the Meta Ad Library for "Iman Gadzhi" (~110 active results) and keyword "consulting.com" (~30,000 generic, none his).

**Finding: no active Meta ads for the coaching funnel.** Every Iman-Gadzhi-attributed active ad is for **Hills Eyewear**, his sunglasses brand (H3 Hampton, H7 Riva, blue-light collection — "Tap to shop / Shop Now" → hillseyewear.com). Zero ads point to consulting.com, the Quantum Mastermind, or the mastermind-call booking page. The remaining "Iman Gadzhi" results are third parties name-dropping him (Detox Dudes: "coached high performers like Alex Becker & Iman Gadzhi"; a Slovak coach selling "Iman Gadzhi štýl").

The FB disclaimer in the landing-page footer is therefore **boilerplate**, not evidence of a paid coaching funnel. It does not prove paid traffic.

### The real read
Iman runs paid Meta ads **only for his physical product** (eyewear), where ROAS is measurable and the funnel is transactional. The $28,800 mastermind is sold with **zero paid acquisition** — it runs entirely on organic content gravity (YouTube long-form + IG + the fan clip ecosystem). The coaching funnel has no ad spend because the audience is already warm enough that it doesn't need any. This is the single strongest content beat in the whole capture: a near-$29k offer sold to a full room every quarter on $0 of funnel ad spend.

### Retargeting
No retargeting ads observed for the coaching funnel (consistent with no paid coaching funnel at all). Eyewear ads use a standard DTC creative-volume approach (many near-identical creatives, UGC-style with named creators like amarariva, alexmoldovanos).

## Offer ladder (deep-dive, captured from consulting.com)

The mastermind is the top of a four-rung ladder, not a standalone offer. Company trades internally as "Educate."

| Rung | Product | Target | Mechanism | Access state |
|---|---|---|---|---|
| 1 | **Monetise** | Early-stage, first digital product | Proprietary software stack: Synthesise (product/pricing design), Flozy (CRM/OS), GhostWriter OS (50+ AI agents for launch copy), Shadow Operator Playbook | Cohort-gated — "Enrolments Currently Closed / Join Waitlist" |
| 2 | **UpLevel** | Founders wanting hands-on consulting to build/launch | (page not yet captured) | Application |
| 3 | **Quantum** | Founders at $20K+/mo scaling what works | "License our systems / PlugnPlay architecture" + Fractional C-Suite | Application ("Apply to Work With Us") |
| 4 | **Masterminds** | Top-tier, invite-only | In-person event, $28,800 (Andalusia) | Application call |

### Quantum — the core high-ticket program

Five systems they "install with you":
1. **Organic Category King** — compounding content authority, explicitly "without spending on ads"
2. **Negative Acquisition Flywheel** — "get paid to acquire customers"; content as both revenue and demand
3. **Revenue-Generating Events** — self-liquidating cash events that convert warm audiences
4. **Global Talent Arbitrage** — elite international team at low cost via their hiring funnels/SOPs
5. **Attraction-Based Sales** — inbound-only, "ditch the cold DMs"

Bonus layer: wealth preservation, global tax/asset structures, "Escape Velocity" (founder exits ops).

Named advisory board (a credibility + authority asset most coaches don't expose):
- Iman Gadzhi — CEO
- **Luis Berger — CMO** ("8-figure launches, $20M+ VSL funnels, architected the marketing systems")
- Max Schliebener — COO (built the ops engine, "$100M+ sales, 70%+ margins")
- Ali Haider — CPO (client success/retention)

### Their own stated numbers (from the Quantum sales page — claims, not verified)
- 5M+ subs/followers in 12 months by "systematically hacking the algorithm" across YouTube, TikTok, IG, X, LinkedIn, Snapchat
- Iman works ~5 hrs/week; C-suite handles 99%
- $70M+ digital product sales at 97.15% margins
- **"$20M+ from one YouTube video"** — one video → ~$250K AdSense + $20M sales (their "negative cost of acquisition" proof)
- Ad spend: **"only $2M on ads to bring in over $70M+"** — extreme low-spend ratio, not literally zero

### Accuracy correction to the paid-ads finding
Earlier I wrote "$0 funnel ad spend." Precise version: the **current Quantum Mastermind funnel shows no active Meta ads** (Ad Library confirmed — only Hills Eyewear ads run). But Consulting.com's own page states ~$2M historical ad spend against $70M+ revenue. So the accurate beat is **a ~35:1 revenue-to-ad-spend ratio and an organic-first model they brand as the "Negative Acquisition Flywheel,"** not a literal zero. The site itself brags "250M+ Monthly Views. All organic. Built without ad spend" — their positioning is organic-domination, and the precise, defensible content claim is the ratio plus the no-ads-on-the-current-funnel fact, not "he never runs ads."

## Funnel classification

Application + call funnel for a high-ticket recurring event. Warm traffic (organic social) + likely paid traffic (Meta) → long-form sales page → application call → close. No opt-in, no VSL, no webinar, no nurture sequence. Price shown upfront to pre-qualify. The product's quarterly location rotation is what lets them re-sell the same offer to the same audience repeatedly. This is close to the Jeremy Haynes call-funnel skeleton in [[frameworks/call-funnel-framework]] but stripped of the VSL and nurture layers because the offer status and the founder's existing audience warmth do that job instead.

## Source trail
Captured 2026-05-15 via Chrome MCP from `consulting.com/andalusia-mastermind` and `consulting.com/mastermind-call`. Site built on Framer. Screenshots pending manual capture.

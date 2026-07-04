---
type: synthesis
tags: [funnel, sales, scaling, offer]
sources: founder direction 2026-07-03 (mock review + reframe), [[synthesis/integrations-hub-spec]], [[synthesis/client-acquisition-renovation-2026-07-03]] Part 3, market scan (Assembly/Copilot, SuiteDash, Wayfront/SPP), portal mock code review
created: 2026-07-03
updated: 2026-07-03
---

# Client portal product spec (v2 — connection-first)

Founder reframe after reviewing the Scoreboard mock, 2026-07-03: the portal belongs to the client. When they log in, its first job is letting them **connect everything** — Kit, YouTube, Instagram, Cal.com or Calendly, Stripe / Fanbasis / Whop, Zapier if their tools need it. No sample stats anywhere, even in mocks. Proof-of-value renders as real data arrives, never before. This supersedes the stats-first framing of the earlier Part 3 shape (the tabs survive; the center of gravity moves).

## What the market ships, and what Pulsify takes

Scanned the dedicated client-portal products agencies buy (Assembly, formerly Copilot; SuiteDash; Wayfront, formerly Service Provider Pro; plus the GHL-style white-label pattern). The standard module set across all of them: branded login/white-label domain, dashboard, messaging, file sharing, tasks/approvals, invoicing/subscriptions, intake forms, contracts/e-sign, knowledge base, notifications, and "embed anything" app slots.

The cut — take only what Pulsify's engagement actually runs on:

| Module (market standard) | Pulsify verdict | Why |
|---|---|---|
| Branded portal + login | HAVE (token links) | magic-link-style already; white-label domain waits on the neutral-domain decision |
| Dashboard | TAKE, reshaped | Scoreboard, real data only, honest empty states |
| Intake forms / onboarding | TAKE, as the centerpiece | the Connect checklist = CO1 as software (below) |
| Tasks / client to-dos | TAKE, small | "what we need from you" strip (already in This week) |
| File sharing / deliverables | TAKE, light | Assets tab + Drive links; no file system build |
| Invoicing / payments view | LATER | payments table lands with the hub (I1); a read-only "what you've paid" card after |
| Messaging / chat | SKIP | comms live in Discord/WhatsApp per the delivery SOP; building chat is a swamp with zero edge |
| Contracts / e-sign | SKIP | contracts are per-deal documents; not portal scope |
| Knowledge base | SKIP for now | client retains SOPs at off-boarding; a links card covers it |
| Embed-anything apps | SKIP | our integrations are native, which is the whole point |

**The differentiator none of them have:** a connect-your-marketing-stack surface. Assembly embeds Calendly; SuiteDash embeds files. Nobody OAuths/keys the client's Kit, YouTube, IG, booking, and payments into an operating system, because no portal vendor RUNS the client's growth. Pulsify does. The connection hub is not a feature copied from the market — it is the product.

## The portal's five jobs, in order

1. **Connect (the first-run experience).** A checklist hero: "0 of 7 connected," one card per connection, progress bar. Each card: what it is, why Pulsify needs it, the action, status. Two card mechanics, both first-class:
   - *Key/OAuth connects* (testable): Kit API key + tag, Cal.com key / Calendly link, Stripe/Whop keys where used, Zapier webhook if their tools demand it.
   - *Delegated-access connects* (instructional): YouTube channel access (Studio permissions), Instagram via Meta Business Suite partner access, Fanbasis until its API story is verified. Card carries exact steps + a "done" confirm; never a password field (no raw credentials, ever — same rule that killed form Q28).
   Client writes are portal-token-scoped to their own row only (I1 delta below). Operator can always do it for them from /settings; the checklist reflects either path.
2. **Prove (Scoreboard).** Real data only. Every widget has exactly two states: real numbers with a freshness stamp, or an instructive empty state naming the connect step that unlocks it ("Connect Kit to see your email list growth"). Zero invented figures; the SAMPLE-badge concept is retired along with sample data. Demo mode (watermarked, fictional client) survives only as an operator flag for sales calls — never the default, never in mocks.
3. **Report (This week).** Shipped / in production / needed from you — the delivery heartbeat, already backed by content_items/call_notes/client_assets.
4. **Deliver (Content, Calls, Assets, Decisions tabs).** As in the approved IA; Pipeline stays pending until the revenue bridge exists.
5. **Onboard (the CO1 phases, in-product).** The onboarding doc's phases become a portal checklist with real links (survey, voice-memo submission, contract explanation video) filled per client by the operator — which also retires CO1's dead-placeholder problem (lint L9.1) by making the links config, not document text.

## Design corrections (root causes found in the mock's code)

The founder's review flagged cramped numbers, wrong-reading red, and spacing. All confirmed in css:
1. **Numbers too tight:** `.metric-value` runs letter-spacing -0.05em at 30–38px with line-height 0.98; the hero h1 runs -0.055em. Negative tracking that aggressive squeezes tabular numerals together. Fix: max -0.02em tracking on numerals, line-height >= 1.05; h1 the same.
2. **Red reads as error:** trend states use a red dot/label (`--danger #ba4b3a`) for down-trends. On a client's proof surface, red means "something is broken." Rule: red is reserved for genuine failures only; down-trends render muted/neutral with context copy; "flat" drops the amber alarm treatment too.
3. **No spacing rhythm:** margins/gaps mix 28/24/20/18/16/14px arbitrarily, and `.widget-head` carries a 64px right-padding hack to clear the SAMPLE badge. Fix: one 8px scale (8/16/24/32), and the badge hack dies with the badge.
4. **Scale:** hero h1 clamps to 54px — landing-page scale, not product scale. Portal headline caps ~32–36px.

## Mock stage 2 (gate before the full build)

One revised mock: the FIRST-LOGIN state — Connect checklist hero with 7 cards (mixed key/delegated types, one shown connected so the state design is visible), Scoreboard below in honest empty states, all four design corrections applied, light + dark. Founder sign-off on this revision unlocks the full build. Same single-gate rule as before.

## Build deltas for Codex

- **I1 delta (additive to the running hub build):** client-token-scoped WRITE endpoints for the client's own integration rows (portal token auth, same resolveAccess isolation as /leads; secrets write-only + masked; scope locked to their own client id; operator override unchanged). Delegated-access cards need only a boolean confirm field, no secrets.
- Full portal build = approved IA + this spec's five jobs + design corrections; delivery tabs ride the existing D1 tables; onboarding checklist content is per-client config (operator fills links once).
- Acceptance adds: a fresh client token sees the Connect state end to end; connecting a real Kit key flips the Scoreboard email widget from instructive-empty to real data; no widget can render a number without a live source; red appears nowhere except genuine failure states; client token cannot write another client's integrations (verified, not assumed).

## Open questions / gaps

- YouTube/IG as true OAuth vs delegated-access instructions — start instructional (zero build, matches delivery SOP credentials flow), upgrade to OAuth in I2 if friction shows.
- Whether the onboarding checklist fully replaces the CO1 Google Doc or links to it during transition — recommend full replacement once link config exists; founder call.
- White-label/custom domain — parked with the neutral-domain decision.

## Connections

- [[synthesis/integrations-hub-spec]] — the backend this portal is the client face of
- [[synthesis/client-acquisition-renovation-2026-07-03]] — Part 3 superseded in emphasis by this page; IA and design constraints still bind
- [[synthesis/payment-onboarding-automation-spec]] — the payment event that flips a prospect page into this portal
- [[wiki/lint-report]] — L9's CO1 findings get structurally retired by job 5

## Source trail

Founder voice notes 2026-07-03 (mock review: numbers/red/spacing; connection-first reframe; provider list; "compare to portals you can buy online"). Market scan via web, 2026-07-03: Assembly/Copilot module set and embed model, SuiteDash/Wayfront positioning ([copilot.app](https://www.copilot.app/), [assembly.com/client-portal](https://assembly.com/client-portal), [rock.so buying guide](https://www.rock.so/blog/client-portal-software), [gigradar comparison](https://gigradar.io/blog/client-portal-software)). Design root causes: direct read of `output/portal-mock/scoreboard.html` css. Provider list from the founder verbatim; Fanbasis capability still flagged unverified per [[synthesis/integrations-hub-spec]].

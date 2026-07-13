---
type: synthesis
tags: [funnel, scaling, offer]
sources: [[wiki/synthesis/portal-content-studio-spec]], [[wiki/synthesis/payment-onboarding-automation-spec]], [[wiki/playbooks/prospect-signed-onboarding]], [[wiki/synthesis/client-portal-product-spec]], [[wiki/synthesis/integrations-hub-spec]]
created: 2026-07-12
updated: 2026-07-12
---

# Dashboards audit + client portal strategy + onboarding automation (2026-07-12)

Full sweep requested by the founder: audit every surface (operator dashboard, client portal/dashboard, admin, the new studio+metrics), rate it honestly, find bugs, fix the skin and make it feel native, define how the portals serve clients going forward, and map automated onboarding end to end. This page is the audit and the plan; the fixes go to Codex once the one gating design decision is made.

## The four surfaces (what exists, honestly)

1. **Operator dashboard** — `pulsify-dashboard.pages.dev` (separate repo, origin/main). The SDR/CRM cockpit: leads, health, quota, revenue vision. Design identity: "Mirage" (sunset-on-glass). This is where the operator runs the business.
2. **Client dashboard** (NEW this sprint) — `pulsify-funnels.pages.dev/portal`, behind login. 8 sections + sequence studio + metrics. Design: inline-styled, blue (#6871f4) + Inter, dark-mode capable. Built by Codex P1-P3.
3. **Admin console** — `pulsify-funnels.pages.dev/admin`. Operator surface for provisioning clients, landing pages, integrations, and now dashboard logins + studio review. Design: its own `/admin/console.css`.
4. **Landing pages + old token portal** — the canonical landing standard (Frank build) and the legacy `/client?t=token` portal. Design: the approved landing skin.

## The honest rating

| Surface | Function | Design | Verdict |
|---|---|---|---|
| Operator dashboard | B+ (deep CRM, real tooling) | B (Mirage, established) | Works; not in this sweep's blast radius |
| Client dashboard | B+ (login, studio, metrics all live + verified) | B- (coherent but generic-modern, not branded) | Solid MVP, reads "SaaS template" not "Pulsify" |
| Admin console | B (does the job) | C+ (third separate look) | Functional, drifting |
| Login page | A- (clean split-screen, gradient) | B+ | The best-looking surface |

**The core finding: this is not a bug problem, it's a coherence problem.** The code is functionally sound and defensively written — the JS escapes all interpolated data (`esc()` helper, no XSS), the drop-off/weekly math is correct, the sequence-bar scaling is correct, it's responsive, dark mode works, and every P1-P3 flow was live-verified. What's wrong is that **four surfaces speak four visual dialects**, and the newest one (the client dashboard the client actually sees) is competent-generic rather than unmistakably Pulsify. A client logging in should feel the same brand they saw on the landing page and in the content — right now they'd feel like they logged into a different company's tool.

### Concrete issues found (real, small)
- **No shared design tokens.** Each surface redefines its own colors/type/radius inline. Any change drifts them further apart. This is the root cause of the coherence problem.
- **Accent color is a default.** `#6871f4` is a generic indigo, not a chosen Pulsify brand color. The operator dashboard's Mirage sunset palette and this blue don't agree.
- **Diagnostic badge** ("body failed before the ask") is a long string in a pill — can wrap awkwardly on narrow cards. Minor.
- **Brand treatment is a text wordmark** ("Pulsify client dashboard") — no logo/mark, no identity moment.
- **Empty states are honest but plain** — the dashboard's first impression on a real client (before data) is text on cards.
- No functional bugs of consequence surfaced in the sweep.

## The fix: one Pulsify design system, three surfaces on it

The right move is not "reskin each page" — it's **extract one shared design-token stylesheet** (`/shared/pulsify-ui.css`: color, type scale, spacing, radius, shadow, dark-mode) and put the client dashboard, login, and admin on it, matched to the operator dashboard's identity so the whole product reads as one brand. Then a per-surface polish pass (brand moment in the rail, refined empty states, the badge fix, motion). This is a scoped Codex build off a spec I write; it's low-risk because it's CSS-layer + token extraction, not logic.

**The one gating decision (founder's call):** which identity is Pulsify's? Options: (a) unify everything onto the operator dashboard's Mirage "sunset-on-glass" so operator + client feel like one product; (b) give the client-facing surfaces a distinct calmer premium identity (client tools often intentionally differ from internal CRMs) and only share the token *structure*; (c) a fresh brand direction. My recommendation: **(a) — one identity, Mirage-derived** — because a client who sees the same brand across landing page, content, and dashboard trusts a coherent operation, and it's the cheapest to maintain. This decision gates the reskin and nothing else; the onboarding work below proceeds regardless.

## How the client portal serves clients going forward (the vision)

The dashboard is the weekly proof-of-value surface — the thing that makes a client renew. Its jobs, in order of what earns renewals:

1. **Proof they're winning** (Revenue + Performance): real payments, follower growth, drop-off improving week over week, dollars-per-follower climbing. The client sees the system working in numbers, not vibes.
2. **The current game plan** (Plans + Momentum + To-dos): what phase they're in, what shipped, what they owe us and we owe them. Kills the "what am I paying for" churn driver.
3. **The content engine** (Studio): they generate sequences/carousels on demand, we review, they post. The dashboard becomes the place work happens, not just a report.
4. **The connection layer** (Automations + future integrations): their Kit/YouTube/IG/booking/payments connected, so the metrics are real and the funnel is visible.

Longer term this is the productized $10K system: a prescriptive Action Engine ("your hook is failing at slide 2, here's the fix"), multi-client operator rollups, and the dashboard as the artifact that justifies premium pricing — proof density on a screen, which is exactly the escape from the middle squeeze both creator corpora predicted.

## Automated onboarding — the full map (what's built, what's left)

Founder ask: automate onboarding completely from the moment money lands or a contract is signed. **Good news: ~60% is already built.** The remaining 40% is connection, now that the dashboard exists as a target.

**Already live** (integrations hub I1, on pulsify-funnels): payment webhooks (Stripe signed, others path-secret), the operator "Mark paid" button, the D1 `payments` + `integrations` tables, and Discord alerts on payment. The manual checklist ([[playbooks/prospect-signed-onboarding]]) and the automation spec ([[synthesis/payment-onboarding-automation-spec]]) both exist.

**The full automated flow (target state):**
```
payment lands (Stripe webhook) OR operator clicks "Mark paid"
      v   -> payments row (BUILT)
1. Auto-create the client's dashboard login (client_auth) + generate a set-password link   [NEW - wire to P1 auth]
2. Mint/confirm their portal token                                                          [BUILT in portal]
3. Send ONE onboarding email: welcome + set-password link + Google Form + CO1 doc           [needs email rail]
4. Flip client_config status -> "client" (pipeline auto-advance)                            [partial]
5. Seed the dashboard: plans/team/momentum from a template, first to-dos                     [NEW - small]
6. Discord alert to operator: "X paid, onboarding fired"                                     [BUILT]
      v
Google Form responses -> operator reads (v1) / Apps Script -> /event pipe (v2)
      v
operator runs the game-plan call within 72h; dashboard already populated
```

**What's genuinely left:**
- **The email rail** — the one hard blocker. Sending the onboarding email needs Resend (or Kit) + a verified domain, which is **parked until the first client** per founder ruling. Until then the flow fires everything else and hands the operator a ready-to-send draft (fail-soft, same as the rest of the pipe). So onboarding is "automated except the email is copy-paste" until the domain exists — which is fine, since there's no client yet.
- **Wire payment -> auto-create login** (connect the live payment event to the new P1 auth). Small Codex task.
- **The dashboard seed template** (default plans/team/momentum so a new client's dashboard isn't empty on first login). Small.
- **The rail decision** (Stripe vs SWIFT/crypto) — gates the webhook path; the Mark-paid button works regardless.

So: automated onboarding is a small, well-defined Codex build on top of live infrastructure, gated only on the email rail (parked, by design) and the rail decision. When the first client signs, one "Mark paid" click can create their login, seed their dashboard, alert the operator, and hand over the onboarding email — with the email going fully automatic the moment the domain lands.

## Recommended build order

1. **Now (no decision needed):** wire payment-event -> auto-create dashboard login + seed template + operator draft email. Ships automated onboarding minus the send.
2. **On the design decision:** the design-token unification + polish pass across client dashboard, login, admin (Codex, off my spec).
3. **On first client / domain:** flip the email rail on; onboarding goes fully hands-off.
4. **Later:** P4 sections, the prescriptive Action Engine, multi-client operator rollups.

## Open questions / gaps

- The one design decision above (identity direction).
- The payment-rail decision (long-standing, lint L4).
- Operator dashboard is a separate repo — unifying it fully is a larger, separate effort; v1 unification targets the three funnels-repo surfaces + token-matching to Mirage.
- "Save rate" still undefined (carries over).

## Source trail

- Live code read 2026-07-12 (`output/standard-preview/portal/`, `/admin`, login). Onboarding: [[playbooks/prospect-signed-onboarding]], [[synthesis/payment-onboarding-automation-spec]], integrations-hub-i1 memory. Portal vision: [[synthesis/client-portal-product-spec]], dashboard product vision memory.

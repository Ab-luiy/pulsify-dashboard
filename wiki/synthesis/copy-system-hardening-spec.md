---
type: synthesis
tags: [content, funnel, outreach, sales]
sources: [[wiki/lint-report]], full read of raw-sources/prompts/*, Lead Studio buildPrompt (pulsify-dashboard index.html @ 58d22ab), provision-prompt.js (funnels), [[frameworks/vsl-framework]], [[frameworks/webinar-framework]]
created: 2026-07-03
updated: 2026-07-03
---

# Copy system hardening (spec)

Founder ask, 2026-07-03: go through how Pulsify writes its copy — VSL, webinar, email sequences, everything — and hardwire it so there are no bugs or drift. This page is the audit result plus the fix design. Codex (gpt-5.5 high) implements; no code was changed in this pass.

## How copy actually gets written today (the inventory)

Four writing surfaces exist. Every asset type routes through exactly one of them:

| Asset | Where the writing instructions live | Framework it implements | Status |
|---|---|---|---|
| Client VSL (deliverable) | [[raw-sources/prompts/client-vsl-writer-prompt]] (manual paste) | 6-step Haynes, affluent/general split | Sound |
| Outreach VSL (personalized) | Lead Studio `buildPrompt()` "VSL" rule | one-line rule, no structure | B3 below |
| Pre-call email sequence | [[raw-sources/prompts/precall-email-sequence-prompt]] | hammer-them, 12-18 / 48-72h, quadrants | Sound |
| Application->booking emails | nowhere | — | B5 (lint L2) |
| Audience nurture sequence (5-email) | Lead Studio "Full email sequence" rule | pain -> false solutions -> mechanism -> proof -> offer | Sound |
| Onboarding welcome email | nowhere (spec'd in [[synthesis/payment-onboarding-automation-spec]]) | — | pending that build |
| Webinar script | nowhere — [[frameworks/webinar-framework]] has no writer prompt | — | B4 |
| Landing page (live JSON) | provision-prompt (3 copies: funnels server + funnels browser + dashboard bridge) | approved standard, headline + anti-invention rules | Sound but B6 |
| Landing page copy (text-only) | Lead Studio "landing page copy" rule | STALE pre-standard pattern | B1 |
| Outreach DM / opener | Lead Studio "Short opener" rule (+ vault outreach-asset-prompt DM mode) | recurring-theme + gap question | Sound |
| Single outreach email | Lead Studio "Email" rule | problem/possible/next-step | Sound |
| Ad scripts | Lead Studio "Ad scripts" rule | Haynes/Megalodon DR, 3 angles | Sound |
| Typeform application | Lead Studio "Typeform" rule | qualification arc | Sound (Niksetting patterns pending, parked) |
| Loom script | Lead Studio + vault outreach-asset-prompt | 10/60/20 structure | Sound |
| YouTube script | [[raw-sources/prompts/youtube-script-prompt]] | Content Engine subroutine | Sound |
| Titles + thumbnails | titles-thumbnails skill | 5 formulas, Ayman rules | Sound |
| Diagnosis doc / pre-call brief / weekly report | dedicated vault prompts | delivery SOP | Sound |

## The bugs (verified in code @ dashboard 58d22ab, 2026-07-03)

**B1 — two contradictory landing-page rule sets in the same dropdown.** Lead Studio's "Landing page copy" asset teaches the dead pre-standard pattern verbatim: "headline = the problem, subhead = cost of inaction, body = Pulsify as operator, social proof = Nick, CTA = book a call." Two menu entries below it, "Landing page (live page JSON)" carries the approved standard (mechanism/case-study headline, application CTA, anti-invention). An operator picking the first asset gets copy the standard explicitly rejects. This is lint L3's twin living in code — the vault prompt AND the dashboard both carry the stale pattern.

**B2 — three divergent voice guards.** The canonical 9-point guard ([[raw-sources/prompts/_voice-guard]]) is hand-copied into six vault prompts (currently in sync) but the two CODE surfaces each carry their own paraphrase: Lead Studio's HUMANIZER block (missing the copula-dodge check, different banned-word list: "game-changer/unlock/elevate" vs canon's "delve/leverage/utilize"), and the provisioning COPY_RULES (its own third wording). Three sets of rules claiming to be the same standard, no mechanism to notice when they drift further.

**B3 — the outreach VSL rule has no structure.** One line ("open with pain, introduce Pulse System after, one CTA") where every other serious asset carries a full scaffold. It should carry the compressed 6-step arc (hook -> problem -> mechanism -> proof -> offer -> one CTA) with the anti-invention and voice-guard blocks, same as its vault sibling.

**B4 — no webinar writer exists.** [[frameworks/webinar-framework]] documents the architecture (live vs evergreen, cold-traffic focus, CPL targets) but nothing can write one. Low urgency (webinar is a with-budget-only play per the pillars) but the founder named it explicitly; the chain should exist.

**B5 — the application->booking window has no copy** (lint L2, restated here because it belongs to this system): the only email trigger the live pipe HAS fires on application, and no sequence exists for "applied but hasn't booked." 3-5 emails, job = book the call. This precedes the hammer-them sequence chronologically.

**B6 — the provisioning prompt is hand-synced across three copies in two repos**, protected only by a header comment. The header itself admits it: "deliberate duplicate kept in sync by hand."

## The hardwire design (Codex, gpt-5.5 high)

1. **One canon.** `raw-sources/prompts/_voice-guard.md` is the single source of the voice guard. Both code surfaces embed its 9 points verbatim inside clearly-marked blocks (`/* VOICE-GUARD-CANON v… */`). The Lead Studio HUMANIZER paraphrase and the COPY_RULES banned-tells paraphrase get replaced by the canon text (keep each surface's extra domain rules — they're additive, not conflicting).
2. **Drift detection, not discipline.** A small checker script in each repo (`tools/lint_copy_rules.py` pattern) extracts every marked canon block plus the three provisioning-prompt copies and diffs them: canon-vs-code and copy-vs-copy. Wire it into the existing GitHub workflows so drift fails the build. This is the actual "hardwiring" — sync stops depending on memory.
3. **Kill B1**: replace the "landing page copy" asset rule with the standard's copy rules (same source as the provisioning prompt), or fold it into the live-page asset with a "copy only" output mode. Either way, one landing-page doctrine in the product. Same fix applied to the vault's outreach-asset-prompt landing section (lint L3) in the same claim.
4. **Fix B3**: give the outreach VSL rule the compressed 6-step scaffold.
5. **Write the two missing prompts** (Codex drafts from the framework pages, Claude reviews the copy per gate 3): `webinar-script-prompt.md` (from [[frameworks/webinar-framework]], same template as the VSL writer: inputs block, structure, rules, voice guard) and `application-to-booking-sequence-prompt.md` (3-5 emails, job = book the call, quadrant-lite inputs, hammer-them hands off after booking).
6. **Fold in the Part 5 upgrades** from [[synthesis/client-acquisition-renovation-2026-07-03]] (evidence-cited generation, approved/rejected example bank, machine-checkable self-check) — same files, same claim, one pass instead of two.

## Acceptance

- Canon blocks byte-identical across all surfaces; checker green in CI on both repos; deliberately corrupting one copy makes it red.
- "Landing page copy" asset output follows the standard (spot-generate one and check the headline against the headline rule).
- Outreach VSL output shows the 6-step structure.
- Both new prompts exist, follow the house prompt template, and pass the voice guard themselves.
- No behavior change to any sound asset type (openers, sequences, ad scripts untouched except the canon-block swap).

## Sequencing

After the client portal build (founder's stated priority one). This spec is one claim, one session, mostly mechanical. Model directive from the founder, 2026-07-03: implementation coding runs on Codex gpt-5.5 HIGH.

## Connections

- [[wiki/lint-report]] — L2/L3 are absorbed by this spec's items 3 and 5
- [[synthesis/client-acquisition-renovation-2026-07-03]] — Part 5 folds in here (item 6)
- [[synthesis/landing-page-standard]] — the doctrine B1 violates
- [[frameworks/vsl-framework]], [[frameworks/webinar-framework]] — the frameworks the writers implement

## Source trail

Direct reads 2026-07-03: all raw-sources/prompts/* files, Lead Studio `buildPrompt()` + asset dropdown + HUMANIZER block and the bridge COPY_RULES copy (pulsify-dashboard index.html @ 58d22ab, lines ~9599-9656), funnels `functions/_shared/provision-prompt.js` header + rules, [[frameworks/vsl-framework]], [[frameworks/webinar-framework]] (via its wiki page), [[playbooks/pulsify-delivery-sop]].

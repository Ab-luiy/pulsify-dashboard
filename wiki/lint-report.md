---
type: synthesis
tags: [content, offer, funnel, outreach, sales]
sources: full read of the VSL chain (frameworks, prompts, playbooks), live pulsify-funnels + pulsify-dashboard surfaces, wiki/index.md
created: 2026-07-03
updated: 2026-07-03
---

# Business-layer audit (Fable pass, 2026-07-03)

User-requested full scan of everything Pulsify runs on: the Jeremy Haynes VSL chain end to end (getting the information, writing the VSL, building the page, writing the emails), service delivery, live copy, titles, and whatever else surfaced. Verdicts first, findings after. Sister doc: [[synthesis/payment-onboarding-automation-spec]] (the new build this audit feeds).

## Verdicts

- **The VSL chain is sound.** Extraction prompt -> VSL writer (faithful to the 6-step Haynes structure, affluent/general split, verified-proof-only rule) -> landing page (approved standard + provisioning prompt with the headline and anti-invention rules baked in) -> pre-call email prompt (hammer-them, 12-18 over 48-72h, quadrant-sourced). The pieces agree with each other and with the source framework. Findings below are drift at the edges, not rot in the core.
- **Live copy is good.** Frank's live page passes every rule it's governed by: case-study-led H1 sourced to a real transcript, honest subhead, single apply CTA, no AI tells, no invented facts.
- **Titles are the real problem — not quality, doctrine.** The vault holds three partially contradictory answers to "what does Pulsify's own channel publish," and the latest live video sits in the crossfire. This is the one finding that needs a founder decision (L1).

## Findings

### L1 — content doctrine contradiction (high, needs founder decision)

Three sources disagree on Pulsify's own channel:
1. `CLAUDE.md` three categories: coaching-concept breakdowns, arbitrary case studies via miro/gamma demos, coaching-belief breakdowns — meta-layer content aimed at coaches.
2. [[content-engine/pulsify-content-niche-batches-2026-06]] + the 2026-06-16 feedback memory: content is the **craft itself** (setups, products, ads), never the meta-layer, never operator/B2B language.
3. The live channel: latest video `if i had 7 days to make $50k as a coach I'd do this.` — meta-layer, coach-identity framing.

The sharp edge: the accepted ICP reframe (2026-06-16, the same one that just rewrote the scrape queries) says prospects are **craft-doers who do not identify as coaches** — "coach" language surfaces the gurus nobody wants. The live title has the same disease the old queries had: `as a coach` filters for coach-identity viewers instead of the trader/dropshipper with an audience who could sell a mentorship but doesn't call themselves a coach.

Recommendation (mirrors the query fix, needs sign-off since it's positioning): Pulsify's own titles speak to craft-doers about monetizing the craft — "turn your trading skill into $50k" energy, never "as a coach," never "growth operating." Categories 1-3 from CLAUDE.md survive as formats (breakdowns, case studies, belief-breakers); the vocabulary changes. Once decided, reconcile all three sources into one page (who the channel is for, what it publishes, banned vocabulary) and update CLAUDE.md's three-category list to match.

### L2 — the application-to-booking email gap (medium)

Jeremy's hammer-them sequence is post-BOOKING (6/day between booking and call). The live funnels pipe triggers Kit on APPLICATION. Cal.com isn't wired yet (known, deliberate). Consequence: the sequence the pipe can actually trigger today has a different job — get an applicant to book — and no prompt, spec, or copy exists for it anywhere. [[raw-sources/prompts/precall-email-sequence-prompt]] explicitly covers only the post-booking window. Fix: write the application->booking sequence spec (short, 3-5 emails, job = book the call); the hammer-them sequence slots in later when booking data exists.

### L3 — outreach-asset-prompt landing-page section is stale (medium)

[[raw-sources/prompts/outreach-asset-prompt]] (2026-05-24) predates the approved landing-page standard (2026-06-30) and contradicts it: "book a call" CTA (standard: application form), "subhead frames the cost of inaction" (standard: headline rule — mechanism or case-study led), no proof-wall / real-screenshots-only rule. Anyone using that prompt's landing-page mode today produces off-standard copy. Fix: replace that section with a pointer to the standard's copy rules + the provisioning prompt.

### L4 — payment rails are documented in three conflicting ways (medium, blocks the onboarding automation)

[[playbooks/pulsify-delivery-sop]] pre-engagement says "Crypto into Binance Turkey or SWIFT"; the same page's tools table says "Stripe / payment processor"; the contract template says Turkey payment rails. No single decided payment path exists. This directly blocks the payment-triggered onboarding the founder asked for (a webhook can only fire from a rail that has webhooks). Decision needed — see the spec's rail options.

### L5 — stale pointers in the delivery SOP (low, quick fix)

[[playbooks/pulsify-delivery-sop]] Open questions still claim `brand-brain-intake.md` and `pulse-system-stack.md` are "not yet written" — both have existed since 2026-06-09. Week 1 also references brand-brain-intake as "future page (pending)". Update the three pointers.

### L6 — index rot in content-engine (low, quick fix)

`wiki/index.md` links [[content-engine/pulsify-content-batch-2026-05]] — the file was renamed to `pulsify-content-batch-b2b.md` (link is dead) and is PARKED with a positioning warning the index summary doesn't mention. The replacement page [[content-engine/pulsify-content-niche-batches-2026-06]] (2026-06-15) is missing from the index entirely.

### L7 — vsl-framework page doesn't point at the operative page structure (low)

[[frameworks/vsl-framework]]'s landing-page section describes Jeremy's structure (bullets, FAQ, Calendly). Pulsify's operative structure is the merged Mason+Grant standard — deliberately different (no bullets above fold, proof wall, embedded form). The divergence is decided and documented in [[synthesis/landing-page-standard]], but the framework page doesn't say so; a reader landing there first builds the wrong page. Add one pointer line.

### L8 — aging known gaps, restated so they don't rot silently (low)

- CAPI technical SOP: flagged missing on [[frameworks/vsl-framework]] since 2026-05-02; matters only when paid ads start. Keep parked, keep tracked.
- Off-boarding template emails + final-call agenda (delivery SOP open question since May): still missing.
- The buyer-psychology onboarding questionnaire is incomplete — Q1, Q3 (and possibly more) were never supplied. The onboarding automation needs the full form; founder to post the rest.
- Kit email accounts still don't exist (standing blocker) — every email finding above lands in Kit when it does.

### L9 — the CO1 onboarding packet (medium, founder supplied it 2026-07-03 after the first pass)

Reviewed the live 30-question onboarding Google Form and the CO1 Full Onboarding Doc. Findings:
1. **Empty placeholders throughout CO1**: the Phase 1 expectations video, every "watch the video below" step (Zapier, Typeform, Calendly, Fanbasis), the contract explanation, and the Phase 2 Drive/Stripe survey link are blank. A client working through it today hits dead ends.
2. **Zapier step contradicts the architecture decision** (2026-07-01: core runtime is direct Cloudflare/D1/Kit, no Zapier required). Demote to optional / client-specific tools only.
3. **Calendly vs Cal.com**: CO1 says Calendly, [[playbooks/pulsify-delivery-sop]] says Cal.com. Pick one, reconcile both docs.
4. **Missing integration steps**: Wistia (VSL hosting — core to the Funnel Stack), YouTube Studio access, IG access via Meta Business Suite (all three are in the delivery SOP's credentials list), Kit API key handover for the funnels pipe, and a "you'll receive your private portal link" expectation step (CO1 predates the portal entirely).
5. **Security**: form Q28 invites pasting raw login details into a Google Form (responses sit in a plaintext Sheet). Every tool in the stack supports delegated access (Meta partner access, YouTube channel permissions, Kit team, Typeform partner, Calendly team — CO1 already does this for two of them). Rule: never collect raw passwords; replace Q28 with per-tool delegated-access instructions.
6. **The buyer-psychology questions are missing from the form** (revises L8): the 30 questions are logistics intake; the win-reason set (believed-us / almost-stopped / buy-earlier / which-video-converted) should be a final form section — it is the attribution + content-intelligence payload.

## What was checked and passed

- Prompt-suite consistency: all five delivery prompts carry the identical 9-point voice guard and no-invention hard rules; the provisioning prompt (browser + server twins) carries the headline rule, anti-invention rule, and banned-tells list. No drift between the twins found at header level.
- Hammer-them numbers consistent everywhere they appear (6/day, 48-72h, 12-18 emails, 50-80% opens, 60-70% shows).
- The prospect-signed-onboarding checklist agrees with the funnels pipe as deployed (fields optional at outreach, upgrade = fill settings + mint token).
- Frank's live copy against the standard and the voice rules: pass (checked live, 2026-07-03).
- Titles hard-format rules on the latest video: lowercase, measurable, no question mark, under 60 chars — pass on format; L1 is about targeting, not format.

## Connections

- [[synthesis/payment-onboarding-automation-spec]] — the build this audit unblocks (L4 is its gating decision)
- [[synthesis/client-acquisition-renovation-2026-07-03]] — Part 5 already owns the prompt-upgrade queue; L2/L3 fold into it
- [[synthesis/landing-page-standard]] — the operative copy law referenced throughout
- [[synthesis/sdr-pipeline-audit-2026-07-03]] — the ICP/query reframe that L1 extends to titles

## Source trail

Full reads this pass: [[frameworks/vsl-framework]], [[raw-sources/prompts/client-vsl-writer-prompt]], [[raw-sources/prompts/precall-email-sequence-prompt]], [[raw-sources/prompts/outreach-asset-prompt]], [[playbooks/pulsify-delivery-sop]], [[playbooks/prospect-signed-onboarding]], [[content-engine/packaging-rules]], [[content-engine/pulsify-content-batch-b2b]], [[content-engine/pulsify-content-niche-batches-2026-06]], provision-prompt.js (server twin, header + rules), live Frank page (curl, 2026-07-03), live channel data (dashboard-data-v2.json: latest video title/stats), onboarding-form memory note.

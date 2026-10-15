---
type: synthesis
tags: [content, offer, funnel, product, pricing, delivery]
sources: [[playbooks/pulsify-offer-v1]], [[playbooks/pulsify-delivery-sop]], [[synthesis/mvp-plan-2026-10-02]], [[synthesis/sales-copilot-plan-2026-10-04]], [[playbooks/story-sequence-client-flow]], [[playbooks/engineering-standard]]
created: 2026-10-12
updated: 2026-10-12
---

# Managed growth launch: PRD, acceptance evidence and pricing

Founder confirmed on October 12: sell the full managed growth service with the portal. The product is the delivered engagement. This document consolidates scattered requirements into a launch contract and records fresh checks. The pricing recommendation and quantified delivery package below are proposals, not approved changes to offer v1. Ticket: https://github.com/Ab-luiy/pulsify-saas/issues/60.

## Founder decisions, October 15 (these replace the proposals below where they differ)

- **Price: $5,000 base + 30% performance fee** for the 90-day engagement. The $10k + 25% recommendation below is not adopted.
- **What we deliver:** making content creation easy and tracking the people it brings in. Volume follows the client's plan. Typical: 1-2 YouTube videos a week, story sequences twice a week, 1-2 carousels a month only when something major happens, and 2-5 Instagram reels a day (still to be confirmed against the September 26 "no reels" note).
- **Guarantee:** tied to app output. No refunds, disputes or chargebacks, because the work is delivered. The exact wording is still to be written.
- **Contract:** DocuSign.
- **Onboarding is the most important part of the app.** The new spec is [[synthesis/onboarding-v2-spec-2026-10-15]], to be reviewed with the founder before it goes live.
- **Connect cards:** every card that needs a platform shows a blurred sample with a "Connect your [platform]" button (pulsify-saas #63). The watch time chart is too zoomed in (#64).
- **AI:** the app's AI should answer from Pulsify's know-how plus the client's answers, and improve with each client. Run on a cheap model (GLM and others to be tested); no Opus API cost.

Follow-up answers, same day:

- **Reels:** the 2-5 a day cadence stays, but we don't script them. Reels are where the creator is raw and natural. We plan the cadence, they make them.
- **What the 30% covers:** everything after they join, from content to funnel to closing. Revenue they already make from content before joining is not touched, unless we rebuild that stream; then it counts too. This means we must **record their starting monthly revenue at signing** (onboarding asks it, and the contract states it).
- **Guarantee (proposed, founder leaning yes):** if we don't deliver the agreed work for the 90 days, we keep working at no extra cost until we do. No refunds. His view: the app itself will win them over.
- **Also part of delivery (done by us, app support later):** building the client's program. Curriculum for their paid students, how to run 1-1 mentorship, teaching assets and docs, a student sheet (who paid, who didn't, call calendar), and Whop setup if they host there.
- **Setter and closer:** we find them one when the time calls for it.
- **Paid ads:** later, or early if they want to scale fast. Organic first.
- **Main selling point:** the whole system keeps selling through organic content and traffic.

Still open: whether refunded sales come off before the 30% (recommended: yes), and the exact guarantee wording for DocuSign.

## Why this matters for Pulsify

Content creates demand, the offer defines what we owe, and the funnel turns demand into measured conversations and collections. The portal supports all three. We must price the operator and production work as well as the software, and verify real saves and approvals rather than treating a screen or a deployment record as evidence of the whole service.

## Core mechanics

### Product requirement and ownership

Buyer: a creator with expertise, a viable mentorship offer or a separately scoped offer-creation engagement, and willingness to record and take sales calls. Prior service results establish relevant experience; they do not establish retention or revenue improvement from today's app.

Paid outcome: Pulsify installs and operates an agreed content-to-enquiry-to-sale workflow, reviews the work, and reports what happened. Customer records expertise/content, supplies accurate proof and account access, approves material, attends reviews, and fulfils their own mentorship. Pulsify owns research, planning, drafting, packaging, production coordination, funnel setup, sales support and measurement within an agreed scope.

Software may assist or automate a task. A named operator owns any manual step. Client self-service is optional assistance within this managed service. The client must not discover after payment that finishing the promised work depends on them learning APIs or running our prompts.

### Proposed package to cost and quote

One creator brand, one core offer, one primary YouTube channel and one Instagram profile; 90-day initial engagement. Proposed capacity envelope for a concrete quote:

- Brand intake, baseline capture, diagnosis and a prioritised execution plan.
- Up to 12 long-form video packages over the engagement: research, script/outline, title, thumbnail and agreed editing/production coordination. Client records. Establish the actual editor quote before promising finished edits inside the base.
- Up to two managed story sequences a week. The client can publish additional simple stories using the portal. Designed launches count separately against the agreed production workload, rather than implying unlimited bespoke art.
- One conversion path: profile funnel first; a landing page/VSL/application/booking path where the diagnosis warrants it. One initial pre-call email sequence, with its exact count stated before signing.
- One weekly review, an agreed weekly report, booked-call preparation and reviewed follow-up drafts. Client or existing sales team handles calls and message sending.
- Portal access and support throughout the engagement. Up to two consolidated revision rounds per deliverable as a proposed scope control; errors against the agreed brief are corrected without consuming a revision allowance.

These volumes are a planning proposal, not measured capacity or a change to existing contracts. They must be compared with the founder's desired cadence before use. Existing story guidance can recommend five to seven sequences a week; two managed sequences does not silently redefine that strategy. The remaining cadence needs an explicit client/operator owner and budget.

Excluded from this quote unless separately scoped: ad spend and ad management, recruiting a sales team, running the client's mentorship, filming, unlimited revision/design work, building a course platform, automatic comment/DM handling, or a revenue guarantee. A one-off build fee must not imply permanent hosted software/support ownership after termination; define exports and continued access explicitly.

### Launch acceptance matrix

Status means evidence, not confidence. Live = exercised on production in the existing Example workspace. Automated = repository tests, with external providers mocked where applicable. Manual = a service owner is required. Unverified = do not sell as automatic.

| Requirement | Acceptance condition | Current evidence / disposition |
|---|---|---|
| Paid start | Terms signed, base collected, named operator records payment | Manual by founder decision; no new payment transaction was performed |
| Provisioning | Workspace, login setup, seeded steps and welcome dispatch | Live D1 has two provisioning records marked sent: mvp-test-client (Oct 2), nicholas (Oct 10). Provider acceptance recorded; inbox receipt and payment not inferred |
| Client login | Existing credentials issue a session and permit own data reads | Live demo login 200; test session logged out afterward |
| Access separation | Anonymous request denied; a changed client ID cannot select another workspace | Live anonymous 401 and mismatched client 403; broader cross-tenant tests automated |
| Onboarding / Brand Brain | Saved answers supply the correct client's context | Live brain read and YouTube onboarding hints observed; onboarding writes covered in automated suite, not overwritten live |
| YouTube ideas | Brief reaches working generated output or a usable manual handoff | Live manual prompt returned. Demo AI mode is manual/source none |
| Title and thumbnail | Chosen idea and proof produce a usable package | Live manual prompt returned; actual model output/creative quality not validated in this run |
| Video build | Opening and structured outline can be saved and retrieved | Live manual prompt; synthetic video project saved/reread successfully. This is a planning workflow, not an automatic finished-video editor |
| Concurrent saves | An old edit cannot silently overwrite a newer record | Live stale timestamp returned 409 |
| Review gate | Client submits; only operator approves; client sees the decision | Entire API path passed live. Client self-approval returned 401. Synthetic record/review/content removed after verification |
| Copywriter | Manual prompt, paste-back and saved reply survive reread | Live create/paste/read/delete passed; no paid AI call made |
| Stories | Draft created, edited, persisted and can be designed/exported | Live API draft/save/reread/delete passed. PNG/ZIP generation and 1080x1920 dimensions covered by production-export browser tests |
| Source privacy | Client handoffs omit internal named-source material | Fixed and released October 12, Pages 65508234. Three YouTube handoffs and story handoff pass explicit live source-name/private-path checks. Raw bundles preserved; 5 regressions pass. Previously persisted prompts are not rewritten |
| Full AI writing | Real selected provider returns a good result from actual permitted client context | Not verified. Demo has no key. Resolve operationally with the operator's writing workflow or a deliberately configured client provider; do not describe the demo as autonomous AI |
| Funnel | One real client's page, form, booking and pre-call path work together | Existing implementation/tests; fresh external event-to-client chain not exercised here. Per-client commissioning required |
| Sales support | Brief, recorded context and follow-up drafts support a booked call | Implemented and automated tests; no fresh client calendar/recording provider event triggered |
| Attribution | Known tagged enquiry/booking/payment is attributed with refund handling | Existing implementation/tests; no fresh financial event generated. Manual reconciliation remains required before reporting business results |
| Social integrations | Client's own accounts connect and data belongs to that workspace | Read endpoint works; customer OAuth/data import not proven by demo. #15 remains the commissioning dependency |
| Reports | Weekly output corresponds to real client inputs | Operator must verify completeness and label missing data. Demo cash is sample data |
| Publication | Approved output is published by the agreed owner | Manual for launch unless the exact publishing integration is commissioned and verified |
| Reliability | Restore, error handling, external failures and support ownership are understood | Backend tests pass; no production restore or load test performed. Cannot claim unlimited scale or a recovery SLA |
| Renewal / exit | Continuing service fee, access and exported assets are clear | Commercial decision still needed; old SOP contains inconsistent continuation and ownership wording |

### Verification record

Frontend main 9afb032: lint, TypeScript and production build passed. The full static browser run finished with **755 passed, 509 skipped and one failed**. The failure was the call-note edit payload retaining its original title. The complete delivery test file then passed 15/15, and the specific failing test passed three additional repeats. The cause is not established; this is an intermittent failure to track, not a completely green full-suite run. No frontend source was changed. Skipped tests do not count as verified coverage.

Backend: 233 tests passed before the patch; **238/238 passed after it**, including five new reference-handling regressions. The Functions bundle compiled. Production demo checks passed 25 functional assertions, while all three YouTube handoffs separately exposed internal source names. Functional pass flags do not override that privacy failure. Synthetic chat/story data was deleted and the review/project/content cleanup was verified at zero remaining rows. Existing client content was not edited.

These checks establish workflow mechanics. They do not establish quality of AI-generated content, complete provider integrations, sales results, actual delivery cost or willingness to pay. Evidence and reproduction notes are in output/mvp-readiness-2026-10-12/README.md.

Release follow-up, October 12: Pages preview b5666d69 and production 65508234 deployed from pushed Brain main snapshot 1398fb06, leaving active Instagram worker development outside the release. The completed lead-people fix e8abc756 also ships in Pages. Frontend export stays at 9afb032. Both preview and production passed 24 checks, including four explicit prompt privacy assertions and synthetic copy/story persistence and cleanup. The original 25-check audit included a separate video review loop; this release rerun did not repeat that optional mutation. Evidence: preview-check.json, production-after-fix.json, production-deploy.txt and deployments-after.json. Backend release rerun: 238/238 pass.

### Ship decision

The core portal supports a managed pilot: real persistence and the video approval loop work, and the reference fix is now live and verified. An unconditional claim that the entire managed service is ready would go beyond the evidence. Before first client handoff: agree the bounded scope, attribution/settlement and guarantee terms; commission that client's actual funnel/accounts; verify the first real deliverable is good enough to publish. No new feature suite is required to answer these questions.

The new TypeScript/one-repo work (#57/#58) is staged separately. This audit does not cut it over or make it a prerequisite for validating the current production path. The five helper changes and new backend test must be carried into its deploy copy before cutover.

### Pricing recommendation

Propose **$10,000 base + 25% of contract-defined attributable cash collected for the initial 90-day managed engagement**, with portal access included. This combination already exists in offer v1. Making it the default instead of the $5,000 + 30% opener is a new recommendation awaiting the founder's decision. No separate monthly SaaS fee proposed for this package.

Preserve approved PIF or 50/50 payment terms for discussion: $5,000 at start and $5,000 at the defined funnel delivery milestone. PIF funds delivery sooner. A $10,000 contract on split terms is not $10,000 cash available on day one. Do not pay production expenses on the assumption that projected performance fees have already been collected.

The $5,000 + 30% structure remains the documented floor, not an automatic discount for the same open-ended workload. Use it only when a scoped cost budget and the client's economics support it. The old negotiation tree's $7,500 + 30% branch is not cheaper than its $5,000 + 30% opening; it needs clarification before being used as a concession.

Current offer v1 attribution covers post-integration collections broadly, excluding specified pre-existing events. It does NOT mean only incremental lift. The proposal does not silently change that definition. State covered offers, excluded leads, refunds, chargebacks, installment collections, processor fees and settlement timing before quoting. Clarify whether sales-team commissions sit inside or outside Pulsify's share for this specific deal.

### Economic sensitivity, not measured delivery costs

The model uses $50 per operator hour as an internal planning input, 13 weeks, and hypothetical production/tools allowances. These are not wage benchmarks or vendor quotes. They exclude acquisition, taxes, fixed overhead, refunds and any unlimited continuation. Replace them with actual time logs and quotes before relying on the margin.

| Scenario | Setup + weekly hours | Total hours | Production + tools | 90-day delivery cost | Base-only margin at $5k | Base-only margin at $10k |
|---|---|---:|---:|---:|---:|---:|
| Lean | 20 + 3/week | 59 | $600 + $300 | $3,850 | 23% | 61.5% |
| Working estimate | 25 + 5/week | 90 | $1,200 + $450 | $6,150 | -23% | 38.5% |
| Heavy | 40 + 8/week | 144 | $2,400 + $600 | $10,200 | -104% | -2% |

This is the rationale for the higher base. In the working scenario the lower base fails to cover delivery before performance income. Even $10,000 fails under the heavy scenario. Price does not fix unbounded scope.

| Attributable collections over the engagement (illustrative) | Fee at $5k + 30% | Fee at $10k + 25% |
|---:|---:|---:|
| $0 | $5,000 | $10,000 |
| $30,000 | $14,000 | $17,500 |
| $60,000 | $23,000 | $25,000 |
| $100,000 | $35,000 | $35,000 |

The options cross at $100,000 attributable collections. Below that, $10k + 25% costs the client more in total. Present this honestly; a lower percentage is not automatically a cheaper deal. In the working cost case, a proposed 50% delivery-margin target requires about $24,333 collections on $5k + 30%, or $9,200 on $10k + 25%. The target is a planning choice, not a market standard.

Client value check: incremental contribution from added sales + verified avoided costs - the entire Pulsify fee - additional execution costs. Existing baseline revenue counted for the fee is not incremental customer benefit. Example: 20 additional $3k collections at 70% contribution yield $42k before our fee. If the applicable fee were $25k, $17k remains before other new costs. These are hypothetical inputs, not a result promise.

Vendor prices are a small subset of delivery cost. Cloudflare lists a $5/month minimum for Workers Paid, with usage charges beyond included allowances. Zernio lists two free accounts and $6/account for accounts 3-10. These are current published prices, not proof of our actual invoice or total per-client bill. AI/provider, video editing, email/video hosting and additional integration costs must be assigned explicitly. Do not sign up for paid services in advance of the founder's existing payment gate.

## How Pulsify uses this

For the first managed engagement, attach the agreed scope and acceptance checklist to the delivery plan. Log setup hours and weekly delivery by task, production invoices, direct platform usage, fees collected and attributable client collections. Record one baseline before making changes. Each weekly review ends with approved work, a named publishing owner, observed results and the next action.

Use real client usage to revise the product. Prioritise failures that prevent a paid deliverable or accurate reporting. Do not use this audit to promise a new feature backlog, automatic posting, unlimited AI or guaranteed revenue.

## Connections

- [[playbooks/pulsify-offer-v1]] — approved historical economics; current proposal changes the default recommendation only.
- [[playbooks/pulsify-delivery-sop]] — operator-owned work that must be costed; outdated Slack/Notion and continuation language require explicit reconciliation.
- [[synthesis/mvp-plan-2026-10-02]] — earlier scope and manual payment decision.
- [[synthesis/mvp-qa-2026-10-03]] — earlier read-only verification; this audit adds live writes and review approval.
- [[synthesis/sales-copilot-plan-2026-10-04]] — working sales support, without claimed conversion lift.
- [[playbooks/story-sequence-client-flow]] — story production and export scope.
- [[synthesis/offer-v2-risk-reversal]] — unresolved guarantee proposals; no clause adopted by this audit.
- [[playbooks/engineering-standard]] — migration and implementation rules.

## Open questions / gaps

1. Founder decision on proposed $10k + 25% default and precise delivery volume. Full managed growth + portal is confirmed; the new default price is not.
2. Bounded guarantee/remedy, fee attribution, commissions, continuation and hosted-access terms remain to be settled. The unbounded historical $100k continuation prevents a defensible cost ceiling.
3. Real delivery time and editor quotes. The model is sensitivity analysis until these exist.
4. Quality acceptance for the first real client's complete output and commissioning of their external accounts. A working manual handoff is not proof of generated copy quality.
5. Reference sanitisation patch is live and verified. Previously saved prompts can retain old material; regenerate/replace them before sharing with clients. The patch does not alter client-supplied facts or rewrite historical records.

## Source trail

- Founder request and scope selection in this chat, October 12, 2026.
- The linked shared offer, delivery and product specifications; raw origins remain linked from those pages. No raw source edited or imported in this task.
- Current frontend main 9afb032; Brain production-source prompt helpers, authentication, workspace-records, content-reviews and AI-provider code inspected locally.
- Fresh evidence: output/mvp-readiness-2026-10-12/live-check.json, backend-tests.txt, backend-after-fix.txt, frontend-check.txt, delivery-rerun.txt, delivery-repeat.txt, functions-build.txt, provisioning-evidence.json and cleanup-verified.json. Tests use synthetic demo data; no external message or payment was sent by this audit.
- Reproducible live checks: tools/mvp-readiness/live-check.mjs. Optional MVP_REVIEW_TEST=1 creates a synthetic review with exact cleanup SQL; run cleanup statements individually through D1 and verify zero rows afterward. Credentials are read from gitignored .env and never logged.
- Reproducible hypothetical economics: tools/mvp-readiness/pricing.mjs and output/mvp-readiness-2026-10-12/pricing-model.json.
- Vendor checks, October 12: https://developers.cloudflare.com/workers/platform/pricing/ and https://zernio.com/pricing. External price facts are used only for this founder-requested readiness/pricing analysis.

---
type: playbook
tags: [contract, offer, legal, template]
sources: [[wiki/playbooks/pulsify-offer-v1]], [[clients/tb-tradez/contract-draft]], [[raw-sources/contracts/fitfo-service-agreement]]
created: 2026-05-15
updated: 2026-10-26
---

# Pulsify contract

The service agreement a client signs. **The app generates it.** You open the contract popup on a booked lead in the pipeline, fill in the name, email, setup fee, revenue share and starting monthly revenue, then Save and Send Contract. DocuSign sends it (pulsify-saas #80).

**Source of truth:** `output/standard-preview/functions/_shared/contract-text.js`. Tests: `output/standard-preview/tests/contracts.test.mjs`. The text below mirrors that file as of 2026-10-26. Change the file first, then this page.

> **Rewritten 2026-10-26.** The May template (Pulsifymedia LTD, a $100k-in-90-days guarantee, a 90-day term, weekly settlement, mandatory CRM integration) is retired. The live contract is built on the FITFO and TB Tradez agreement structure instead. See [[playbooks/pulsify-offer-v1]] for what changed and why.

## Why this matters for Pulsify

The client signs what the app sends. If the vault describes a different contract, the next session or sales call promises terms nobody will sign.

## What the client fills in vs what is fixed

| Filled in per deal (popup) | Fixed in the text |
|---|---|
| First name, last name, email | The services, both sides' duties |
| Setup fee (default $5,000; $0 prints "No upfront fee is payable") | Sales-team split out of our share (10% closer, 5% setter, the rest ours) |
| Revenue share % (default 30) | Guarantee wording, word for word |
| Starting monthly revenue | No end date, 30-day tail, no refunds, confidentiality |
| Optional additional terms (printed as their own section) | |

## The text

```markdown
# Pulsify service agreement

This Service Agreement (the "Agreement") is made on {{DATE}} between Pulsify (the "Operator") and {{CLIENT_NAME}}, {{CLIENT_EMAIL}} (the "Client"). Together they are the "Parties".

## I. The services

The Operator provides growth operations and content systems for the Client's creator business. This covers offer development and positioning, packaging and structuring the Client's YouTube content, optimizing the Client's Instagram profile with story sequences and carousels, a client portal for content tracking and planning, payment-processor setup, funnel development, and weekly reporting.

It also covers building the Client's paid program (the curriculum, how the Client runs one-to-one calls, teaching material, tracking who has paid, and setting up the platform it is hosted on); recruiting, training and managing setters and closers when the offer is ready to scale; and planning and managing paid advertising as a later phase of the engagement, or earlier if the Client wants to scale faster.

The Client records and publishes all videos. Deliverables may be adjusted for unforeseen circumstances or changes in the Client's needs.

The Client keeps up the agreed content cadence, answers requests in good time, stays available for scheduled calls, provides account access when it is needed for setup and tracking, and delivers the program to the Client's own students.

## II. Fees

Setup fee: {{SETUP_FEE}} (USD), due when this Agreement is signed.   [or: No upfront fee is payable.]

Revenue share: the Operator receives {{FEE}}% of all revenue collected by the Client from the offer(s) developed under this Agreement, and the Client keeps the rest. The Operator's share is due within five (5) business days after the revenue is received by the Client. "Revenue" means cash actually collected by the Client, net of refunds and chargebacks.

Sales team: where setters and closers are engaged, the Operator's {{FEE}}% share pays for them: ten percent (10%) to the closer, five percent (5%) to the setter, and {{FEE minus 15}}% kept by the Operator. The Client pays nothing extra for the sales team. Until a sales team is engaged, the Operator performs these functions and keeps the full {{FEE}}%.
   [If the share is under 15%: where setters and closers are engaged, how they are paid is agreed in writing before they start.]

Starting monthly revenue: the Parties record the Client's monthly revenue at the start of this Agreement as {{START_REVENUE}} per month.

All amounts are in USD. Late or failed payments pause the Operator's work until the payment is resolved.

## III. Guarantee

Your workspace is live and tailored to you the day you finish onboarding, and your first video package and story sequence follow right after. If anything we promised isn't delivered, we keep working at no extra cost until it is. No refunds.

## IV. Term and termination

This Agreement starts when both Parties have signed and continues until either Party ends it by written notice (a message counts). No notice period and no termination penalty applies. The Client keeps the systems and deliverables built during the engagement. Revenue from any opportunity already in active progress when the Agreement ends, and collected within thirty (30) days after that, remains subject to the revenue share in Section II.

## V. Refunds

All payments are non-refundable, because they are tied to work already performed and revenue already collected.

## VI. Confidentiality

Both Parties keep confidential the funnel strategies, revenue data, client lists and other materials shared during the engagement, unless the law requires disclosure or the other Party agrees in writing. The Operator may use results and content produced through the engagement as case studies, and the Client may ask for specific personal details to be withheld.

## VII. General

This Agreement is personal to the Client and may not be assigned without the Operator's written consent. Each Party holds the other harmless from claims arising from its own negligence or misconduct. This Agreement is the whole agreement between the Parties. The Parties will try to settle any dispute in good faith first, and then in a forum they agree on at that time.

[Additional terms, if any were typed in the popup.]

By signing below, each Party confirms it understands and agrees to these terms, including the fees, the guarantee, the refund terms and confidentiality.

Client: {{CLIENT_NAME}}, signature            Operator: Pulsify, accepted by sending this Agreement (or a signature when a countersigner email is set)
```

## Open questions / gaps

- **Sending is not switched on.** DocuSign is linked (account ID and webhook key are set as Pages secrets), but the three keys needed to send are missing: the integration key, the user ID and the private key. Until they are set, Send Contract answers "DocuSign not connected" and nothing goes out.
- **The app points at the DocuSign sandbox by default.** Sandbox envelopes are for testing. A real client contract needs a production integration key and `DOCUSIGN_BASE_URL` set to the production host (see the header of `functions/_shared/docusign.js`).
- **Who edits the videos.** The contract says the client records and publishes, and is silent on editing.
- **The operator is not a registered company.** The contract names "Pulsify". An unregistered trading name is weak for enforcing the share if payments stop ([[clients/tb-tradez/decisions]]). Revisit if a company is registered.
- **No governing law named.** Disputes go to good-faith talks, then a forum agreed at the time. The practical enforcement is control of the systems.
- **Zero-floor risk on $0-upfront deals.** The 30-day tail only reaches deals already in progress. A longer tail ("any lead that entered the pipeline during the engagement, collected within 90 days") was proposed for TB Tradez and never agreed.
- **Chargeback acknowledgement** (from [[synthesis/dustin-varano-the-keys]]): a clause where the client acknowledges they won't open a payment dispute. It is not in the text. It needs a lawyer before it is added.

## Connections

- [[playbooks/pulsify-offer-v1]]: the offer this contract codifies.
- [[clients/tb-tradez/contract-draft]]: the FITFO-based agreement the app's text grew from.
- [[synthesis/service-scope-and-terms-proposal-2026-10-26]]: what is settled and what is left for the first client.

## Source trail

- `raw-sources/contracts/fitfo-service-agreement.docx` and [[clients/tb-tradez/contract-draft]] (structure, termination, tail, sales-team split).
- Founder decisions, 2026-10-15 (price, guarantee wording, starting revenue, refunds).
- Founder, 2026-10-26: add setters/closers 10/5/15, ads later and program building.
- Retired: the May 2026 v1 template built from the Nick Furr and Jacob Thomas MSAs.

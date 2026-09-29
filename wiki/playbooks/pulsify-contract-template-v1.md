---
type: playbook
tags: [contract, offer, legal, template, pulse-system]
sources: [[wiki/playbooks/pulsify-offer-v1]], [[raw-sources/contracts/nick-furr-pulsifymedia-msa]], [[raw-sources/contracts/jacob-thomas-pulsifymedia-msa]]
created: 2026-05-15
updated: 2026-09-29
---

# Pulsify contract template v1

The canonical service agreement Pulsify sends after a close. Templatized from the Nick Furr and Jacob Thomas agreements, rewritten to match the v1 offer (base fee + performance + $100k guarantee + Turkey payment rails + Pulse System scope). Send via DocuSign.

## Why this matters for Pulsify

Two prior contracts existed (Nick: 25% profit share only; Jacob: 20% + software passthrough). Neither matches the current commercial structure. Without one canonical template, every close re-invents terms and Pulsify either undersells (no base fee) or stalls (no draft ready). This page is the single source of truth.

## How to use this template

1. Find/replace every `{{PLACEHOLDER}}` token before sending.
2. Confirm the pricing branch against the closed terms (see [[playbooks/pulsify-offer-v1#pricing--the-negotiation-tree]]).
3. Confirm jurisdiction with the founder before first use (see open questions below).
4. Paste the rendered text into DocuSign as a new document, place signature blocks, send.
5. Save the signed PDF to `clients/{client-name}/contract-signed.pdf` and append to `clients/{client-name}/decisions.md`.

## Deltas vs. prior contracts

| Item | Nick Furr | Jacob Thomas | v1 Template |
|---|---|---|---|
| Base fee | None | None | $5k / $7.5k / $10k per offer page |
| Performance share | 25% | 20% | 25% or 30% per branch |
| Software passthrough | Implicit | $97 GHL + $45 ManyChat | Removed (Pulse System replaces the stack) |
| Guarantee | None | None | $100,000 in 90 days or work continues free |
| Payment rails | Stripe | Stripe | Crypto (Binance Turkey) + SWIFT primary; Wise/Payoneer secondary; **no Stripe** |
| Engagement length | Unspecified | Unspecified | 90 days paid, unbounded continuation if guarantee missed |
| Scope language | Generic funnel/GHL/ManyChat | Generic funnel/GHL/ManyChat | Pulse System components (Brand Brain, Content Engine, Funnel Stack, Sales Co-pilot, Ops Replacement) |
| Integration requirement | Absent | Absent | CRM + payment processor visibility required for attribution |
| Jurisdiction | USA | UK / England & Wales | Placeholder — confirm |

## The template

```markdown
# Pulsifymedia LTD. — Service Agreement

This SERVICE AGREEMENT, hereinafter referred to as the "Agreement", is entered into on {{EFFECTIVE_DATE}} by and between:

**PULSIFYMEDIA LTD.**, hereinafter referred to as the "Operator"; -and-

**{{CLIENT_LEGAL_NAME}}**, hereinafter referred to as the "Client."

Collectively, the Operator and the Client are referred to as the "Parties."

The Parties agree to the following recitals:

**Whereas**, the Operator is in full legal capacity as a company specializing in the field of growth operations, info product scaling, AI-assisted content production, and funnel infrastructure for high-ticket coaching businesses;

**Whereas**, the Operator affirms that it has the required experience and ability to provide the Client with the Services defined herein;

**Whereas**, the Operator agrees to be engaged to provide the Client with the Services, subject to the terms and conditions contained herein;

**Whereas**, the Parties desire to express in writing their mutual understanding and agreements with respect to this engagement;

**NOW, THEREFORE**, in consideration of the mutual promises and covenants contained herein, and other good and valuable consideration, the Parties hereto, intending to be legally bound, do hereby agree as follows:

---

## I. The Services

The Operator is engaged to install and operate the Pulse System inside the Client's coaching business across a 90-day paid engagement. The Pulse System comprises five components, each with defined deliverables and human checkpoints:

1. **Brand Brain** — a client-owned knowledge vault built from past calls, past content, structured intake, and competitor research. Delivered Week 1–2.
2. **Content Engine** — weekly research, scripting, packaging, and pipeline management for the Client's primary content channel (YouTube long-form by default). Delivered from Week 3 onward.
3. **Funnel Stack** — the conversion path from content view to sales call, including VSL, Typeform, Cal.com, and IG profile-funnel wiring. Delivered Week 4–5.
4. **Sales Co-pilot** — pre-call briefs, drafted proposals, drafted follow-ups, automatic CRM stage transitions. Delivered Week 6+.
5. **Ops Replacement** — comment triage, DM triage, dashboard refresh, weekly metric reports. Delivered Week 9+.

A full Client Scope Document confirming exact deliverables, channel choices, and integrations will be produced by the Operator in Week 1 of the engagement and shared with the Client for sign-off.

The engagement also includes:
- Weekly reporting and optimization meetings.
- A dedicated Slack or Discord workspace.
- Direct asynchronous communication channels with the Operator.

Deliverables are subject to adjustment due to unforeseen circumstances or changes in the Client's needs, by mutual written agreement.

---

## II. Fees

For undertaking the engagement, the Client agrees to the following fee structure:

**Base Fee:** USD {{BASE_FEE}}, payable as {{PAYMENT_SPLIT}}. Where the engagement is split, the second installment is due on delivery of the Funnel Stack (Week 5).

**Performance Share:** The Operator shall receive {{PERFORMANCE_PERCENT}}% of all attributable revenue collected by the Client during the engagement, payable on a weekly settlement cadence within five (5) business days of the close of each calendar week.

**Attribution Rule:** All revenue collected by the Client from the date the Operator is integrated into the Client's CRM and payment processor is attributable to the Operator, with the sole exception of leads that were already in active negotiation with a scheduled close date prior to integration. After integration, every revenue event collected counts toward the performance share because the Operator owns the systems generating, processing, and tracking them.

**Settlement Source of Truth:** The weekly setter/closer Slack report and the payment-processor export are the joint source of truth. Both Parties have read access. Disputes are resolved against those records.

All prices are quoted in USD. Late payments or failure of payments shall result in immediate cessation of all work carried out by the Operator until payment is resolved. All work product remains the sole right of the Operator until payment is made.

---

## III. Engagement Term and Performance Guarantee

**Paid Term:** 90 days from {{ENGAGEMENT_START_DATE}}.

**Performance Guarantee:** The Operator guarantees that the Client shall collect at least USD 100,000 in new attributable revenue (as defined in Section II) within the 90-day Paid Term.

**Continuation:** If the Client has not collected USD 100,000 in attributable revenue by the end of the Paid Term, the Operator shall continue to provide the Services at no additional Base Fee until the threshold is achieved. There is no time cap and no hour cap on the continuation period. The Performance Share continues to apply on all revenue collected during continuation.

**Termination by Client:** The Client may terminate the engagement at any time with seven (7) days' written notice. Termination ends the Operator's obligation to deliver Services, ends the Operator's obligation to maintain installed systems, and ends the Performance Share on revenue collected after termination. Base Fee installments already due remain payable.

**Termination by Operator:** The Operator may terminate the engagement for cause if the Client (a) fails to provide CRM or payment-processor access required for attribution, (b) fails to attend two or more consecutive scheduled meetings without rescheduling, or (c) materially breaches this Agreement and fails to cure within fourteen (14) days of written notice.

---

## IV. Refund and Cancellation

- Base Fee installments are non-refundable once paid, as they fund completed and in-progress delivery work.
- Performance Share payments are non-refundable, as they are directly tied to revenue already collected by the Client.
- Termination does not entitle either Party to a refund of fees already paid.

---

## V. Payment Scheme

The Client agrees to settle all payments in USD via the following preferred rails:

1. **Cryptocurrency** (USDT or USDC on a major chain) via Binance Turkey — preferred.
2. **International SWIFT bank transfer** to the Operator's nominated account.

Alternative rails (Wise, Payoneer, or equivalent) may be arranged upon mutual agreement before the first invoice. Stripe is not available for this engagement due to the Operator's payment-rail configuration.

The Client is responsible for any fees, taxes, or withholdings imposed by their jurisdiction. Quoted amounts are net to the Operator.

---

## VI. Client Integration Requirement

To enable the Services and the attribution rule in Section II, the Client agrees to grant the Operator read or admin access (as appropriate) to the following systems within five (5) business days of the Effective Date:

- The Client's CRM (or, where none exists, agreement to install one within the engagement).
- The Client's payment processor dashboard or equivalent revenue-collection record.
- The Client's content publishing accounts for the channels in scope.
- The Client's calendar booking system (Cal.com or equivalent).
- The Client's communication channels with any existing setters or closers.

Without integration, the Operator cannot perform the Services or compute the Performance Share. Failure to provide integration within fourteen (14) days of the Effective Date is grounds for termination under Section III.

---

## VII. Non-Disclosure and Intellectual Property

Both Parties mutually agree that certain confidential information, including but not limited to funnel strategies, revenue data, client lists, and internal frameworks, may be exchanged during this engagement. Both Parties agree not to disclose or share this information with any third party unless required by law or with prior written consent.

a. **Confidential Materials:** Includes technical materials, models, strategies, and intellectual property created during this engagement.

b. **Sales Materials:** Includes pricing strategies, sales funnels, and client acquisition methods provided by either Party.

c. **Intellectual Property Rights:**
- The Client retains ownership of the Brand Brain populated with their data, the per-client AI agent installed in their accounts, all content produced under the engagement, and any creative output bearing the Client's likeness or voice.
- The Operator retains ownership of all underlying templates, frameworks, prompt packs, the Pulse System methodology, and any tooling not specific to the Client's account.
- Pre-existing intellectual property of either Party remains the sole property of its original owner.

d. **Additional Confidential Information:** Any other information explicitly marked or identified as confidential by either Party.

**Case Studies and Marketing Use:** The Client agrees that the Operator may share anonymized case studies, screenshots, testimonials, and quantitative results achieved through the engagement for marketing purposes. Personal or brand-identifiable information will be excluded upon the Client's written request.

---

## VIII. Miscellaneous

**Non-Transferability:** The rights and obligations under this Agreement are exclusive to the Parties and may not be assigned or transferred to a third party without prior written consent of the other Party.

**Mutual Indemnification:** Both Parties agree to indemnify and hold each other harmless from any claims, damages, or losses arising from negligence or misconduct during the engagement.

**Integration:** This Agreement, including any amendments or incorporated terms, constitutes the entire agreement between the Parties and supersedes any prior agreements or understandings.

**Notices:** All formal notices under this Agreement shall be in writing and delivered by email to the addresses provided at execution.

---

## IX. Interpretation and Enforcement

This Agreement shall be governed by and construed in accordance with the laws of {{GOVERNING_JURISDICTION}}. Both Parties agree that any disputes arising from this Agreement shall be resolved in the courts of {{COURTS_JURISDICTION}}.

---

**BY SIGNING BELOW, EACH PARTY ACKNOWLEDGES THAT IT UNDERSTANDS AND AGREES TO ALL OF THE AFOREMENTIONED TERMS, INCLUDING THOSE RELATED TO SERVICE FEES, THE PERFORMANCE GUARANTEE, THE INTEGRATION REQUIREMENT, REFUND POLICY, AND CONFIDENTIALITY.**

{{CLIENT_LEGAL_NAME}}                                           PULSIFYMEDIA LTD.

Signed: _______________________________            Signed: _______________________________

Title: ________________________________             Title: ________________________________

Date: _________________________________             Date: _________________________________
```

## Placeholder reference

| Token | Source | Example |
|---|---|---|
| `{{EFFECTIVE_DATE}}` | Call close date | 2026-06-12 |
| `{{CLIENT_LEGAL_NAME}}` | Client legal name (individual or entity) | Marcus Reilly |
| `{{BASE_FEE}}` | Negotiated base per offer page | 5,000 / 7,500 / 10,000 |
| `{{PAYMENT_SPLIT}}` | PIF or 50/50 | "paid in full on the Effective Date" OR "50% on the Effective Date and 50% on Funnel Stack delivery (Week 5)" |
| `{{PERFORMANCE_PERCENT}}` | Negotiated share per offer page | 25 or 30 |
| `{{ENGAGEMENT_START_DATE}}` | Day 1 of paid term (usually Effective Date) | 2026-06-12 |
| `{{GOVERNING_JURISDICTION}}` | Pending founder decision | "England and Wales" |
| `{{COURTS_JURISDICTION}}` | Pending founder decision | "England and Wales" |

## Connections

- [[playbooks/pulsify-offer-v1]] — the commercial terms this contract codifies.
- [[concepts/pulse-system-mechanism]] — the scope language in Section I.
- [[playbooks/pulsify-delivery-sop]] — the week-by-week SOP the contract maps to.
- [[clients/nick/overview]] — the predecessor contract this template supersedes for new clients.

## Open questions / gaps

- **Jurisdiction.** Prior contracts disagreed (Nick: USA; Jacob: UK/England and Wales). Pulsifymedia LTD as a UK ltd defaults to UK jurisdiction, but the founder operates personally from Turkey. UK is the cleaner answer for a UK ltd company. Confirm before first send.
- **Crypto-only payment friction.** Some US-based prospects will balk at Binance Turkey USDT. Wise/Payoneer evaluation still pending. A US business bank account in Pulsifymedia LTD's name would unlock Stripe/ACH and remove this objection — worth weighing against setup time.
- **Performance share on continuation past 12 months.** v1 has no cap. If a client crosses 12 months in continuation, the Operator is doing unbounded free work. Founder accepts this risk as of 2026-05-10 ([[playbooks/pulsify-offer-v1#open-questions--gaps]]). Revisit when the first stress event arrives.
- **Counter-signature authority.** Pulsifymedia LTD signer name and title not yet locked in template. Add when finalized.
- **No NDA-only variant.** Some prospects ask for an NDA before a sales call. Worth drafting a 1-page NDA standalone if it becomes a recurring ask.

- Dispute protection (added 2026-09-29, source [[synthesis/dustin-varano-the-keys]]): section IV already makes fees non-refundable. Two clauses Dustin Varano uses that this template lacks: an acknowledgment that the client waives initiating a chargeback or payment dispute, and a no-guarantee-of-income clause. He admits chargeback rights can't be fully waived; the value is written proof the terms were knowingly accepted, which processors weigh in disputes. He pairs it with recording every client call for the life of the engagement and submitting the recordings, the signed agreement and a deliverables log as evidence. Needs a lawyer's review before adding, and the income clause must not contradict the performance guarantee in section III.

## Source trail

- `raw-sources/contracts/nick-furr-pulsifymedia-msa.pdf` (profit-share-only, USA jurisdiction).
- `raw-sources/contracts/jacob-thomas-pulsifymedia-msa.pdf` (profit-share + software passthrough, UK jurisdiction).
- [[playbooks/pulsify-offer-v1]] — pricing tree, performance attribution, guarantee, integration requirement.
- [[concepts/pulse-system-mechanism]] — scope language for Section I.

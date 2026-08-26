---
type: client
tags: [tb-tradez, decisions, contract]
created: 2026-08-26
updated: 2026-08-26
---

# TB Tradez decisions

Chronological record of what was decided, by whom, and why.

## [2026-08-26] Signed - no upfront, 35% revenue share

**Decided by:** founder, on the closing call.

**Terms as reported:** no upfront payment, 35% revenue share. Client is Tahlon Buttle, trading as TB Tradez, based in British Columbia, Canada.

**Rationale:** not recorded on the call. Logged here as reported.

> ⚠️ Contradiction with [[playbooks/pulsify-offer-v1]]. The offer page states a hard floor of $5,000 base plus 30%, and that "both base AND performance fee are mandatory. There is no path that drops one." This deal drops the base entirely. It also runs against the standing founder doctrine that price objections are smokescreens and the upfront is non-negotiable.
>
> Resolution: the founder closed it this way and that stands. Recorded as a deviation rather than silently absorbed, because the offer page still reads as though the floor holds. If performance-only becomes the pattern rather than the exception, the offer page needs rewriting to describe the deal Pulsify actually sells.

**Comparison to FITFO**, the only prior performance-only deal:

| | FITFO | TB Tradez |
|---|---|---|
| Upfront | $0 | $0 |
| Floor | First $3,000 of revenue to Pulsify | None |
| Share after floor | 30% | 35% |
| Termination | Mutual at-will, client keeps systems | Same |
| Post-termination tail | 30 days on in-progress deals, plus recovery-fee survival | 30 days on in-progress deals only |

The 5% higher share is the compensation for dropping the $3,000 floor. Whether that trade is good depends entirely on whether revenue actually lands, which is the definition of the risk that was taken on.

## [2026-08-26] Contract built from FITFO, not the v1 template

**Decided by:** Claude, executing.

[[playbooks/pulsify-contract-template-v1]] assumes a base fee, a $100,000 guarantee, and a 90-day paid term. None apply. The FITFO service agreement is the correct structural match and its termination language is the version that was actually drafted to answer a client's direct redline question.

Source archived at `raw-sources/contracts/fitfo-service-agreement.docx`. This is the first contract stored in the vault; Nick's and Jacob's MSAs are still referenced but absent.

**One substantive change beyond the fee numbers:** the revenue base was scoped from FITFO's unqualified "all revenue collected by the Client" to revenue from the offers developed under the agreement. Reason and trade-off in [[clients/tb-tradez/contract-draft]].

## Open

1. How 35% splits when a sales team is engaged. Drafted as 10% closer / 5% setter / 20% Operator. Unconfirmed.
2. Whether to close the zero-floor exposure, and if so by extending the 30-day tail or adding a recovery fee. Must be raised by voice before it appears in the document.
3. Whether Section I scope matches what was promised on the call. Carried over from FITFO unchanged and includes sales-team recruitment and paid ads.
4. Operator entity: the vault says Pulsifymedia LTD, the live CO1 onboarding doc says Pulsify Media LLC, and the FITFO agreement leaves the line blank. Unresolved.

---
title: Service scope and terms, what is settled and what is left (#60)
type: synthesis
status: rewritten 2026-10-26 after a full read of the vault, the live contract code and the live database
created: 2026-10-26
tags: [offer, pricing, contract, delivery]
sources: [[synthesis/mvp-readiness-and-pricing-2026-10-12]], [[synthesis/onboarding-v2-spec-2026-10-15]], [[playbooks/pulsify-offer-v1]], [[playbooks/pulsify-delivery-sop]], [[clients/tb-tradez/contract-draft]], [[clients/tb-tradez/decisions]]
---

# Scope and terms: what is settled, what is left

Almost all of this was already settled. It lives in three places: your decisions of 15 October, the onboarding "deal" screen, and the contract the app sends (`functions/_shared/contract-text.js`, built 18 October from the FITFO and TB Tradez agreement). Ticket: pulsify-saas #60.

## Settled

**The deal**
- $5,000 upfront plus 30% of the revenue they collect from what we build together. Refunds and chargebacks come off first.
- Their starting monthly revenue is written into the contract. Content money they already made stays theirs, unless we rebuild that stream.
- Our 30% is due within 5 business days of them receiving the money.
- Late or missed payment pauses our work until it is paid.
- Payment by crypto or bank transfer. No Stripe.
- No refunds.

**How long it runs**
- No end date. It runs until either side says stop, by message, with no notice period.
- If it stops, they keep everything we built. Deals already in progress that close within 30 days still pay the 30%.

**What we do**
This is your scope list (Cardinal Mason's "Our work" slide and the onboarding deal screen). We do the work that makes them money:
- Their offer, positioning and unique mechanism.
- Their YouTube videos planned for them: idea, outline in their words, two titles and two thumbnails, and a story sequence to push each one.
- Their Instagram profile: bio, highlights, story sequences, and carousels when something big happens.
- Their funnel, from the first click to the booked call, tracked the whole way.
- Their paid program: curriculum, how to run 1-1 calls, teaching material, who paid and who didn't, and Whop if they use it.
- Setters and closers, found and managed by us when the time comes. When they're working, the 30% splits 10% closer, 5% setter, 15% us.
- Ads later, or early if they want to scale fast. Organic first.
- The app, a weekly review, and weekly reports.

**What they do**
These are the parts only they can do. They record their videos (1 to 2 a week as the standard, and they can change it), post their own reels (2 to 5 a day, raw and unscripted), show up to the weekly review, approve drafts, reply to their leads, take their calls and look after their students.

**The guarantee (approved wording)**
"Your workspace is live and tailored to you the day you finish onboarding, and your first video package and story sequence follow right after. If anything we promised isn't delivered, we keep working at no extra cost until it is. No refunds."

**Case studies**
We can use their results. They can ask us to hold back personal details.

## Left

1. ~~The contract the app sends is missing setters/closers, ads and program building.~~ **Done 2026-10-26:** all three are in the contract, with the 10/5/15 split paid out of our share. Still open: who edits the videos. The contract only says the client records and publishes.
2. **The app can't send a contract yet.** The DocuSign account is linked (account ID and webhook key are set), but the three sending keys are not: integration key, user ID and private key. Setting them needs one sign-in to your DocuSign developer account.
3. **Nick's workspace.** It was set up on 10 October with his Instagram and YouTube connected and 20 onboarding answers. Nothing has been added since. The guarantee's "first video package and story sequence right after" hasn't been made for him yet.
4. **Jane on real answers.** Jane moved to free Gemini today. She has only been tested on made-up clients, never on a real workspace.

## Old pages

Updated 2026-10-26: [[playbooks/pulsify-offer-v1]] and [[playbooks/pulsify-contract-template-v1]] now match these terms. The delivery SOP still has the old $100k and day-90 sections.

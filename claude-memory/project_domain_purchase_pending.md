---
name: project_domain_purchase_pending
description: pulsify-ai.com is wanted but deferred until first revenue; remind the founder to buy it when he books the first payment
metadata: 
  node_type: memory
  type: project
  originSessionId: cb450ffc-0887-4eda-9814-d5f7dbe69d24
  modified: 2026-08-13T14:02:57.794Z
---

Founder decision 2026-08-13: he is NOT buying `pulsify-ai.com` yet. He was on the Wix checkout ($7.90 first year, renews $21.35/yr) and backed off — until Pulsify makes money he wants the cheapest domain he can get, then upgrades.

**Why:** cash discipline before first revenue. The domain is for the funnel/landing pages currently living on `pulsify-funnels.pages.dev` (see [[project_og_preview_path_urls]] and [[project_landing_page_standard]]) — a custom domain is the last piece of the link-trust problem, but it does not start a conversation this week, so it fails the gate in [[project_fable_handoff]].

**How to apply:** the moment he tells me the first client payment has landed (first signed deal / first money in), remind him — unprompted — to buy `pulsify-ai.com`. Buy at a flat-rate registrar (Cloudflare Registrar or Porkbun sell .com near wholesale with no first-year bait price), not Wix, unless he says otherwise. Same trigger as the onboarding flow in [[project_onboarding_form]], so both fire on the same event.

Also settled that day: you cannot buy a cheap TLD and have it *display* as a different domain. Whatever URL he pastes is what the recipient sees; masked/cloaked forwarding shows the cheap domain in the address bar, breaks the OG preview cards, and reads as sketchy. So the cheap domain becomes the real public domain until he replaces it.

**Founder correction, same day — do not repeat my error.** I claimed `pulsify-funnels.pages.dev` reads as neutral because it's visibly Cloudflare. Wrong. A trader receiving a cold DM has never heard of `pages.dev`; it reads as an unknown domain exactly like a .info would. Never assume a prospect parses infrastructure.

That correction weakens the case for deferring. The domain sits in front of revenue, not after it, because every prospect asset is delivered through the link. Per-lead path URLs already work (`/frank-wieler`), so attaching a domain is a DNS change with no rebuild — and buying at Cloudflare Registrar skips the nameserver migration since Pages already hosts it. I put that argument to him; the buy-now vs wait call is his.

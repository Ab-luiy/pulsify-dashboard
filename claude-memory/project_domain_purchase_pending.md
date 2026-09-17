---
name: project_domain_purchase_pending
description: pulsify-ai.com is BOUGHT (Cloudflare Registrar, 2026-09-17) and attached to the pulsify-funnels Pages project; send links now use pulsify-ai.com
metadata: 
  node_type: memory
  type: project
  originSessionId: cb450ffc-0887-4eda-9814-d5f7dbe69d24
  modified: 2026-09-17
---

Status 2026-09-17: the founder bought `pulsify-ai.com` at Cloudflare Registrar (account 437f6dfbb738a4267395bd5da251494a, nameservers alexia/agustin.ns.cloudflare.com). I attached both `pulsify-ai.com` and `www.pulsify-ai.com` as custom domains on the `pulsify-funnels` Pages project (CNAME -> pulsify-funnels.pages.dev, proxied). They were in "Verifying" state when I last looked; www returned 522 for the first few minutes, expected during activation.

**Why:** the domain sits in front of revenue, every prospect asset is delivered through the link, and `pages.dev` reads as an unknown domain to a trader. Per-lead path URLs (`/frank-wieler`) needed no rebuild.

**How to apply:** prospect send links are now `https://pulsify-ai.com/{lead-slug}` (see [[project_og_preview_path_urls]]). If a new session sees a 522 or "Verifying", re-check the Pages Custom domains tab before touching DNS. Plan cost decisions the same day: domain zone stays on the Free website plan (the $20 Pro / $200 Business screen is the zone plan, not Workers), and Workers Paid ($5) is SKIPPED until something needs Queues or >10ms CPU; design automations around cron triggers plus D1 polling instead of Queues.

Historical: he first backed off a Wix checkout on 2026-08-13 ($7.90 then $21.35/yr renewals) to wait for first revenue, then bought before that trigger fired. Lesson kept from that day: never assume a prospect parses infrastructure; masked forwarding of a cheap TLD breaks OG cards and reads as sketchy.

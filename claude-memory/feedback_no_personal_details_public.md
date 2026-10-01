---
name: feedback-no-personal-details-public
description: Never put the founder's name, personal Gmail, country or phone on any public page; use hello@pulsify-ai.com
metadata:
  type: feedback
---

Public pages (privacy, terms, landing pages, footers, emails) must not show the founder's real name, personal Gmail, country or any contact that identifies him. Use hello@pulsify-ai.com, which Cloudflare Email Routing forwards to his inbox (set up 2026-10-01, rule "hello forwards to founder").

**Why:** he said the old privacy and terms pages "dox" him (2026-10-01). They named him, said he was based in Turkey and linked his Gmail.

**How to apply:** before shipping any public page, grep for his name, gmail and country. Terms still say governing law is Turkey; that is a legal choice, flag it rather than changing it silently. See [[project-domain-purchase-pending]].

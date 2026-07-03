---
name: project_onboarding_form
description: Client onboarding = live 30-question Google Form + CO1 Full Onboarding Doc (Google Doc); buyer-psychology questions still missing from the form; trigger = user names a signed client
metadata: 
  node_type: memory
  type: project
  originSessionId: f907bb42-8ad7-4bdb-a78c-800116c0a17e
---

UPDATED 2026-07-03 (supersedes the Typeform plan): the onboarding form is LIVE as a **Google Form**, 30 questions (contact, niche, offer + pricing, last-3-months revenue, income goal, platforms/audience sizes, story views, lead sources, buying path, funnel links, content winners/losers, bottlenecks, weekly hours, offline dates, launch plans, access needs, optional login paste, confirmation). Form id `1zXVRhwBgX3WF1ie194m-FvG7Vd4-OFpwNA9wtKu_gTE`. Second asset: **CO1 Full Onboarding Doc** (Google Doc id `1b3DyzRQ0h9u91l80kl_iqyrhKd6FiGe2xQe1rqN-FdE`) — phased client checklist (expectations video, surveys, voice-memo research, Drive/Stripe access, Discord, Kit, Zapier, Typeform, Calendly, Fanbasis PIF + Whop BNPL). "Pulsify Media LLC" appears as the entity name on CO1.

STILL MISSING from the form: the buyer-psychology win-reason questions (what made you believe us / the ONE thing that almost stopped the buy / what would have made you buy earlier / which video converted you + link). User should add them as a final form section — they're the funnel-attribution + content-intelligence payload.

KNOWN ISSUES filed in wiki/lint-report.md (L9, 2026-07-03): CO1 has empty video/link placeholders throughout; tells clients to set up Zapier (contradicts the no-Zapier core-runtime decision); Calendly vs the delivery SOP's Cal.com; missing Wistia/YouTube-access/IG-access/portal-expectation steps; the form's Q28 invites pasting raw logins (security — delegated access instead).

**Trigger unchanged:** when the user names a signed client, run the full onboarding (send form + CO1 + portal link, create clients/{name}/, per [[playbooks/prospect-signed-onboarding]]). Automation design: wiki/synthesis/payment-onboarding-automation-spec.md (Google Form has no webhooks — v1 sends links, v2 optional Apps Script -> /event).

---
name: project_client_integrations_parked
description: "2026-09-24 founder parked client sign-in integrations (pulsify-saas #15) until the first client signs AND pays; then build it. Plan = Zernio per-client profile for IG/YouTube, own OAuth apps for Kit/Calendly/Stripe"
metadata:
  node_type: memory
  type: project
  originSessionId: 667d93ee-0214-4df3-8e69-9ddb9ae2fed0
  modified: 2026-09-24T20:56:06.254Z
---

Founder, 2026-09-24: "flag that until we sign a client and when he's in and paid us we'll build that out and get it dialed." Ticket #15 moved to the Later milestone with the full plan in a comment.

**Why:** client-side integrations cost money per connected account and only matter once a paying client exists; build effort goes to what signs the first client.

**How to apply:** do not build client OAuth or Zernio client profiles unprompted. The trigger is the founder naming a signed, paid client (same trigger as [[project_onboarding_form]]); then propose building #15 as part of that client's onboarding. Plan when it unparks:
- Instagram and YouTube via Zernio (already the operator's connection, see [[project_supabase_realtime]]): one Zernio profile per client on Zernio's approved apps. Verified pricing 2026-09-24 (docs.zernio.com/pricing): first 2 accounts free, 6 USD/account/month for accounts 3-10, 3 USD for 11-100, so about 12 USD/month per client with IG + YouTube.
- Own Google app is fallback only: the "Pulsify Dashboard" consent screen is in Testing, so refresh tokens die after 7 days and only listed test users can connect until Google verifies it. The redirect https://pulsify-ai.com/api/oauth/youtube/callback was added to the "Pulsify Portal" OAuth client (endpoint not built); YouTube scopes were NOT added (auto-mode blocked the scope grant; founder must click it).
- Meta's own app needs a registered business, which the founder does not have.
- Kit, Calendly/Cal.com, Stripe need their own OAuth apps, one at a time.
- Until then clients use the existing connect-with-key flow on /app/portal/access. Related: [[project_integrations_hub_i1]], [[project-ticket-board]].

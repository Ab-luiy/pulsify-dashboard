---
name: user_founder_emails
description: The founder has three near-identical Gmails; which one owns Cloudflare vs Meta; canonical list in wiki/playbooks/account-registry.md
metadata:
  type: user
---

The founder gets lost between his own emails because three look like typos of each other. Recorded 2026-09-17 from the live dashboards:

- `abod.louai@gmail.com` (one o): Cloudflare account owner (Registrar, Pages, D1, Zero Trust). The Claude desktop app is signed in as this.
- `abood.louai@gmail.com` (two o): primary contact on the Meta Accounts Centre (Facebook "AB Luiy", Instagram `ab.luiy`, Page "Pulsify"). Meta developer registration is under this profile.
- `abod.steam@gmail.com`: secondary contact on the Instagram profile.

**Why:** ownership splitting across accounts is the setup mistake that costs weeks (Meta and Google reviews, OAuth clients tied to the wrong owner).

**How to apply:** before any new account or OAuth client, read and update `wiki/playbooks/account-registry.md` and tell him which email to log in with. Default for Google Cloud is the Cloudflare one (`abod.louai@gmail.com`) unless he says otherwise. Never store passwords or secrets anywhere. See [[project_domain_purchase_pending]].

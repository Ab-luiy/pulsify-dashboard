---
name: feedback_keys_and_apis_are_mine
description: "Founder rule 2026-09-19 - never ask him to handle API keys, secrets or API setup; Claude owns all of it and designs around the one hard block"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 853b8ab0-fa86-4e66-be5a-3be26808dca2
  modified: 2026-09-19T16:28:48.025Z
---

Founder, 2026-09-19, after being walked through Zernio and Cloudflare key screens: "whenever it's a task that has to do with keys or APIs don't ever ask me to do it because I don't know how to do that. Always take care of that yourself. Stop hassling me."

**Why:** he is the operator, not an engineer. Every "paste this key into that dashboard" step costs him time, confusion and trust, and the Zernio session showed it (lost the one-time key, unsure which key was which).

**How to apply:**
- Default: Claude creates keys, generates secrets, installs them with `wrangler secret put` (piped, never printed), registers webhooks, runs OAuth connect flows in the browser pane. wrangler is logged in on this machine (OAuth, abod.louai).
- The single hard block that survives: Claude cannot type a credential the founder owns into a form field. So engineer around it instead of delegating it: prefer OAuth/hosted-login flows over pasted keys; let one service that already holds a secret do the work for another (e.g. Worker relays email through a Pages route instead of needing RESEND_API_KEY itself); generate secrets Claude controls and install them on both sides.
- If a founder-owned key is genuinely unavoidable, do every surrounding step (open the exact page, fill the name, select the type) and ask for one paste only, once, with no explanation of why.
- Never say "add X to Cloudflare" in a TLDR again.

Related: [[project_admin_key_access]], [[feedback_never_guess]], [[feedback_speed_is_the_motto]]

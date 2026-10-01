---
name: project-registration-approval
description: Sign-in is request-then-approve; founder picks client or operator in the console; only owners add operators
metadata:
  type: project
---

Shipped 2026-10-01 (pulsify-saas #40). Anyone can request access on the sign-in page; nothing exists until the founder approves from Clients ("Waiting for approval": As client / As operator). Client approval runs provisionClient (workspace plus welcome email with setup link). Operator approval writes operator_users; owners (OPERATOR_EMAILS secret) are the only ones who can add or remove operators; Settings > Team access also adds by email. New requests email hello@pulsify-ai.com (forwarded to him) and ring the bell.

**Why:** founder wanted account creation dialled in without back-and-forth, and a way to bring a software-engineering friend in. He likes GoHighLevel's sub-accounts: each client workspace already works like one (Open workspace = switch in).

**How to apply:** not built yet and worth proposing if he asks: a read-only engineer role (needs blocking writes in the middleware and in Open workspace), and per-workspace user access (a client's own team, an operator limited to some workspaces). See [[feedback-no-personal-details-public]] and [[project_infoos_integration]].

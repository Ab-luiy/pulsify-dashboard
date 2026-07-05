---
name: project_integrations_hub_i1
description: "Integrations hub I1 LIVE on pulsify-funnels (2026-07-03) — /integrations UI, D1 integrations/payments tables, Mark-paid onboarding flow, webhook receivers, Discord alerts; portal v2 = connection-first, stage-2 mock pending"
metadata: 
  node_type: memory
  type: project
  originSessionId: f907bb42-8ad7-4bdb-a78c-800116c0a17e
---

2026-07-03: Integrations hub phase I1 (money path) SHIPPED to pulsify-funnels production (brain main `a995d6d` + gate-fix commit, migration 0008 applied to live pulsify-portal D1). Built headless by Codex gpt-5.5 high per [[integrations-hub-spec]] (wiki/synthesis/integrations-hub-spec.md), reviewed/deployed by Claude.

What exists now:
- `/integrations` (admin): provider cards — operator Kit + Discord webhook + per-client Cal.com/Calendly/Whop/Stripe with one-time webhook URLs shown after save; env status cards for Gemini/Anthropic/Supadata.
- D1: `integrations`, `integration_events`, `payments` (append-only, idempotent by reference), `client_config.status`.
- `/api/payment` Mark-paid path = the payment-onboarding trigger: payment row -> Kit onboarding email (Google Form + CO1 doc + portal link; fail-soft draft when Kit absent) -> AUTO-ROTATES/mints portal token (old link dies — intended, matches signing flow) -> status flip to 'client' -> Discord alert.
- Webhooks: Stripe signature-verified; Cal.com/Calendly/Whop use path-secret routes (`/api/hooks/<provider>/<secret>`) — signature schemes deliberately NOT guessed, harden in I2.
- event.js: Discord alerts on new application + >=75% hot-watch (deduped); Kit config falls back to integrations table.

REVIEW CATCH (4th build, 4th real defect): the I1 refactor made getConfig infallible and silently killed /event's unknown-client 404 — live-confirmed arbitrary client ids could write rows. Fixed same session (known = client_config OR client-scoped integrations row). RULE: a fallback default that makes a lookup infallible deletes every gate built on its absence — grep for !cfg-style guards when making getters non-null. Also: headless Codex wrote AGENT_CHAT in the clone against protocol; discarded, reminded.

USER-SIDE: paste Kit API key + Discord webhook URL into /integrations; per-client provider connects as they come; accounts (Kit/Wistia/Typeform) still not created.
NEXT: stage-2 portal mock (connection-first per wiki/synthesis/client-portal-product-spec.md — client connects Kit/YT/IG/booking/payments from inside the portal, NO sample stats ever, design fixes: numeral tracking, red=failures-only, 8px spacing scale) -> founder sign-off -> full portal build + client-token integration writes.

2026-07-05: stage-2 mock BUILT (Codex gpt-5.5 high, Claude-reviewed) at `pulsify-portal-build/output/portal-mock/stage2.html` (+ STAGE2-NOTES.md). Connect-first first-login: 7 connect cards (Kit connected + 6 not, mixed key-testable / delegated-instructional; delegated = YouTube+IG with steps + Mark-as-done, zero credential inputs), "1 of 7" progress bar, Scoreboard below in 6 honest empty states naming each connect step, all 4 design fixes verified rendered (h1 -0.02em/30-36px, no --danger var at all, 8px scale, SAMPLE badge retired), light+dark, no 390px overflow. AWAITING founder sign-off — that yes unlocks full portal build (Run B) + the client-token integration-write delta. This session runs on Opus 4.8 (Fable gone); build-in-Codex / think-in-Claude split unchanged. See [[project_operator_console]].

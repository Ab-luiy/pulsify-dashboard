---
type: synthesis
tags: [funnel, sales, outreach, scaling, content]
sources: [[synthesis/funnel-portal-pipeline]], [[synthesis/payment-onboarding-automation-spec]], [[playbooks/pulsify-delivery-sop]], [[synthesis/client-acquisition-renovation-2026-07-03]], AGENT_CHAT.md 2026-07-03
created: 2026-07-03
updated: 2026-07-03
---

# Integrations hub (spec)

Founder ask, 2026-07-03: connect every app Pulsify runs on — Google Calendar, Slack, Kit, "and everything" — through the dashboard and the portal, with accounts switched on and connected from inside the product. Founder's emphasis: "getting the integrations in place is what's most important." This page is the full thinking; Codex (gpt-5.5 high) executes the code. No code was written in this pass.

## The one architecture decision

**The hub lives on pulsify-funnels; the dashboard and the portal are its two faces.** Funnels already has everything an integrations layer needs: D1, Pages Functions, secrets, per-client config with masked read-back, token auth for clients, admin auth for the operator, delivery-failure logging, and /api/health. The dashboard talks to it over the existing direct-API bridge (admin key, decided 2026-07-02); the client portal reads its own slice through the existing portal-token isolation. Building a second secrets store inside the static dashboard would duplicate all of that with worse security.

Two scopes, one table:
- **Operator scope** — Pulsify's own accounts (Pulsify's Kit list, founder's Google Calendar, Slack workspace, YouTube Analytics OAuth). One row set, visible only via admin key.
- **Client scope** — per-client connections (their Kit key+tag, Wistia media, Typeform secret, booking link, payment provider). Already half-exists as `client_config`; the hub formalizes it and gives it status/test/disconnect semantics instead of bare text fields.

New D1 table `integrations` (scope, client_id nullable, provider, config_json, secret fields stored separately and never returned raw — same masked pattern as kit_api_key today), plus `integration_events` for sync/webhook logs riding the existing `delivery_failures` discipline.

## The full software inventory (what "everything relevant to us" actually is)

Ranked into build phases by business value. Per provider: what it feeds, and how it connects.

### Phase I1 — the money path (build first)

| Provider | Feeds | Connection mechanics |
|---|---|---|
| **Kit** (operator + per-client) | every email leg: application sequences, onboarding email, hammer-them later | API key (v4, already integrated per-client). Add operator-level key, connection test (list tags), status card. Standing rule holds: never save a client kit_api_key without their typeform_webhook_secret (F4). |
| **Cal.com** (free default) | bookings -> operator Today queue, portal Calls tab, the hammer-them trigger window, payment attribution | API key + webhook (booking.created). Free plan has webhooks — this is why it's the default. |
| **Calendly** (paid option) | same as Cal.com | webhook subscription, needs their paid plan; build the same normalized `booking` event so either provider slots in. |
| **Whop** (payments) | payment events -> [[synthesis/payment-onboarding-automation-spec]] `/api/payment`, Revenue live | API key + signed webhooks (membership/payment events). Known to have both. |
| **Stripe** (payments, if adopted) | same `/api/payment` | standard signed webhooks. Build the normalizer so Whop/Stripe/Mark-paid all produce one payment event. |
| **Fanbasis** (payments, PIF) | same | **UNVERIFIED: webhook/API capability unknown — check before promising; if absent, its payments enter via the Mark-paid path.** |
| **Discord webhook** (operator alerts) | instant notifications: new application, hot watch signal, payment, booking, delivery failure | plain webhook URL, zero OAuth, one evening of value for five minutes of work. Ship in I1 as the notification channel until/unless Slack lands. |

### Phase I2 — the visibility path

| Provider | Feeds | Connection mechanics |
|---|---|---|
| **Google Calendar** (founder) | Today queue (calls today, prep links), portal call scheduling visibility | Google OAuth (calendar.readonly first). Needs a Google Cloud OAuth app — founder-side setup, spec includes the exact steps. Store refresh token encrypted (AES-GCM via WebCrypto, key = CF secret). |
| **YouTube Analytics** (founder channel) | the dashboard's currently-honest "unconnected" analytics: retention, CTR, watch time | same Google OAuth app, additional scope. Rides the same token row. |
| **Slack** (bot + webhook) | client-workspace notifications, booking self-assign (dashboard v2 backlog item) | Slack app with bot token + incoming webhooks. Heavier than Discord; do it when a client workspace actually runs on Slack. |
| **Wistia** | per-client VSL analytics beyond our own player events (plays, engagement graphs) in portal Funnel tab | API token per account. Accounts still don't exist (standing blocker). |
| **Instagram (Composio)** | IG stats already pulled via the existing Composio bridge + ig-report | surface as a status card (connected via Composio), no rebuild. |

### Phase I3 — the convenience path (build only when pulled)

| Provider | Why it can wait |
|---|---|
| **Typeform API** (auto-create forms per client) | embed + webhook already work; auto-creation is a luxury. |
| **Google Drive / Notion** | file exchange and shared docs are link-sharing today; OAuth adds little. |
| **WhatsApp** | Business API is heavy bureaucracy for "urgent only" comms. Parked. |
| **GitHub / Cloudflare status** | internal plumbing health — extend /api/health cards instead of a real integration. |
| **Supadata / Gemini / Anthropic keys** | already env-based; the hub shows presence/absence status cards only, keys stay in CF secrets. |

## The three surfaces

1. **Dashboard -> "Integrations" screen (operator).** Card per provider: status dot (connected / not / erroring), what it feeds in one line, connect action (key paste or OAuth button), Test button (live ping, e.g. Kit list-tags), last event timestamp, disconnect. Uses the bridge with the stored admin key. This is the "switch on and connect our accounts from here" the founder asked for.
2. **/portal Delivery editor (operator, per client).** The existing client_config fields get the same card treatment per client: connect their Kit, their booking link, their payment provider, their Wistia. Status instead of blind text fields.
3. **Client portal "Integrations" tab (client-facing, read-only).** The client sees WHAT is connected for them (Kit: connected, Booking: Cal.com, Payments: Whop) — never keys, never raw config. Builds trust ("the machine is wired") and matches the Client OS tab that already exists as a shell.

## Security rules (inherit, don't reinvent)

- Secrets never round-trip: write-only fields, masked `*_set: true` on read (existing kit_api_key pattern).
- OAuth refresh tokens encrypted at rest (AES-GCM, key in CF secret), never in config_json plaintext.
- Webhooks signed where the provider supports it; unsigned providers get a per-integration secret in the URL path.
- Client scope isolation rides resolveAccess exactly like /leads — a portal token can only ever read its own client's status slice.
- All connect/disconnect actions logged to integration_events; failures to delivery_failures (never throw into the user path).
- OAuth redirect domain is pulsify-funnels.pages.dev until the neutral-domain decision lands — consent screens will show that name; acceptable, revisit at domain switch.

## Build sequencing (for Codex)

- **I1 first** — it completes the money path: bookings + payments + email + alerts are the events every other system (Today queue, portal tabs, payment-onboarding automation, hammer-them) is waiting on. I1's webhook receivers + the payment normalizer effectively BUILD the payment-onboarding spec's trigger layer — do them as one claim, not two.
- **Portal relationship:** the portal full build (Wave 3, mock pending founder sign-off) renders integration status but must not block on the hub — build the hub's D1 + endpoints first (or same claim), then the portal tab reads it.
- **I2 second**, Google OAuth app steps documented for the founder.
- **I3 stays parked** until something pulls it.

## Acceptance (per phase)

- I1: operator connects Kit from the dashboard Integrations screen and Test passes live; a Cal.com sandbox booking fires the webhook and appears as a normalized booking event; a Whop test payment (or Mark-paid) produces one payment row + one Discord alert + the onboarding email flow from [[synthesis/payment-onboarding-automation-spec]]; every card shows honest status; secrets never appear in any GET.
- I2: Google consent flow round-trips and the dashboard shows real calendar + YouTube Analytics data with freshness stamps; token refresh survives past the first hour.
- All phases: tenant isolation re-verified (client token cannot read operator or other-client rows); /api/health extended with per-integration status.

## What the founder must do (the honest user-side list)

Create the accounts that still don't exist (Kit, Wistia, Typeform — standing since 2026-07-01); create the Google Cloud OAuth app when I2 starts (spec will carry exact steps); pick Whop and/or Stripe as the webhook-capable payment rail if instant payment triggers are wanted (Mark-paid works regardless); approve Discord-webhook as the I1 alert channel.

## Open questions / gaps

- Fanbasis API/webhook capability — verify before promising anything (flagged above).
- Slack vs Discord as the standing ops channel — Discord is I1 by cost; Slack waits for a real client workspace.
- Whether operator-scope tokens should live in a separate D1 database from client rows — same DB with scope column assumed; Codex may overrule with reasoning.

## Connections

- [[synthesis/payment-onboarding-automation-spec]] — I1 builds its trigger layer
- [[synthesis/client-acquisition-renovation-2026-07-03]] — Today queue and portal tabs consume these events
- [[synthesis/funnel-portal-pipeline]] — the pipe all of this extends
- [[playbooks/pulsify-delivery-sop]] — the tools-per-client table this makes real

## Source trail

Founder instruction 2026-07-03 (this session); existing integration reality from [[synthesis/funnel-portal-pipeline]] and the deployed funnels source (client_config, masked secrets, resolveAccess, delivery_failures, /api/health); dashboard v2 backlog (Slack booking self-assign) from shared memory; provider capability claims: Kit v4 (in production use), Cal.com/Calendly/Whop/Stripe (general knowledge, verify exact event names at build), Fanbasis explicitly flagged unverified.

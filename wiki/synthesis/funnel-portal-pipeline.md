---
type: synthesis
tags: [funnel, landing-page, vsl, typeform, wistia, kit, portal]
sources: founder direction 2026-06-30 to 2026-07-01, local implementation in output/standard-preview
created: 2026-07-01
updated: 2026-07-18
---

# Funnel-to-portal pipeline

Every Pulsify landing page feeds one client-scoped data pipe. Wistia viewing,
Typeform applications, opt-in emails, and Kit delivery live on the same lead record
inside the portal.

## Why this matters for Pulsify

The landing page is part of the Funnel pillar, but the value is not the page alone.
Pulsify needs to see who arrived, what they watched, where they dropped, what they
submitted, and whether follow-up started. This turns the funnel from an asset into an
operating system the client can inspect.

## Core mechanics

Each browser receives a persistent visitor ID and a per-tab session ID. The landing
page passes both into the Typeform as URL parameters. Wistia events use the same IDs.
When the application arrives, the backend attaches the submitted email to the earlier
anonymous video session.

The shared Cloudflare pipe has four legs:

1. The page sends visits, CTA clicks, and traffic attribution.
2. Wistia sends player engagement from the embedded VSL.
3. Typeform sends the signed application webhook, or the gate page sends a native
   opt-in.
4. The backend writes the lead and engagement data to D1, then creates or updates the
   subscriber in Kit and applies the client's automation tag.

The portal reads the same D1 database and filters by client ID. It reports visitors,
play rate, watch time, average percentage watched, milestone retention, applications,
opt-ins, CTA clicks, Kit sync status, and per-lead viewing behavior.

Each acquisition page can also carry one prospect email and a random private-link
token. The `?lead={token}` share URL attributes page and Wistia activity to that
prospect before they apply. Dashboard previews use `?operator_preview=1`, which
suppresses event delivery so operator checks do not inflate the card's view count.
IP, country, city, and user agent remain supporting evidence in the activity drawer;
the private token is the stronger identity signal because IP addresses can be shared,
rotated, or masked.

## How Pulsify uses this

The first live implementation is Frank's funnel in `output/standard-preview/`.
New landing pages reuse the same script and backend. Their HTML changes the client ID,
page ID, copy, media, Typeform, proof, and Kit configuration. It does not fork the
tracking code.

Per-client credentials and media IDs are entered through the password-gated Settings
page. Secrets do not go into chat or client-side JavaScript.

The operator manages these pages from the Acquisition pages card library. Every card
shows active state, views, unique visitors, tracked-lead visitors, video plays, and
average watch depth. A single modal creates or edits the page, while the detailed
activity drawer, follow-up queue, advanced editor, and tracked off-page assets remain
available beneath the same surface.

The ADMIN_KEY-gated Links route is the operator directory for client access, internal
tools, infrastructure, and the current prospect-page library. Prospect links come
from the same acquisition-page data, so new pages appear without a second manual list.

## Connections

- [[synthesis/landing-page-standard]] — defines the page structure, skin, and required integration mounts.
- [[playbooks/pulsify-dashboard-workstream]] — the portal is the live funnel-health layer.
- [[frameworks/vsl-framework]] — governs the VSL, Typeform, and pre-call conversion path.
- [[concepts/hammer-them-strategy]] — Kit owns the email automation triggered by the captured lead.

## Open questions / gaps

- The shared API is hosted on the Frank Pages project. Move it to a neutral Pulsify
  funnel domain before a second public client is launched.
- Client-facing authentication still uses the admin gate. Add per-client access before
  clients log in directly.
- Cal.com booking and closed-revenue attribution are the next data legs. They are not
  part of this build.
- Consent copy and privacy policy need to be set per client's jurisdiction before paid
  traffic.

## Source trail

- Founder direction, 2026-06-30 to 2026-07-01.
- `output/standard-preview/`
- `output/portal-pipe/`

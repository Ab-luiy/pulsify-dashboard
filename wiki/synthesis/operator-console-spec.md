---
type: synthesis
tags: [funnel, scaling]
sources: founder direction 2026-07-04; output/standard-preview (settings.html, portal.html, integrations.html, campaigns.html)
created: 2026-07-04
updated: 2026-07-04
---

# Operator console: one admin page for the funnels system

The founder runs four separate admin surfaces on pulsify-funnels — /settings, /portal, /integrations, /campaigns — each reached by memorized URL, each asking for the admin key on its own, and full of fields that assume the reader already knows what a "Wistia media ID" or "webhook path secret" is. Founder direction 2026-07-04: unify them into one page where everything is a click away, and explain every field in plain language.

## Decision

Build a single-page operator console at **/admin** on pulsify-funnels. Frontend-only: zero changes to any function under `functions/` — the console composes the four existing UIs over the exact same API endpoints and admin-key header they use today.

## Why this matters for Pulsify

The funnels system is becoming the delivery backbone (landing pages, client portal, integrations hub, payments). The operator surface grew a page at a time and now costs the founder real friction: four unlocks, four URLs, undocumented fields. One console with one unlock is also the shape the productized version needs — a coach paying $10K does not get four URLs.

## Core requirements

1. **One unlock.** A single admin-key prompt on /admin. Stored in localStorage under one key (`pulsify_admin_key`); every tab reads it. Migrate/read any legacy per-page stored values so an already-unlocked browser stays unlocked. On 401, clear and re-prompt once, everywhere, with the same message.
2. **Information architecture.** Left rail with four sections, hash-routed so each is linkable:
   - `#clients` — everything from settings.html: client picker, new-prospect provisioning flow, page content editor, proof-wall images, portal-link mint.
   - `#delivery` — everything from portal.html: per-client content pipeline, call notes, assets, editable in place.
   - `#integrations` — everything from integrations.html: provider cards, masked secrets, Test buttons, Mark-paid.
   - `#campaigns` — the campaigns board as-is.
   A single shared client selector at the shell level: pick the client once, `#clients` and `#delivery` follow it.
3. **Every field explained.** Each input carries a one-line plain-English hint answering three things: what it is, where the founder gets it, and what happens if it is left blank. Required vs optional is marked. A "What do these mean?" drawer per section holds the fuller glossary (content below — embed it, do not paraphrase it into jargon). Written for a smart non-technical operator.
4. **Old pages stay live.** /settings, /portal, /integrations, /campaigns keep working untouched except for one banner linking to /admin. No redirects yet — the Lead Studio bridge and bookmarks depend on them. Retire later once the console has run for a while.
5. **Design.** Funnels skin tokens, light + dark, one accent, 8px spacing scale, no overflow at 390px. Same bar as integrations.html or better. No sample data anywhere (standing rule; instructive empty states instead).

## Field glossary (embed verbatim-in-spirit; keep this plain)

| Field | Plain meaning |
|---|---|
| Client ID | Short slug that identifies the client everywhere in the system (URLs, database). Set once when creating them; never change it afterwards. |
| Client name | The display name that shows on their landing page. |
| Landing page design | Which of the two page designs their landing page uses (the standard one or variant 2). |
| Wistia media ID | The short code of the VSL video hosted on Wistia — it is in the video's Wistia URL. Blank = the page shows a video placeholder. |
| Typeform link | The URL of the application form embedded on their landing page. |
| Typeform webhook secret | A password Typeform sends along when it notifies us of a new application, so fake submissions get rejected. Auto-handled; normally leave alone. |
| Kit v4 API key | From Kit (ConvertKit): Settings -> Developer -> v4 key. Lets the system add subscribers and send the onboarding email. |
| Kit tag ID | The number of the Kit tag new leads get added to; that tag drives the email automation. Find it in the tag's URL inside Kit. |
| Landing-page origin | The exact web address allowed to send visitor events to us (a security allowlist). Normally the pulsify-funnels domain, or the custom domain once one exists. |
| Proof-wall images | Direct image URLs for the eight proof screenshots on the landing page. Blank slots show a placeholder shimmer. |
| Client portal link | The tokenized login link you send the client; the Generate button mints a fresh one. |
| Webhook URL (Discord) | From your Discord channel: Settings -> Integrations -> Webhooks -> copy URL. Where application/booking/payment alerts get posted. |
| Webhook path secret | A random string baked into the webhook URL we hand a provider (Cal.com, Calendly, Whop) so only that provider can post to it. Auto-generated on first save; leave blank to keep it. |
| Stripe signing secret | From the Stripe dashboard after you create the webhook endpoint; proves payment events really come from Stripe. |
| Email template ID | Optional Kit template number controlling how the onboarding email looks. Blank = plain default. |
| Onboarding subject / preview text | The subject line and inbox preview of the automatic onboarding email sent when a payment lands. |
| Onboarding form URL / CO1 doc URL | The intake form and onboarding doc links included in that email. Defaults already point at the real Google Form and CO1 doc. |
| Sending email | Optional from-address for the onboarding email; blank uses the Kit account default. |
| Client contact name / email | Who the onboarding email greets and where it goes. |
| Booking URL | The client's Cal.com or Calendly link, shown where booking is offered. |
| Company ID | Only for providers that need an account identifier (e.g. Whop); optional. |

## Acceptance gates

- One paste of the admin key unlocks all four sections; a page refresh keeps the session; a wrong key never half-unlocks.
- Feature parity, clicked through per section: settings save round-trip, provisioning flow (copy prompt, generate, paste JSON, live link), proof-image save, portal-token mint, delivery CRUD (content items, call notes, assets), integrations CRUD + Test buttons + secrets stay masked on read, Mark-paid path reachable, campaigns board renders with real data.
- Every input has its hint; the glossary drawer matches the table above.
- The four legacy pages still work unmodified (banner aside).
- `tests/i1-checks.mjs` green; `git diff --stat` shows no changes under `functions/`.
- Builder self-review, then Claude cross-review, then deploy (`--branch main`), then live verification with the real key.

## Add-client wizard (v2 addendum, founder ask 2026-07-04)

Founder direction: adding a client should feel like a modern SaaS signup — one question at a time, big clickable option cards, required steps up front, everything else skippable with "Add later," so a client gets into the system with just a name and the rest fills in over time.

Backend precondition verified 2026-07-04: `functions/api/settings.js` merges partial payloads (absent fields keep their existing values — the old F3 wipe bug is fixed), so the wizard saves incrementally per step with no risk of clobbering earlier answers. Still zero backend changes.

**Entry points:** an "Add a new client" button beside the shared client selector, and the same button inside the #clients empty state.

**Flow** — full-screen overlay on /admin, one step per screen, progress dots, Back always available, "Save and finish later" visible from step 2 on (closing at any point keeps everything already saved):

1. **Name.** Client name text input; a permanent ID (slug) is auto-generated from it, shown, and editable before confirm (lowercase/dashes validation, live uniqueness check against the client list — if taken, say so and offer to open that client instead). Continue immediately creates the client (`POST /api/settings` with `client` + `client_name`). This step is the only required one: after it, they exist.
2. **What is this?** Two large select-cards: "Signed client" (continue the wizard) vs "Prospect page" (close the wizard and land them in the New prospect provisioning card with a note that the client ID is already created). Card squares, not radio buttons.
3. **Page design.** Two select-cards, Standard vs Variant 2, each with a small visual preview; saves `template_variant`. Skippable (defaults to Standard).
4. **VSL video.** Wistia media ID. Skippable.
5. **Application form.** Typeform link. Skippable.
6. **Email automation.** Kit tag ID + Kit v4 API key. Skippable.
7. **Proof wall.** The eight proof-image URL slots (or "add later" in one click). Skippable.
8. **Done.** A checklist summary: what is set, what is marked "To add later." Buttons: mint the portal link, preview the landing page, open the full Client setup form.

Every step reuses the exact field hints and glossary language already in the console. Each Continue fires a partial save; Skip fires none.

**Pending-setup visibility:** on #clients, when the active client is missing any of the wizard fields, show a small "Setup checklist" strip listing the pending items; clicking one opens the wizard at that step. This is how "to be added later" stays findable instead of forgotten.

**Out of scope for the wizard:** integration provider cards (Discord, Stripe, booking providers — they stay in #integrations), the creator-brief provisioning flow itself (step 2 routes to it), and anything requiring new API parameters.

## Open questions / gaps

- Whether /admin eventually absorbs a dashboard-style overview (payments feed, event log) — out of scope for this build; the hub's `integration_events` table makes it possible later.
- Legacy-page retirement date — founder's call after the console has been the daily driver for a while.

## Source trail

- Founder direction, session 2026-07-04 ("unify all of those together in one page… some variables or fields I don't understand at all").
- Live pages inventoried: `output/standard-preview/{settings,portal,integrations,campaigns}.html`.
- Auth pattern: `functions/_shared/common.js` (single ADMIN_KEY check for all four).

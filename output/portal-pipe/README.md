# Pulsify funnel pipe

The shared backend for every Pulsify landing page.

## What it does

Each page carries a `client` ID and a `page` ID. The shared integration script then:

1. records the visit, CTA clicks, and traffic source;
2. embeds that client's Wistia VSL and records plays, pauses, seeks, watch time, unique seconds watched, watch percentage, completion, playback rate, mute state, and exit position;
3. embeds that client's Typeform and passes a persistent visitor ID into the form;
4. joins the submitted email to the video activity that happened before submission;
5. accepts a native email opt-in when the funnel uses a gate page;
6. creates or updates the subscriber in Kit via API v4, then applies the client's Kit tag;
7. exposes the combined funnel record to the password-gated portal.

The deployed source of truth is `output/standard-preview/`. This folder is the architecture reference.

## Live routes

- `/` — Frank landing page
- `/optin` — optional email-gate page
- `/portal` — multi-client funnel portal
- `/settings` — per-client Wistia, Typeform, and Kit setup
- `POST /event?client=<id>` — shared event and webhook receiver
- `GET /leads?client=<id>` — secured portal data
- `GET /api/funnel-config?client=<id>` — public non-secret embed configuration
- `GET /api/clients` — secured client list
- `GET/POST /api/settings` — secured integration settings

## Add another landing page

The page needs:

```html
<body
  data-client="client-slug"
  data-page-id="main"
  data-api-origin="https://pulsify-frank.pages.dev">

  <div data-pulsify-wistia></div>
  <div data-pulsify-typeform></div>

  <script src="https://pulsify-frank.pages.dev/js/funnel-integrations.js"></script>
</body>
```

For a native gate page:

```html
<form data-pulsify-optin data-success="/training">
  <input type="text" name="name">
  <input type="email" name="email" required>
  <button type="submit">Continue</button>
</form>
```

Then create the client in `/settings`.

## Typeform setup

Create these URL parameters in the Typeform so the embed can pass identity and attribution:

- `client`
- `visitor_id`
- `session_id`
- `page_id`
- `referrer`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`

Set the Typeform webhook to:

`https://pulsify-frank.pages.dev/event?client=<client-id>`

Set a webhook secret in Typeform and save the same value in `/settings`. The backend rejects an invalid signature.

## Kit setup

Create a Kit v4 API key under Kit's Developer settings and a tag that starts the desired automation. Save both in `/settings`.

On either a Typeform submission or native opt-in, the pipe:

1. upserts the subscriber with `POST /v4/subscribers`;
2. applies the tag with `POST /v4/tags/{tag_id}/subscribers`.

Kit failures are recorded on the lead and never discard the application.

## Database

- `schema.sql` is the complete schema for a new D1 database.
- `migrations/0002_funnel_analytics.sql` upgrades the original Frank proof-of-concept.

The shared D1 database is client-scoped. One database can serve every landing page while the portal filters by client.

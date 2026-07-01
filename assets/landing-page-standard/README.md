# Pulsify landing-page standard

Use `output/standard-preview/` as the current reference implementation.

Every new page keeps the approved landing-page structure and skin, changes the client copy/media, and sets three integration attributes:

```html
<body
  data-client="client-slug"
  data-page-id="main"
  data-api-origin="https://pulsify-funnels.pages.dev">
```

Required mounts:

```html
<div data-pulsify-wistia></div>
<div data-pulsify-typeform></div>
```

Required shared script:

```html
<script src="https://pulsify-funnels.pages.dev/js/funnel-integrations.js"></script>
```

That gives every page the same Wistia, Typeform, opt-in, Kit, and portal pipeline without rewriting integration code per client.

Full setup and event coverage: `output/portal-pipe/README.md`.

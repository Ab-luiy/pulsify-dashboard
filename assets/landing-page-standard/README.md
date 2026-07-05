# Pulsify landing-page standard

This folder now holds the reusable landing-page assets instead of leaving the
standard trapped inside `output/`.

## Variants

- `canonical/` — the founder-approved default. This now mirrors the Frank mock
  promoted into placeholder form: VSL hero, Step 2 Typeform demo, student video
  case studies, centered two-column screenshot wall, final CTA.
- `variant-02/` — alternate design direction for the future picker. Same page
  spine and integration contract, but currently parked and not approved as the
  main look.

## Shared contract

Every new page keeps the approved landing-page structure, swaps in the client
copy/media, and sets three integration attributes:

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

## Placeholder conventions

Both templates use explicit placeholders such as `{{CLIENT_SLUG}}`,
`{{HEADLINE_LINE_ONE}}`, `{{HEADLINE_EMPHASIS}}`, `{{HERO_SUBHEAD}}`,
`{{HERO_CTA}}`, and `{{FOOTER_DISCLAIMER}}`. Proof stays mounted through the
fixed `data-proof-tag` slots so Claude's editor/picker can fill content without
rewiring the runtime.

Full setup and event coverage: `output/portal-pipe/README.md`.

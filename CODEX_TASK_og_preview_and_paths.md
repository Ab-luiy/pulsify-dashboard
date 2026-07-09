# CODEX TASK — link-paste preview cards (Open Graph) + clean per-lead path URLs

Self-contained spec. Repo: this checkout (Pulsify-Brain main). All work under
`output/standard-preview/` (the deployed pulsify-funnels source) plus the template
twins under `assets/landing-page-standard/`. Claude reviews the diff, deploys, and
verifies live — do NOT deploy yourself.

## Why (founder-approved 2026-07-09)

1. When a landing-page link is pasted in IG DMs / WhatsApp / iMessage, there is no
   preview card today — the templates have zero Open Graph tags. Founder wants: one
   SHARED preview image showing the page design, plus the lead's name in the preview
   title text, automatically for every client.
2. Outreach links currently look like `pulsify-funnels.pages.dev/?client=frank`.
   Founder wants clean per-lead paths: `pulsify-funnels.pages.dev/frank-wieler`.
   ~100+ lead pages expected next month, all on this one free Pages project.
   (A possible later rename to a neutral-named Pages project is an OPEN founder
   decision — build everything host-agnostic, derive origins from the request, never
   hardcode the host in new code.)

## Part A — Open Graph / Twitter tags

The shared preview image already exists (Claude generated it from the canonical
design): `output/standard-preview/assets/og-card.png` (1200x630 PNG, neutral default
copy, no client branding). Serve as a static asset.

1. In BOTH canonical template copies
   (`output/standard-preview/templates/canonical/index.html` and
   `assets/landing-page-standard/canonical/index.html`), add to `<head>`:

   ```html
   <meta property="og:type" content="website">
   <meta property="og:title" content="{{PAGE_TITLE}}">
   <meta property="og:description" content="{{META_DESCRIPTION}}">
   <meta property="og:url" content="{{OG_URL}}">
   <meta property="og:image" content="{{OG_IMAGE_URL}}">
   <meta property="og:image:width" content="1200">
   <meta property="og:image:height" content="630">
   <meta name="twitter:card" content="summary_large_image">
   <meta name="twitter:title" content="{{PAGE_TITLE}}">
   <meta name="twitter:description" content="{{META_DESCRIPTION}}">
   <meta name="twitter:image" content="{{OG_IMAGE_URL}}">
   ```

   Apply the same block to the variant-02 template twins too (parked design, but keep
   the head contract identical so it never drifts).

2. In `output/standard-preview/functions/index.js` (the render function):
   - Fill `OG_URL` = the canonical URL for this client: `${url.origin}/${client}` once
     Part B lands (path form, not the ?client= form).
   - Fill `OG_IMAGE_URL` = `${url.origin}/assets/og-card.png`. Derive from request
     origin — no hardcoded host.
   - Make the PAGE_TITLE default name-aware, same pattern as the existing BRAND_MARK
     fallback: when the client row has no PAGE_TITLE set, default to
     `${titleCase(client)} — Private Application` instead of the bare
     "Private Application". This is what puts the lead's name in the preview title
     with zero per-lead work. (META_DESCRIPTION default stays as-is.)
   - These two OG tokens are computed per-request — do NOT add them to
     DEFAULT_CONTENT or the /admin editable token set; they are not copy.

## Part B — path-based client URLs

Goal: `GET /frank-wieler` renders exactly what `GET /?client=frank-wieler` renders
today. Keep `?client=` working unchanged (existing sent links must not break).

Implementation sketch (your call on specifics, these are the constraints):
- A catch-all single-segment function (e.g. `functions/[slug].js`) that:
  1. FIRST passes through to static assets / existing routes: if the slug matches an
     existing static asset or a reserved route, `next()` untouched. Reserved at
     minimum: `settings`, `admin`, `campaigns`, `integrations`, `portal`, `client`,
     `optin`, `api`, `a`, `templates`, `assets`, `css`, `js`, `event`, `leads`,
     `favicon.ico`, `robots.txt`. Safer: attempt `env.ASSETS.fetch` first and only
     treat 404s as potential client slugs — reserved list as belt-and-braces.
  2. Cleans the slug with the same `cleanId` rules, looks it up in `client_config`.
     Row exists -> render via the same template+token pipeline as `functions/index.js`
     (refactor the shared render into `functions/_shared/` rather than duplicating).
     No row -> `next()` (falls through to 404/static behavior, NOT another client's
     page — mirror the F2 lesson: never default a miss to Frank).
- `functions/index.js` keeps handling `/` + `?client=` exactly as now, plus the new
  OG token fills.

Seed one row: duplicate the existing `client_config` row `client="frank"`
(template_variant + page_content_json) into a new row `client="frank-wieler"` so the
first real send link is `pulsify-funnels.pages.dev/frank-wieler`. Do it via a
migration-style SQL file if schema conventions require, otherwise document the exact
`wrangler d1 execute` statement for Claude to run against the remote DB — do not run
remote D1 commands yourself.

## Constraints

- Match existing code style in functions/ (plain CF Pages functions, no frameworks).
- Do not touch: landing-template body/sections (head block only), admin console
  behavior, event/leads/auth logic, deploy config.
- Convention from AGENT_CHAT: `/settings.html`-style clean-URL redirects collide with
  same-named function routes — the reserved-path pass-through must cover this.
- Verify locally what you can: `node --check` every touched JS file; confirm the
  template head parses (no stray `{{` left unreplaced by the render regex
  `\{\{(\w+)\}\}`).
- Leave a short summary of every file touched at the end of your run.

## Acceptance

1. `curl` of `/` and `/?client=frank` HTML contains the og: block with filled values
   (no literal `{{OG_...}}` remnants), image URL absolute on the request origin.
2. `/frank-wieler` returns Frank's rendered page (200, same content as
   `?client=frank-wieler`).
3. `/settings`, `/admin`, `/campaigns`, `/integrations`, `/portal`, `/a/x`,
   `/api/health` all behave exactly as before (no interception).
4. Unknown slug `/no-such-lead` does NOT render any client's page.
5. A client row with a custom PAGE_TITLE shows that title in og:title; a row without
   one shows "{Client Name} — Private Application".

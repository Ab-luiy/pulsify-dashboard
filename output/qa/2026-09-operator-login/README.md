# Operator login production release

Date: 2026-09-19

## Outcome

The Pulsify-owned Kendo-style login is now the operator entry surface. The public gateway, admin fallback and in-app sign-out all route to `/portal/login?operator=1`. Operator mode keeps the supplied split composition, hides the client credential form, uses the product mark, and presents one `Continue with Google` action. `/admin` remains protected by Cloudflare Access.

Cloudflare Pages production deployment: `2cbac2ca.pulsify-funnels.pages.dev`.

Canonical production domain: `https://pulsify-ai.com`.

## Live checks

- `https://pulsify-ai.com/` returned 200 and linked the operator card to `/portal/login?operator=1`.
- `https://pulsify-ai.com/portal/login?operator=1` returned 200 with `Welcome back` and `Continue with Google`.
- Anonymous `https://pulsify-ai.com/admin` returned 302 to Cloudflare Access.
- The immutable deployment URL served the same operator login.

## Verification

- `node tests/login-brand-browser.cjs` passed desktop and 390 px operator layouts with no overflow.
- `node tests/access.test.mjs` passed 3/3.
- `node tests/phase2-shell.test.mjs` passed 1/1.
- `node --check admin/console.js` passed.
- `node --check admin/phase1.js` passed.
- Wrangler compiled the Pages Functions bundle during deployment.

Rendered evidence:

- `login-operator-1536.png`
- `login-operator-390.png`

## Access configuration

The `Pulsify operator console` application is prepared in Cloudflare with `Accept all available identity providers` disabled, Google selected as the only provider, and instant authentication enabled. The settings are staged in the dashboard and require the final Save action. Until that save, clicking `Continue with Google` can still show Cloudflare's generic provider chooser.

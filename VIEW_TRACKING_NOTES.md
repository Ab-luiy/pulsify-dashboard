# View tracking handoff

Implemented funnel view tracking without changing the existing `/event`, `/api/campaigns`, or `/leads` response contracts. No landing template files were changed. Nothing was deployed.

## Files changed

- `output/standard-preview/migrations/0010_view_tracking.sql`
- `output/standard-preview/functions/event.js`
- `output/standard-preview/functions/a/[token].js`
- `output/standard-preview/functions/api/assets.js`
- `output/standard-preview/admin.html`
- `output/standard-preview/admin/console.js`
- `output/standard-preview/admin/console.css`
- `output/standard-preview/tests/view-tracking.test.mjs`

Migration: `0010_view_tracking.sql`

## Verification

- `node output/standard-preview/tests/view-tracking.test.mjs`
  - PASS: event, redirect, assets API, and regression checks passed.
- `node --check` passed for every changed or new JavaScript file.
- `node output/standard-preview/tests/client-integrations.test.mjs`
  - PASS: 7 passed, 0 failed.
- `node output/standard-preview/tests/i1-checks.mjs`
  - PASS: exited 0.
- ASCII scan passed for every changed file under `output/standard-preview/`.

## Commands for review and release

Run these from `output/standard-preview/` after reviewing the diff.

Apply migration 0010 to the live D1 database:

```powershell
npx wrangler d1 execute pulsify-portal --remote --file=migrations/0010_view_tracking.sql
```

Deploy the reviewed Pages build:

```powershell
npx wrangler pages deploy . --project-name pulsify-funnels --branch main
```

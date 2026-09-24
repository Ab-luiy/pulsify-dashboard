# Sentry monitoring

## Live state, 2026-09-24

- The founder's Sentry organization is `pulsify-37` in the EU data region, owned by `abod.louai@gmail.com`.
- `javascript-nextjs` receives browser crashes and API failures from the production Next.js app at `pulsify-ai.com/app`. The DSN is a public browser identifier embedded in `src/lib/monitoring.ts` in the sibling `pulsify-saas` repository. `NEXT_PUBLIC_SENTRY_DSN` may override it at build time. Nonproduction hosts do not send events unless `NEXT_PUBLIC_SENTRY_TEST=1` is set for a deliberate test.
- `pulsify-backend` receives uncaught Cloudflare Pages exceptions through the `@sentry/cloudflare` Pages middleware plugin in `functions/_middleware.js`. Its public DSN is the code fallback; an `SENTRY_DSN` environment binding may override it.
- Both projects have Sentry's active high-priority issue notification rule, delivered by email to suggested assignees or recently active members.
- Organization privacy settings scrub default sensitive fields and prevent storing IP addresses. The browser hook removes query strings and fragments from URLs. The Pages hook excludes user, request, breadcrumbs, extra context, exception messages, and stack locals. It reports exception type and code location for debugging.
- Verified local browser and Wrangler synthetic errors arrived in the correct separate projects. A fresh backend event displayed its IP as `<redacted>` and had no synthetic private token. All seven setup-generated issues were resolved after verification; the unresolved feed was empty. The final Pages deployment is `573a0366.pulsify-funnels.pages.dev`, with `/app/` working for a signed-in operator and anonymous route gates intact. Temporary test routes were removed.

## Operations

- Issues: `https://pulsify-37.sentry.io/issues/` (default feed shows unresolved issues).
- Browser source: `C:/Users/Abdullah/Desktop/pulsify-saas/src/lib/monitoring.ts`; build/export with `npm run release` from `pulsify-saas`, then deploy the synced `output/standard-preview` directory.
- Pages source: `functions/_middleware.js`. Install dependency with `npm ci` in `output/standard-preview`. The build needs `nodejs_compat`, declared in `wrangler.toml`.
- Verify before the next deploy: run frontend lint/typecheck and browser monitoring test; run the backend Node tests and `npx wrangler pages functions build --compatibility-date 2026-06-30 --compatibility-flags nodejs_compat`. Check production route gates and Sentry's unresolved feed after deploy.
- To temporarily stop browser reporting, remove/disable the Sentry initialization in the browser source and rebuild. To stop Pages reporting, remove the first `onRequest` plugin in `functions/_middleware.js` and redeploy. The public DSNs are identifiers, not authentication secrets.

Source maps are not uploaded to Sentry yet, so minified production stack traces may need code inspection to pinpoint a line. Add a build-time Sentry auth token and release/source-map upload before relying on exact original-source line mapping. Keep the auth token outside git.

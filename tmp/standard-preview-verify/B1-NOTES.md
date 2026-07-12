# Portal B1 notes

## Files changed

- `functions/api/client-integrations.js` - added portal-token-only client integration read, write, test, and delete handlers.
- `functions/_shared/integrations.js` - added YouTube, Instagram, and Zapier provider definitions and client status coverage.
- `tests/client-integrations.test.mjs` - added an in-memory mocked-D1 auth, isolation, masking, provider, delegated confirmation, delete, and test harness.
- `B1-NOTES.md` - recorded this handoff.

## Isolation guarantee

Every database operation uses the client resolved from the SHA-256 hash of `x-portal-token`; body and query `client` values are ignored.

## Test results

- `node --check functions/api/client-integrations.js` - pass.
- `node --check functions/_shared/integrations.js` - pass.
- `node tests/client-integrations.test.mjs` - 7 passed, 0 failed.
- `node tests/i1-checks.mjs` - pass.
- ASCII-only scan of the changed JavaScript and test files - pass.

## Uncertainty

None.

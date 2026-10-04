# Sales Co-pilot release evidence

Released 2026-10-04 from clean pushed pulsify-saas main `ee57922` to Pages deployment `0f6c908c`. Additive D1 migrations 0054, 0055 and 0056 applied successfully. Tickets #41-44 closed with release evidence.

- Final `npm run check`: lint, typecheck, static production build and 751 browser tests passed; 482 intentional skips. Three unrelated failures in the first broad run passed isolated reruns; the final full run passed without retries reported.
- Backend `node --test tests/*.test.mjs`: 223 passed, zero failures. Includes calendar targets, tenant boundaries, linked call context, manual and Anthropic follow-up paths, approval and stale draft protection.
- Browser checks cover writable client controls and operator review using API fixtures. The screenshots `scoreboard-phone.png` and `scoreboard-desktop.png` use labelled test fixture numbers, not client results.
- Live operator Example workspace: sales scoreboard and blank target editor loaded. Live Example client preview: scoreboard loaded, editing controls absent. `live-client-preview.png` records the read-only preview, not a password-authenticated client session.
- Live read-only API smoke: Team 200 with owner seed, both periods and zero targets; Calls 200; missing call follow-up 404. Unauthenticated build assets return 404 by design. `/app/release.json` remains behind operator sign-in.

Targets are unset until the client chooses them. Follow-ups require operator review and manual sending. No real client outcomes were entered for verification. Preview was exited after the check.

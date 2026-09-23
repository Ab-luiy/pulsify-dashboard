# PropelAuth client sign-in

The Pages app now supports PropelAuth OAuth2 with PKCE. It remains disabled until a linked client has passed a real sign-in test. The current client password/link login and operator Cloudflare Access login remain available. The existing Pulsify login page keeps its approved background and layout.

## Current state, 2026-09-23

- The founder created the Pulsify Cloud Project. Production Auth URL: `https://auth.pulsify-ai.com`. Cloudflare DNS has the provider's TXT verification record and a DNS-only `auth` CNAME to `ext.propelauth.com`; PropelAuth verified the domain and HTTPS responds.
- Production sign-up is invite-only and requires confirmed email. Test sign-up is also invite-only and requires confirmed email. The production frontend origin is limited to `https://pulsify-ai.com`, with login/logout fallback at `/portal/login`.
- A production OAuth client exists with redirect URI `https://pulsify-ai.com/api/propelauth/callback`. Its public Client ID is stored in the Pages production `PROPELAUTH_CLIENT_ID` secret. The one-time client secret was not copied or used; PKCE does not require it.
- `PROPELAUTH_AUTH_URL`, `PROPELAUTH_CLIENT_ID`, `PROPELAUTH_CALLBACK_URL`, and `PROPELAUTH_ENABLED=0` are installed on the `pulsify-funnels` Pages production environment. Migration `0037_propelauth_identities.sql` was applied and the table verified in remote D1. Pages deployment `8aede0d6` includes the dormant auth routes. Live `/api/propelauth/config` reports `enabled:false`; `/api/propelauth/start` returns 503; existing `/portal/login` returns 200.
- PropelAuth hosted login has a split layout and the Pulsify dark palette. The white Pulsify lockup, monogram favicon, and monochrome login hero were uploaded from `assets/brand/variations/05-lockup-white.png`, `assets/brand/variations/07-monogram.png`, and `assets/brand/login-hero-1600.jpg`. The live `https://auth.pulsify-ai.com/en/login` page was visually inspected after saving and shows the logo, dark form and hero image. The provider's free-plan footer remains green.
- Login methods: email/password remains enabled. Passwordless magic-link login was enabled on 2026-09-23 and verified visible on the hosted production login. Its production links retain the default one-use invalidation and human-confirmation interstitial. Authenticator-app (TOTP) 2FA is available by default as optional self-enrollment on PropelAuth's hosted account page; remember-device is enabled. SMS and mandatory 2FA are paid-plan features and remain off.
- Google login: the dedicated OAuth web client `Pulsify client login via PropelAuth` in Google Cloud project `pulsify-dashboard-496614` has production/test redirects `https://auth.pulsify-ai.com/google/callback` and `https://11944798960.propelauthtest.com/google/callback`. After the founder approved credential transfer, a new Google client secret was installed in PropelAuth, Google social login was enabled, and the hosted production page showed **Sign in with Google**. Clicking it reached Google's account chooser with the expected client ID and production redirect; no Google account consent or invited-client callback was completed. The unused original secret was disabled. No secret value was committed or logged. The Google consent app remains in Testing status with only two listed test users, and publishing is disabled until Branding is complete. Public `/privacy` and `/terms` currently return 404; Google requires a public home page and policy links for an external production app. Google is visible on the hosted page but is **not client-ready** until consent publishing and a real invited-client sign-in succeed.
- No client users or organizations have been linked. Keep `PROPELAUTH_ENABLED=0` until a real invited client is tested end to end. Operator Cloudflare Access is unchanged.

## Provider setup

1. Create a Pulsify PropelAuth account. Configure its login branding to match the existing Pulsify login, and keep registration invite-only.
2. Create a production OAuth client for the same site. Register this exact redirect URI: `https://pulsify-ai.com/api/propelauth/callback`. Copy the Auth URL and Client ID. The browser never receives a client secret; this integration uses the authorization-code flow with PKCE.
3. Create one PropelAuth organization for each Pulsify client workspace. Invite the correct client users. Never infer a workspace from an email address or domain.
4. Add `PROPELAUTH_AUTH_URL` (the HTTPS base Auth URL), `PROPELAUTH_CLIENT_ID`, and `PROPELAUTH_CALLBACK_URL=https://pulsify-ai.com/api/propelauth/callback` to the Cloudflare Pages production environment. Keep `PROPELAUTH_ENABLED` unset or `0` until the checks below pass. Use the Cloudflare dashboard or `wrangler pages secret put` for account credentials; do not commit them.
5. Apply `migrations/0037_propelauth_identities.sql` to the production `pulsify-portal` D1 database with `wrangler d1 execute pulsify-portal --remote --file=migrations/0037_propelauth_identities.sql`. The migration is additive and idempotent. The migrations tracker in this project is out of sync; do not use `migrations apply` blindly.

For each user, explicitly record the PropelAuth user ID, organization ID, and Pulsify client ID after checking the invitation and workspace ownership:

```sql
INSERT INTO client_provider_identities
  (provider, provider_user_id, provider_org_id, client_id)
VALUES ('propelauth', '<PropelAuth user ID>', '<PropelAuth organization ID>', '<Pulsify client ID>');
```

Use parameter binding or a carefully reviewed SQL file when executing this against D1; never paste IDs received from a client into a string-built command. A verified, enabled, unlocked PropelAuth user must also still belong to the mapped organization at every login. No identity is linked automatically by email.

## Acceptance before enablement

- Run `node --test tests/*.test.mjs` and `node tests/login-brand-browser.cjs` from `output/standard-preview`.
- Test an invited client in a staging environment with a separate OAuth client and callback URL. Confirm that a linked user reaches only their own `/portal` workspace, with an HttpOnly, Secure session cookie that expires in 12 hours.
- Confirm that an unlinked user, a user removed from the PropelAuth organization, and a user with a different client hint cannot sign in. Confirm that the operator Google path and existing password/link paths still work.
- Set `PROPELAUTH_ENABLED=1` in the target Pages environment only after its database links and OAuth callback have been tested. The new button then appears on the client password step. Revert to `0` to hide it immediately without affecting existing login paths.

This is a client login addition. It does not replace Cloudflare Access for operators or automatically migrate existing passwords/accounts. The production provider configuration, DNS, branding and database schema are installed. Linked-client acceptance remains before enabling the button.

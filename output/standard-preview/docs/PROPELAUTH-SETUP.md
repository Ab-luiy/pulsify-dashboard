# PropelAuth client sign-in

The Pages app now supports PropelAuth OAuth2 with PKCE. It stays disabled until the provider account exists and the Cloudflare variables are set. The current client password/link login and operator Cloudflare Access login remain available. The login page keeps the approved Pulsify background and layout.

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

This is a client login addition. It does not replace Cloudflare Access for operators or automatically migrate existing passwords/accounts. The live provider login cannot be accepted until the founder creates the PropelAuth account and supplies its Auth URL and Client ID through Cloudflare configuration.

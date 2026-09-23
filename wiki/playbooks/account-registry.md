---
type: playbook
tags: [funnel, scaling]
sources: [[Cloudflare dashboard 2026-09-17]], [[Meta Accounts Centre 2026-09-17]]
created: 2026-09-17
updated: 2026-09-17
---

# Account registry: which email owns what

The founder has several Gmail addresses with near-identical spellings and gets lost between them. This page is the one place that records which login owns each service Pulsify depends on. Check it before creating any new account or OAuth client, so ownership never splits across emails. Emails only, never passwords, keys or secrets (those live in Cloudflare project settings).

## The emails

| Email | Note |
|---|---|
| `abod.louai@gmail.com` | one "o". Cloudflare account owner. The Claude desktop app is signed in as this address. |
| `abood.louai@gmail.com` | two "o"s. Primary contact on the Meta Accounts Centre (Facebook profile "AB Luiy"). |
| `abod.steam@gmail.com` | contact on the Instagram profile `ab.luiy` inside the same Accounts Centre. |

They look like typos of each other. They are three separate Google accounts.

## Service ownership

| Service | Owning login | Verified |
|---|---|---|
| Cloudflare (account id `437f6dfbb738a4267395bd5da251494a`): Registrar for `pulsify-ai.com`, Pages project `pulsify-funnels`, D1, Zero Trust team `pulsify-ai` (login methods: Google + one-time PIN). Access application "Pulsify operator console" (id `bf9cabea-ebb7-4eee-b1de-d233623c0d77`) protects `pulsify-ai.com/admin` and `www.pulsify-ai.com/admin`, policy "Operator" allows only abod.louai@gmail.com, AUD tag `8c6c31dea1fa44e035c1449ec35f7d2a80601521be6d184fd5ed1d1a594af312`, certs at `https://pulsify-ai.cloudflareaccess.com/cdn-cgi/access/certs`. Second Access application "Pulsify operator dashboard" (id `a725e027-42e3-4447-a60b-4ed25c586d45`) protects `ops.pulsify-ai.com` (custom domain on the `pulsify-dashboard` Pages project, added 2026-09-17), same "Operator" policy, all IdPs, AUD tag `e2b36b7175a01dc8def8128bb52d160c629185b0196c36d706732220da2006f6`; curl confirms the 302 to Access. Google IdP Test run 2026-09-17: "Your connection works", identity abod.louai@gmail.com. Gap: `pulsify-funnels.pages.dev/admin` and `pulsify-dashboard.pages.dev` still bypass Access until middleware enforces the JWT (or the dashboard project stops serving pages.dev) | `abod.louai@gmail.com` | 2026-09-17, dashboard title and `wrangler login` record in AGENT_CHAT |
| Meta Accounts Centre: Facebook profile "AB Luiy", Instagram `ab.luiy`, Facebook Page "Pulsify" | `abood.louai@gmail.com` (primary contact), phone verified 2026-09-17 | 2026-09-17, Accounts Centre |
| Meta for Developers: app "Pulsify", App ID `1617160843090125`, Instagram use case, connected to business portfolio **abdul** (ID 221866223598606, clean, never ran ads) | `abood.louai@gmail.com` (Facebook "AB Luiy") | 2026-09-17, app dashboard |
| Meta business portfolio "Pulsify media" (ID 1198606604815844) | same login. **Ad-restricted since 2024-08-20, appeal window closed, Meta refuses deletion while restricted. Owns nothing. Ignore it.** | 2026-09-17, Account Quality |
| Nick's business (ad spend history) | `abod.steam@gmail.com` was added as admin there; that is where the founder's past ad running happened, not on abdul | founder statement 2026-09-17 |
| Google Cloud project "Pulsify Dashboard", project ID `pulsify-dashboard-496614`, number 689048215822. APIs on: YouTube Data v3, YouTube Analytics, YouTube Reporting. OAuth consent screen "Pulsify", External, **Testing mode** (only listed test users can sign in; cap 100; `abod.louai@gmail.com` is the first). OAuth clients: **Cloudflare Access** `689048215822-9tpevvc3odstpvqg2urm496g20gm8knf.apps.googleusercontent.com` (redirect `https://pulsify-ai.cloudflareaccess.com/cdn-cgi/access/callback`, secret lives in Zero Trust Google IdP); **Pulsify Portal** `689048215822-ca47cfg3tpe9isq6cjssbnurhchd5ek6.apps.googleusercontent.com` (origin `https://pulsify-ai.com`, redirect URI NOT set yet, Codex adds it when the callback path exists; secret stored as `GOOGLE_PORTAL_CLIENT_SECRET` on the pulsify-funnels Pages project). Two API keys from May 2026 restricted to YouTube Data v3 (lead scraper); quota is per project so no separate portal key | `abod.louai@gmail.com` | 2026-09-17, console |
| Resend: domain `pulsify-ai.com` Verified 2026-09-17, region us-east-1, DKIM + SPF CNAMEs (`send`, `rsend` -> forge.rmta.net) + DMARC p=none in Cloudflare DNS. API key "pulsify-funnels" (sending access only) stored as `RESEND_API_KEY` on the pulsify-funnels Pages project. Sender address: `hello@pulsify-ai.com`. Receiving is off | `abod.louai@gmail.com` | 2026-09-17, Resend dashboard |
| DocuSign **developer sandbox** (demo.docusign.net, account "Pulsify", display id 50558014, API Account ID `e99c7d55-a532-4732-a356-787ade631958`). Connect config "Pulsify portal provisioning" (id 22319453, Active): REST v2.1 JSON, SIM, Envelope Signed/Completed, include Custom Fields + Recipients, HMAC on, URL `https://pulsify-ai.com/api/docusign-connect`. Secrets on pulsify-funnels: `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_HMAC_SECRET`, `INTEGRATION_ENCRYPTION_KEY`, `EMAIL_FROM` (= `Pulsify <hello@pulsify-ai.com>`). **Demo envelopes are not valid contracts**; real client contracts need a paid DocuSign plan and the Connect config repeated there | `abod.louai@gmail.com` | 2026-09-17 |
| Fathom: API client "Pulsify portal" generated 2026-09-17 under the founder's Fathom user (settings show the free premium preview expired; API access was available anyway). Stored as `FATHOM_API_KEY` on pulsify-funnels. Fathom MCP is also connected to this Claude environment for reading meetings | founder's Fathom login | 2026-09-17 |

## Secrets inventory on the `pulsify-funnels` Pages project (names only, 2026-09-17)

2026-09-23 client-login addition: Google Cloud project `pulsify-dashboard-496614` also owns OAuth web client `Pulsify client login via PropelAuth` (`689048215822-m68avqr93s5v38tmoc8ht9dktkt5rcr6.apps.googleusercontent.com`). Its two redirects point to PropelAuth's production/test Google callbacks, not the existing Portal or Cloudflare Access callbacks. A new client secret was entered directly into the Pulsify PropelAuth project; no secret value is stored in this vault. The original unused secret was disabled. Google consent remains in Testing with two test users, so the hosted Google button is not client-ready. See `output/standard-preview/docs/PROPELAUTH-SETUP.md`.

`ADMIN_KEY`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_HMAC_SECRET`, `EMAIL_FROM`, `FATHOM_API_KEY`, `GOOGLE_PORTAL_CLIENT_SECRET`, `INTEGRATION_ENCRYPTION_KEY`, `RESEND_API_KEY`. All stored as encrypted Secrets via the dashboard (plain vars are wrangler.toml-managed). Values live only in Cloudflare.

## Secrets on Worker `pulsify-sync` (names only, 2026-09-18)

`YT_API_KEY` (same Google Data v3 key the scraper uses), `COMPOSIO_API_KEY` (Composio key "pulsify-sync worker", created 2026-09-18, full access; the older "IG to Claude Connect" key still serves GitHub Actions and the Claude bridge). `COMPOSIO_WEBHOOK_SECRET` not set. `INTEGRATION_ENCRYPTION_KEY` added 2026-09-18 (same value as Pages, both rotated together). `SYNC_ENABLED` is true in wrangler.toml as of Worker version c760b91d.

## Rules

1. Before creating any new service account, pick the owning email from the table and write the row here first.
2. Google Cloud and Cloudflare should sit on the same Google account if possible so the Cloudflare Access Google login and the portal OAuth client share one owner. The Cloudflare account is `abod.louai@gmail.com`, so that is the default for Google Cloud unless the founder decides otherwise.
3. The Meta app must be owned by the Facebook profile that admins the Page linked to the Instagram account. That is "AB Luiy" under `abood.louai@gmail.com`.

## Connections

- [[synthesis/pulsify-command-center-architecture-2026-09-17]] — the account list this registry serves.
- [[playbooks/landing-page-fill-in-playbook]] — landing pages now ship on `pulsify-ai.com`.

## Open questions / gaps

- Google consent screen is in Testing mode on purpose: same pattern as Instagram testers. Each client's Google account gets added under Audience > Test users at onboarding. Publish + verification only when a legal entity exists or clients exceed the cap.
- Meta Business Verification is SKIPPED: no registered entity (founder is a student). Clients connect as Instagram Testers on the app instead (App roles, tester invite, client accepts in IG settings). Revisit verification and App Review when there is a legal entity or more than a handful of clients.

## Source trail

- Cloudflare dashboard, 2026-09-17, account title "Abod.louai@gmail.com's Account".
- Meta Accounts Centre, Profiles and personal details, 2026-09-17.
- AGENT_CHAT.md line 440, `wrangler login` as abod.louai@gmail.com.

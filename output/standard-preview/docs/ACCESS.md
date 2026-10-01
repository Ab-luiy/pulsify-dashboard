# Who can sign in, and how to give access

One page for every way into Pulsify (founder, 2026-10-01). If someone cannot get in, start at
"Someone cannot get in" at the bottom.

The rule behind all of it: **access is an email address on a list.** A client gets in when their
email is the login email of a workspace. A team member gets in when their email is on the team
list. Password, emailed link and Google are only different ways of proving you own that email.
Nothing ever gives access without that match.

## The two lists

| Who | The list | Where you change it |
|---|---|---|
| Clients | The login email of each workspace (`client_auth`, one email per workspace) | Created when you approve a request or add a client. Shown on the client's setup. |
| Team | Owners: `OPERATOR_EMAILS` in `wrangler.toml`. Operators: added from the console (`operator_users`). | Owners: edit `wrangler.toml` and deploy. Operators: Settings > Team access, or approve a request as Operator. Only owners can add or remove operators. |

## Clients

### How a client gets an account

1. **They ask.** On the sign-in page they choose Client and either fill in Request access, or click
   Continue with Google. Google fills in their name and email for them, so it is one click.
   Nothing is created yet. You get a bell notification and an email.
2. **You approve.** Console > Clients > Waiting for approval > Approve (as client). This creates
   the workspace with their email as the login email and sends the welcome email with a link to
   set a password. The link works once and lasts 48 hours.
3. **They sign in.** With the password they set, or with Continue with Google using that same
   email. They do not need to set a password to use Google.

You can also skip step 1: Clients > Add client creates the workspace and sends the same welcome
email. A signed contract (DocuSign) does the same automatically.

### How a client signs in

- Email and password. Forgot password emails a one-time link (48 hours).
- Continue with Google, if the Google account's email is exactly their workspace login email.
  A different Google address (for example a personal Gmail when the workspace uses their business
  email) is treated as a new person and files a new request. Fix it by approving nothing and
  telling them which email to use, or by changing the workspace login email.

### Removing a client

Archive the workspace (Clients > the client > Archive). Their data stays; nobody can sign in to it
until you reopen it.

## Team

### How someone joins the team

- **Owners** (you and Asif) are in `OPERATOR_EMAILS` and can never be removed from the console.
- **Operators**: an owner adds them in Settings > Team access, or approves their request as
  Operator in Clients > Waiting for approval. They get an email saying they are on the team.

### How the team signs in

- Email and password on the Team tab. The first time, they click "Set or reset password" to get
  a one-time link (48 hours). A new device also gets a 6-digit code by email (10 minutes);
  ticking "Trust this device" skips the code for 30 days.
- Continue with Google, if the Google account's email is on the team list.

### Removing someone from the team

Settings > Team access > Remove. Their open sessions stop on their next click.

## Where the homepage sends people

Get started opens the Client or Team pop-up. After someone signs in once, that browser remembers
their side and the button says "Continue to Client portal" or "Continue to Team console", with a
small link to the other side. Clearing the browser's site data resets it.

## Turning on Continue with Google (one time)

The button stays hidden until both values below are set, so nothing breaks before then.

1. Google Cloud console (console.cloud.google.com), a project for Pulsify.
2. APIs & Services > OAuth consent screen: External, app name Pulsify, your support email,
   authorized domain `pulsify-ai.com`, scopes `openid`, `email`, `profile`. Then **Publish app**
   (status "In production"). While it says "Testing", only the test users you list can sign in,
   which looks exactly like a broken button for everyone else.
3. APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
   Authorized redirect URI: `https://pulsify-ai.com/api/google/callback` (exactly this).
4. Copy the Client ID and Client secret into the Pages project (`pulsify-funnels`):
   - `GOOGLE_CLIENT_ID` as a plain variable (add it under `[vars]` in `wrangler.toml`).
   - `GOOGLE_CLIENT_SECRET` as a secret: `npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name pulsify-funnels`.
5. Deploy. Continue with Google appears on both tabs.

The code is `functions/_shared/google-auth.js` (tests: `tests/google-login.test.mjs`). It only
accepts Google accounts with a verified email and checks that the sign-in was started on our
page (state, nonce and PKCE), so a link from elsewhere cannot sign anyone in.

The older "Use Google or a magic link instead" link on the Team tab is PropelAuth
(`docs/PROPELAUTH-SETUP.md`). It only shows when `PROPELAUTH_ENABLED=1`. With Continue with
Google on, you can leave it off.

## Someone cannot get in

| They see | What it means | Fix |
|---|---|---|
| "Incorrect email or password." | Wrong password, or that email has no workspace. | Check the email is the workspace login email. Have them use Forgot password. |
| "Request sent" / "Your request is in" | Their email has no workspace yet; a request is waiting. | Clients > Waiting for approval > Approve. |
| No welcome email | The email went to spam, or sending failed. | Ask them to check spam. Clients > the client > Setup sends a fresh setup link. |
| "Link expired" | The setup or reset link is older than 48 hours or was used. | They click the button on that page for a new one, or you send a fresh setup link. |
| "This account is not on the Pulsify team." | Their email is not on the team list. | Settings > Team access > add them (owners only). |
| "That Google account is on the Pulsify team. Use the Team tab to sign in." | A team member used Google on the Client tab. | Use the Team tab. |
| "This workspace has been archived." | The workspace is archived. | Reopen it from Clients. |
| "Google has not confirmed that email address yet." | The Google account's email is unverified. | Verify it with Google, or use the password. |
| Google button missing | Google is not set up, or the consent screen is still in Testing. | "Turning on Continue with Google" above. |
| Signed in with Google but got "Request sent" | Their Google email is not the one on the workspace. | Tell them which email the workspace uses, or change the workspace login email. |

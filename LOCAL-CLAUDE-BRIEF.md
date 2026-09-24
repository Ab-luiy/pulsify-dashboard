# Brief for local Claude: Pulsify skeleton sprint (2026-09-24)

You are the local orchestrator. You run on the founder's machine with the real
repos, credentials, Wrangler and Codex. A cloud Claude session prepared this
brief and the work below; it could not deploy or reach live APIs. Read `Pulsify-Brain/CLAUDE.md`, `pulsify-saas/CLAUDE.md` and the
tail of `Pulsify-Brain/AGENT_CHAT.md` before starting.

## Who does what

| Role | Owns |
| --- | --- |
| **Local Claude (you)** | Backend, data, API wiring, security, tests, migrations, deploy prep, reviewing Codex output, writing Codex task files |
| **Codex** | Every visual design decision: layout, typography, spacing, motion, charts' look, page composition |
| **Founder** | Decisions, credentials, provider setup, approving deploys, signed-in checks |

Rule: you never make design calls. When a task has a visual side, build the
data and behaviour first, then hand the visual part to Codex with a task file.

## The loop for every task

1. Claim the files on the Lock Board in `AGENT_CHAT.md`.
2. Build the logic and tests yourself (backend, API module, hooks, fixtures).
3. If the task has a visual side, write `Pulsify-Brain/CODEX_TASK_<name>.md`
   using the template at the bottom, then run Codex on it
   (`codex exec` in workspace-write, as the Lock Board history shows).
4. Review Codex's result: `npm run check` in pulsify-saas, backend tests in
   Brain, `npm run screens` and look at the images. Send it back to Codex with
   specific fixes if anything is off.
5. Hand to the founder: 3 to 5 lines covering what changed, screenshots,
   what they must do, and what you need decided. Never deploy without the
   founder saying "deploy".
6. Log it in `AGENT_CHAT.md` and `wiki/log.md`, release the lock.

## Step 0: land what the cloud session built (do this first)

1. **pulsify-saas PR 1** (`claude/eager-noether-do2efo`, draft). Most of it
   already landed in `main` through 8185e23 (release script, CI v5,
   page-header fix, Exit preview). What remains is the app half of the
   sign-in change: links to `/login/operator`, `/login/client` and
   `/api/operator-logout`. CI is passing. Mark it ready and merge it only
   together with step 2, because those pages come from the Brain branch.
2. **Brain branch `claude/auth-and-home`**, one commit on top of `main`,
   including this brief. Review it, then merge into `main`:
   `git fetch origin claude/auth-and-home && git merge origin/claude/auth-and-home`.
   Then run every `output/standard-preview/tests/*.test.mjs` (expect 48 of
   48 files passing). It contains:
   - **Operator sign-in on PropelAuth**, no Cloudflare Access screen:
     - `migrations/0038_operator_sessions.sql`
     - `functions/_shared/operator-session.js` (hashed tokens, `__Host-` cookie, 12 h, revocable, re-checked against `OPERATOR_EMAILS` on every request)
     - `/api/propelauth/start?as=operator`
     - `/api/operator-logout`
     - the middleware now accepts the operator session next to Access JWTs
   - **Code lock**: these return 404 unless the visitor is signed in:
     `/app/_next/static`, legacy `/portal/*.js`, `/shared/*.js` (except
     `theme.js`), `/onboard/*.js` and `/js/*`. Onboarding private links now
     issue a session.
   - **Placeholder public pages**:
     - `index.html`: headline, Get started, Operator or Client pop-up
     - `/login/operator`
     - `/login/client`
     - `/site/site.{css,js}`

     They work and pass the CSP rules, but **Codex redesigns them** (task D1).
   - `privacy.html` and `terms.html` drafts. Their `[BRACKETED]` placeholders
     need the founder: legal entity, address, contact email, jurisdiction and
     liability.
   - Security headers in `_headers`.
   - `privacy` and `terms` reserved in `functions/[slug].js`.
3. **Founder switches, in order**:
   1. apply migration 0038 to remote D1
   2. set `PROPELAUTH_ENABLED=1` on the Pages project
   3. invite themself in PropelAuth with an `OPERATOR_EMAILS` address and turn on 2FA
   4. deploy
   5. test operator and client sign-in
   6. only then delete the Cloudflare Access application that covers the `pulsify-ai.com` console paths
4. **Verify live**:
   - Signed out: `/app` goes to `/login/operator`, `/app/portal` goes to
     `/login/client`, and `/portal/legacy.js` returns 404.
   - Signed in: everything loads, and sign-out returns to the branded page.
5. **Link clients to PropelAuth**: each client needs a PropelAuth invite plus
   a row in `client_provider_identities` before "Continue" works for them.
   Until then they use the password link on `/login/client`.

## Task queue (in this order; Growth is deliberately last)

Owner key: **C** = local Claude, **X** = Codex, **F** = founder.

**D1. Public site and sign-in design** (X, then C reviews)
Redesign `index.html`, `/login/operator` and `/login/client` from the working
placeholders.
- **Founder's spec**:
  - logo and "Pulsify" top-left
  - one headline in the middle
  - the line "Your one stop for info, content creation, and building a
    7-figure audience."
  - a Get started button that opens a pop-up with a deep, dark drop shadow
    asking Operator or Client, each going to its own sign-in page
  - minimal, clean, native, no AI slop, no "Content → Offer → Funnel" arrows
- **Headline options** (the founder picks):
  - "Build the audience. Then the business."
  - "Content, clients and growth, run from one place."
  - "The system behind audiences that sell."
- **Hard constraints** (tell Codex):
  - no inline `<script>` or `<style>` and no `style=""` (the CSP forbids them)
  - no third-party requests (self-hosted Inter at `/shared/fonts`)
  - keep the `data-open-chooser`, `data-close-chooser`, `data-continue`,
    `data-password`, `data-notice` and `body[data-audience]` hooks that
    `/site/site.js` uses
  - `tests/entry-page.test.mjs` must still pass
- The PropelAuth hosted pages at `auth.pulsify-ai.com` should match: F sets
  their colours and logo in the PropelAuth dashboard to Codex's spec.

**S1. Today becomes to-dos only** (C logic, X layout)
Each row is one action with a button that takes you straight to where it's
done. Remove the leads list from Today.

**S2. Find conversations folds into the tracker** (C)
Replace the standalone page with a search bar inside the Outreach tracker.
Keep `/search` redirecting there.

**S3. Portal notification bell and power-button sign-out** (C logic, X icon placement)
- The client workspace gets a bell like the operator's.
- Sign-out is a power button in a corner, on both sides.

**S4. Media library "+" panel** (X, C wiring)
The expanded right sidebar looks bad; relayout.

**S5. Operator inbox, GoHighLevel style** (C data model and API, X UI)
- **Layout**: a list sorted by latest DM, then the conversation, then a right sidebar.
- **Pain-point tags**: premade and one click. Examples: "bad funnel", "new YouTube channel".
- **Tag scoring**: tags are read and ranked from strongest to weakest.
- **Next-action button (SOP)**:
  - If they replied to the opener, build a personalised asset.
  - If they didn't, send a ready-made asset matched to their strongest tag.
- **Follow-ups**: cycle their pain points and assets as hooks and jabs.
- **Reuse**: `functions/_shared/{outreach,outreach-queue,pipeline-touches}.js` and Codex's `lead-share.js`.

**S6. Client integrations by signing in, not API keys** (C, F)
- Clients connect their own services from their workspace with OAuth, starting the first time they sign in.
- F must create an OAuth app per provider: Kit, Calendly/Cal.com, Stripe, Google/YouTube, Meta. Meta may be limited without a registered business.
- Build the flow for each provider as F provides its credentials.

**S7. Client brain and onboarding** (C data, X design)
- The client brain UI is unfriendly and has to be rebuilt.
- Tie it to onboarding so the two feel like one flow.

**S8. Charts** (C endpoints, X design; use the dataviz approach)
- Overview charts: bars, pies, trends.
- All-time tracker redesign.
- Tracker widgets, fan-base style counts and an interactive calendar, on both the operator and client sides.

**G1. Growth section** (last; the founder wants to be in deep-work mode for it)
It isn't shippable in any form yet. Plan it with the founder before
building.

**A1. Instagram and YouTube content automation** (C research and advice first)
Give the founder suggestions and a build plan, then build inside the app.

## Facts to keep straight

- **Story notifications: No.** The Instagram API gives no event when someone
  posts a story. It only sends one when a story @mentions Pulsify. Auto cold
  openers and timed no-reply follow-ups are also unsupported (Codex found this
  on 2026-09-24).
- **Sentry**: it's live. When the privacy page ships, it must list Sentry;
  the draft on the branch already does.
- **The notifications bell** still sends integration alerts to
  `/admin?view=integrations`. Point it at `/app/integrations`.
- **Parked idea (don't lose it)**: build consulting into the software. On
  every call with a lead or client, the problems tackled, the do's and
  don'ts, the pain points and the bottlenecks become records in the app. The
  founder will spec this later.

## Security rules (non-negotiable)

- **Keep secrets server-side**: no secrets in the frontend or in
  `NEXT_PUBLIC_*`. Logic, prompts and scoring stay in Pages Functions.
- **No leaking pages**: no new public page may load app code. Public pages
  have no inline code and make no third-party requests.
- **Trust only the server for identity**: never trust a client id sent by
  the browser; the backend resolves identity.
- **Test the lock**: after each deploy, spot-check that signed-out requests
  for app code return 404.

## Codex task file template

```md
# CODEX_TASK_<name>
Owner: Codex (design). Reviewer: local Claude. Approver: founder.
Goal: <one sentence>
Founder's words: <paste the exact request>
Files you may edit: <list>. Do not touch anything else.
Data and behaviour already built: <hooks, API, props, test ids to keep>
Design rules: pulsify-saas docs/DESIGN.md tokens only, no hex in components,
Pulsify voice (plain, direct, no exclamation marks, no emojis), no AI slop,
works at 390px with no sideways scroll, light and dark.
Done when: <acceptance criteria>; `npm run check` passes; screenshots of
desktop and phone in both themes attached to the Lock Board entry.
No deploy, no commits to main without local Claude's review.
```

## Handing back to the founder

Every handoff is short:
- what changed
- screenshots
- what they must do, in order
- one decision needed, if any

No deploys without the founder saying "deploy".

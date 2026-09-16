---
type: synthesis
tags: [funnel, portal, dashboard, design-system, reference]
sources: live observation of https://app.kendo.ai on 2026-09-17 (public pages plus an authenticated session on the founder's own account)
created: 2026-09-17
updated: 2026-09-17
---

# Kendo app teardown: stack, design system, and what to copy

A complete outside-in review of Kendo (app.kendo.ai), an AI sales-manager SaaS, done from the login page through every authenticated screen. Kendo is a sales tool and Pulsify is not. This page is only about how the product is built and why it feels smooth, so the mechanics can be lifted into Pulsify's client portal and operator dashboard. Nothing here is a guess. Every claim came from the DOM, the CSS, the network log, or the response headers during the session. Where a fact could not be verified it is marked as such.

## Why this matters for Pulsify

The portal and dashboard are the productized delivery layer (see [[pulsify-portal-master-architecture]] and [[flagship-qa-2026-07-02]]). Clients judge the whole service by how those screens feel. Kendo is a good benchmark because it is a small team shipping a premium-feeling dark app on commodity parts. The lesson is not the parts, which are standard. The lesson is the handful of decisions that produce the polish. Those are listed in the "What to copy" section and are ordered by payoff.

## Stack (verified)

| Layer | What Kendo uses | How it was verified |
|---|---|---|
| Framework | Next.js App Router, Turbopack build, React Server Components | `_next/static/chunks/turbopack-*.js`, `?_rsc=` prefetches, `x-nextjs-prerender` header |
| Hosting | Vercel. HTML served from the fra1 edge, API functions run in iad1 (US East) | `server: Vercel`, `x-vercel-id: fra1::iad1::...` |
| Styling | Tailwind v4 with shadcn/ui components and tailwindcss-animate | oklab/lab color values, `@theme` variables, exact shadcn class signatures, `enter`/`exit` keyframes |
| Font | Geist, self-hosted through next/font, single variable file | `geist_*-module__variable` body class, one woff2 |
| Theme | next-themes, class strategy, default "system" | inline theme script in body, `html.dark`, `localStorage.theme` |
| Motion | Framer Motion for mount and stagger, CSS for everything else | inline `style="opacity:1; transform:none"` on animated wrappers |
| Toasts | Sonner | sonner keyframes in the stylesheet |
| Drag and drop | dnd-kit | `aria-roledescription="sortable"`, `DndDescribedBy` ids on KPI cards |
| Auth | Firebase Auth with App Check. Google, Microsoft, email link, password, passkeys, 2FA | `__FIREBASE_APPCHECK_STATE__`, `kendo-ai.firebaseapp.com` in CSP, `/api/auth/passkey/*`, `/api/auth/2fa/*` |
| Data | Firestore plus Firebase Storage for media | firestore in bundle, `firebasestorage.googleapis.com` in CSP media-src |
| API | Next.js `/api/*` routes plus a separate `api.kendo.ai` | both hosts in the bundle |
| Payments | Stripe | `js.stripe.com` in CSP, "Manage Billing" opens Stripe |
| Support | Intercom | widget script and cookies |
| Analytics | Vercel Analytics, GA4 via GTM, Microsoft Clarity, Meta Pixel plus server-side CAPI, Rewardful affiliates, a first-party tracker on t.kendo.ai | scripts in DOM, `/api/meta/capi` route |
| Video | Wistia, Vimeo, Fathom embeds allowed | CSP frame-src |
| Voice agent | voicereply.ai iframe with camera and mic permission | CSP and Permissions-Policy headers |

API auth is a bearer token in a header, not a cookie. A same-origin fetch to the dashboard bootstrap endpoint without the header returned 401. Security headers are strict: full CSP, `frame-ancestors none`, `x-frame-options DENY`, HSTS with preload, `x-robots-tag noindex` on API routes.

## Performance numbers (login page, cold, built-in browser)

| Metric | Value |
|---|---|
| Time to first byte | 463 ms |
| DOM interactive | 587 ms |
| Full load | 2.43 s |
| JavaScript transferred | 885 KB |
| CSS transferred | 43 KB |
| Requests | 101, most of them trackers |
| In-app page switch | about 150 ms of animation, no network wait |

The app is not unusually light. The smoothness comes from how navigation works, not from a small bundle.

## The five decisions that make it feel smooth

These are the actual mechanisms. Everything else is decoration.

1. **No routing between pages.** Every screen lives at `/dashboard`. The sidebar changes client state and the page component swaps. The document title updates. The URL does not. There is no route transition, no loading boundary, no layout shift. Deep links exist as `/?tab=scorecards&teamId=...` and get consumed on load.
2. **One enter animation on every page.** The page root is wrapped in `animate-in fade-in slide-in-from-bottom-1 duration-150`. A 150 ms fade plus a 4 px rise. That is the whole transition and it is identical everywhere.
3. **One global easing.** Tailwind's default transition timing function is overridden to `cubic-bezier(.16, 1, .3, 1)` (ease-out-expo) at 150 ms. Every hover, focus, and color change on the site uses it. Buttons transition only `filter, color, background-color, border-color, box-shadow`.
4. **Bootstrap once, cache locally.** On login one `dashboard/bootstrap` call returns the whole overview payload. Analytics, team health, date range preset, sidebar collapse state, selected tab, and "feature intro seen" flags are all persisted in localStorage under versioned keys (`teamAnalytics:v5:{team}:{range}`, `teamHealth:v1:{team}`). Reloads paint from cache while the network refreshes.
5. **Skeletons that match the layout.** Every loading state is a skeleton with the exact shape of the finished component (KPI grid, table rows, billing rows) using a slow 2.8 s shimmer. No spinners anywhere.

## Design tokens (dark theme, HSL triplets)

Kendo's dark mode is warm near-black, not neutral gray. The hue is 30 degrees (brown-orange) at 6 to 9 percent saturation. That warmth is why it reads as premium rather than "default dark mode".

| Token | Value | Rendered |
|---|---|---|
| background | 30 8% 6% | #110f0e |
| foreground | 40 16% 94% | #f2f1ed |
| card | 30 7% 9% | #191715 |
| card-raised | 30 6% 12% | |
| popover | 30 7% 10% | |
| muted / secondary | 30 6% 13% | #23211f |
| muted-foreground | 35 9% 60% | #a29b90 |
| accent | 30 6% 15% | |
| border / input | 30 7% 17% | #2e2b28 |
| ring | 40 8% 60% | |
| primary (accent orange) | 28 88% 60% | #f3933f |
| button-primary | 30 6% 16% | #2b2926 |
| button-primary-foreground | 40 16% 94% | |
| destructive | 0 84% 66% | |
| success | 142 65% 45% | |
| warning | 42 72% 32% | |
| sidebar-background | 30 9% 5% | |
| sidebar-border | 30 7% 17% | |
| chart-1 to chart-5 | 214 52% 68%, 24 60% 64%, 335 42% 64%, 240 40% 70%, 322 36% 58% | muted pastels, no neon |
| radius | 0.6rem | |

Light theme for reference: background 0 0% 98%, foreground 0 0% 12%, card white, primary 24 82% 48%, border 0 0% 88%, sidebar 36 4% 98.2%.

The most important token decision: **the primary button is not the accent color.** Orange is reserved for links, the active theme pill, and focus. Primary buttons are a raised neutral (`button-primary`). This keeps the screen calm and makes the one orange element on a page the obvious thing to click.

### Shadows (dark)

The dark-mode trick is a 1 px inner white hairline instead of a visible border.

```
--shadow-button:         inset 0 0 0 1px #ffffff0d, 0 1px 2px 0 #0000004d
--shadow-button-primary: 0 1px 2px 0 #0006
--shadow-elev-1:         inset 0 0 0 1px #ffffff0a, 0 1px 0 0 #0006
--shadow-elev-2:         inset 0 0 0 1px #ffffff0d, 0 1px 2px 0 #0006, 0 4px 8px -4px #0000004d
--shadow-card:           none
--shadow-card-hover:     0 4px 14px -6px #0006
```

### Gradients and texture

```
--gradient-sunset:      linear-gradient(135deg,#331f2b 0%,#442c36 24%,#2f2f4c 50%,#364963 74%,#795034 100%)
--gradient-sunset-cool: linear-gradient(135deg,#36212e 0%,#313154 45%,#395374 100%)
--gradient-sunset-warm: linear-gradient(135deg,#2b2b46 0%,#374e6c 45%,#845433 100%)
--gradient-sunset-dusk: linear-gradient(135deg,#392331 0%,#5a3544 45%,#845433 100%)
--gradient-sheen:       linear-gradient(105deg,#fff0 28%,#ffffff24 47%,#ffffff0a 53%,#fff0 64%)
--workspace-grain:      inline SVG feTurbulence fractalNoise, baseFrequency .78, 2 octaves, tiled at 180px
```

`.workspace-main-surface` is card background plus the grain tile, applied to the main scroll area and the sticky header. The grain is barely visible but it kills the flat "web page" look. The sunset gradient plus sheen plus a 16 px dot grid is the recipe for every feature-intro modal header.

### Type scale

Geist everywhere, weight 500 by default for labels and buttons, negative tracking on everything.

| Utility | Size / line / tracking / weight |
|---|---|
| text-h1 | 32 / 40 / -0.02em / 700 |
| text-h2 | 24 / 32 / -0.015em / 700 (rendered 500 on login) |
| text-h3 | 18 / 26 / -0.01em / 700 |
| text-body | 16 / 24 |
| text-body-sm | 14 / 20 |
| text-micro | about 11 px |
| text-2xs | 10 px |
| chart labels | 9 px |
| Page h1 | 28 / 36 / -0.025em / 500 |
| KPI value | 26 to 28 px / leading-none / -0.035em / 500 / tabular-nums |
| Table header | 10 px / 600 / uppercase / 0.08em |

Every number in the product is `tabular-nums`. Section eyebrows are 10 px uppercase with 0.1em tracking.

## App shell

- **Sidebar**: fixed, 254 px, `bg-sidebar`, right border at 80 percent opacity. Off-canvas below 1024 px with a `bg-black/20 backdrop-blur-sm` overlay. Header row 52 px with a 24 px logo and a 17 px bold wordmark. Workspace switcher is a 40 px outlined button with a 20 px initial-letter avatar in purple.
- **Nav item**: 34 px tall button, `rounded-md px-2.5 gap-2.5`, 16 px icon, label 13.5 px medium at 70 percent foreground. Hover raises text to full and adds `bg-muted/50`. The active state is a separate absolutely positioned `bg-muted border-border/70` layer behind the button, so it can slide as a pill, and the label becomes semibold. Section labels are 12 px medium at 80 percent muted, not uppercase. Disabled items show a 9 px uppercase "Coming soon" pill.
- **Sidebar footer**: a usage card with a black "Upgrade" pill, a segmented control (`bg-muted/60 rounded-md p-0.5`, active segment `bg-background shadow-sm`), and the remaining balance in tabular numbers.
- **Header**: sticky, 52 px, bottom border at 50 percent, grain surface. Left is a sidebar toggle and the page title in 14 px semibold. Right is a date-range button, a purple credits pill, and a 28 px avatar circle.
- **Main**: fluid, `px-2 py-4` up to `xl:px-6`, no max width on the overview. Settings-style pages cap at 880 px, coaching pages at 1080 px, the performance table at `max-w-screen-2xl`. Scrollbars are hidden with a `no-scrollbar` utility on every scroll container.

## Page-by-page

**Overview.** Launch Checklist card at the top: header row with a thin `h-1.5` progress bar, then a `divide-y` list of Radix Collapsible rows, each with a 32 px circle check, the title, integration logos, and a chevron. Open rows indent to 52 px and show a paragraph, 10 px pill badges, a small primary CTA and a ghost "Mark as completed". Below it a 4-column grid where the left 3 columns hold the activity heatmap and the KPI grid and the right column holds Live feed, "Need help", and a video card. The heatmap is GitHub style: 13 px cells, 2 px radius, 3 px gaps, 9 px month and weekday labels, a blue intensity legend. The KPI block is the best single component on the site: an outer `rounded-xl border bg-border overflow-hidden` wrapper with an inner `grid gap-px` so the cells share hairline dividers with no per-card borders. Each cell is a 156 px minimum flex column with an 11 px label, a 28 px tabular value, a 10 px description, and a footer with a delta and "limited data". Cells are dnd-kit sortable with a grab handle that appears on hover, and clicking a cell drills into that metric. Column order and visibility are saved per team.

**Performance.** A dense data table. Segmented control for Live vs Training calls, Filters and Columns buttons in a `rounded-t-md` toolbar that visually docks onto the table card. Sticky header, sticky first column, 10 px uppercase headers that are both sortable and draggable to reorder, 2290 px minimum width scrolling inside `max-h-[calc(100vh-305px)]`. Empty cells are not dashes, they are action prompts ("Add outcomes", "Mark offers", "Analyze calls") which is a good pattern for a portal where data is missing.

**Agent.** A centered chat launcher capped at 640 px: 44 px logo, h1 with a "Beta" outline pill in primary color, three status pills, a 1.5 px bordered textarea with an icon row, and suggested-question chips (`rounded-full border bg-background/60 px-3 py-1.5 text-[12px]`).

**Calls.** Master-detail split. Left column 350 px with a search input, a 3-way segmented control, filter chips, and a dashed-border empty state. Right column is a bordered detail pane with a centered "Select a call" empty state. On mobile the detail pane gets a "Back to calls" bar.

**Roleplay, Best Calls, Paths.** All use the same `page-header-shell`: an eyebrow, a 28 px medium h1, a muted subtitle, an optional status pill, and a right-aligned primary action. Best Calls uses underline tabs (`border-b-3 border-foreground` on active) and pill tabs with tabular counts. Paths uses a dashed-border empty state card with a 56 px `bg-primary/10 rounded-2xl` icon tile.

**Scorecards.** Four choice cards in a grid, each `rounded-xl border bg-card p-5 shadow-elev-1 hover:shadow-elev-2`, with an h3, a one-line summary, a "Best for" eyebrow paragraph, a small tag, and a full-width outline button. The "from scratch" card uses a dashed border plus a subtle radial highlight.

**Call Routing.** A node canvas. Dot-grid background (`radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)` at 18 px), 252 by 104 px nodes with a header strip, a 36 px icon tile, and 16 px connection ports. Toolbar with Editor, Runs, Versions underline tabs and a "DRAFT ONLY" pill. A frosted issue badge top-right and a zoom pill bottom-center. When prerequisites are missing the canvas is covered by a `bg-background/80 backdrop-blur-sm` overlay with a centered card. Note: this page installs an unsaved-changes guard that blocks sidebar navigation until you reload. That is a bug on their side, not a pattern to copy.

**Context.** Two-column settings layout: a 240 px left rail with a setup-progress card (eight segment bars) and a vertical nav where each item shows "0 of 8 filled" in tabular 11 px, then a right column of `divide-y` rows with a label on the left and a 280 px input on the right. "Autofill", "Clear", and a "Saved" indicator sit in the section header.

**Integrations.** A hero card reusing the login gradient photo, mirrored, with a left-to-right background fade, a 44 px integration icon tile, the description, a CTA, and a frosted feature list on the right. Below it a horizontally scrolling icon strip that switches the hero, then categorized grids. AI connectors (ChatGPT, Claude, Gemini, Grok, MCP) are listed as coming soon.

**Members.** Search plus two select filters and a primary "Add Member" in one card, then a table card with 9 px tall header cells and a member row showing avatar, name, "(you)", stats, last activity, and a Manage button. Below it Settings rows: team name with a 32-character limit, Stripe billing handoff, and a danger zone for deleting the team.

**Billing and Usage.** Section header (h3 body-size semibold plus a muted line) above a `divide-y` card of label-left value-right rows. Values render as skeletons until loaded. Usage adds a bar-chart empty state and a feature legend with colored dots.

**Account.** Underline tabs (Profile, Notifications, Security, Sessions). Profile card with a 56 px initials tile, stacked inputs, a locked email field with a "LOCKED" pill, and a footer "All changes saved" line with a "Saved" pill. Appearance card with Light, Dark, System pills where the active one is orange. Theme is stored per device.

## Feature-intro modals

Every major section shows a one-time intro dialog on first visit, tracked in `localStorage` under `kendo:featureIntroSeen:{uid}`. The recipe: Radix Dialog, `max-w 28.75rem`, `rounded-xl border bg-card shadow-elev-2`, overlay `bg-black/70 backdrop-blur-sm`, open animation `fade-in-0 zoom-in-95` at 200 ms. A 176 px header stack: sunset-cool gradient, sheen, 16 px dot grid at 70 percent, bottom fade to card, and a 64 px frosted icon tile (`border-white/25 bg-white/15 backdrop-blur-md`). Below it an h3, a muted sentence, three checked benefit lines with staggered Framer entrance, and a full-width primary button.

## What to copy into Pulsify, in order

1. Client-state page switching with the single 150 ms fade-and-rise wrapper. This alone closes most of the "feels slow" gap in the current portal.
2. The global ease-out-expo easing at 150 ms on every transition.
3. The warm-black token set above, with the raised-neutral primary button and a single accent color used sparingly. Swap the orange for Pulsify's accent; keep the discipline.
4. Inner-hairline shadows instead of borders on buttons and raised surfaces.
5. The KPI grid (gap-px over bg-border) with tabular numbers, 11 px labels, and drill-in on click. This is the dashboard product's core component.
6. Layout-matched skeletons with the slow shimmer. Remove every spinner.
7. Bootstrap-once plus versioned localStorage cache for analytics payloads.
8. The page-header-shell pattern so every page opens the same way.
9. Grain on the main surface.
10. Empty states that contain the next action, and missing data cells that say what to do instead of showing a dash.

## What not to copy

- The tracker stack. Seven analytics vendors on a login page is why it makes 101 requests. Pulsify needs Vercel or Cloudflare analytics and nothing else until there is a reason.
- The navigation guard on Call Routing that traps the user.
- The sales vocabulary and the specific pages. Pulsify's portal shows content, funnel, and offer health, not call scores.

## Deep pass: how the features connect (added same day)

The first pass covered every top-level page. This second pass opened every dialog, wizard, filter panel, menu, and gate that a free-trial account can reach. Where a feature is paywalled that is stated, not guessed.

### The product's spine

Kendo is one loop, and every screen is a view onto it: **calls come in -> a scorecard grades them -> the grades roll up into performance, coaching, and alerts**. Understanding that loop explains why the app feels coherent.

1. **Context** (Configure) is the shared brain. Eight sections, 52 fields, all free text: Company & Brand, Products & Pricing, Sales Scripts & Playbooks, Sales Methodology, Competitive Intelligence, Objection Handling, Buyer Personas, Sales Assets & Resources. Every AI feature (scorecard drafting, roleplay prospects, the Agent chat) reads from it, and each of those features tells you so ("Filling out the Context tab makes my suggestions sharper"). One source of truth, many consumers.
2. **Scorecards** (Configure) are the rubric. Categories carry percentage weights that must total 100. Criteria inside a category carry relative points and a Required flag. Four ways to create one: AI designer (chat plus up to 5 attached files), learn from 2 to 5 past calls, pick a template (MEDDPIC 7 criteria, BANT 4, NEPQ 7, Consultative 5, plus Discovery, Demo, Closing call templates), or blank.
3. **Call Routing** (Configure) decides which scorecard grades which call. A node canvas: source node (any source or a specific provider) connects to an assignment node (a scorecard). Tabs for Editor, Runs (an audit of every routing evaluation with matched, fallback, team-default, unmatched outcomes), and Versions (immutable published releases with restore). Draft until published.
4. **Calls** is the library. Three tabs: Live calls, AI roleplays, Upload (MP3, WAV, M4A, MP4, TXT, VTT, up to 50 files). Filters span role, job title, source, payment, deal outcome, provider, meeting type, import method, processing state, rep, and score band.
5. **Integrations** feeds the library. 21 connectors in six groups (meeting tools, dialers, CRM, payments, notifications, automation) plus Webhooks and a Push API. Payment connectors (Stripe, Whop) exist so revenue can be matched to the call that closed it, which is what makes "cash collected per call" possible.
6. **Overview, Performance, Best Calls, and the rep profile** are the read side. Overview KPIs click through to Performance. A Performance row clicks through to the rep profile (per-rep KPIs, missed opportunities, action items, all calls, performance profile, top objections, key strengths). Best Calls surfaces anything scoring 70 or more as a team film room.
7. **Roleplay and Paths** are the practice side. A prospect is a 3-step wizard (Buyer Profile, Scenario & Resistance, Voice & Configuration) with five entry points: AI conversation, manual, import from a website, from a past call, or Kendo recommendations from your context. A Path is a named sequence of up to 10 prospect steps. Roleplay minutes are the metered credit.
8. **Agent** is the chat layer over all of it, with three status pills (sources connected, calls analyzed, data sufficiency) so the user knows how much to trust the answer.

### Gating and monetization

- Free trial: 1 seat, 30 roleplay minutes, 300 live-call minutes, everything visible.
- Paywalled behind a plan: connecting any integration, adding team members. The gate is a small centered dialog ("Upgrade required" or "Paid plan required") with "Not now" and "View plans". View plans swaps the Billing page into a pricing view.
- Pricing: Pro at 46 dollars per user per month billed yearly (550 a year), Max at 83 (1000 a year), a monthly toggle, a G2 badge, and a "Talk to sales" line for SSO and done-for-you setup.
- Credits: workspace-shared, auto-reload optional, purchased through Stripe. Usage page breaks minutes down by feature and by member.
- Affiliate program through Rewardful, exposed as "Open Portal" on the Account page.

The pattern to copy is not the prices. It is that every locked action still renders fully, explains itself in one sentence, and routes to one upgrade surface.

### Onboarding mechanics

- First login: a "What's new" video modal, then an 8-step Launch Checklist card pinned to the top of Overview. Each step has a one-paragraph explanation, a primary CTA that deep-links into the right page, and a manual "Mark as completed". Step 4 completes itself when the system detects a scored call. Progress is stored server-side per user per team.
- Each section shows a one-time "Introducing X" intro dialog (gradient header, three benefit lines) tracked per user in localStorage.
- Empty states carry the next action. Table cells with missing data say "Add outcomes" or "Analyze calls" instead of a dash.

### Account and security surface

Profile (name, locked email, phone, photo), Notifications (about 25 individually toggled events, each tagged Email or In app and Required or Recommended), Security (password, Google, Microsoft, authenticator app, email verification, passkey, connected desktop apps), Sessions (sign-in activity grouped by IP). Theme choice is per device.

### Interaction details worth copying

- Header date range: a popover with 13 presets on the left, two month calendars, and a selected-range footer with Cancel and Update. One shared range drives every page and is persisted per user.
- Notifications bell and avatar menu are Radix menus with the same popover styling everywhere.
- Sidebar collapses to a 64 px icon rail, persisted.
- Workspace switcher lists teams and offers Create New Team. Everything is team-scoped.
- Performance table: Filters (role, job title, member, data availability) and Columns (show, hide, drag to reorder, grouped by Volume, Conversion, Revenue, Quality) both persist per team.
- Wizards guard exit with a "Discard unsaved prospect changes?" dialog. Call Routing guards with a native browser confirm, which is the one place the app feels cheap.
- No command palette. Ctrl+K does nothing.

### What stayed out of reach

Integration connect dialogs, Slack setup, webhook signing, member invites, and any screen that needs real call data are behind the paywall or behind having data. Voice provider for roleplay is not identified; the voice list (Brianna, Brian, Parker, Archie, Gemma and about 25 more with British, Australian, and Southern variants) looks like a third-party TTS catalog, but that is an inference.

## Open questions / gaps

- The internals of `api.kendo.ai` (queues, transcription, scoring pipeline) are invisible from the client and were not probed.
- Data was empty on a fresh account, so chart rendering (which library, how it animates) was not observed. The chart color tokens suggest Recharts or similar, but that is unverified.
- The date-range picker and avatar menu did not open in the narrow viewport during the session, so their internals are unrecorded.

## Source trail

- Live session on https://app.kendo.ai, 2026-09-17, founder's account via Google sign-in. Observations captured from the DOM, computed styles, stylesheet rules, localStorage keys, network log, and response headers.
- Raw notes: scratchpad files `01-public-teardown.md` and `02-app-shell-overview.md` from the session (not in the vault).
- Related: [[pulsify-portal-master-architecture]], [[portal-content-studio-spec]], [[flagship-qa-2026-07-02]], [[landing-page-standard]].

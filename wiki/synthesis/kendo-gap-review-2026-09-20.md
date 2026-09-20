---
type: synthesis
tags: [portal, dashboard, design-system, funnel, review]
sources: [[wiki/synthesis/kendo-app-teardown-2026-09-17]], [[wiki/synthesis/kendo-port-codex-brief]], live code under output/standard-preview on 2026-09-20, output/qa/2026-09-phase5/REVIEW.md and BUGFIX-RELEASE.md
created: 2026-09-20
updated: 2026-09-20
---

# Kendo gap review: what still reads as html in the Pulsify shells

A file-level, ranked list of the distance between app.kendo.ai (as documented in [[kendo-app-teardown-2026-09-17]]) and what the Pulsify operator console and client portal do today. Read-only review of `output/standard-preview` on 2026-09-20, after the September 20 bugfix release. Every "now" claim points at a file and line. Ranks: P1 changes the felt quality for an operator doing outreach all day, P2 is visible every session but not on the main path, P3 is polish.

The short version. The shell chrome (sidebar, header, date range, bell, view enter, KPI grid, login) is at or near Kendo level. What drags the product back to "html" is everything below the chrome: 11 of 17 operator sidebar destinations still render a different design system (five in iframes, six inside the Mirage dashboard document), the token set is missing the values that half the focus and shadow rules depend on, 28 of 31 nav items share one placeholder icon, and there is no single button or input primitive, so every view invented its own.

## Why this matters for Pulsify

The founder's rule for Phase 6 is that the product must not look like html next to Kendo. The portal and console are the productized delivery layer ([[pulsify-portal-master-architecture]]); a client judges the service by how those screens feel, and the operator lives in Outreach, Leads, Search and the bell for hours. Kendo's polish comes from a handful of decisions applied everywhere, not from better components. Pulsify has ported most of those decisions to the shell and then stopped at the view boundary. This page is the punch list for closing that.

## Already at Kendo level (one line each, move on)

- Login page (`portal/login/auth.css`): warm-black, 28/500 h1, raised-neutral primary, 150 ms rise, hairline inputs. Done.
- Shell tokens for the core surfaces (`shared/shell.css:1-2`): background, card, card-raised, popover, muted, border, primary, button-primary all match the brief.
- Global easing and duration variables (`shell.css:1`, `--ease` and `--dur`) exist and shell.css itself uses them.
- Single view-enter animation on `main` with reflow retrigger (`shell.js:18`, `shell.css:3 .view-enter`) plus reduced-motion opt-out.
- Sidebar: 254 px, 64 px collapse persisted, off-canvas below 1024 with blur overlay, 34 px nav rows, 12/500 section labels (`shell.css:3`, `shell.js:21-22`).
- Header: sticky 52 px, 14/600 title, collapse toggle, date range, bell, 28 px initial avatar (`shell.js:12`).
- Date range popover with 13 presets, two calendars, selected-range footer, preset persisted by name (`shell.js:7-9, 29-33`).
- KPI grid with gap-px over border, 156 px cells, 28 px tabular values, drag reorder, hide/show, drill-in (`surface.css:5-14`, `surface.js:16-35`).
- Skeleton class with the 2.8 s shimmer (`shell.css:3 .skeleton`). No spinners anywhere in the new code.
- Bell dropdown: anchored under its trigger, fade plus 4 px, day groups, All/Unread tabs, expand in place, Escape closes (`notifications.js`, `shell.css:41-72`).
- Feature-intro dialog, launch checklist, gate dialog (`surface.js:12-14, 38-54`).
- Table header style 10/600 uppercase 0.08em (`integrations-view.css:32`).
- Document title per view in the `View — Workspace | Pulsify` form (`shell.js:18`).
- Bootstrap cache in localStorage keyed by range (`admin/phase1.js:32, 35`; `portal/phase1.js:3`).

## The gaps, ranked

### P1. Six operator views render the Mirage dashboard inside the warm-black shell

Kendo: one design system on every screen (teardown, "Design tokens" and "App shell").

Now: `admin/phase1.js:4` routes `crm, instagram, youtube, content, health` and the overview cards `metrics, plan, income, payouts, cashflow, calendar, dashboard` into `admin/native-dashboard.js`, which fetches the 545 KB `admin/dashboard.html`, strips its scripts, mounts the whole document into `main` and re-executes the scripts (`native-dashboard.js:23-33`). That document carries its own palette: `--bg:#0c0712`, `--dashboard-accent:#f472b6` (pink), `--cyan:#c4b5fd`, `--violet:#d946ef`, `--pink:#fb7185`, JetBrains Mono on every number (`.kpi .k`, `.pay-table .amt`, `.legend .num` and about 30 more selectors), a serif italic quote block, and nine keyframes including `mirageDrift`. `shared/surface.css:26-27` overrides only `--text`, `--bg`, `--card-bg`, `--surface`, `--line` and the panel backgrounds; the accent, the neon chart colors and the mono font survive.

Why it reads as html: the sidebar is warm black with a green accent, then CRM opens in pink and lavender with a different number font. That is the single most obvious tell to anyone who has seen Kendo.

Fix: two options, and the second is the real one.

1. Short term (about 40 lines in `shared/surface.css`): under `.native-dashboard`, override `--dashboard-accent`, `--dashboard-accent-dim`, `--cyan`, `--blue`, `--orange`, `--violet`, `--pink`, `--success`, `--warn`, `--danger` to the shell tokens and the five muted chart HSLs from the brief, set `font-family:Inter` with `font-variant-numeric:tabular-nums` on every selector that names JetBrains Mono, and kill `mirageDrift`, `pulseOrbit`, `ringIn` under `.ps-shell`.
2. Real fix (Batch 3 below): extract CRM, Instagram, YouTube, Content and Health as native views the way Outreach and Leads were, on `ps-page-header`, `ps-metric-grid`, `int-table` and `contact-row`. Plan, income, payouts, cash flow and calendar can stay on the override until they are rebuilt.

### P1. Five operator views still live in iframes

Kendo: no routing, one document, sidebar swaps client state (teardown, "The five decisions", item 1).

Now: `admin/phase1.js:22` creates an `<iframe class="ps-frame" src="/admin/console-view.html?view=...">` for every view that is not overview, search, outreach, leads, payments, integrations, settings or a dashboard view. That is `home` (Clients), `delivery` (Client work), `brain` (Client brain), `campaigns` (Acquisition pages) and `email`. Each iframe loads `console-view.html` with seven stylesheets (`console-view.html:4-16`), Google Fonts Inter plus JetBrains Mono, `console.js` (211 KB) and `console.css` (62 KB), and stays alive in a Map, so an operator who touches all five holds five copies of the console. The frame is `height:calc(100dvh - 110px)` (`shell.css:3 .ps-frame`), which gives a nested scroll area inside the page scroll. Theme is pushed by postMessage after load (`phase1.js:22, 33`), so the first paint of each frame is whatever `console.css` defaults to before the message lands. In light mode the frame keeps `admin/workspace.css:1` purple `#7862ce` because `shell.css` only remaps `--ui-*` under `html[data-theme=dark]` (`shell.css:2`).

Why it reads as html: the double scrollbar, the blank frame on first open, the flash before the theme message, the second font load, and the view-enter animation playing on `main` while the frame is still empty.

Fix: port each of the five as a native view module (`admin/clients-view.js`, `delivery-view.js`, `brain-view.js`, `campaigns-view.js`, `email-view.js`) rendering into the `owned` section the way `leads-view.js` does. The data calls already exist in `console.js`; the work is lifting the render functions out and dropping them onto `ps-page-header`, `int-table`, `set-section` and the dialog helper. Estimate 150 to 300 lines per view, Clients first since it is the operator's home. Until then, at minimum add a `.skeleton` placeholder over the frame until its `load` event, and remove the frame height so the page scrolls as one.

### P1. The token set is missing the values half the rules depend on

Kendo: full token set including ring, destructive, success, warning, chart-1 to 5 and six shadow variables (teardown, "Design tokens" and "Shadows"). The brief copies this list verbatim (brief 2.1).

Now: `shared/shell.css:1-2` defines background through button-primary and stops. Never defined anywhere in the tree: `--ring`, `--destructive`, `--success`, `--warning`, `--chart-1` to `--chart-5`, `--shadow-button`, `--shadow-button-primary`, `--shadow-elev-1`, `--shadow-elev-2`, `--shadow-card`, `--shadow-card-hover`. Consequences that are live today:

- Every input focus rule is dead. `shell.css:25 .set-input:focus`, `integrations-view.css:49 .int-form input:focus`, `:58 .leads-search:focus`, `:113 .sr-input:focus` all set `outline:none` and then `border-color:hsl(var(--ring))`, which is invalid and dropped. Result: clicking into any input in Settings, Leads, Search or a connect dialog removes the outline and shows nothing. (The onboarding page avoided this by hardcoding `hsl(40 8% 60%)` at `onboard/phase4.css:24`.)
- `surface.css:18 .ps-surface-dialog{box-shadow:var(--shadow-elev-2)}` resolves to none, so the intro, gate and metrics dialogs float with no elevation.
- Warning and destructive colors are hardcoded hex in 14 places: `#e0b050` (`shell.css:61`, `integrations-view.css:20, 24, 79, 88, 96`) and `#cf7a6a` (`shell.css:35, 37, 42, 61`, `integrations-view.css:54`, `onboard/phase4.css:31, 38`). None of them shift with the light theme.

Fix: add the missing lines to both blocks in `shell.css:1-2` (about 25 lines total, values from the brief), then replace the hex usages with `hsl(var(--warning))` and `hsl(var(--destructive))`. Grep for `--ring` afterwards and confirm every focus rule now paints.

### P1. 28 of 31 sidebar items show the same placeholder icon

Kendo: 16 px icon per nav item, one glyph per destination (teardown, "App shell", nav item).

Now: `shared/shell.js:4` ships eight paths (grid, menu, bell, arrow, calendar, people, chart, settings) and `shell.js:5` falls back to `grid` for anything else. `admin/phase1.js:3` assigns icons to three items (overview, home, leads); the other 14 get the grid. `portal/phase1.js:7` assigns none; all 14 client items get the grid. The Phase 5 screenshot `bugfix-integrations-desktop.png` shows a column of identical four-square glyphs from Search down to Settings.

Why it reads as html: a repeated placeholder icon is what a scaffold looks like before the designer arrives. It is the first thing the eye lands on.

Fix: add about 20 lucide-style 24-box paths to `shell.js:4` (search, message-circle, users, instagram, youtube, film, briefcase, brain, layout, mail, plug, credit-card, heart, settings, calendar, image, pen, bar-chart, home, link) and set the third element on every nav tuple in `admin/phase1.js:3` and `portal/phase1.js:7`. About 40 lines. Also switch `.ps-icon svg` stroke-width to 1.75 and give the active row a foreground icon so the icon and label change together.

### P1. There is no button primitive, so there are six

Kendo: two button roles. Primary is the raised neutral with `--shadow-button-primary`, secondary is card colour with the 1 px inner white hairline, both 36 to 40 px, medium weight, brightness on hover (teardown, "Design tokens", "Shadows"; brief 1.3 and 2.1).

Now: the only shared class is `.ps-control` (`shell.css:3`): 32 px min-height, 12 px regular text, 6 px radius, a real `border:1px solid` instead of the inset hairline, no hover state at all, and no transition. The raised-neutral primary is copy-pasted three times with `!important`: `.set-primary` (`shell.css:34`), `.int-primary` (`integrations-view.css:28`), `.ps-bell-primary` (`shell.css:69`). The portal has its own `.ws-button` (`portal/workspace-shell.css:2`): accent-filled, 12/600, 9 px radius, patched to button-primary by `portal/phase1.css:1`, while `.ws-slot button.primary` still fills with `var(--ws-accent)` (green) on the studio screens. Onboarding has `.button.primary` at 40 px and 12 px radius (`onboard/phase4.css:26-30`). Login has `.primary-button` at 40 px and 12 px radius (`auth.css:2`). Five radii across the product for the same element.

Why it reads as html: a 32 px, 12 px-text, bordered button next to a 40 px, 13 px, hairline button is the clearest sign nobody owns the system.

Fix: in `shell.css` define `.ps-button` (36 px, 13.5/500, radius `var(--radius)`, `box-shadow:var(--shadow-button)`, no border, transition on filter/color/background-color/border-color/box-shadow, hover brightness 1.1, active .95, disabled opacity .5) plus `.ps-button.primary` (button-primary tokens, `--shadow-button-primary`) and `.ps-button.ghost`. About 30 lines. Then alias: make `.ps-control` an alias of `.ps-button` and `.set-primary`, `.int-primary`, `.ps-bell-primary` aliases of `.primary` and delete the `!important` copies (`shell.css:34, 69`, `integrations-view.css:28-29`). Bring login and onboarding onto the same 36 px and radius values.

### P1. Inputs come in three heights and none of them show focus

Kendo: one input, 40 px, `--input` border, ring on focus, the inner hairline shadow (teardown, "Context" page; brief 2.1).

Now: `.set-input` 40 px radius 8 muted background with the hairline (`shell.css:23`), `.leads-search` 32 px radius 6 no hairline (`integrations-view.css:57`), `.sr-input` 44 px radius 10 (`integrations-view.css:112`), `.int-form input` 40 px radius 8 (`integrations-view.css:48`), `.ot-note textarea` with no focus rule at all (`integrations-view.css:108`), `.ob-connect-row input` its own set (`onboard/phase4.css:55`), login `input` 40 px radius 8 with a real ring (`auth.css:2`). As covered above, every focus rule in the shell and view stylesheets references the undefined `--ring`.

Fix: one `.ps-input` in `shell.css` (40 px, radius `var(--radius)`, `hsl(var(--muted))` background, `--shadow-button` hairline, focus `border-color:hsl(var(--ring))` plus `0 0 0 3px hsl(var(--ring)/.25)`), and `textarea.ps-input`, `select.ps-input`. About 15 lines. Replace the five classes with it; keep `.leads-search` at 36 px by a modifier, not a second definition.

### P1. Skeletons stop matching the layout once you leave the overview

Kendo: every loading state is the exact shape of the finished component (teardown, "The five decisions", item 5; brief 1.4).

Now, the good cases: overview KPIs and cards (`admin/phase1.js:27`), integrations hero plus six cards (`integrations-view.js:82`), the new `contact.skeleton()` rows in Outreach (`admin/contact-row.js:41-43`, uncommitted as of this review, Codex is mid-change on `outreach-view.js`). The rest:

- Settings paints one 200 px block for the nav and one 400 px block for the body (`settings-view.js:18`); the real page is seven bordered sections with rows.
- Leads paints a single 220 px block (`leads-view.js:45, 54`) and repaints it on every tab and filter click, so the table flashes to grey each time even when the data is already in `cache`.
- Search paints a single 160 px block (`search-view.js:40`).
- Outreach stats paint one 120 px block (`outreach-view.js:39`) where eight KPI cells will land.
- Push API keys, webhooks and payment matching each paint a 64 px block (`integrations-view.js:120-123`) and then expand to a table.
- Native dashboard paints eight KPI skeletons (`native-dashboard.js:22`) and then replaces them with a 545 KB document whose own scripts re-render everything, so the page jumps twice.
- Pending states are label swaps: `Saving…` (`settings-view.js:51`), `Creating storyboard…` (`workspace-shell.js`), `Queued` (`integrations-view.js:182`), and the button text is replaced by an error string on failure (below).

Fix: give each view a skeleton that mirrors its final DOM. Settings: seven `.set-section` shells with three `.set-row` skeleton lines each (about 12 lines). Leads: six `contact-row` skeletons via `PulsifyContact.skeleton()` and never repaint the skeleton when `cache[tab]` exists (about 8 lines). Search: three `.sr-hit` shaped rows (6 lines). Outreach stats: eight `.ot-stat` cells with two bars each (6 lines). Integrations tables: a header row plus three body rows (10 lines each). Add a `.ps-button.pending` state (opacity .7, cursor wait, label stays) instead of label swaps.

### P1. Error copy leaks status codes and overwrites buttons

Kendo: every error is a sentence and every empty cell is an action ("Add outcomes", "Analyze calls") (teardown, "Performance" page; brief 2.4).

Now: five view helpers throw `HTTP ${r.status}` when the server gives no message (`leads-view.js:20`, `search-view.js:11`, `outreach-view.js:28`, `settings-view.js:15`, `integrations-view.js:44`), and that string is painted into the page as the empty state. On write failures the button label becomes the truncated error: `button.textContent = e.message.slice(0, 30)` (`outreach-view.js:157`), `.slice(0, 40)` (`leads-view.js:142`, `integrations-view.js:127`), `"Retry disconnect"` (`integrations-view.js:128-129`). `surface.js:4 notice()` and `admin/phase1.js:32` prepend a bare `<p class="ps-error">` above the h1 with no icon, no dismiss and no retry (`shell.css:3 .ps-error` is a bordered box and nothing else). The workspace switcher appends the raw error as a paragraph inside the menu (`shell.js:25`).

Fix: one `PulsifyShell.fail(status, fallback)` that maps 401 to "Your session ended. Sign in again.", 403 to "You do not have access to this.", 404 to "That record is gone.", 429 to "Too many requests. Wait a moment.", 5xx to "Pulsify is having trouble. Retry in a minute." (about 15 lines in `shell.js`); replace the five `HTTP ${r.status}` throws with it. Add `.ps-inline-error` (12 px, destructive colour, appears under the control that failed) and use it instead of swapping button labels (about 10 lines CSS, five call sites). Restyle `.ps-error` as a card with a leading icon and a Retry button.

### P1. Tables clip on mobile and the frame scrolls inside the page

Kendo: the performance table scrolls horizontally inside its card with a sticky first column; the calls list becomes a single column with a "Back" bar on mobile (teardown, "Performance", "Calls").

Now: `.int-table{overflow:hidden}` (`integrations-view.css:30`) wraps the six-column Leads inbox table (`leads-view.js:80`), the six-column funnel table (`:99`), the five-column keys and webhooks tables and the payment matching tabs. At 390 px the right columns are cut off with no scroll; the only mobile rule shrinks `.leads-text` (`integrations-view.css:72`). The native dashboard sets `overflow-x:clip` on itself under 520 px (`surface.css:29`), which clips the kanban and the payment tables instead of scrolling them. Iframe views are `calc(100dvh - 110px)` tall (`shell.css:3 .ps-frame`), a nested scroller on a page that also scrolls. The bell panel and the sidebar are fine on mobile (bugfix-bell-mobile.png).

Fix: `.int-table{overflow:auto}` with `table{min-width:640px}` and `th:first-child, td:first-child{position:sticky;left:0;background:hsl(var(--card))}` (6 lines). For Leads specifically, under 700 px render `PulsifyContact.row()` cards instead of the table (about 20 lines in `leads-view.js:75-94`). Drop the `.ps-frame` height and let frames size to content via `frame.contentDocument.body.scrollHeight` on load until they are ported (8 lines), then delete with the port.

### P2. Menus are modal dialogs pinned to the top-right corner

Kendo: bell and avatar are Radix menus with the same popover styling everywhere, anchored to their trigger, no backdrop (teardown, "Interaction details").

Now: `shell.js:17 pop()` creates a `<dialog>` with `showModal()` for the avatar menu, the workspace switcher and the date range, all placed at `position:fixed;top:58px;right:24px` (`shell.css:3 .ps-popover`) with a `#0003` blurred backdrop. The workspace switcher button sits top-left in the sidebar (`shell.js:12`), so its menu opens at the opposite corner of the screen. Click-outside is a manual bounding-rect check (`shell.js:17`). No enter animation. `.int-dialog` and `.leads-thread` then override the same class back to centred with `inset:auto;transform:translate(-50%,-50%)` (`integrations-view.css:44`), so one class serves two opposite jobs, and there are three backdrop values in play (`#0003`, `#0009`, `#000b`).

Fix: split the class. `.ps-menu` is a non-modal popover positioned from the trigger's rect (reuse `notifications.js:156-163 place()`), 150 ms fade plus 4 px, closes on outside mousedown and Escape, no backdrop (about 40 lines in `shell.js` and 10 in `shell.css`). `.ps-dialog` is the centred modal with the `#000b` blur backdrop and the `ps-dialog-enter` zoom already in `surface.css:20-21`. Point `int-dialog` and `leads-thread` at `.ps-dialog` and delete the `inset:auto` override.

### P2. Sidebar active state, footer and switcher are the flat versions

Kendo: active item is a separate `bg-muted border-border/70` layer behind the button so it can slide, label semibold; footer is a usage card with a segmented control; switcher is a 40 px outlined button with a 20 px initial avatar (teardown, "App shell").

Now: `.ps-nav button.active{background:hsl(var(--accent))}` (`shell.css:3`), a fill with no hairline and no motion between items. Footer is two lines of static text, "Private workspace / Connected to Pulsify" (`shell.js:12`). Switcher is 42 px with the monogram SVG at 24 px (`shell.css:3 .ps-switch`). Nav label is at 80 percent foreground; Kendo is 70. The portal sets the switcher label to the client name by `textContent`, which also wipes the img and chevron (`portal/phase1.js:17`).

Fix: add an absolutely positioned `.ps-nav-pill` inside `.ps-nav`, move it to the active button's `offsetTop` on `sync()` with `transition:transform var(--dur) var(--ease)` (about 20 lines in `shell.js`, 6 in `shell.css`). Replace the footer with a small card: workspace status line and a two-segment control (for the operator: Outreach / Delivery counts; for the client: plan status) using the existing `.ps-segments` (about 15 lines). Replace the monogram with a 20 px initial tile and 40 px height.

### P2. Motion is right in the shell and wrong in every layer under it

Kendo: one easing, one duration, everywhere (teardown, "The five decisions", item 3); exit keyframes on dialogs and menus.

Now: hardcoded timing survives in `admin/contact-row.css:1` (`150ms cubic-bezier(.16,1,.3,1)` written out instead of the variables), `shell.css:73 .ps-toast` (`.2s`), `portal/workspace-shell.css` (`transform .2s`, `ws-in .22s ease`), `portal/legacy.css:205` (`pulse-loading 1.2s linear`, `panel-in .18s ease`), `onboard/phase4.css:8, 18, 23, 26` (`.15s` and `.3s` written out), `auth.css:2` (`120ms ease`), and `admin/dashboard.html` (`transition: all 0.16s ease`, `.35s`, `.18s ease`, nine keyframes). The portal double-animates each navigation: `shell.sync()` retriggers `.view-enter` on `main` and `PulsifyWorkspace.go()` also toggles `ws-slide-panel` on `#wsStage` and calls `window.scrollTo` (`portal/workspace-shell.js`, `go()`), so the content rises twice. Nothing has a leave animation: dialogs, menus, the toast and the bell disappear on the same frame.

Fix: sweep the seven files to `var(--dur) var(--ease)` (about 15 edits). Remove `ws-slide-panel` from `go()` and keep `view-enter` (2 lines). Add `ps-leave` keyframes (opacity 1 to 0, 4 px down, 100 ms) and play them before `remove()` in `notifications.js:164 close()`, `shell.js:16 close()`, the toast and `.ps-surface-dialog` (about 20 lines).

### P2. Text glyphs where Kendo has icons

Kendo: lucide SVG for every chevron, check, drag handle and close.

Now: `⌄` for the switcher chevron (`shell.js:12`) and checklist rows (`surface.css:25`), `⠿` for the KPI drag handle (`surface.js:23`), `✦` in the intro art (`surface.js:12`), `✓` and `+`/`−` in the bell and outreach (`notifications.js:17, 131`, `outreach-view.js:144`), `↗` and `→` on portal cards (`workspace-shell.js`, `card()`), `‹`/`›` on the calendar (`shell.js:31`), and a literal `?` in the new contact row chevron (`admin/contact-row.js:38`, both branches of the ternary render `?`, which looks like a lost Unicode character). These render in whatever font the OS falls back to, at different weights per platform.

Fix: extend `PulsifyShell.icon()` with chevron-down, chevron-right, check, grip, sparkle, plus, minus, x, arrow-up-right paths (about 12 lines) and replace the 11 call sites. Fix `contact-row.js:38` first; it is on the outreach list.

### P2. Typography drifts between views

Kendo: Geist, 500 by default on labels and buttons, negative tracking everywhere, a fixed scale of 32/24/18/16/14/11/10 (teardown, "Type scale").

Now: page h1 is right everywhere (`shell.css:3`, `surface.css:3`, `onboard/phase4.css:21`, `auth.css:2`). Below that: h2 is 16/500 in the shell (`shell.css:3`) but 16/600 in settings (`shell.css:15`), 20/600 in the integrations hero (`integrations-view.css:6`), 13/600 for outreach and search groups (`integrations-view.css:85, 117`), 18/500 on the checklist (`surface.css:25`), 22/500 in dialogs (`surface.css:24`), 14/600 in the bell (`shell.css:46`). Small text uses 10, 11, 11.5, 12, 12.5 and 13 px across the views. Body has no tracking; Kendo runs negative tracking on labels and buttons too. Portal eyebrows are typed in capitals in the strings (`'OVERVIEW'`, `'THE SEQUENCE ARC'`, `'STEP 1 OF 3'` in `workspace-shell.js`) instead of `text-transform`, so they cannot be restyled. Dashboard views set numbers in JetBrains Mono and quotes in serif italic (`dashboard.html`). The portal studio loads Satoshi and Clash Display (`portal/studio-app.css:1`).

Fix: add `--text-h2: 500 18px/26px`, `--text-h3: 500 16px/22px`, `--text-label: 500 11px/16px`, `--text-micro: 10px` to `shell.css:1` and consume them in the eight h2 rules above (about 12 edits). `letter-spacing:-.01em` on `.ps-shell` body text and buttons (1 line). Lowercase the portal eyebrow strings and give `.ws-eyebrow` the 10/600/0.1em uppercase rule (5 edits). Mono and serif go with the dashboard port.

### P2. Empty states are sentences, not next actions

Kendo: dashed card, 56 px icon tile, one bold line, one muted line, one primary button; missing cells say what to do (teardown, "Paths", "Performance"; brief 2.4).

Now: the pattern exists as `.ps-surface-empty` (`surface.css:15-17`) but `surface.js:36` applies it only to the portal's `.ws-empty` nodes. Operator views use `.int-empty`, a centred muted paragraph: Search (`search-view.js:51`), Leads (`leads-view.js:91, 106`), Outreach (`outreach-view.js:91`), keys and webhooks tables, payment matching (`integrations-view.js`), bell (`notifications.js:145`). The Leads funnel table leaves the Paid cell blank when there is no payment (`leads-view.js:104`) instead of a prompt. The dashboard views show `No unmatched conversations.` as a single table cell (`native-dashboard.js:18`).

Fix: export `PulsifySurface.empty(icon, title, note, actionLabel, onAction)` returning the dashed card (about 10 lines) and use it at the seven sites above, each with its real next action: Search -> "Try one of these" chips, Leads inbox -> "Connect Instagram", Outreach outbound -> "Open Instagram", keys -> "Create an API key", webhooks -> "Add endpoint", bell -> stays text (Kendo's is text too). Paid cell -> "Match a payment" link to Integrations.

### P2. Light theme is not the same product

Kendo: light tokens are a considered set (background 0 0% 98%, border 0 0% 88%, primary 24 82% 48%) and the theme applies to every surface (teardown, "Design tokens", light reference; "Account" page).

Now: the shell light set (`shell.css:1`) is a cool blue-gray (`220 18% 97%`, border `220 15% 88%`), not the warm neutral Kendo uses, and the `--ui-*` bridge variables are only remapped under dark (`shell.css:2`), so in light mode the iframe views fall back to `admin/workspace.css:1` purple `#7862ce` and the portal falls back to `portal/workspace-shell.css:2` purple `#7862ce` plus Trakyo green from `shared/pulsify-ui.css`. The portal boot skeleton is hardcoded dark (`portal/index.html` `.ps-boot`), so a light-theme client sees a dark flash before their light workspace. Login and onboarding force `color-scheme:dark` (`auth.css:1`, `phase4.css:3`), which is acceptable for login but means the theme choice in Settings does not carry to the first-run page. No light-mode screenshot exists in `output/qa/2026-09-phase5/`.

Fix: move the `--ui-*` bridge block out of the dark selector into `.ps-shell` so it applies in both themes (move 8 declarations). Change the light set to warm neutral: background `40 20% 98%`, card `0 0% 100%`, muted `40 12% 94%`, border `40 10% 88%`, muted-foreground `35 6% 42%` (5 edits). Make `.ps-boot` read `localStorage.theme` in the inline theme script and pick light or dark hexes (6 lines). Add a light screenshot pass to the QA folder.

### P2. Native confirm() still guards four flows

Kendo: unsaved-changes and delete prompts are dialogs; the one place it uses `window.confirm` is called out as the cheapest moment in the app (teardown, "Interaction details"; brief "Do not build").

Now: `shared/settings-view.js:66` (workspace deletion request), `portal/workspace-shell.js` `canLeave()` (unsaved changes), and five calls in `admin/console.js` inside the iframe views.

Fix: `PulsifySurface.confirm(title, body, confirmLabel)` returning a promise over the `.ps-surface-dialog` pattern (about 15 lines) and replace the seven call sites.

### P2. Surface layering and card hairlines

Kendo: no visible borders on raised surfaces, a 1 px inner white hairline via box-shadow, `shadow-card:none` and `shadow-card-hover` (teardown, "Shadows"; brief 2.1).

Now: every card and table is `border:1px solid hsl(var(--border))`: `.ps-card`, `.ps-kpis`, `.ps-settings`, `.ps-popover` (`shell.css:3`), `.set-section` (`shell.css:14`), `.int-hero`, `.int-table`, `.ot-card`, `.sr-hit` (`integrations-view.css`), `.contact-loading` (`contact-row.css`), `.ps-surface-empty`, `.ps-launch`, `.ps-surface-dialog` (`surface.css`). Hover on `.ps-card` swaps to `card-raised` and a hard `#0006` shadow. Only `.set-input` and the bell panel use the inset hairline. No grain anywhere in the tree (no `feTurbulence`, no `workspace-main-surface`).

Fix: once the shadow tokens exist, replace `border:1px solid` with `box-shadow:var(--shadow-elev-1)` on the twelve card selectors and `hover{box-shadow:var(--shadow-card-hover)}` (12 edits). Add `.workspace-main-surface` with the 180 px SVG noise data URI on `.ps-main` and `.ps-header` (6 lines).

### P2. Tabs, chips and pills come in four families

Kendo: underline tabs for page sections, pill tabs with tabular counts, one segmented control style, one pill badge (teardown, "Best Calls", "Sidebar footer", "Members").

Now: `.int-tabs` is a muted bar with card-coloured active segment (`integrations-view.css:40-43`), `.ot-tabs` reuses it inside a bordered box (`:80`), `.ps-bell-tabs` is a third segmented style (`shell.css:47-50`), `.ps-segments` a fourth (`shell.css:3`). Chips: `.leads-chip` radius 999 (`integrations-view.css:61`) and `.int-chip` radius 8 (`:17`). Pills: `.int-pill` 10/600 uppercase with dot (`:22-24`, matches Kendo) but `.contact-stage` is 11 px, radius 5, no dot (`contact-row.css:1`), and `.ps-bell-badge` is hardcoded `#cf7a6a`.

Fix: keep `.int-pill` as the pill, keep `.ps-segments` as the segmented control, add `.ps-tabs` underline tabs (`border-bottom:2px solid transparent`, active `hsl(var(--foreground))`, counts in muted tabular) for view-level sections (about 12 lines). Point `.int-tabs`, `.ot-tabs`, `.ps-bell-tabs` at those two. Make `.contact-stage` an `.int-pill`.

### P2. Onboarding runs two stylesheets against each other

Kendo: one stylesheet.

Now: `onboard/index.html:12-157` is an inline light-theme design (JetBrains Mono step counts, 52 px h1, 16 px radius inputs with a 40 px blur shadow, `.24s ease` step animations, `:root{color-scheme:light}`), loaded after `onboard/phase4.css`, which therefore needs 37 `!important` declarations to win. Any new rule in the inline block silently wins again.

Fix: delete the inline `<style>` block and the Google Fonts link from `onboard/index.html`, move the six structural rules it still needs (`.onboard-shell`, `.onboard-head` layout, `.onboard-form` width, `.step-actions`) into `phase4.css` without `!important`, and load `shared/shell.css` for the tokens so the page stops hardcoding the HSL values (about 60 lines removed, 20 added).

### P3. Client portal is still the old workspace wearing the new shell

Kendo: one component set.

Now: `portal/index.html` loads `pulsify-ui.css` (Trakyo light, 16 px radius, `--ui-accent:#0ea968`), `legacy.css`, `studio-app.css` (Satoshi, Clash Display, `#7154e8`), `journeys.css`, `workspace-shell.css` (purple `#7862ce`, 78 hardcoded hex values), then `shell.css` and `phase1.css`. `portal/workspace-shell.js` builds its own rail and menu, `phase1.css:1` hides them and moves the `.ws-shell` node into the new `main` (`portal/phase1.js:11`). It works, but every portal card, stat, table and button is a `ws-*` class retokened through `--ws-*` bridges, and the studio inside `.ws-slot` keeps purple tab buttons with a glow (`studio-app.css:1 .tab-btn.active`) and `.ws-card.action:hover{border-color:#a99bc9}`, `.ws-card-footer{color:#d2bff6}` in dark (`workspace-shell.css:2`). Ranked P3 only because clients see it less often than the operator sees the console; it is the same class of problem as the iframes.

Fix: in order, (1) retoken the remaining hex values in `workspace-shell.css` and `studio-app.css` to shell tokens (about 30 edits), (2) alias `.ws-button` to `.ps-button`, `.ws-card` to `.ps-card`, `.ws-stat` to `.ps-kpi`, `.ws-table` to `.int-table table` (10 lines), (3) stop loading `pulsify-ui.css` and `journeys.css` on the portal once nothing references them.

### P3. Small things that still show

- Header title did not update in the Phase 5 screenshot (`bugfix-integrations-desktop.png` shows "Overview" over the Integrations page with Overview highlighted in the nav). The mocked test may have rendered the view directly; verify on the live console that `sync()` runs for Integrations.
- `.ps-launch` uses a native `<progress>` styled by `accent-color` and WebKit pseudo-elements (`surface.css:25, 30`); Firefox renders its own bar. Replace with a two-div bar (4 lines).
- Focus rings are three styles: 2 px primary offset 3 on the shell (`shell.css:3`), 2 px muted-foreground offset -3 on contact rows (`contact-row.css:1`), 2 px accent on login (`auth.css:2`). Pick the shell rule with `--ring` once it exists.
- Keyboard: `.int-tabs` and `[data-section]` buttons have no `role=tab` or arrow-key movement; the bell opens without moving focus into the panel. Ctrl+K search exists (Kendo has none); keep it.
- Avatars: 28, 32, 40 and 42 px circles across header, search, outreach and contact rows. Fine, but pick 32 for lists and 40 for detail.
- Toast is bottom-right, 8 s, click to open (`notifications.js:93-101`). Kendo uses Sonner bottom-right. Fine.
- The 12 % `--muted-foreground` lift in dark (`shell.css:2` uses 66 %, brief says 60 %) makes secondary text a touch bright. One number.
- Google Fonts Inter is loaded by the login, onboarding and iframe pages while the shell self-hosts `inter-latin.woff2` (`shell.css:6`); two Inter builds can render different metrics. Point the three pages at the self-hosted file.

## Suggested execution order for a design engineer

Four batches of roughly equal size. Each batch ships on its own and leaves the product better than before it.

Batch 1, the primitives (shell only, no view logic). Complete the token set in `shell.css:1-2` including light warm neutrals and the `--ui-*` bridge in both themes. Add `.ps-button` with primary and ghost, `.ps-input`, `.ps-tabs`, `.ps-menu` versus `.ps-dialog`, `ps-leave` keyframes, the sliding nav pill, the icon set and the SVG replacements for text glyphs. Alias the old classes. Sweep hardcoded hex, durations and easings across `shell.css`, `surface.css`, `integrations-view.css`, `contact-row.css`. Fix `contact-row.js:38`. Result: every existing view gets correct focus, hover, shadows, icons and menus without touching the views.

Batch 2, the operator's daily loop (Outreach, Leads, Search, bell, Settings). Layout-matched skeletons per view, no skeleton repaint when the cache is warm, `PulsifyShell.fail()` and `.ps-inline-error` at every fetch and write, `PulsifySurface.empty()` with a real next action at each empty site, `.int-table` horizontal scroll with sticky first column and the contact-row card layout under 700 px, `PulsifySurface.confirm()` replacing `confirm()`, typography variables applied to the eight h2 rules. Result: the screens someone uses for eight hours a day match Kendo's loading, empty, error and mobile behaviour.

Batch 3, kill the third design system. Override the Mirage palette, chart colours, mono and serif fonts and drift keyframes under `.native-dashboard` as a stopgap, then port CRM, Instagram, YouTube, Content and Health out of `dashboard.html` into native view modules on `ps-page-header`, `ps-metric-grid`, `int-table` and `contact-row`. Add the grain surface to `.ps-main` and `.ps-header`, hairline shadows on the twelve card selectors, the sidebar footer card, the light-theme QA screenshots. Result: the operator console is one design system except for the five iframes.

Batch 4, kill the iframes and the portal stack. Port Clients, Client work, Client brain, Acquisition pages and Email from `console.js` into native views (Clients first), delete `.ps-frame` and the frames Map from `admin/phase1.js`. On the portal, retoken `workspace-shell.css` and `studio-app.css`, alias `ws-*` to `ps-*`, drop `pulsify-ui.css` and `journeys.css` from `portal/index.html`, fix the dark-only boot skeleton, remove the double animation in `go()`. Delete the inline style block from `onboard/index.html`. Result: three pages (login, onboarding, workspace) and two shells on one stylesheet family.

## Connections

- [[kendo-app-teardown-2026-09-17]] is the reference for every "Kendo" line above.
- [[kendo-port-codex-brief]] is the original build brief; items 1.3, 1.4, 1.6, 2.1, 2.3, 2.4 and the "Do not build" list are the ones still open.
- [[phase6-outreach-product-brief]] is the product work this review gates; the P1 items on Outreach, Leads and Search should land before or alongside it.
- [[flagship-qa-2026-07-02]] holds the standing QA rules; the light-theme screenshot pass belongs there.
- [[pulsify-portal-master-architecture]] for the two-tier model the portal batch has to keep intact.

## Open questions / gaps

- Whether the founder wants the five iframe views ported before or after the Mirage views. This review orders Mirage first because it is six sidebar destinations against five, and the port is smaller per view.
- `contact-row.js` and `contact-row.css` are untracked and `outreach-view.js` is modified in the working tree at review time. The list rows, sort control and skeletons they add are the right shape; the `?` chevron and the hardcoded easing are the only notes on them. Re-read after Codex commits.
- The light-theme values proposed for Batch 1 are a warm-neutral approximation of Kendo's light set with Pulsify green kept as the accent. They are not screenshot-verified; the founder should see one light screenshot before they are locked.
- The Phase 5 review items in `output/qa/2026-09-phase5/REVIEW.md` (search index state, Zernio dedupe, archive restore, realtime payload boundary) are backend and are not repeated here.

## Source trail

- `output/standard-preview/shared/shell.css`, `shell.js`, `theme.js`, `surface.css`, `surface.js`, `settings-view.js`, `notifications.js`, `integrations-view.css`, `integrations-view.js`, `pulsify-ui.css` (tokens only).
- `output/standard-preview/admin/phase1.js`, `phase1.css`, `native-dashboard.js`, `outreach-view.js`, `leads-view.js`, `search-view.js`, `contact-row.js`, `contact-row.css`, `console-view.html` (head and tail), `console.css` (tokens), `workspace.css` (tokens), `dashboard.html` (palette, font and animation rules by grep).
- `output/standard-preview/portal/phase1.js`, `phase1.css`, `surface.js`, `index.html` (head), `workspace-shell.js` (first 60 lines), `workspace-shell.css` (tokens and component rules by grep), `studio-app.css` (head), `legacy.css` (animations by grep), `login/index.html`, `login/auth.css`, `login/phase1.css`.
- `output/standard-preview/onboard/index.html` (head and inline style), `onboard/phase4.css`.
- `output/qa/2026-09-phase5/REVIEW.md`, `BUGFIX-RELEASE.md`, `bugfix-integrations-desktop.png`, `bugfix-bell-mobile.png`, `login/login-signin-1536.png`.
- [[kendo-app-teardown-2026-09-17]] and [[kendo-port-codex-brief]] for every Kendo measurement.

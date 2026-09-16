---
type: synthesis
tags: [portal, dashboard, design-system, funnel]
sources: [[wiki/synthesis/kendo-app-teardown-2026-09-17]], [[wiki/synthesis/client-dashboard-redesign-spec-2026-07-12]], [[wiki/synthesis/pulsify-portal-master-architecture]]
created: 2026-09-17
updated: 2026-09-17
---

# Codex build brief: port the Kendo mechanics into the Pulsify portal

Self-contained brief for Codex. Goal: make the Pulsify client portal and operator dashboard feel the way app.kendo.ai feels, by porting the specific mechanics documented in [[kendo-app-teardown-2026-09-17]]. Kendo sells to sales teams. We do not. Nothing sales-specific is ported. Only the shell, the motion, the tokens, the loading model, the KPI component, the onboarding checklist pattern, and the gating pattern.

Codex builds and self-verifies. Claude reviews the diff once before deploy.

## What exists today (read these first)

| Thing | Where | State |
|---|---|---|
| Client portal preview (north star for composition) | `pulsify-portal-build/output/standard-preview/portal-preview/index.html`, live at pulsify-funnels.pages.dev/portal-preview/ | Preview only |
| Shared UI tokens (Trakyo, light, money-green, Inter) | `pulsify-portal-build/output/standard-preview/shared/pulsify-ui.css` | Live contract |
| Client dashboard spec | [[client-dashboard-redesign-spec-2026-07-12]] | Approved, partly built |
| Operator dashboard (MIRAGE design) | `pulsify-dashboard-sdr-build/index.html` (885 KB single file), `index-mirage.html`, deploy from origin/main of Ab-luiy/pulsify-dashboard to Cloudflare Pages | Live |
| Client-facing portal pipe | pulsify-funnels (Cloudflare Pages + D1, `/admin` operator console) | Live |
| Master architecture | [[pulsify-portal-master-architecture]] | North star |

Both apps are single-file HTML plus vanilla JS on Cloudflare Pages. This brief does not ask for a framework migration. Every Kendo mechanic below is portable to plain HTML, CSS, and JS. If Codex believes a migration is necessary for any item, it stops and says so instead of doing it.

## Decision the founder must make before Phase 2 (Phase 1 does not depend on it)

The vault has a locked light Trakyo system for the client dashboard (money-green, Inter, light surfaces). Kendo is warm near-black with a neutral primary button and one sparse accent. Options:

1. Keep Trakyo light as the light theme and add a Kendo-derived warm-dark theme as the portal's dark theme, with Pulsify green replacing Kendo orange as the accent. Default the portal to dark. **Recommended.** Nothing already approved is thrown away, and the "dynamic and unique" feel comes mostly from the dark theme plus motion.
2. Replace Trakyo entirely with the Kendo-derived system in both themes.
3. Keep Trakyo only, port mechanics but not tokens.

Phase 1 below is theme-independent. Phase 2 assumes option 1 unless told otherwise.

## Phase 1: the feel (mechanics only, no visual redesign)

Ship these to the client portal first, then the operator dashboard. Each item has an acceptance test.

### 1.1 Single-shell page switching

- One document. The sidebar changes an `activeView` state. Views are conditionally rendered sections inside `<main>`. No full reloads, no hash-router flashes, no layout shift of the shell.
- Persist `activeView` per user in localStorage under a namespaced key (`pulsify:workspace-location` = `{view, clientId}`). Restore it on load. Support deep links as a query param (`?view=studio&client=...`) that is consumed once and then dropped from the URL.
- Update `document.title` per view in the form `View name — Client name | Pulsify`.
- Acceptance: switching between any two views takes under 200 ms with no network wait when data is cached, and the sidebar never repaints.

### 1.2 The one enter animation

- Every view root gets the same wrapper: 150 ms fade from 0 to 1 plus a 4 px upward translate, ease-out-expo. Nothing else animates on view change.
- Implementation: a single CSS class `.view-enter` applied on mount, keyframes `fade-in` and `slide-in-from-bottom-1`, `animation-duration: 150ms`, `animation-timing-function: cubic-bezier(.16, 1, .3, 1)`.
- Acceptance: no view has a different or longer entrance. Reduced-motion media query disables it.

### 1.3 One global easing and duration

- Set `--ease: cubic-bezier(.16, 1, .3, 1)` and `--dur: 150ms` on `:root`. Every `transition` in both stylesheets uses them. Buttons transition only `filter, color, background-color, border-color, box-shadow`. Primary buttons use `hover: brightness(1.10)` and `active: brightness(0.95)` instead of color swaps.
- Acceptance: grep of both stylesheets shows no hardcoded easing or duration outside the two variables, except the shimmer.

### 1.4 Layout-matched skeletons, zero spinners

- One `.skeleton` class: `background: color-mix(in oklab, var(--muted) 60%, transparent)`, overflow hidden, a `::before` that translates from -100% to 100% with a 2.8 s ease-in-out infinite gradient sweep at 4 percent foreground opacity.
- Every async region ships a skeleton that matches the final layout exactly: the KPI grid renders 8 skeleton cells at the same min-height, tables render 6 skeleton rows at the same row height, setting rows render label plus a 96 px value bar.
- Remove every spinner and every "Loading..." string from both apps.
- Acceptance: throttle network to Slow 3G and screenshot each view during load. No layout jump when data arrives.

### 1.5 Bootstrap once, cache locally

- On login, one request returns everything the first view needs (client, KPIs for the shared date range, checklist state, integration statuses, notifications). Subsequent views read from an in-memory store first.
- Cache the analytics payload in localStorage under a versioned key `pulsify:analytics:v1:{clientId}:{from}_{to}`. On load, paint from cache immediately, then refetch and patch. Bump the version constant whenever the payload shape changes.
- Persist per user: shared date range preset, sidebar collapsed state, dismissed intros, checklist progress (server side), table column order and visibility (server side per client).
- Acceptance: a warm reload of the overview paints real numbers before the first network response returns.

### 1.6 The shell

- Sidebar 254 px, collapsible to a 64 px icon rail (persisted). Below 1024 px it is off-canvas with a `rgba(0,0,0,.2)` blurred overlay and a slide transition.
- Nav item: 34 px tall, 13.5 px label at 70 percent foreground, 16 px icon, hover raises to full foreground with a 50 percent muted background. Active state is a separate absolutely positioned pill layer behind the button (so it can be animated as a sliding indicator) plus semibold label. Section labels 12 px medium, not uppercase.
- Header: sticky, 52 px, left is collapse toggle plus view title in 14 px semibold, right is the shared date range button, a notifications bell (Radix-style popover, empty state "You're all caught up"), and a 28 px initial avatar with a menu (name, email, sign out).
- Workspace switcher at the top of the sidebar (for the operator: switch client; for the client: their single workspace).
- Usage or status widget pinned to the sidebar footer (for Pulsify: content pipeline count or plan status), with a segmented control styled `bg-muted/60 rounded-md p-0.5`, active segment `bg-background shadow-sm`.
- Acceptance: pixel-compare against the Kendo measurements in the teardown page, section "App shell".

### 1.7 The date range control

- One popover: 13 presets on the left (Today, Yesterday, Today and yesterday, Last 7, 14, 28, 30 days, This week, Last week, This month, Last month, Year to date, Custom), two month calendars, a "Selected range" footer with Cancel and Update. One range drives every view. Persisted per user as a preset name, not as dates, so it stays correct tomorrow.

## Phase 2: the surface (tokens and components, assumes option 1)

### 2.1 Tokens

Add a dark theme to `pulsify-ui.css` using Kendo's warm-black set with Pulsify's accent. HSL triplets, consumed as `hsl(var(--x))`:

```
.dark {
  --background: 30 8% 6%;      --foreground: 40 16% 94%;
  --card: 30 7% 9%;            --card-raised: 30 6% 12%;   --popover: 30 7% 10%;
  --muted: 30 6% 13%;          --muted-foreground: 35 9% 60%;
  --accent: 30 6% 15%;         --border: 30 7% 17%;        --input: 30 7% 17%;
  --ring: 40 8% 60%;           --radius: .6rem;
  --primary: <Pulsify green, keep lightness near 60%>;  --primary-foreground: 20 30% 8%;
  --button-primary: 30 6% 16%; --button-primary-foreground: 40 16% 94%;
  --destructive: 0 84% 66%;    --success: 142 65% 45%;     --warning: 42 72% 32%;
  --sidebar-background: 30 9% 5%; --sidebar-border: 30 7% 17%;
  --chart-1: 214 52% 68%; --chart-2: 24 60% 64%; --chart-3: 335 42% 64%; --chart-4: 240 40% 70%; --chart-5: 322 36% 58%;
  --shadow-button: inset 0 0 0 1px #ffffff0d, 0 1px 2px 0 #0000004d;
  --shadow-button-primary: 0 1px 2px 0 #0006;
  --shadow-elev-1: inset 0 0 0 1px #ffffff0a, 0 1px 0 0 #0006;
  --shadow-elev-2: inset 0 0 0 1px #ffffff0d, 0 1px 2px 0 #0006, 0 4px 8px -4px #0000004d;
  --shadow-card: none;         --shadow-card-hover: 0 4px 14px -6px #0006;
}
```

Rules that matter more than the numbers:

- The primary button is the raised neutral (`--button-primary`), not the accent. The accent appears on links, focus rings, the active theme pill, and at most one element per view.
- Raised surfaces get the inner 1 px white hairline via box-shadow instead of a border.
- Numbers are always `font-variant-numeric: tabular-nums`.
- Main surface and header get a grain: an inline SVG `feTurbulence` fractal noise tile at 180 px, repeated, on top of the card color. Class `.workspace-main-surface`.
- Type scale: h1 28/36 at -0.025em weight 500 for page titles, KPI values 26 to 28 px leading-none tracking -0.035em weight 500, body 14/20, labels 11 px, table headers 10 px uppercase 0.08em weight 600, chart labels 9 px. Keep Inter for now. Geist is optional and a separate decision.
- Theme is per device: Light, Dark, System pills on the account view, stored in localStorage `theme`, applied by an inline script before paint so there is no flash.

### 2.2 The KPI grid (the dashboard's core component)

- Outer wrapper `rounded-xl border bg-border overflow-hidden`, inner `grid gap-px` with 1, 2, 3, 4 columns at the sm, xl, 2xl breakpoints. Cells `bg-card min-h-156px p-5 flex-col cursor-pointer`, hover `bg-muted/25`.
- Cell content: label 11 px muted plus an info tooltip, value 28 px tabular, one-line description 10 px muted at 80 percent, footer with delta and a data-sufficiency word ("limited data").
- Cells are reorderable by drag with a handle that appears on hover. Order and visibility persist per client.
- Clicking a cell opens the detail view for that metric (for Pulsify: the studio or the content pipeline filtered to that metric).
- Acceptance: with 8 metrics and no data, the grid renders 8 zeros with correct descriptions and no dashes.

### 2.3 Page header shell

- Every view opens with the same block: optional 14 px eyebrow, 28 px h1, one-line muted subtitle, optional status pill (rounded-full border bg-muted/40 text-xs), right-aligned primary action. One component, used everywhere.

### 2.4 Empty states carry the next action

- Empty list: dashed-border card, 56 px icon tile at `bg-primary/10 rounded-2xl`, one bold line, one muted line, one primary button.
- Empty table cell: an action prompt ("Connect Instagram", "Add proof") instead of a dash.

### 2.5 Feature-intro dialog

- One reusable dialog for first visits to a section, tracked per user in localStorage `pulsify:featureIntroSeen:{uid}` as an array of section ids. Radix-style: 460 px max, `rounded-xl border bg-card shadow-elev-2`, overlay `bg-black/70 backdrop-blur-sm`, open animation fade plus zoom from 95 percent at 200 ms. Header 176 px: a 135-degree gradient, a diagonal white sheen, a 16 px dot grid at 70 percent, a bottom fade to card, and a 64 px frosted icon tile. Body: h3, one muted sentence, three checked benefit lines with a staggered 40 ms entrance, one full-width primary button.

### 2.6 Launch checklist

- A card pinned to the top of the client's overview until dismissed. Header with a 6 px progress bar and "N of M completed". Rows are an accordion (one open at a time): 32 px circle check, title, integration logos, chevron. Open row: one paragraph, small pill badges, a primary CTA that deep-links to the right view, and a ghost "Mark as completed". At least one step completes automatically from system state (for Pulsify: "Connect Instagram" completes when the token exists).
- Progress is stored server side per user per client.
- Pulsify's steps come from [[pulsify-portal-master-architecture]] onboarding: voice note, ICP, connect Instagram and YouTube, connect payment tool, first proof upload, first sequence generated, first sequence live, first retest.

### 2.7 Gating pattern (for the productized tier)

- Any locked action still renders in full. Clicking it opens a small centered dialog with a one-sentence reason, "Not now", and "View plans". "View plans" swaps the billing view into a pricing view. One upgrade surface for the whole app.

## Phase 3: operator dashboard parity

Apply 1.1 through 1.7 and 2.1 through 2.4 to `pulsify-dashboard-sdr-build/index.html`. Add the Performance-table mechanics from the teardown: sticky header, sticky first column, 10 px uppercase sortable and draggable headers, a Columns panel grouped by category with show, hide, reorder persisted per operator, a Filters popover, and action-prompt cells for missing data. Row click opens the per-client profile view.

## Do not build

- Any sales vocabulary or Kendo page (roleplay, scorecards, call routing).
- A command palette (Kendo has none, and it is not in the master architecture).
- Native `window.confirm` guards. Use the dialog pattern from 2.5 for unsaved-changes prompts.
- More than one analytics vendor.
- A framework migration.

## Verification Codex must run before handing back

1. Lighthouse on the client overview: performance and accessibility both above 90 in dark and light.
2. Screenshot set at 1536 wide and 390 wide for every view, both themes, both loading and loaded states, saved under the repo's `output/qa/` folder with the date.
3. A written pass against the seven gates in `AGENT_CHAT.md`.
4. Log every file touched in `AGENT_CHAT.md` with the Lock Board rows claimed and released.

## Source trail

- [[kendo-app-teardown-2026-09-17]] for every measurement, token, and pattern referenced here.
- [[client-dashboard-redesign-spec-2026-07-12]] for the approved Trakyo contract and the studio spine this brief must not break.
- [[pulsify-portal-master-architecture]] for the onboarding steps and the two-tier model.

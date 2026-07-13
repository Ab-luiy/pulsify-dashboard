---
type: synthesis
tags: [funnel, content, scaling]
sources: [[wiki/synthesis/dashboards-audit-and-portal-strategy-2026-07-12]], [[wiki/synthesis/portal-content-studio-spec]]
created: 2026-07-12
updated: 2026-07-12
---

# Client dashboard redesign — craft spec for Codex

The founder-approved redesign of the client dashboard, designed with the impeccable craft flow (product register, Trakyo visual contract) and handed to Codex to build to production quality against the live data. The Studio is the centerpiece. Design north-star: the live preview at `pulsify-funnels.pages.dev/portal-preview/` (source: `output/standard-preview/portal-preview/index.html`) — treat it as the composition/hierarchy/interaction contract, not a screenshot to trace.

## Visual contract (non-negotiable)

- **Design language:** Trakyo. Tokens in `output/standard-preview/shared/pulsify-ui.css` (money-green `#0ea968` + `#34d399`, Inter UI, JetBrains Mono tabular numbers, 3-tier soft shadows, 16px radius, light/dark). The preview file uses the same system inline — reconcile into the shared stylesheet.
- **Register: product (app UI).** Bar = "earned familiarity," the Linear/Notion/Stripe standard. The tool disappears into the task. No decorative motion, no display fonts in labels, consistent component vocabulary screen to screen.
- **Progressive disclosure over modals.** Libraries fold and expand inline (accordion). Modals only where the founder asked for an edit pop-up (the generator/edit flow) — and those use `inert` on the background + focus trap.

## The Studio (centerpiece — build this best)

Four stacked zones, top to bottom:

1. **Insight strip** — the "what's working / make more" summary. Left: a plain-language read of the week (best-performing type + its numbers, where sequences are leaking, what to make next) with two actions: "Generate a {best type} sequence" and "Reiterate the top performer." Right: 4 mini stats (sequences, carousels, avg completion, DMs) with week deltas. This is the reiterate-and-improve surface the founder asked for; the copy is generated from the client's own metrics, never invented.
2. **Create** — the 7 sequence type cards (value-driven, credibility, Q&A, day-in-the-life, breakdown, lifestyle, CTA) + start-here + story-launch, each with icon, one-liner, and cadence/function/audience chips from the matrix. Plus a carousel-create row (methodology / taxonomy / philosophy). Click a type -> the generator/edit modal (topic, goal, proof lines -> generated slides -> edit -> send for review; the P2 studio-generate contract).
3. **Story sequences library** — the client's past sequences, **folded rows labeled by date**, each row showing mini-widgets (completion %, DMs, drop-off diagnostic badge). Click/expand -> inline reveal of the slide strip (with the leaking slide flagged) + actions: Edit slides, Make another like this, View full. Keyboard-operable (role=button, tabindex, aria-expanded, Enter/Space), focus-visible rings.
4. **Carousels library** — past carousels, **folded rows labeled by number (Carousel 01/02/03)** + type + date + saves/reach widgets. Expand -> the slide thumbnails (9:16 tiles numbered) + the same actions.

New data this needs (Codex builds the endpoints, same auth pattern):
- `studio_sequences` already exists (P2) — the library reads approved/draft rows for the client, joined with `sequence_log` metrics where a posted match exists.
- New `studio_carousels` table (client_id, num, title, type, slides_json, saves, reach, created_at) + a `metrics-carousels` entry surface, mirroring the sequence flow.
- The insight strip computes from `sequence_log` + `account_snapshots` (best type by completion, worst drop-off slide, cadence gap) — a small server-side summarizer, or computed client-side from the metrics endpoints already live.

## The other sections (bring to the same bar)

- **Home / "This week"** — replaces Momentum. A money hero (cash this week + all-time + sparkline), followers, $/follower, and shipped-this-week / owed-this-week lists. The one-screen login view.
- **Revenue** — money-green KPI cards (JetBrains Mono), payment table, and two entry points the founder asked for: a **Settings gear** (drawer: business name, niche, trigger word, revenue goal, preference toggles — the GoHighLevel-style config) and an **Integrations button** (drawer: Stripe/Whop/Fanbasis/Kit/YouTube/Cal.com connect cards, wired to the live integrations hub I1 — connected states reflect real `integrations` rows).
- **Performance** — KPI cards + sequence rows with real bar strips (drop slide in rose) + diagnostic badges + a reach donut. This is the live P3 data, restyled.
- **Team** — member cards (contact links, "right now" task, day-calendar strip); click -> member modal (full day + task list). Below: a "what everyone's working on" board split by role (operator / content / setter). Needs a `team_members` table (name, role, email, contact, current_task, day_slots_json) + a `team_tasks` table, admin-editable.
- **Plans** — multiple plan cards with progress bars + status.
- **To-dos** — client-owned checkable items (the creator ticks their own); Pulsify-owned items shown distinct and locked. (P1 to-do check-off already exists; extend for ownership + client-only checking.)

## Production bar (impeccable product register — definition of done)

- Every interactive element: default / hover / focus-visible / active / disabled / loading / error. Focus-visible rings (2px accent). Keyboard paths everywhere (accordions, drawers, modals, tabs).
- **Empty states that teach** (no sequences yet -> "Generate your first sequence" with the create CTA), not "nothing here." **Skeleton loaders**, not center spinners.
- Motion 150-250ms, conveys state only (accordion expand, drawer/modal in, tab change). No orchestrated page-load choreography. `prefers-reduced-motion` alternative for all.
- Contrast >=4.5:1 body / >=3:1 large. Watch muted labels on tinted panels — bump toward ink if close.
- Consistent vocabulary: one button system, one card system, one badge system across all sections and the admin surface.
- Dark mode correct throughout (toggle + persistence). No horizontal overflow at 390px; sidebar collapses.
- Real data, no placeholder copy at presentation. Sentence case, no emojis/exclamations (CDS content voice).

## Build approach

- This is a real feature build (new data surfaces), not a pure reskin. Structure it in passes: shell + shared tokens -> Studio (the centerpiece) -> Revenue settings/integrations -> Team -> Home/Performance/Plans/To-dos -> states + responsive + a11y.
- Keep all existing P1-P3 logic (auth, studio-generate contract, metrics math) intact; extend, don't rewrite.
- New tables via a fresh migration; new endpoints follow the `resolveClientAccess` + admin-key pattern.
- Local-verify (node --check, local D1, curl the new endpoints). Claude reviews (logic + the production bar) and deploys. No auto-deploy, no remote D1, no commit from Codex.

## Source trail

- Founder feedback 2026-07-12 (studio must connect sequences + carousels, folded/expandable, labeled by date/number, mini widgets, summary/reiterate; revenue settings + integrations; team calendars + task board; kill Momentum). Impeccable craft flow (product register). Design north-star: the deployed preview.

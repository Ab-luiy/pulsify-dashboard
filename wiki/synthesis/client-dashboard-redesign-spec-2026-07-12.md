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

## The product spine (what makes this a SaaS, not a report)

The dashboard is not a set of screens; it's one loop the client runs every week:

**diagnose → create → track → retest → replicate.**

Every surface serves a stage of that loop. The Studio is where it lives. This is the moat — the vault's "Action Engine" made concrete ("your hook fails at slide 2, here's the fix, retest it"). Build the loop, not the panels.

## The Studio (centerpiece — build this best)

The updated north-star preview stacks six zones, top to bottom. Each maps to a stage of the loop:

1. **Diagnosis engine (insight card)** — *diagnose.* Three data-derived lines: the winning type (best completion), the leak (worst-retention slide across live sequences, with the exact % lost), and the prescription ("ship 2 more credibility, retest the value-driven hook"). Two actions wired to the next stage: **Generate {winning type}** and **Retest the leaking hook**. Right rail: 4 week stats with deltas. Every word is computed from the client's own data — never invented copy.
2. **Content pipeline** — *track (in flight).* Six stages (Ideas / Drafting / In review / Scheduled / Live / Retesting) with live counts. Clicking a stage filters the sequence library. This is the "see everything and do more" surface.
3. **Create** — *create.* The 7 sequence types + start-here + story-launch as cards (icon, one-liner, cadence/function/audience chips from the deployment matrix) + a carousel-create row. Click a type -> the generator/edit modal (topic, goal, proof lines -> generated slides -> send for review; the P2 studio-generate contract). Proof field label enforces the standing rule: **student results only, never lifestyle.**
4. **Winning frames** — *replicate.* Proven structures the data earned (any sequence >= ~65% completion). Each frame card shows type, "used Nx", "avg N%", slide count, and "Create from this frame" (opens the generator pre-seeded). This is "use the data to make more of what works."
5. **Story sequences library** — *track + retest.* Folded rows **labeled by date**, showing status (live/review/testing), completion %, DMs, and a mini retention sparkline (leak bars in rose). Expand reveals: the per-slide diagnosis line, a **variant/retest lineage** (v1 -> v2 testing -> winner) when one exists, the slide strip with per-slide retention % and the leaking slide flagged, and actions: Edit slides / Make another like this / **Retest hook** / View full. A segmented filter (All / Live / In review / Testing) sits in the header. Keyboard-operable throughout.
6. **Carousels library** — folded rows **labeled by number (Carousel 01/02/03)** + type + date + saves/reach. Expand -> numbered 9:16 slide tiles + the same actions.

### The retest loop (the differentiator — build it real)

When a sequence leaks, the client clicks **Retest hook** -> a modal that names the exact leaking slide and its lost %, pre-fills a new hook, and explains the method (run the new hook on the next posting, hold the other slides identical, compare completion after 48h, the winner becomes the frame). Launching it flips the sequence to `testing`, creates a `v2` variant, and starts tracking. The library then shows the lineage and a "Compare variants" action. This is what "easier to retest" means operationally: one button from any leaking sequence to a tracked, controlled experiment.

New data this needs (Codex builds the endpoints, same auth pattern):
- `studio_sequences` already exists (P2) — the library reads approved/draft rows, joined with `sequence_log` metrics + a per-slide retention array.
- New `studio_carousels` table (client_id, num, title, type, slides_json, saves, reach, created_at).
- New `sequence_variants` table (sequence_id, label v1/v2/…, hook_text, status, completion, started_at) to drive the retest lineage + compare.
- New `studio_frames` — either a table or a derived view over sequences with completion >= threshold, exposing structure + usage count + avg completion.
- Pipeline state: a `status` enum on sequences (idea/draft/review/scheduled/live/testing) drives both the pipeline counts and the library filter.
- The diagnosis engine computes from `sequence_log` + per-slide retention + `account_snapshots` (best type, worst-retention slide, cadence gap). A small server-side summarizer is cleaner than client math once it's live.

## Cross-cutting SaaS systems (on the whole app, not just Studio)

These are what make it read as a real product (earned familiarity, Linear/Stripe/Raycast bar) rather than a template:

- **Command palette (Ctrl/Cmd-K)** — jump to any section, create any sequence type, retest, log metrics, sync, open settings/integrations. Grouped (Go to / Create / Act), arrow+enter keyboard nav, live filter, empty state. This is the "do more, faster" spine and the single biggest "this is a SaaS" signal.
- **Toasts** — every mutating action confirms (sent for review, retest launched, logged, synced). Bottom-right, auto-dismiss, non-blocking.
- **Skeleton loading** — the "Sync data" action shows shimmer skeletons, not a spinner. All async surfaces load this way.
- **Live/status affordances** — a "Live" pulse in the topbar, per-item status pills, connection states on integrations reflecting real `integrations` rows.
- **Full keyboard + focus model** — focus-visible rings, role/aria on folds, switches, modals; Escape closes; focus returns to the trigger on close; `prefers-reduced-motion` alternative for all motion.

## The other sections (bring to the same bar)

- **Home / "This week"** — replaces Momentum. A money hero (cash this week + all-time + sparkline), followers, $/follower, DMs, a **"Your next move"** prescription card (the diagnosis engine surfaced on the overview, one action into Studio), and shipped-this-week / owed-this-week lists. The one-screen login view.
- **Revenue** — money-green KPI cards (JetBrains Mono), payment table, and two entry points the founder asked for: a **Settings gear** (drawer: business name, niche, trigger word, revenue goal, preference toggles — the GoHighLevel-style config) and an **Integrations button** (drawer: Stripe/Whop/Fanbasis/Kit/YouTube/Cal.com connect cards, wired to the live integrations hub I1 — connected states reflect real `integrations` rows).
- **Performance** — KPI cards + a **slide-by-slide retention curve** (SVG area chart, the cliff marked) + a **type leaderboard** (completion bars, top-to-bottom) + sequence rows with bar strips (drop slide in rose) + a "Log sequence" modal (feed the engine) + a reach donut. This is the live P3 data plus the tracking depth the founder asked for.
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

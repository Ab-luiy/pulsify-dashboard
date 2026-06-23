---
name: project_dashboard_v2_spec
description: "Big operator-dashboard feedback + feature spec (2026-06-23) — visual fixes, new Sales/Payments + Metrics + payout calculator sections, and the Slack/Calendar/EOD backend phase"
metadata: 
  node_type: memory
  type: project
  originSessionId: d6966459-9f75-459a-b63a-53a89db26f4d
---

Major feedback + roadmap the user gave 2026-06-23 reviewing the themed operator dashboard (on Prism/light theme). Three buckets:

**A. VISUAL FIXES (buildable now):**
- Charts look STRETCHED/scuffed — line charts (viewBox 640×220) + sparklines distort when stretched to wide cards; fix aspect/sizing so they don't look ugly.
- THEME-MATCHING: when switching themes, the neon/chart colors must match the active theme's scheme. Currently `chartColors` is a fixed JS array (Mirage pinks) → charts stay pink on Prism/etc. Make chart colors theme-reactive (derive from theme vars) AND re-render charts on theme switch. (Sparklines already use var(--accent) and recolor; line/bar charts do NOT.)
- LIGHT-THEME VISIBILITY: on light themes (Prism/Light/Signal/Atelier) text inside the Plan-command/hero/quote cards is barely visible — those panels have hardcoded DARK backgrounds (+ the ~133 white-alpha overlays) that don't flip, so dark text lands on dark panels. Needs the `--hi`/overlay + hardcoded-dark-bg refactor. Dark themes (Mirage/Dark/Obsidian/Aurora/Voltage) are fine.
- Remove the "today's hit list" block.
- Posts (Instagram) section: the post emoji "looks ass" and the note text is squeezed into a tiny box — instead make it a dynamic highlight/banner ACROSS the whole bar as the message (not crammed in a square).
- "The loop" + similar (e.g. "Alexei 5-step system") — cool font but barely visible / too small; increase size/contrast.
- Sales tab needs a much better-looking design (see bucket B).
- COPY: stop using AI-generated filler in content-gaps and other blocks — user says "I've already given you a way to type and write copy so use that" (CLARIFY which: Prompt Lab / Arsenal AI tools, Lead Studio Claude-API gen, or write in their real brand voice from the brain).

**B. NEW SECTIONS (build as mockups now; some need backend later):**
- METRICS section (right side): expandable chart + "flashy slide metrics" showing performance of EVERY section. Move FUNNEL HEALTH into this metrics section.
- Monthly REVENUE tracker + CASH COLLECTED.
- PIE CHART: hover a slice → setter metrics + which closer closed the deal (per-closer attribution).
- SALES = repurpose into a payments dashboard like **Whop payments / Fanbasis**: payment plans, PIF (paid in full), Klarna/Sezzle/Whop financing. Everything currently in Sales moves to a separate section.
- PAYOUT CALCULATOR (operator): standard fee 15% IF both a setter AND closer were present; setter takes 5% of the closed deal, closer takes 10%. Plus a general calculator.

**C. BACKEND PHASE (needs infra — Cloudflare Workers + integrations):**
- Live-updated Excel/Sheet that flows into the dashboard when setters contact leads; each setter's EOD sheet shown in-dashboard.
- CALENDAR of booked calls, SYNCED into BOTH portals: shows meeting source (Cold DM / Landing Page → Triage Call / Referral), date booked.
- SLACK flow: a booking/self-booking → posts to Slack → a closer clicks the message to SELF-ASSIGN (may have 2 closers) → dashboard updates with who took it.
- Closer TIMEZONE awareness: show each booked appt time in the assigned closer's local timezone.
- Cross-reference the closer's GOOGLE CALENDAR to verify they're free at the call time → so closers must keep Google Calendar filled with their daily routine (wake, blocks, etc.).

NOTE: "most of this applies to BOTH portals." User ended with "that's what I can think of for now" (i.e. a roadmap, not a one-shot). [[project_portal_features_roadmap]] [[project_portal_reskin]] [[project_deploy_pipeline]]

**STATUS (2026-06-24) — built, verified, and DEPLOYED to prod main (commit f0fbca7; live at pulsify-dashboard.pages.dev; source = awesome-bassi index.html, mirrored to Desktop/pulsify-operator-dashboard-FINAL.html). Deploy done the canonical way: deploy-0624 worktree off origin/main, dropped in my index.html, transplanted origin's ytLeadsData/ytLeadsMeta (320 leads — turned out identical), ff-pushed to main:**
DONE: all visual fixes (charts un-stretched via viewBox intrinsic ratio not forced aspect; theme-reactive neon line/bar/sparkline/donut; hit list removed; Loop font; donut un-distort + readable legend; corny "from hit list to closed" title → "Payments"). New tabs: Payments (#tab-sales, replaced Sales; old Sales content hidden in a display:none wrapper, ids preserved), Metrics (#tab-metrics, Funnel Health MOVED here from the hidden Sales block — only one vslViews now), Payouts (#tab-payouts, setter/closer pie + 15/5/10 payout calc + quick calc), Cash & Calendar (#tab-cashflow, cash tracker + booked-calls calendar + Slack/GCal/timezone routing MOCK). Overview now leads with a data-driven "Where you left off" brief (populated in renderOperatorCockpit); operator rail renovated (mini-cards, bigger %, glow meter). IG section bands = full-width accent banners (emojis removed); .ig-action note theme-reactive (was hardcoded #f6a609/#16a34a → var(--warn)/--success). Light-theme text-visibility blocker fixed: hardcoded dark panel gradients (#14100f/#0a0708, #110a16/#0c0712) → var(--surface-2)/--bg/--bg-2 (Mirage unchanged, light themes now readable). Humanizer copy pass on the flagged AI-tell prose (content-gap notes, cockpit content move, plan copy) — rewrote "execution problem not knowledge problem" etc., removed prose → arrows.
REMAINING: (1) white-alpha overlays (~133 rgba(255,255,255,.0x)) light-theme polish — deliberately NOT blanket-flipped (some are functional fills that must stay light; needs per-usage judgment, low value since user runs Mirage). (2) Funnel Health/drop-off shows zeros until VSL/Typeform/Cal analytics are connected (real data, not a bug). (3) Bucket C backend (real Slack post, GCal availability, live EOD/Cal.com feeds) still mock UI. (4) DONE — deployed to prod main 2026-06-24 (per [[project_deploy_pipeline]]). Integration done via re-runnable anchored python scripts in the wonderful-curran worktree (integrate_*.py) + sections/*.txt.

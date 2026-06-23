---
name: project_portal_features_roadmap
description: "Pulsify portal feature roadmap — theme switcher (DONE), plus setter/closer login, monthly goal calendar, IG/YT analytics specs (mockup-able vs needs backend)"
metadata: 
  node_type: memory
  type: project
  originSessionId: d6966459-9f75-459a-b63a-53a89db26f4d
---

Feature roadmap the user spec'd on 2026-06-23 for the Pulsify portals (operator + client). Built so far is the theme switcher; the rest is UI-mockable now but needs a back-end (Cloudflare Workers + D1 + OAuth) to be real.

**DONE — Live theme switcher** (`theme-switcher-demo.html`, on Desktop as `pulsify-theme-switcher.html`): one CSS-var-driven dashboard, click any of 9 themes to re-skin instantly (Light, Dark, Signal, Obsidian, Atelier, Aurora, Prism, Voltage, Mirage), persists via localStorage. Includes a **neon revenue chart** = SVG line+area, glowing stroke (`drop-shadow`) + gradient fill + a glaring colored card shadow (`--card-glare`), all theme-adaptive (full neon on dark/flashy themes, tasteful on light). User directive: charts must be neon/flashy with a glaring background shadow, NOT sloppy. Reusable theme system to wire into the real portals.

**BUILT AS MOCKUPS 2026-06-23** in one comprehensive theme-switchable portal — `pulsify-portal.html` (Desktop as same name): tabs Overview / Socials / Calendar / Team, all 9 themes switchable in-header, neon charts (revenue + YT retention/drop-off + per-sequence sparklines). Placeholder data; back-end still needed for the items below:
- **Setters/closers login**: portal logs in available setters & closers; connect each one's **Google Calendar**. (Needs auth + Google Calendar OAuth.)
- **Auto-assign** setters/closers to booked calls by **availability** — logic + integration TBD (user flagged "we'll have to figure out how").
- **Monthly calendar** (for everyone): labels what the CREATOR should be doing + lets them set **weekly goals**. Monthly view.
- **Social growth tracking** for the client's IG + YT accounts (followers/subscribers/engagers):
  - **YouTube**: latest video as the BIGGEST HERO; below it = views + an audience-**retention / drop-off** chart.
  - **Instagram (Reels/posts)**: track by likes, comments, views.
  - **Instagram Stories**: views + engagers + **story drop-off rate**. Crucially, track **story SEQUENCES by type** and their performance: **credibility-based**, **authority-based**, or **Program/cohort launch** sequence.
  (Live data needs IG Graph API + YouTube Data/Analytics API.)

**Why:** user wants the portals to be a maximal, productized system. **How to apply:** keep building these as visual mockups first (placeholder data) per the established pattern, flag the back-end clearly, don't claim live integrations exist. [[project_portal_reskin]] [[project_dashboard_product_vision]] [[project_deploy_pipeline]]

---
name: Dashboard quality bar — premium, beat Airtable
description: The standard to operate at on the HTA dashboard / any CRM-style product work
type: feedback
originSessionId: e323a8a0-779b-4634-af98-cb5c3fef5fbb
---
On dashboard / CRM-style work, operate as a million-dollar-company-grade CRM professional. The target is to beat Airtable and beat polished "high-level" dashboards — not match them.

**Why:** The user repeatedly flagged clutter, low-contrast/squint-y text, and "dead-ass" static feel as unacceptable, and stated this is a product they'd "buy for a lot of money." It will be shown to paying clients.

**How to apply:**
- Default to genuinely premium: strong visual hierarchy, real contrast (no dim text on glass), dynamic/draggable interactions, motion, aesthetic polish. Never ship flat or generic.
- Declutter aggressively — regroup related things, move scaffolding into its own section, delete what doesn't earn its place. The user gave standing permission to reorganize boldly.
- Drag-and-drop kanban is the preferred interaction model for pipelines (CRM leads, content production). Confirmed validated approach.
- "Take your time, do it right" > fast-but-cringe, specifically for this product. (Distinct from the general "speed is the motto" default — that still holds for ops/markdown work, not for this flagship dashboard.)
- 2026-06-23 CRM redesign pass (user called the prior version "pale and cheap… looks like a one-shot prompt"). Concrete bar that landed: charts must be BIG + INTERACTIVE + animated (the donut now hovers to highlight a slice/dim others + updates the center; entrance ring animation) with on-brand Mirage colors (NOT the old neon `#d4ff3a` palette — chartColors is now coral/magenta/violet/pink/indigo/teal/amber); filters as clickable CHIPS (tier/source) + a segmented Board/Table toggle, not a row of dropdowns; lead cards = gradient avatar + name/handle + metadata pills + tier-accent border/hover (not flat text rows); secondary panels (e.g. Priority retargets) collapse into a `<details>` so they don't clutter; sidebar nav grouped under labels (Command / Lead engine / Content & growth / Revenue / Wellness) + reordered (lead engine near top) + active = filled gradient pill. This is the look to MATCH or beat going forward; don't regress to flat/pale.
- 2026-06-23 follow-up pass: user wants a NEON / flashy-ish, GLOWING aesthetic (not flat). Applied: fonts swapped to **Clash Display** (display) + **Satoshi** (body) via Fontshare — user explicitly called Inter/Sora "generic and stupid", so do NOT default back to those; JetBrains Mono kept for data. KPI metric cards = glowing neon stat cards (gradient top-accent bar, Clash Display numbers with colored `text-shadow` glow, hover halo) — the plain text-number version was rejected. Section boxes (intel-box / toolbar / collapse) carry a magenta glow halo; donut center number + section headings glow. Donut/chart center text must be sized so it does NOT touch the ring (reduced to ~16px in the 100-unit viewBox). Keep glow tasteful-but-visible ("neon-ish", not garish).

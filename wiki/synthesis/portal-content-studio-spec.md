---
type: synthesis
tags: [funnel, content, instagram, scaling]
sources: [[wiki/synthesis/client-portal-product-spec]], [[wiki/frameworks/story-sequence-system]], [[.claude/skills/story-sequence-generator/SKILL.md]]
created: 2026-07-12
updated: 2026-07-12
---

# Portal content studio — spec stub (Codex build, gated on founder approval)

Founder direction 2026-07-12: the client portal should carry a section dedicated to YouTube and Instagram, with the Instagram side zooming into sequences and automations — including the ability to select a story-sequence type (or state an intent in plain words), get asked for specific photos with recommendations, and receive generated slide copy. For the founder's own use and per-client.

## Where the portal actually stands (honest status)

- Live portal exists on pulsify-funnels (client portal + operator /admin); portal v2 is spec'd as connection-first ([[synthesis/client-portal-product-spec]]) with a stage-2 mock gated on founder sign-off — that mock has not been signed off yet.
- No content/IG section exists in the portal today. The chat-first generator (the `story-sequence-generator` skill) is live NOW and is the proving ground; the portal UI wraps it later, per the standing chat-version-first rule.

## The section (v1 scope, once approved)

**Content tab, two panes: YouTube | Instagram.**

Instagram pane:
1. **Sequence studio.** Type picker (the 7 types + start-here + launch) OR a free-text intent box ("I want to talk about a case study and how it relates to viewers"). Flow mirrors the skill exactly: intent -> type mapping -> goal (reach/DMs/calls, sets CTA placement) -> proof inventory -> photo checklist with per-slide recommendations -> generated slide copy (pill-by-pill) with emphasis notes. Backend = the same prompt contract as the skill; the skill file is the source of truth so chat and portal never diverge.
2. **Photo checklist UX.** Each requested shot is a checkable item with the recommendation text; client uploads against each item; uploads land in their client folder.
3. **Sequence tracker.** Posted sequences logged with type + angle + per-slide views (manual entry v1) -> drop-off computed, slide-2/slide-7 diagnostics surfaced. This is the Mochi-equivalent lane and feeds the dashboard product vision.
4. **Automations block.** Trigger-word inventory (per-asset words), ManyChat status, and the DM routing map (word -> automation -> setter). Read-only v1.

YouTube pane (thin v1): title/thumbnail requests routed to the existing titles-thumbnails skill contract; publish calendar; per-video conversion notes (which video converted whom, from the buyer-mirror answers).

## Build gates

1. Founder approves scope -> Claude writes the full spec + prompt contracts -> Codex builds (standing rule: Codex implements, Claude specs/reviews).
2. Before any build: the chat skill must have produced at least a handful of real sequences the founder rates as shippable (the earn-the-button rule from the batch-outreach precedent).

## Open questions for the founder

- Does the sequence studio live in the CLIENT portal, the operator /admin, or both (client self-serve vs Pulsify-operated)?
- v1 tracking: manual per-slide view entry acceptable? (IG has no story API for third parties at our tier.)
- Should generated sequences require operator review before the client sees them (quality gate), or self-serve?

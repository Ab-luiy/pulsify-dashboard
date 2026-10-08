---
name: reference-elements
description: Inspect slide, carousel, story, or graphic design references and recreate or adapt their visual elements as editable SVG/HTML plus rendered assets. Use for reference-based cards, funnels, diagrams, typography, phone/UI artifacts, annotations, and layered photo compositions, or for designing new elements using that visual language. Does not install a Canva connector or claim to recover hidden source layers.
---

# Reference elements

Turn a visible reference into a concrete, editable graphic. Deliver the actual element or composition, its source, and an inspected render when the user asks to build. When asked only to analyze, return the construction breakdown without creating artwork.

## Shared source of truth

This skill lives in the Pulsify vault at `C:/Users/Abdullah/Desktop/Pulsify-Brain/.claude/skills/reference-elements`. The Codex installation points to the same folder. Use the existing wiki standards rather than maintaining a second design profile here.

For work in this vault, follow its `AGENTS.md` and coordination requirements. Read the current visual memory at `claude-memory/project_visual_references.md` and the relevant parts of:

- `wiki/content-engine/reference-replication-profile.md` for reference families, materials, geometry, layers, and acceptance criteria.
- `wiki/content-engine/reference-replication-profile.json` to locate relevant anchors, recipes, and component roles. Retrieve selected records; do not load the entire source corpus for one element.
- `wiki/playbooks/reference-replication-sop.md` when producing a complete story/carousel or composing elements over photos.

Resolve these paths relative to the vault root, including when invoked from another working directory. These are Pulsify project rules, not universal rules for unrelated clients. The current brief takes precedence. Do not impose the active highlight's type/colors on every reference study.

## Resolve the visual task

Use the current request and campaign context to identify the reference, the element to recreate, its communication job, destination dimensions, and required editability. Distinguish:

- **Study/recreation:** match the selected reference's construction and keep its source attribution.
- **Production adaptation:** transfer its construction using the user's copy, assets, and brand.
- **New element:** build a graphic for the user's idea using an explicitly selected reference language. Do not imply the new graphic existed in the source.

If a required source or destination is genuinely missing, ask one concise question. If the reference is already in the vault, find it in the relevant manifest and open the actual image. Do not ask for it again. A screenshot alone cannot recover the original font, hidden objects, or source document.

For an isolated element, default to a standalone SVG with a transparent background and an inspected PNG preview. For a photo composition, multi-element slide, or responsive UI artifact, use HTML/CSS with embedded SVG and keep editable text. Honor a requested format or editor; disclose any loss of editability from importing a flattened image.

## Inspect and decompose

Open the original reference at readable resolution. Inspect an enlarged crop for the requested component and the complete slide to understand its role. A written audit supports this inspection; it cannot replace seeing the pixels.

Record the construction using [references/element-spec.md](references/element-spec.md). Keep the breakdown proportional to the request: one component does not need a whole campaign specification.

Separate visible observations, estimated geometry, and unknowns. Capture the details that determine the result:

- Outer silhouette, proportion, alignment, padding, density, and hierarchy.
- Text content, phrase breaks, font category, weight, tracking, and alignment. Verify a font file before naming it as exact; otherwise state the chosen approximation.
- Material roles: fill/opacity, border, shadow, highlight, texture, and whether the object is flat or dimensional.
- Layer order, clipping, masks, and how the object interacts with the photo or other elements.
- Diagram meaning: nodes, routes, direction, branch/convergence, labels, and endpoints.
- Asset roles: real app glyph, proof crop, profile image, UI artifact, or original illustration.

Preserve the component's specific construction. A funnel is not a pile of generic cards; a report artifact is not a decorative rectangle; a source-detail lens enlarges actual source pixels. New production artifacts must demonstrate a real concept and remain identifiable as illustrations where appropriate.

## Build the element

Keep the semantic content separate from style and position so revisions can change one without destroying the others. Build type, geometry, curves, graphs, and labels with deterministic SVG/HTML/CSS or a suitable native vector tool. Keep source screenshots as original pixels. Avoid using a raster generator to spell final copy or fabricate interface data.

Use actual registered app marks and fonts where available. Do not substitute emoji, arbitrary Unicode icons, or invented logo lookalikes. A brand mark in a diagram does not prove an integration exists.

Use a viewBox and explicit dimensions for SVG. Group named component parts and keep text editable. For HTML, wait for fonts and images to load before rendering. Keep assets available with the deliverable; prefer local or embedded dependencies for portable exports. Report font substitutions and any background needed for contrast in a transparent asset.

For diagrams, define nodes and directed edges first, then place and route them. Preserve the argument when adapting formats. Measured charts need actual records, units, timeframe, and scale. Conceptual graphics must not acquire invented conversion rates or performance figures.

For behind-subject layering, transform the base photo and its aligned mask identically, then restore original photo pixels through the alpha. Inspect hair, hands, clothing, furniture, and intersections. If no clean mask is available, choose a faithful visible placement and explain that depth was not reproduced. Do not regenerate the person's identity or manufacture photo space.

Preserve locked copy and current asset exclusions. Scope changes to the requested element or slide. Save a new version instead of replacing an approved artifact without authorization.

## Render and compare

Render the actual source at the destination size. Open the exported image, not merely its code. Compare the reference crop and result at the same display scale; also inspect the whole composition and its intended phone/display size.

Check silhouette/proportion, type mass and phrase breaks, spacing, color roles, material, layer interactions, and graph meaning. Inspect seams and fine strokes at enlarged scale. Check loaded fonts/assets, bounds, clipping, missing labels, contrast, and unexpected transparency. Distinguish intentional overlap from unreadable occlusion.

Fix concrete defects and rerender the affected component. Use pixel differences only when comparing identical source assets and geometry; different photos require a structural/visual comparison. Validation of JSON or SVG syntax is not visual approval. Do not claim an exact reconstruction while source fonts/layers are unknown.

For a complete set, retain the shared SOP's sequence and contact-sheet checks. For one element, keep QA focused on that element and its placement.

## Deliver

Use the user's requested output location. Otherwise save to a clearly named task folder under `output/reference-elements/` in this vault. Deliver the editable SVG/HTML, rendered PNG or requested export, and a concise record of source anchors, asset/font choices, and material deviations. Show the preview inline when supported and link the editable source.

State what was actually recreated, what remains approximate, and any editor-specific limitation. Imported SVG/PNG is not automatically a fully editable Canva document. Creating files does not authorize publishing or external sharing.

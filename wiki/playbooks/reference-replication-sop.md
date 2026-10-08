---
type: playbook
tags: [content, offer, funnel, carousels, story-sequences, design, product]
sources: [[synthesis/carousel-reference-forensic-audit-2026-10-08]], [[synthesis/story-reference-forensic-audit-2026-10-08]], [[content-engine/reference-replication-profile]]
created: 2026-10-08
updated: 2026-10-08
---

# Reference replication SOP for carousels and stories

The procedure for turning a communication brief, uploaded photos and reference anchors into a complete designed set. Both formats use the same assets, components, masks, semantic figures and quality gates. The format adapter changes composition and safe regions. This is a versioned app implementation contract, not a claim that the live app already supports the new scene renderer.

## Why this matters for Pulsify

Content → offer → funnel sets the order. A clever visual cannot fix an irrelevant idea or an undefined next step. The app must capture the purpose and copy first, then make the visual mechanism concrete using the user's real assets. The founder's natural-photo and behind-subject standards must survive automation.

## Core mechanics

### 1. Capture the question, purpose and evidence

Start with one concise question when essential context is missing. Save audience situation, topic, job, belief to change, offer/fit boundary, proof available and desired action. Let the current campaign supply known answers; do not repeatedly interrogate the operator. Distinguish a new set from an edit of locked copy. Existing copy/photo exclusions survive revisions.

Choose narrative architecture before design: feature demonstration, method, taxonomy, concept lessons, case mechanism, personal chronicle or appropriate story type. Those structures are options; they do not force a ghost number or screenshot on every frame. Save a draft state with unanswered essentials instead of filling them with invented claims.

### 2. Write the copy and its payoff map

Draft the cover and complete sequence together. Each slide has question, answer, evidence, next question and payoff ID. Check the finite promise is fulfilled. Keep one primary communication job per frame, phrase-level line breaks and a useful standalone first read. Claims map to evidence IDs or explicit illustration labels. A personal story uses actual sourced history.

Lock the copy version before polishing. A later change that affects length must invalidate relevant layout QA. The user can edit any copy; record the revision and rerun layout checks rather than silently shrinking text. No invented testimonial, calculation from zero, deadline or capacity.

### 3. Register photos, proof, fonts, icons and branding

Use existing operator uploads from the Photo library plus any new authorized files. Record asset ID, original URI/path, content hash, width/height, type, source/use context and capture date where relevant. Keep originals immutable. Apply the banned-photo registry and current job restrictions before selection.

For each selected photo record focal point, meaningful environment, subject region, likely text space and whether depth is needed. Register a correctly aligned alpha mask where available; mask creation belongs to an explicit image-processing workflow and receives visual QA. If depth cannot be made clean, use a faithful non-occluded layout and report that decision.

Register actual screenshots, profile states, thumbnails and app glyphs. A graph stores its real dataset or declares itself conceptual. Asset presence, permissions and authenticated integrations are different records. Do not pretend a diagram's Instagram or Kit icon establishes an API connection. Source proofs remain attributed sources, never client proof by substitution.

### 4. Match references and choose a family

Retrieve relevant anchors from the full profile/manifest by communication job, component and photo geometry. A high head/low negative space photo needs a different recipe than a small shoreline subject. Choose one visual family for the set and deliberate special cover/close modes. Explain the chosen anchors and any override briefly in the saved job.

Send the planner the brief, locked copy, selected original references, actual selected photos/proof assets, active constraints and scene schema. Never request an unspecified premium look. Describe the measurable relationship: title behind hair, three report cards at left, exact UI crop magnified, platform routes converging on a call.

### 5. Produce a structured scene plan

Return versioned JSON with format, profile/family, source IDs, asset IDs, per-format crop/focal point, text blocks, materials, layer order, subject restore, graph nodes/edges, annotation targets and QA notes. Geometry uses normalized canvas coordinates. Store actual paths to curves and exact font IDs where available.

Use strict schema validation. Reject unknown components rather than reducing them to generic cards. Preserve ordinals as optional. Preserve graph labels and source windows. Validate unique IDs, asset types and foreign keys, rear/restore ordering, numeric units, crop/mask registration and essential label visibility. Invalid JSON gets a repair pass with the specific errors; repeated failure produces an actionable blocked draft, not a fabricated preview.

### 6. Compose deterministically

Render photo and its mask through the exact same transform. Place rear SVG/type/source artifacts, then restore the original photo pixels through alpha, then foreground copy. A front-proof recipe may intentionally place panels above the subject. Either way, essential labels remain exposed.

Render typography, boxes, graphs, lines and app glyphs with HTML/CSS/SVG/canvas or another deterministic layout engine. Keep source screenshots as source pixels. Do not ask a raster generator to draw receipts, invent UI labels or spell the final copy. Optional AI-created illustrations need a separate asset brief and inspection, and cannot replace personal/proof identity.

Default photography: real crop, recognizable environment, no stretch, no blanket blur, no mirrored/blurred top fill, no synthetic replacement. When copy conflicts with the photo, relocate it, reframe usefully, simplify a beat, select a better photo or use a permitted narrow contrast backing. Do not turn all backgrounds into charcoal texture.

Render both requested formats from distinct layout variants. Use one semantic graph and recompute its placement/routes. Story proportions and reserves do not emerge by stretching the carousel. Export final images and retain editable scene JSON/SVG/HTML alongside them.

### 7. Review and repair

Run structural/semantic checks, then inspect every frame at phone width, full size and zoomed intersections. Inspect the complete sequence/contact sheet for repeated photo purpose, palette and type continuity, promise fulfillment and uneven density. Compare each draft against its chosen anchor.

Check: photo identity/environment; copy and phrase breaks; actual font load; mask hair/hands/clothes/furniture; no seams/halos; contrast; no essential words hidden; graph topology/units; proof dates/definitions; real mark/icon assets; CTA/delivery; outer platform chrome excluded. A numeric score cannot excuse a known defect. Revise failed regions, rerender affected frames and repeat the relevant checks.

The included validator is a preflight tool, not a complete renderer or aesthetic judge. Its intentionally blocked template proves missing assets are surfaced. Visual sign-off is still required before a result is presented as finished.

### 8. Save, deliver and learn

Save immutable approved versions of brief, copy, references/hashes, assets, masks, scene plan, renderer version, exports and QA report. Draft review is distinct from publication. Never automate publication simply because rendering succeeded. Use the authorized existing campaign workflow for sending/posting.

Feedback records the exact failure and scope: source family, job, slide, asset and correction. Current explicit rejections outrank earlier inferred preferences. Do not train every client on one founder's rejected photo. Keep shared knowledge in existing wiki/memory/profile; no separate Codex strategy copy.

Track metrics available for the format and the actual business path. Record observation window and audience context. Stories can expose per-frame measures; do not fabricate comparable carousel per-slide data. Track qualified replies, booked/attended calls and collected cash where linked evidence exists. Change one important variable in comparable tests. Save repeated useful patterns with limits. The objective is clearer demand and better fit, not a guarantee of unlimited profit.

### 9. App implementation contract

The inspected current `carousel-prompt.js` outputs short text/design hints and a four-kind layout; its sanitizer strips anything outside those fields. It cannot retain masks, transforms, layer lists, source-proof links or graph topology. Add a versioned scene payload beside existing text outputs rather than silently feeding this profile into the current sanitizer and assuming it renders.

| App stage | Input/output | Implementation requirement |
|---|---|---|
| Brief | Purpose, question, audience, CTA and evidence | Reuse client context; editable concise brief |
| Copy | Full sequence and payoff map | Versioned copy; proof-linked claims; preserve locked edits |
| Assets | Photo/proof/icon/font IDs | Existing upload library; hashes, ownership, source dates, exclusions |
| Reference matcher | Selected family and anchors | Vision access to actual images; retrievable full catalog |
| Planner | Strict scene JSON | Capability-based provider adapter; separate system rules from untrusted source content |
| Validator | Schema + semantic failures | Reject lost fields, nonexistent assets, bad arithmetic, unsafe occlusion and absent data |
| Mask/renderer job | Photo, alpha and editable components | Exact transform registration, vector graphs/type, stable fonts, no global blur |
| Review | Export, side-by-side, phone/full/zoom | Clear failed state with specific repair path; retain draft history |
| Export | PNG set and editable source | Idempotent job, deterministic asset/version checksum |
| Feedback | Scoped correction and approved variant | Learn from explicit decisions; no global preference drift |

Persist `brief_version`, `copy_version`, `profile_version`, reference IDs, asset hashes, `scene_version`, `renderer_version`, output hashes and QA status. Job states: brief → copy → assets → plan → validate → render → review → approved/exported. A failed stage records errors and can resume without redoing the entire set. Approval/export does not imply publication.

Use asynchronous bounded jobs and an idempotency key derived from versions/assets. Cache asset analysis/masks and reference embeddings by hash. Limit parallel high-resolution renders to available memory. Timeout and retry transient failures with a bounded policy; do not retry a semantic failure unchanged. Store a readable failure rather than a silent generic fallback.

Configure provider, model, credentials and capabilities server-side. The founder mentioned Anthropic and a possible future model; actual availability is unverified here. Keep model names out of the visual standard. At integration time verify image input, structured output, context limits and cost for the selected provider. Keep credentials out of scene JSON and client bundles. A text-only model cannot inspect uploaded photos faithfully without a separate vision stage.

Minimum integration acceptance fixtures: rear name with portrait; card behind standing subject; three-channel conceptual funnel; real IG profile annotations; metric/time proof lens; white phone taxonomy; paired additive reveal; same content recomposed as story/carousel. Include negative fixtures for missing mask, shifted mask, unknown icon, undefined multiplier, hidden label, unverified claim, missing chart data and forbidden blur. Compare against selected source anchors and actual client assets before enabling finished exports.

## How Pulsify uses this

Both [[playbooks/carousel-sop]] and [[playbooks/story-sequence-design-procedure]] enter this shared procedure after their content architecture is chosen. The [profile JSON](../content-engine/reference-replication-profile.json), [job schema](../../output/carousel-reference-audit-2026-10-08/job.schema.json), [job template](../../output/carousel-reference-audit-2026-10-08/job-template.json) and [preflight validator](../../output/carousel-reference-audit-2026-10-08/validate_job.py) are reviewable integration artifacts. The template intentionally requires real asset bindings; it is not a completed commercial story or a connected live feature.

## Connections

- [[content-engine/reference-replication-profile]] — shared visual and machine-readable standard
- [[synthesis/carousel-reference-forensic-audit-2026-10-08]] — complete new carousel evidence
- [[synthesis/story-reference-forensic-audit-2026-10-08]] — complementary existing story evidence
- [[frameworks/carousel-system]], [[frameworks/story-sequence-system]] — structure and narrative decisions
- [[frameworks/proof-system]], [[concepts/profile-funnel]], [[content-engine/copy-voice-guide]] — claim integrity, conversion route and language

## Open questions / gaps

This task supplies the portable system and local validation artifacts. It does not implement/deploy the new scene payload, masking service, renderer UI or provider credentials in the live app. Source fonts/layers and performance data remain unavailable. Production fidelity is judged against real references and supplied assets; a JSON file alone cannot promise a pixel-identical reconstruction.

## Source trail

[[synthesis/carousel-reference-forensic-audit-2026-10-08]], [[synthesis/story-reference-forensic-audit-2026-10-08]], this session's explicit founder direction, existing story/carousel procedures and inspected `output/standard-preview/functions/_shared/carousel-prompt.js` contract.

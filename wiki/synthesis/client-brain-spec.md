---
type: synthesis
tags: [offer, content, funnel, product, scaling]
sources: [[wiki/synthesis/pulsify-portal-master-architecture]], [[wiki/synthesis/payment-onboarding-automation-spec]], [[raw-sources/icp/marcus-icp-research.json]], [[wiki/frameworks/bio-optimization-system]], [[wiki/content-engine/sequence-carousel-design-system]]
created: 2026-07-15
updated: 2026-07-15
---

# The client brain, field structure and build spec

Build one of the master architecture. Each client gets a structured, living knowledge base that feeds every generator and exports as a context package for the client's own AI. This page defines the fields, where each one comes from, and the build contract. The structure mirrors what Pulsify already collects (the 28-point avatar research schema, the 30-question onboarding form, the offer voice note), so onboarding fills it instead of anyone typing it from scratch.

## Design principles

- Every field has a **source** (voice note, intake form, connected account, operator research) and a **freshness date**. No field is invented; empty fields show as gaps to close, not fabricated content.
- The brain is **generator-facing first**: each section maps to the exact inputs the sequence, carousel, reel, bio, and email generators need.
- The whole brain **exports as one context package** (a single structured markdown document) the client pastes into their own AI. That is the productized version of how the founder runs this vault.

## The eight sections

### 1. Identity
Who they are. Name, handle(s), niche and craft (the money-making skill, e.g. subscription dropshipping), years in, location/timezone, the one-line positioning. Source: intake form + operator.

### 2. Offer
What they sell. The offer stack (name, price, what is included), delivery model (1-on-1 / group / DWY / DFY), the unique mechanism and its category-of-one name, guarantees, payment plans and rails, the upsell path. Source: the onboarding voice note (transcribed), refined on the game-plan call. This is the section the voice note fills.

### 3. ICP
Who they sell to, in the avatar research schema already in use: audience name, daily frustrations, secret desires, the language they use (verbatim phrases), objections, false beliefs, emotional triggers, raw community language, pain scenarios. Plus financial qualification (can this audience pay high-ticket). Source: operator research (the same pipeline that produced the Marcus avatar), seeded by the intake form. If the client has no ICP, Pulsify runs the research; that is part of the paid value.

### 4. Story
The narrative bank. Origin story (before-state, turning point, now), key beliefs and contrarian takes, recurring life details that humanize (the 20 percent lifestyle share, humanity not flex), wins and losses worth telling, the "same as you" bridge moments. Source: voice note + a story-prompt section of onboarding + accumulated from calls.

### 5. Voice
How they sound. Tone register (direct operator / warm mentor), sentence habits, words and phrases they actually use, banned words, emoji and punctuation habits, the AI-tells kill list applied per client. Source: samples of their real captions/DMs/emails analyzed at onboarding, then tuned.

### 6. Proof vault
The receipts, tagged and generator-ready. Student results (screenshots, revenue dashboards, DM receipts, before/afters), each tagged by type (proof-screenshot / device-mockup / proof-wall / real-workspace, the four allowed image classes), student name/permission status, the number it shows, and what claim it backs. Never lifestyle. Source: uploaded at onboarding and continuously; stored in R2, indexed in D1. This is what the design-direction generator pulls artifact slots from.

### 7. Funnel facts
The operating config. Trigger word(s), link-in-bio destination, lead magnet(s), email platform and tags, booking link, DM routing (ManyChat flow or setter), platforms and audience sizes, posting cadence targets, current funnel links. Source: intake form + integration center connections.

### 8. Do-not list
The guardrails. Claims they cannot make (no proof yet), topics to avoid, competitors not to name, numbers that are private, anything legal/compliance. Source: operator + client, onboarding.

## How it fills (the onboarding mapping)

- Voice note -> transcript -> sections 2 and 4 (offer, story), auto-drafted then operator-confirmed.
- Intake form (the live 30-question form) -> sections 1, 3-seed, 7.
- Caption/DM samples -> section 5.
- Proof uploads -> section 6 (R2 + tags).
- Operator research -> section 3 full avatar.
- Connected accounts -> section 7 config + live metrics elsewhere in the portal.

## What consumes it

- Sequence/carousel/reel generators: sections 2, 3, 4, 5, 6 (proof lines and artifact slots), 8.
- Bio optimizer: 1, 2 (mechanism name), 6 (backtrackable proof), 7 (trigger word).
- Email composer: 3 (language), 5, 2.
- The context-package export: all eight, one markdown doc, one click, versioned.

## Build contract (Codex, when fired)

- D1: `client_brain` table (client_id, section, field, value_json, source, updated_at) or eight typed tables if cleaner; R2 bucket for proof media with a `proof_assets` index table (client_id, r2_key, image_class, tag, claim, permission, uploaded_at).
- Portal: a Brain tab, eight sections, inline editing, per-field source + freshness stamp, gap indicators for empty fields, and the Export context package button (generates the markdown doc).
- Admin/god-view: same brain editable operator-side; the voice-note upload + transcript-to-draft flow can be operator-side v1 (operator pastes the transcript, AI drafts the sections, operator confirms).
- Generators read the brain server-side when composing prompts (extend the existing sequence-prompt builder to pull from `client_brain` instead of ad-hoc params where present).
- Same discipline: local-verify only, no deploy/commit/remote-D1 from Codex; Claude reviews and deploys.

## Open questions

- Transcription: v1 can be operator-pasted transcript (zero new infra); v2 wires a transcription API. Recommend v1 now.
- Versioning depth: freshness stamps v1; full history later if needed.

## Source trail

- Founder approval 2026-07-15 ("yes" to proposing the structure). Avatar schema read from `raw-sources/icp/marcus-icp-research.json`. Onboarding assets per [[synthesis/payment-onboarding-automation-spec]]. Consumer contracts per the generator and design-system pages.

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

## Phase 2 implementation (2026-07-15)

Phase 2 is live on `pulsify-funnels`. The production Studio path now loads the authenticated client's `client_brain` and proof rows before composing the sequence prompt. This covers the story-sequence Studio and the Reels capture flow because both use `/api/studio-generate`.

The prompt consumes identity, offer, ICP, story, voice, proof, funnel facts, and the do-not list. An operator-filled trigger word becomes the fallback when the request does not supply one. Only proof with granted permission is automatically promoted into proof lines. Denied proof is excluded. Unknown-permission proof stays visible as reference data and the prompt requires confirmation before publication. Brain content is marked as untrusted reference data so text stored by a client cannot override the generator contract.

The operator Brain view now has one-click export. `/api/client-brain-export` is `ADMIN_KEY`-gated and returns one structured Markdown attachment with all eight sections, field sources, freshness stamps, explicit gaps, and the proof-link permission ledger. The response is `no-store`. Direct client download is not exposed in this phase; the operator controls when the package is handed to the client.

Claude's independent review found one pre-deploy permission leak in the mirrored `proof.items` prompt block. The generator now filters denied entries structurally before prompt composition, while granted and permission-unknown entries keep their permission labels. The acceptance test covers all three states. No migration was required. R2 upload, transcription, automated ICP research, and a client-facing Brain tab remain later work.

## Founder refinements (2026-07-15, approved, fired)

The section list holds. These corrections change how it fills and who fills it:

- **1 Identity.** The client types a long freeform block explaining exactly what they do and how it makes money. AI distills that block into the one-line positioning and the mechanism name. So the field is a fat-block input plus an AI-distilled one-liner.
- **3 ICP is operator-conducted research, not a client field.** Clients usually have only a slim, surface guess (generic B2C problems). We capture their guess, but the real ICP comes from Pulsify research: a story-sequence loop that asks the audience what they struggle with in exchange for a lead magnet, Instagram audience stats (age-group percentages of who watches), and above all their previous sales-call transcripts and their DMs of people asking questions (both are gold). The brain stores the guess as client-supplied and the real avatar as operator-researched.
- **4 Story input is a voice note OR a transcript.** A 10 to 20 minute voice note telling the full career journey, or, better, a paste of a podcast/interview/meetup transcript where someone already asked them the questions. Offer both as options.
- **5 Voice, what we actually capture:** tone (playful / serious / professional / informal), whether they curse or use slang, and their positioning attitude (for example the "they played video games, I was grinding on weekends, they did not make it and I did" frame). Collected through our own Typeform-style question layout with fields, choices, an upload button for voice notes or pictures, and an optional speech-to-text so they can talk instead of type.
- **6 Proof.** Images and screenshots are the default (people they helped, student wins, recorded video testimonials can be linked). If they have none, an explicit choice: "I do not have proof or case studies yet." Never block on it.
- **7 Funnel facts are operator-filled, not client-facing.** A trader or FBA creator does not know trigger words, lead magnets, or DM routing. That is the operator's craft. This section is filled operator-side, not asked on the onboarding form.

### The onboarding form

A Typeform-style, animated, fade-in intake: one question at a time, fields, multiple choice, empty fields, and a plus/upload control for voice notes and images. When the client finishes, the answers come back to the operator as clean, readable end-results (question, their answer), easy and dumb-proof to read, not raw data.

### The generation loop (both directions)

The returned answers do two jobs. One, we run them through our own Pulsify AI context to generate the client's assets and fill the gaps. Two, we produce markdown files for the client to drop into their own local folder, so their own AI knows their story, offer, ICP, voice, and proof, the exact way this vault works here. The context-package export is that set of markdown files. Later we teach them to keep it in a repo or local folder and generate their own output from it.

## Open questions

- Transcription: v1 can be operator-pasted transcript (zero new infra); v2 wires a transcription API. Recommend v1 now.
- Versioning depth: freshness stamps v1; full history later if needed.
- R2 for proof images: v1 can accept a paste-link if R2 is not yet enabled on the account; wire real upload once the bucket exists.

## Source trail

- Founder approval 2026-07-15 ("yes" to proposing the structure). Avatar schema read from `raw-sources/icp/marcus-icp-research.json`. Onboarding assets per [[synthesis/payment-onboarding-automation-spec]]. Consumer contracts per the generator and design-system pages.

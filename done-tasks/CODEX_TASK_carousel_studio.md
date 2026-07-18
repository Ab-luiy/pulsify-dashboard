# CODEX TASK — carousel studio (portal P4 slice)

Author: Claude. Date: 2026-07-16. Model: gpt-5.6-sol. Founder authorized overnight autonomous stages.

The Studio gains carousel generation, mirroring the sequence studio's proven contract. Grounded in two canonical vault pages — read BOTH before any code:
- `wiki/frameworks/carousel-system.md` — the 3 structures (methodology-as-document, taxonomy/matrix with the 3-chip colour code, philosophy set), cover-is-the-thumbnail, CTA rules.
- `wiki/content-engine/sequence-carousel-design-system.md` — the design grammar the output must carry per slide (annotation, image class from the 4 allowed only, treatment, chips, ghost number).

Also read the existing sequence flow (`functions/api/studio-generate.js`, `studio-sequences.js`, `_shared/sequence-prompt.js`) — the carousel flow copies its shape: generate (manual mode default, LLM path when a key exists) -> draft -> submit for review -> ADMIN approve/reject.

## Build

1. **Migration 0018 (additive):** `studio_carousels` (id, client_id, structure, topic, goal, params_json, output_json, manual_prompt, status draft/review/approved/rejected, review_note, created_at, updated_at).
2. **Prompt builder** `_shared/carousel-prompt.js`: encodes the 3 structures (cover spec + per-slide roles per structure), the design-direction block per slide (same sanitizer vocabulary as sequences — reuse `sanitizeDesignDirection` from sequence-prompt, do not duplicate it), the chip colour code for taxonomy, proof-currency rule (student results, never lifestyle), the client's brain context (same brain-read the sequence path uses — reuse that code), and the CTA rules (comment-trigger vs DM-trigger matched to goal).
3. **Endpoint** `functions/api/studio-carousels.js`: token-scoped client actions (generate/save/submit/list own) + ADMIN_KEY review actions (approve/reject, cross-client list) — same authz shape as studio-sequences, impersonated sessions read-only (the shared helper already enforces this; opt reads in, writes stay default-deny).
4. **Portal Studio UI:** a Carousels block in the Studio panel: a create control (pick structure: methodology / taxonomy / philosophy + topic + goal), drafts/review/approved list labeled Carousel 01/02/03 by client-sequence number, expandable to the numbered slide list with per-slide copy + design direction rows (reuse the existing `.dd` treatment). Manual mode shows the copyable prompt exactly as sequences do.
5. **Admin review queue:** carousels appear in the existing studio review surface (or a parallel block matching it) with approve/reject.

## Tests (mocked D1)

Generate in manual mode -> draft persisted with a manual prompt containing the structure spec + design blocks + proof-currency ban; the design sanitizer replaces a disallowed image class; submit -> review -> approve transitions; client cannot touch another client's carousel (404/403); impersonated session can read but not write; ADMIN actions 401 without the key. All existing suites still pass.

## Discipline

Identical to all prior tasks: LOCAL-VERIFY ONLY, additive migration only, NO deploy/remote-D1/commit/secrets, no em-dashes/en-dashes, no reward copy, claim locks on AGENT_CHAT.md first, done note with exact files + verification. Claude reviews, migrates, deploys.

## Not in scope

Winning-frames rail, retest variants (next stage), image generation, and the command palette.

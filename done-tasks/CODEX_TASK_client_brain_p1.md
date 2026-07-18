# CODEX TASK — client brain, Phase 1 (intake foundation)

Author: Claude. Date: 2026-07-15. Model: gpt-5.6-sol. Founder approved ("fire").

Full spec: `wiki/synthesis/client-brain-spec.md` (read it, including the "Founder refinements 2026-07-15" section, which is authoritative). This task is Phase 1 only: the data model, the client-facing onboarding form, and the operator view. Later phases (generator wiring, markdown export, R2 image upload, ICP-research tooling, speech-to-text) are noted at the end, do NOT build them now.

Everything lands on the existing pulsify-funnels stack (D1 `pulsify-portal`, `output/standard-preview/functions`, `/admin` console). Read the existing patterns first (auth via ADMIN_KEY on operator endpoints, the `resolveClientAccess` / token pattern used by `/portal` and `/leads`, the console.js/console.css conventions) and match them.

## 1. Data model (new migration, next number after 0013)

- `client_brain` (id, client_id, section, field, value_json, source, updated_at). Sections: identity, offer, icp, story, voice, proof, funnel, donot. `source` is one of: client-form, voice-note, transcript, operator, research. Upsert by (client_id, section, field).
- `proof_items` (id, client_id, kind, url, claim, permission, created_at). `kind`: image-link, video-link, screenshot-link. No R2 in Phase 1; proof is captured as pasted links plus a "no proof yet" flag stored in client_brain (section proof, field has_proof=false). Note in a comment that R2 upload replaces link-paste once R2 is enabled.
- Extend the `/api/settings` delete cleanup to also remove these rows for a client (same pattern P2/P3 used).

## 2. The onboarding form (client-facing, token-gated, Typeform-style)

A new page (e.g. `/onboard/` reading a client token, or `functions/onboard/[[path]].js` + an HTML shell) that a client opens during onboarding. Design: one question per step, fade in and out between steps, a progress indicator, big readable type, matches the Trakyo shared UI (`shared/pulsify-ui.css`). Controls per step: text field, long textarea, multiple choice, and a paste/link control for voice notes and proof links. Only the CLIENT sections are asked here:

- Identity: a long freeform "explain exactly what you do and how it makes money" textarea (the fat block), plus name and handles.
- Offer: a paste-link or text field for the offer voice note, plus a short "what do you want to do" textarea.
- ICP (their guess only): "who do you think you help, and what do they struggle with" (freeform). Label it as a starting point; the real ICP is our research.
- Story: choose one, a voice-note link, or paste a podcast/interview/meetup transcript, or a long textarea.
- Voice: tone (playful / serious / professional / informal, multiple choice), "do you curse or use slang" (choice), and a freeform "how do you position yourself" prompt with the grinding-vs-video-games style example as placeholder. Optional upload/paste for voice samples.
- Proof: repeatable link rows (paste an image, screenshot, or video-testimonial link, plus what it shows), OR a single choice "I do not have proof or case studies yet."

Submit posts to a new endpoint that writes every answer into `client_brain` (and proof rows into `proof_items`), tagged with the right `source`. Token-gated to the client; no ADMIN_KEY on the client submit, use the existing client/token access pattern.

Do NOT ask funnel facts here. That section is operator-only.

## 3. The operator brain view (in /admin)

A brain view per client in the operator console: the returned answers shown clean and readable, grouped by the eight sections, question then answer, easy to scan, not raw JSON. Each field editable operator-side, with its `source` and a freshness (updated_at) stamp, and a clear gap indicator for empty fields. The operator-only sections, funnel facts and the ICP research/avatar, are editable here and were never on the client form. This is where the operator reads what came back and fills their half.

## Discipline

- LOCAL-VERIFY ONLY: `node --check` every touched JS file and the extracted inline JS of any new HTML page; a mocked-D1 test that a form submit writes the expected client_brain rows with correct sources and that the operator read returns them grouped by section; confirm existing `/portal`, `/leads`, `/admin`, and the studio flows still parse. Migration must be additive.
- NO deploy, NO remote D1, NO commit, NO secrets.
- Voice: no em-dashes or en-dashes, no reward/celebratory microcopy, sentence case, student-proof currency.
- Claim files on the AGENT_CHAT.md Lock Board first; post a done note with the exact files and verification. Claude reviews then deploys (and runs the remote migration).

## Not in Phase 1 (do not build now)

Generator-reads-brain wiring, the markdown context-package export, R2 image upload, ICP-research tooling (story-loop / IG-stats / transcript ingestion), speech-to-text. These are later phases.

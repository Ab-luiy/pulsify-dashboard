# CODEX TASK — Client dashboard P2: content studio (sequences) + email verification

Founder-approved ("p2 fire", 2026-07-12). Spec: `wiki/synthesis/portal-content-studio-spec.md` (P2 section). P1 is LIVE (login + shell). This task: the Instagram sequence studio inside the dashboard's Studio section, plus email delivery/verification for logins. No deploy, no remote D1, no commits — Claude reviews and deploys.

## Read first (the prompt contract sources — do not improvise the content rules)

1. `.claude/skills/story-sequence-generator/SKILL.md` — THE generation contract: types, intake, photo-request rules, output shape, hard copy rules.
2. `wiki/frameworks/story-sequence-system.md` — the framework the contract encodes.
3. `wiki/content-engine/copy-voice-guide.md` — voice rules the prompt must embed.
4. P1 code: `functions/_shared/client-auth.js` (use `resolveClientAccess` for all new endpoints), `functions/api/client-dashboard.js`, `portal/index.html`.

## Known prod constraint (learned in P1)

Local `wrangler pages dev` does NOT enforce Workers production limits (P1 shipped PBKDF2-150K and prod caps at 100K). Keep all crypto/runtime parameters conservative; note anything prod-sensitive in your report.

## Build

### 1. Migration (next number): `studio_sequences` + email verification

- `studio_sequences`: id INTEGER PK, client_id, type, intent, topic, goal, trigger_word, params_json, output_json, manual_prompt, status ('draft','review','approved','rejected'), review_note, created_at, updated_at. Index on (client_id, status).
- `client_email_codes`: code_hash, client_id, email, purpose ('setup'), expires_at, attempts, created_at.

### 2. Prompt builder: `functions/_shared/sequence-prompt.js`

`buildSequencePrompt({clientName, clientProfile, type, intent, topic, goal, triggerWord, proofLines, slideCount})` -> {system, user}. Encode the skill's contract EXACTLY:
- The seven types (value-driven, credibility, Q&A, day-in-the-life, breakdown, lifestyle, CTA) + start-here + story launch; if `intent` is given instead of `type`, instruct the model to map intent -> type and say so in one line.
- The universal 6-step arc; the 9-slide conversion frame (1-3 interrupt+proof/value, 4-6 pain mirror+gap, 7-9 access/offer/CTA); CTA dial: goal=reach -> soft/no CTA, goal=dms/calls -> engineered CTA with the trigger word; lead-magnet type -> CTA slide 1.
- Photo requests per slide: concrete + shootable + one alternative, Pulsify proof currency ONLY (workspaces, screen receipts, dashboards, whiteboards, team calls, human-not-flex) — never cars/watches/hotels/cash.
- Hard copy rules verbatim from the skill: pill-box style (1-3 pills/slide), one reframe per sequence, pain-not-situation, real numbers only from supplied proof (never invent), divide-by-three note, voice guard (no em-dash spam, no "here's the kicker", no curly quotes, sentence case, no emojis/exclamations).
- Required OUTPUT: strict JSON `{type, mapped_from_intent, slides:[{n, job, text_pills:[], emphasis, photo:{primary, alternative}, interactive}], hooks:[2 alternates for slide 1], why_order, posting_note}`. Include "Respond with JSON only."

### 3. Generation endpoint: `functions/api/studio-generate.js`

- POST, client-scoped via `resolveClientAccess` (session or legacy token).
- Inputs: type OR intent, topic, goal, trigger_word (optional), proof_lines[] (optional), slide_count (default 8).
- Provider chain: if `env.GEMINI_API_KEY` -> Gemini (`gemini-2.0-flash` via REST, JSON response mode); else if `env.ANTHROPIC_API_KEY` -> Anthropic messages API (`claude-sonnet-5`); else -> return `{ok:true, mode:"manual", manual_prompt}` (the composed prompt for copy-paste, mirroring Lead Studio's free fallback).
- Parse/validate the JSON (strip code fences defensively); on parse failure return the raw text + manual_prompt rather than 500.
- Persist every generation to `studio_sequences` with status 'draft'; return the row id + output.
- Also `functions/api/studio-sequences.js`: GET list (client-scoped, own rows only), POST actions: submit-for-review (client, draft->review), approve/reject with note (ADMIN key only), delete own draft.

### 4. Studio UI in `portal/index.html`

Replace the Studio empty state with the sequence studio (keep the section's existing visual language):
- Step 1: type cards (the 7 + start-here) OR a free-text intent box ("what do you want to talk about?"), topic field, goal select (reach / DMs / booked calls), optional trigger word, optional proof lines (textarea, one per line), slide count.
- Step 2 (after generation): slides rendered as cards — pills as styled lines, emphasis note, photo request with its alternative, interactive element; per-slide copy button + copy-all; the 2 hook alternates; why-order + posting note.
- Photo checklist: each photo request is a checkable item; uploads OPTIONAL v1 — if the existing media upload plumbing (migration 0009 / media endpoints) is straightforward to reuse for client-scoped uploads, wire it; if not, ship the checklist without upload and say so in the report. Do not build new storage plumbing.
- Status flow: Draft -> "Send for review" -> badge "In review" -> "Approved" (badge green) once operator approves. If mode=manual (no LLM key), show the manual prompt in a copy box with one line explaining it.
- History list: past sequences with status, reopenable.

### 5. /admin: review queue + email settings

- New "Studio review" block in the admin console: list sequences with status 'review' across clients, view the slides, Approve / Reject with note (ADMIN key auth, existing pattern).
- Extend the P1 "Dashboard login" block: if `env.RESEND_API_KEY` exists, "Email setup link" button -> sends the setup link to the client's email via Resend REST API (from address: `env.EMAIL_FROM` or a sensible default placeholder read from env; if unset, disable button with a hint). Keep the copy-link flow regardless.

### 6. Email verification at password setup

- When a setup link is opened AND `env.RESEND_API_KEY` exists: `client-set-password` flow requires a 6-digit code — endpoint `functions/api/client-email-code.js` POST {setup_token} generates code (hashed in `client_email_codes`, 10 min TTL, max 5 attempts), emails it via Resend; the set-password POST then takes {setup_token, code, password}.
- If no RESEND_API_KEY: skip the code step entirely (current P1 behavior unchanged). The login page setup panel gains the code field only when the API says a code was sent.

### 7. Copy rules

All UI text: plain direct English, sentence case, no emojis, no exclamation marks.

## Verify (local only)

- `node --check` all touched JS.
- Fresh local D1 (all migrations), `wrangler pages dev` with a `.dev.vars` containing ADMIN_KEY only (no LLM keys) -> exercise with curl: studio-generate returns mode:"manual" with a complete prompt containing the 6-step arc and proof-currency rules; row persisted; submit-for-review + admin approve transitions statuses; set-password works WITHOUT code when no RESEND key. Then add a fake GEMINI_API_KEY and confirm the code path fails gracefully (upstream error -> clean error json, not a crash).
- Delete `.dev.vars` after. No deploy, no remote D1, no commits.

## Report

Append to `AGENT_CHAT.md`: files + migration number, the exact provider chain behavior, what you reused for uploads or why you skipped, verification transcript summary, prod-sensitive params flagged. Clear your lock line.

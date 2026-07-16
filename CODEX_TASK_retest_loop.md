# CODEX TASK — the retest loop (production wiring)

Author: Claude. Date: 2026-07-16. Model: gpt-5.6-sol. Overnight stage 2, founder-authorized.

The differentiator from the redesign spec (`wiki/synthesis/client-dashboard-redesign-spec-2026-07-12.md`, "The retest loop"): when a logged sequence leaks, one click starts a controlled experiment — a new hook variant, everything else held identical, compared after the next posting. Currently preview-only; this wires it into production.

Read first: `functions/api/metrics-sequences.js` (the drop-off math + diagnostics that identify the leak), `studio-sequences.js` (lifecycle patterns), and the preview's retest modal + lineage UI in `output/standard-preview/portal-preview/index.html` (the design contract).

## Build

1. **Migration 0019 (additive):** `sequence_variants` (id, client_id, sequence_ref, label, hook_text, status testing/won/lost/retired, completion_pct, started_at, resolved_at, created_at). `sequence_ref` ties to whatever identifier the metrics rows use (read the schema; do not guess).
2. **Endpoint** `functions/api/sequence-variants.js`: token-scoped client actions — start a retest from a logged sequence (captures the leaking slide + old hook from the metrics diagnostics, takes the new hook text, creates v2 testing), log the variant outcome (its completion after posting), resolve (the higher completion becomes won, the other lost). ADMIN_KEY can read cross-client. Impersonated sessions read-only (shared helper handles it; writes stay default-deny).
3. **Portal wiring:** on Performance sequence rows whose diagnostic is a hook failure, a Retest hook action opening the preview-style modal (names the leaking slide and its loss, pre-fills a suggested new hook the client edits, explains the method in the note). Active retests show the lineage strip (v1 completion vs v2 testing/result) on the row, per the preview treatment. A resolved winner shows which variant won. Real data only; the suggested-hook prefill may be a simple deterministic rewrite (e.g. from the brain voice fields), never a fabricated metric.
4. **Studio insight hook:** when a retest is active, the This-week's-read strip mentions it (real state, e.g. "a hook retest is running on {sequence}"); when resolved, the read includes the winner. Reuse the existing rule engine; keep it one code path.

## Tests (mocked D1)

Start-retest creates a testing variant bound to the client and captures hook text; cross-client start is rejected; impersonated session cannot start/log/resolve but can read; logging an outcome then resolving marks won/lost correctly by completion comparison; ADMIN 401 without key on admin reads; all existing 12 suites still pass.

## Discipline

Identical to all prior tasks: LOCAL-VERIFY ONLY, additive migration only, NO deploy/remote-D1/commit/secrets, no em-dashes/en-dashes, no reward copy, claim locks on AGENT_CHAT.md first, done note with exact files + verification. Claude reviews, migrates, deploys.

## Not in scope

Auto-scheduling posts, winning-frames rail, the command palette, any external API.

# CODEX TASK — Kit email composer (operator side)

Author: Claude. Date: 2026-07-16. Model: gpt-5.6-sol. Last hands-off queue item.

From the master architecture's integration routing: email drafted in our system, sent through Kit. Operator-side first (the operator writes emails on behalf of clients; the client-facing composer comes later). Lands in `/admin` on the pulsify-funnels stack.

Read first: `functions/api/integrations.js` / the integrations hub code (Kit config + API key are ALREADY storable there, `api_key_set` masking exists, see tests/i1-checks.mjs), and the existing delivery_failures fail-soft pattern.

## Build

1. **Endpoint** `functions/api/email-compose.js` (ADMIN_KEY gated):
   - `GET ?action=tags`: when a Kit API key is stored in the integrations config, fetch the account's tags from the Kit API (v4 `https://api.kit.com/v4/tags` with the stored key; confirm the exact auth header from the stored config shape) and return them. No key stored -> `{configured:false}` with an instructive message, never an error throw.
   - `POST action=send`: {subject, body_html or body_text, tag_id or broadcast to a tag}. With a key: create/send via the Kit API (a broadcast to the tag; use Kit v4 broadcasts; keep the call minimal and documented). Without a key, or on Kit API failure: fail-soft to a stored DRAFT (reuse the existing draft pattern from the payment onboarding email: return the full draft so the operator can copy-paste) and log to delivery_failures. Never lose the composed email.
   - `POST action=draft`: save a draft (new additive table `email_drafts` (id, client, subject, body, tag_id, status draft/sent/failed, created_at, sent_at) — migration 0017).
2. **Admin UI**: an Email block in `/admin` (console conventions): subject field, body textarea, tag selector (populated from action=tags when configured; instructive empty state otherwise), Save draft + Send buttons, a recent drafts/sent list from email_drafts. Voice rules apply to all placeholder copy.
3. **Truthfulness:** the UI states clearly whether Kit is connected (real `api_key_set` from the hub) and that Send becomes live once connected. No fake sent-confirmations: a draft saved is reported as a draft, a real send as a send, a failure as a failure.

## Tests (mocked D1 + mocked fetch for Kit)

- tags without key -> configured:false; with mocked key -> tags returned.
- send with mocked Kit success -> email_drafts row status sent; mocked Kit failure -> status failed + delivery_failures row + draft returned; no key -> draft status draft returned.
- ADMIN_KEY 401 on everything. All existing suites still pass.

## Discipline

Identical to prior tasks: LOCAL-VERIFY ONLY, additive migration only, NO deploy/remote-D1/commit/secrets, no em-dashes/en-dashes, no reward copy, claim locks first, done note with exact files + verification. Claude reviews, migrates, deploys. Do NOT store any API key in code or the repo; the key lives only in the existing integrations config.

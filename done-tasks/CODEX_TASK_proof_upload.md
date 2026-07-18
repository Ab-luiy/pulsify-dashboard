# CODEX TASK — native proof-image upload to R2 (client brain Phase 1b)

Author: Claude. Date: 2026-07-15. Model: gpt-5.6-sol.

R2 is now enabled and the bucket exists. Claude already added the binding to `output/standard-preview/wrangler.toml`:

```
[[r2_buckets]]
binding = "MEDIA"
bucket_name = "pulsify-media"
```

Phase 1 (the client brain) is live: the `/onboard` Typeform-style form, `functions/api/client-brain.js`, the `proof_items` table (id, client_id, kind, url, claim, permission, created_at), and the operator Brain view. Right now proof is captured as pasted links. This task swaps that to real image upload on R2. Read the onboard form (`output/standard-preview/onboard/index.html`), `functions/onboard/[[path]].js`, and `functions/api/client-brain.js` first so you extend them, not rebuild.

## Build

1. **Upload endpoint** `functions/api/media-upload.js`:
   - Token-scoped to the client (same `resolveClientAccess` pattern client-brain.js uses; NOT ADMIN_KEY, this is the client uploading during onboarding).
   - Accepts an image file (multipart form-data or raw body with a content-type). Validate: images only (png/jpg/jpeg/webp/gif), reasonable size cap (e.g. 10 MB), reject others.
   - Store in R2 (`env.MEDIA`) under an unguessable key like `${client_id}/${crypto.randomUUID()}.${ext}`.
   - Insert a `proof_items` row (kind = "image", url = the served path below, claim from the form if provided, permission default). Return the served URL and the new row id.
2. **Serving route** `functions/m/[[key]].js`:
   - Reads the object from `env.MEDIA` by key and returns it with the correct content-type and a sensible cache header.
   - v1 access model: unguessable UUID key is the guard (same pragmatic approach as the existing `/a/{token}` asset redirect). Add a short comment that stricter per-client auth on serving is a later hardening step. Return 404 if the object is missing.
   - The served URL stored in proof_items is `/m/${key}`.
3. **Onboard form UI** (`onboard/index.html`): on the proof step, add a real file input (or drag-drop) that uploads to `/api/media-upload` and shows the uploaded thumbnail inline, alongside the existing "what it shows" caption field. Keep the paste-link row for video testimonials (those stay links, kind = "video-link"). Keep the "I do not have proof or case studies yet" option. Multiple images allowed.
4. **Operator Brain view + settings cleanup**: the operator proof section should render the uploaded images (via `/m/...`), not just links. Extend the `/api/settings` delete cleanup to also delete a client's R2 objects (list by `${client_id}/` prefix and delete) when a client is removed, so we do not orphan media.

## Discipline

- LOCAL-VERIFY ONLY: `node --check` every touched JS file + extracted inline JS of the onboard page; a mocked test for media-upload that rejects a non-image and a too-large file, writes a proof_items row on success, and that the serving route 404s a missing key. Mock `env.MEDIA` with put/get/delete/list. Confirm existing client-brain, followups, view-tracking tests still pass.
- NO deploy, NO remote D1, NO commit, NO secrets.
- Voice: no em-dashes or en-dashes, no reward copy, sentence case.
- Claim files on AGENT_CHAT.md Lock Board first; post a done note with exact files + verification. Claude reviews, then deploys (the R2 binding is already in wrangler.toml, so deploy picks it up; no migration needed since proof_items already exists).

## Not in scope

Per-client signed serving auth (v1 uses unguessable keys), image resizing/optimization, and the Phase 2 generator/export work. Do not build those.

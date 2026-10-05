# Operator photo library verification

Founder requested operator uploads on pulsify-ai.com and shared Claude/Codex access through the Brain. Ticket: https://github.com/Ab-luiy/pulsify-saas/issues/48.

Private operator-only /app/photos and /api/operator-photos. Portraits, Everyday, Scenery and Everything else. Up to 30 PNG/JPEG/WebP/GIF images per batch, 10 MB each. Retry skips successfully uploaded images. Original download preserves bytes. Dedicated operator_photos table and operator-photos/ R2 prefix; no client proof rows.

Shared access: run node tools/sync-operator-photos.mjs before choosing story photos. Cloudflare Wrangler credentials stay outside the repository. Originals are downloaded to brand/photos/uploaded and validated against SHA-256 and byte length; unchanged files skip download; altered local files are preserved and reported. The JSON index retains original filenames and folders. No background auto-sync or AI selection claimed.

Backend: 230/230 tests pass. Focused browser tests: 7/7 pass, desktop/390, both themes, axe, original download, folder filtering, operator nav, failed-upload retry and HEIC rejection. All four static screenshots visually inspected. Functions bundle compiled. R2 public development URL disabled; no public bucket custom domains. Migration 0057 applied successfully as an additive table. The empty live library sync succeeds.

Full frontend check and release verification are recorded below when complete.

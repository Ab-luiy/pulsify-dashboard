# Instagram DM audit snapshots

Immutable recovery archive from the laptop copy at `C:\Users\Abdullah\Downloads\Pulsify-Brain\.claude\worktrees\admiring-hermann-913cc3\ig-report\`, imported 2026-09-07.

These files contain private Instagram messages and conversation identifiers. Treat them as sensitive operating data. They record what the API returned at the pull time; they are not current inbox truth.

## Inventory

- `dm-audit-2026-08-24-full.json` — 160 retained thread records from a run that enumerated 175 conversations: 120 `delivered-no-reply`, 19 `we-spoke-last`, 17 `awaiting-us`, 3 `inbound-only`, and 1 blank/error record.
- `dm-audit-2026-08-24-first-50.json` — earlier 50-thread sample: 38 `delivered-no-reply`, 6 `we-spoke-last`, 3 `inbound-only`, 2 `awaiting-us`, and 1 blank/error record.
- `dm-audit-2026-08-24-full.log` — console trace for the full August 24 run.
- `dm-audit-2026-08-26-recent-60.json` — partial scan of the 60 most recent conversations: 41 `delivered-no-reply`, 11 `we-spoke-last`, 4 `inbound-only`, 3 `awaiting-us`, and 1 blank/error record.
- `dm-audit-2026-08-26-recent-60.log` — console trace for the August 26 run.

The August 26 file is a recent-60 snapshot, not a replacement for the broader August 24 archive. The reusable puller is in `tools/instagram-dm-audit/`.

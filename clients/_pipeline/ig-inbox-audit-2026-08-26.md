# IG inbox audit — 2026-08-26

Source: `ab.luiy` Instagram DM inbox, pulled read-only through Composio on 2026-08-26. Raw snapshot: `raw-sources/instagram-dm-audit/dm-audit-2026-08-26-recent-60.json`. Puller: `tools/instagram-dm-audit/dm-audit.ts`.

This is a delta check across the 60 most recent conversations. It does not supersede [[clients/_pipeline/ig-inbox-audit-2026-08-24]], which retains the broader 160-record audit from a run that enumerated 175 conversations.

## Snapshot

| State | Threads |
|---|---:|
| Delivered, no reply ever | 41 |
| We spoke last after a reply | 11 |
| Inbound only | 4 |
| Awaiting us | 3 |
| Blank or API error | 1 |

No new cold-prospect conversion appears in this snapshot.

## Material changes since August 24

- `tb.tradez` stayed in `we-spoke-last` and received a new scheduling message: “Coming up in an hour 45 broski lemme know if we green.” The main vault later records him as signed, so this thread was advancing rather than stalled.
- `howtodosales` appeared as a new `inbound-only` thread. The most recent event has no text, which usually means an attachment or reaction and needs manual inspection before any response.
- `abdvl163` moved from `awaiting-us` to `we-spoke-last` through a blank outbound event. This is an internal or personal thread, not a pipeline lead.
- `mattt.fx` moved from `we-spoke-last` to `awaiting-us` with “Hahahaha gotta set it up.” This is a personal friend thread, not a pipeline lead.
- The other fresh `awaiting-us` records were Jeremy's inbound pitch and Mason Bowstead's peer conversation. Neither belongs in the cold-prospect follow-up queue.

## Limits

The puller reads no more than 30 messages per conversation, so older history may be missing. Attachments and reactions can have blank text. State labels describe message order, not lead quality. The recent-60 cap also means the totals cannot be compared directly with the August 24 full-inbox totals.

## How Pulsify uses this

Use the August 24 audit for the backlog baseline and this page only for the August 26 delta. Regenerate the current inbox before making follow-up decisions. The canonical command is `npm run audit -- 250` from `tools/instagram-dm-audit/`.

## Source trail

- `raw-sources/instagram-dm-audit/dm-audit-2026-08-26-recent-60.json`
- `raw-sources/instagram-dm-audit/dm-audit-2026-08-26-recent-60.log`
- [[clients/_pipeline/ig-inbox-audit-2026-08-24]]
- [[playbooks/ig-followup-sequence]]

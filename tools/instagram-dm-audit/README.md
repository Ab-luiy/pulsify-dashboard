# Instagram DM audit tool

Read-only puller for the `ab.luiy` Instagram inbox through the existing Composio connection. It lists conversations and messages, classifies each thread by who spoke last, and writes `dm-audit.json`. It does not send messages or mark them seen.

Recovered from the laptop vault on 2026-09-07. The working copy had lived inside a disposable `.claude/worktrees/` directory, so this folder is now the canonical home.

## Setup

```powershell
cd tools/instagram-dm-audit
npm install
```

Create an untracked `.env` locally:

```text
COMPOSIO_API_KEY=...
COMPOSIO_USER_ID=owner
```

`COMPOSIO_USER_ID` is optional and defaults to `owner`. Never commit `.env`.

## Run

```powershell
npm run audit -- 60
```

The number is the maximum number of recent threads to inspect. Use `250` for a full-inbox pass. The August 24 run enumerated roughly 175 threads and took about eight minutes.

The output file is intentionally ignored because it contains private messages and conversation identifiers. When a snapshot matters to the business record, copy it into `raw-sources/instagram-dm-audit/`, give it a dated scope-specific name, and document the pull in `wiki/log.md`.

## States

- `delivered-no-reply`: we sent messages and the other person never replied.
- `we-spoke-last`: both sides spoke and our message is most recent.
- `awaiting-us`: both sides spoke and their message is most recent.
- `inbound-only`: they wrote first and we never replied.
- `unknown`: the API returned no usable message.

These states describe message order. They do not prove lead quality, sales intent, or conversion.

## Known API constraints

- Instagram's Graph user ID is not the messaging ID. The script derives the self messaging ID from message `from` and `to` fields.
- `INSTAGRAM_LIST_ALL_MESSAGES` must request `id,created_time,from,to,message` explicitly or bodies can come back empty.
- Attachments and reactions can appear as blank message text.
- The script reads at most 30 messages per thread, so older history may be absent.
- `probe.ts` is a diagnostic with a historical conversation ID. Replace that ID before using it on a different thread.

Composio exposes send and mark-seen tools through the same connection. This audit does not use them. Never send or alter inbox state without explicit founder approval.

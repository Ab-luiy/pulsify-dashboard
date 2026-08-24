# IG follow-up tracker

The live queue. One row per thread, worked top down. Method lives in [[wiki/playbooks/ig-followup-sequence]], this file is what you actually open.

**States:** `A` said yes never delivered · `B` delivered no reply · `C` asset sent then silence · `D` not a prospect · `dormant` sequence exhausted

**Touches:** 1 opener · 2 the send · 3 small question · 4 extra gift · 5 clean exit. Cadence day 0 / 3 / 7 / 14 / 28.

> ⚠️ **Reconstructed, not read live.** Every row below comes from [[clients/_pipeline/ig-inbox-audit-2026-07-28]], which is 29 days stale as of 2026-08-24. Nothing here reflects the current inbox. Reply state, new inbound, and anything sent since 2026-07-28 are all unverified. Confirm against the live inbox before sending a single message, then update this file and delete this warning.

> Every thread here is 29 days past first touch, so the re-entry rule applies to all of them: they re-enter cold at touch 2, and the cadence restarts from that send date as day 0. Do not run day-3 copy on a 29-day-old thread.

## Priority 1 — said yes, never delivered (state A)

They asked for the asset. We did not send it. This is the only group where the failure is ours, and it is the warmest lead in the pipeline. One message each, the deliver track, no sequence.

| @handle | Name | Said yes | Asset | Built? | Next action |
|---|---|---|---|---|---|
| `nq.nox` | Ender Gündoğlu | Mon 2026-07-27 09:50, "Sure" | Authority bridge audit, 3 pages | ⚠️ built July 2026 but the file is not on this machine. Library points at `C:\Users\Abdullah\Desktop\Prospect Assets\nq.nox\`, that user path no longer exists | Locate or rebuild the docx, then deliver track |
| `_acetrades_` | ACE / Andersen | Mon 2026-07-27 00:28, heart then "I'd like to take a look" | Dormant channel repackage | ✅ `Desktop\Prospect Assets\acetrades\acetrades-what-your-numbers-decided.docx` | Deliver track. Ready to send today |
| `tb.tradez` | tb tradez \| Day Trader | Mon 2026-07-27 01:12, "Sure man" | Conversion-job audit + built assets, 3 docs | ✅ `Desktop\Prospect Assets\tb-tradez\` | **Blocked.** Flagged 2026-07-28 as possibly a founder research account, still unresolved. Founder confirms before anything sends |

## Priority 2 — delivered, no reply (state B)

The seven that never answered the opener. These are the threads the founder asked to be logged. Touch 2 is the send, which converts the July permission request into a gift. It cannot fire until an asset exists for that prospect.

| @handle | Name | Touch 1 | Days | Asset built? | Next touch | Blocker |
|---|---|---|---|---|---|---|
| `nolanfutures` | Nolan Hanstedt | 2026-07-26 | 29 | ✗ | 2 (re-entry) | needs intel file + asset |
| `npcniko` | NpcTrades | 2026-07-26 | 29 | ✗ | 2 (re-entry) | needs intel file + asset |
| `jcbstrm` | Jacob Sturm | 2026-07-26 | 29 | ✗ | 2 (re-entry) | needs intel file + asset |
| `olumightysfutures` | Olu | 2026-07-26 | 29 | ✗ | 2 (re-entry) | needs intel file + asset |
| `cache.capital` | Cache \| Trader | 2026-07-26 | 29 | ✗ | 2 (re-entry) | needs intel file + asset |
| `linny.trades` | Linny | 2026-07-26 | 29 | ✗ | 2 (re-entry) | needs intel file + asset |
| `blake.nq` | Blake Harmon | 2026-07-26 | 29 | ✗ | 2 (re-entry) | needs intel file + asset |

None of the seven has an intel file in `outreach/intel/` or an asset on disk. That is the real constraint on this group, not the copy. Each one needs the prospect-asset pipeline run before touch 2 can carry anything.

## Priority 3 — asset claimed sent, unverified (state C)

| @handle | Name | State | Next touch |
|---|---|---|---|
| `acp1re` | acpire | Reacted, replied "thanks bro". Founder answered "gotcha, should be in your inbox in a min" Mon 2026-07-27 01:47. Seen since, no traffic. Delivery never confirmed | Confirm in the live thread whether the file actually landed. If it did not, deliver track. If it did, touch 3 |

## Priority 4 — built asset, no IG thread open

Assets finished and rendered for prospects who are not in the July batch. These have no delivered DM, so they are not follow-ups. They are first touches waiting on a send, and they are the fastest path to new conversations.

| @handle | Asset | Built | Status |
|---|---|---|---|
| `lukextrades` | Format reset + replacement VSL page | ✅ Desktop | never sent, intel status `notes-in` |
| `bergtrades` | Proof-relocation teardown + VSL rewrite, rendered to PDF and PNG | ✅ Desktop | never sent, intel status blank |

Plus four landing pages provisioned live on 2026-07-09 whose send state was never recorded: `grt-trading`, `deevestments`, `kyle-kirshner`, `grant-zuccolotto`. All four sit at `page-built` or `copy-drafted` in `outreach/intel/`, none at `sent`. Confirm against the live inbox whether any DM ever went out.

## Excluded

| @handle | Why |
|---|---|
| `mackwealthy` / `dxminics` | Reply came from his growth operator, not a prospect. Critique recorded in the July audit and worth acting on separately |
| `10k.ecom` | Founder's own sourcing account |
| `abdul` | Internal |
| `FITFO` | Was an active client thread. Deal is dead, see [[claude-memory]] and `clients/fitfo/` |

## Standing rules

- One touch per thread per session. Never two messages in a row.
- Log every send in `outreach/outreach-log.md` the same session. A touch that is not logged did not happen.
- Never reference their silence, never open with "just following up".
- One specific detail per message, pulled from `outreach/intel/{handle}.md`. Never from memory, never guessed.
- Turn on post notifications for every handle in priority 1 and 2. A story slide-up beats a cold bump and does not consume a touch.

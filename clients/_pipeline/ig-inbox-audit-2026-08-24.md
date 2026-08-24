# IG inbox audit — 2026-08-24

Source: `ab.luiy` IG DM inbox, pulled live 2026-08-24 via the Composio Instagram toolkit (`INSTAGRAM_LIST_ALL_CONVERSATIONS` + `INSTAGRAM_LIST_ALL_MESSAGES`). Read-only, nothing sent, nothing marked seen. Raw data at `.claude/worktrees/admiring-hermann-913cc3/ig-report/dm-audit.json`, puller at `dm-audit.ts` in the same folder.

This supersedes the manual browser method used for [[clients/_pipeline/ig-inbox-audit-2026-07-28]]. The inbox is now pullable on demand without a browser session.

## Headline

**120 threads across the whole inbox are sitting on delivered with no reply. 81 of them are from the last seven weeks.** Older batches from February and April 2026 predate the current formula and are archive.

Reply rate per batch, computed from the live pull:

| Batch | Sent | Threads with any inbound | Rate |
|---|---|---|---|
| 2026-04-14 | 33 | 3 | 9% |
| 2026-07-09 | 4 | 0 | 0% |
| 2026-07-18 | 13 | 4 | 31% |
| 2026-07-26 | 44 | 8 | 18% |
| 2026-08-11 | 7 | 1 | 14% |
| 2026-08-22 | 33 | 1 | 3% |
| 2026-08-23 | 6 | 1 | 17% |

> These are upper bounds. "Threads with any inbound" counts every thread where the other person has ever written, including pre-existing relationships. The single reply credited to the 08-22 batch is `niicksfx`, who is Nick, an existing relationship. The true cold reply rate on that batch is zero.

Two corrections to what the vault currently believes:

> ⚠️ **The 42% July reply rate is wrong.** [[clients/_pipeline/ig-inbox-audit-2026-07-28]] recorded the 2026-07-26 batch as 12 sent, 5 replied. The live pull shows 44 sends that day. Real rate is 18% at the upper bound, and lower once pre-existing threads are removed. That figure has been used to call the opener validated. It does not support that.

> ⚠️ **The locked gift-first formula has never produced a reply.** The 2026-07-09 batch is the only time [[content-engine/cold-dm-formula]] was executed to standard, with a real specific reference and a live landing page link in the first message: `frank_wieler1`, `kyle.kirshner`, `grantzuco`, `deevestments`. Four sends, zero replies, 45 days. Four is not a sample, so this does not disprove the formula. It does mean the formula is unproven rather than proven.

**The trend that matters: volume is rising and reply rate is falling.** 44 sends in July returned 18%. 33 sends on 08-22 returned one reply, from someone already known. Follow-ups can recover part of the 120, but they do not fix a first touch that gets quieter every batch.

## The follow-up finding

This part is clean, and it is the one thing in the inbox with a clear verdict.

Every opener in use asks permission to send:

> your profile hijacked my day bro haha, I've been taking a look at your content and honestly most of the stuff in there resonated with me even though im not a trader, I've made you a lil something that goes over your entire brand with nuanced audits. I'd be happy to send it over for you to take a look, lmk!

The follow-up sent to nine silent threads on 2026-08-22 asks permission a second time:

> do i just fk it and drop it right here anyway?

**Nine sends, zero replies.** Nothing new is offered, and the prospect still has to spend a reply before receiving anything.

Against that, the small-question follow-up sent to `_acetrades_` on 2026-08-05 got an answer inside the same minute. One data point, but it points the other way: it asked for a word rather than a decision.

The rule the data supports, and the only one: **a follow-up that asks permission gets ignored. One that hands something over, or asks for one word, gets answered.**

There is a fulfilment problem underneath it. Something has been promised to 120 people. Delivering it is 120 documents. July is what that looks like in practice, when three people said yes and two waited over a month.

## Delivered, no reply — the working list

Every thread from 2026-07-09 onward with no inbound, oldest first. Batches before July are archive and listed at the bottom.

**2026-07-09 — 4 silent, 46 days**
`kyle.kirshner` · `grantzuco` · `deevestments` · `frank_wieler1`

**2026-07-18 — 8 silent, 37 days**
`j2trading_` · `nickgnpro` · `landernq` · `raphtrades` · `ash10hz` · `jkefund` · `hui.trades` · `jacbdom`

**2026-07-20 — 1 silent, 35 days**
`chloeetrades`

**2026-07-26 — 34 silent, 29 days**
`sebfutures` · `cashfelz` · `teaguehib` · `moneymaxtrades` · `npcniko` · `nolanfutures` · `jcbstrm` · `olumightysfutures` · `cache.capital` · `linny.trades` · `blake.nq` · `neb.barrett` · `j7hague` · `amir.shaikhhh` · `mikaelstclair` · `alec.arauzo` · `tylerroo` · `sytrictradezz` · `cris.alxander` · `ejtrades__` · `srokatrades` · `mazzitellitrades` · `skell_ticks` · `evaninvesting` · `krabstrades` · `tktrades.nq` · `justpressedbuy` · `wodtrades` · `evankrutchikk` · `duccitrades` · `nqlovesollie` · `marikacanda` · `becky.trades` · `nq_james`

**2026-08-02 — 1 silent, 22 days**
`nq.jesseb`

**2026-08-11 — 6 silent, 13 days**
`ahmedyfx` · `matrixmisk` · `hantradesnq` · `aymantrades` · `iveytrades` · `nqryder`

**2026-08-22 — 21 silent, 2 days**
`_byron_wilson` · `ronz` · `oztradess` · `alexohtrades` · `walterdeviation` · `rossmetzler` · `zentradesnq` · `real_bentradezz` · `nq_bandyman` · `oliver.trades.nq` · `phystrades` · `nq.will` · `mattowentrades` · `velotradesnq` · `seanrechtman` · `not.jakeryan` · `shahemtp` · `runitwithjersey` · `realriderjet` · `artan.fx` · `alexsesartic`

**2026-08-23 — 5 silent, 1 days**
`passmesomedupe` · `jaywaytrades` · `kjptradez` · `alyssapilavis` · `_ronintrades`

**Total working list: 80.**

### Archive, pre-formula

**2025-12-02 — 1**
`aidaninvesting`

**2026-02-02 — 6**
`dyl.a.nnn` · `jo_ecom` · `managedbyluca` · `ecommerce_kyle` · `damosells` · `_ezyproperty`

**2026-04-09 — 1**
`mttrading1`

**2026-04-14 — 30**
`scotttaylorofficial` · `lifebysanti` · `hazontrades` · `hittrading` · `_amtrades` · `imtylertrades` · `ericfengg` · `vicctrading` · `the_ebol` · `spektrades` · `eduardbeschea` · `theprengel` · `aleksrosme` · `poboy_trades` · `rongtrades` · `marcotrades` · `argerfx` · `silviotrades` · `tradewithjem` · `jahvonnw` · `smartmoneymo` · `theeurotrader1` · `henrytheninjaa` · `attrades_` · `tony_pawlak` · `itsalexbaluyut` · `mini_tradez` · `fibsdontlie` · `javie_fx` · `jordankilgour`

**2026-04-22 — 1**
`_perryx_`


### Notes on individual threads

- The 2026-07-09 four are the only sends that used [[content-engine/cold-dm-formula]] to standard, each with a live landing page link. All four silent 46 days.
- `moneymaxtrades` carries three unanswered messages: the opener, the permission-ask follow-up, and "there is also a quick design you can use for your landing page i would love to slide but need your green light on that too." Three asks, no reply to any.
- `aymantrades` got "manifesting you opening this dm" as a same-minute second message.
- `nqryder` was skipped by the 08-22 follow-up round.
- `ahmedyfx` and `aidaninvesting` are warm personal threads that received the cold opener. `passmesomedupe` is personal and is excluded from the count.
- Four of the 08-22 batch also received a clap reaction alongside the opener.

## Live threads that matter more than the follow-ups

These are not delivered-no-reply and several are more valuable than the entire silent list.

**`tb.tradez` — call booked.** Ongoing conversation through 2026-08-24. He confirmed 10am his time, founder replied "alright perfect / ill give you a ring here" at 12:38 today.

> ⚠️ Resolves the flag in [[clients/_pipeline/ig-inbox-audit-2026-07-28]] and [[playbooks/prospect-asset-library]] that `tb.tradez` might be a founder research account. He is a real prospect with a booked call. Update the intel file and remove the block.

The three tb.tradez assets are already built and sitting at `Desktop\Prospect Assets\tb-tradez\`. They are call material.

**`niicksfx` — Nick, the case study, going cold.** On 2026-08-20 he said he is building his own offer, has people funnelling in from live streaming, and wants guidance on video ideas. Founder asked him to call, Nick said "I'll shoot you a call later today" on 08-21, founder replied "bet" on 08-22. Two days of silence since. This is the one confirmed case study in the vault ([[claude-memory]]) asking for help and drifting.

**`bergtrades.ig` — asset delivered, thread dangling.** Loom on 08-11, page `bergtrades.pages.dev` on 08-16, he replied "Ok I'll check through" on 08-17. Founder then sent "lmk ur thoughts" and, on 08-20, "hol up ive found something exciting too" with no follow-through. An open promise sitting three days unfulfilled.

**`lukextrades` — asset delivered, 7 days silent.** Doc sent 08-05, he replied "my bad bro i'm gonna look thru this all" on 08-11. Founder sent "hows content going?" on 08-16, nothing since.

**`_acetrades_` — asset delivered, 19 days silent.** Doc sent 08-02. The founder ran the exact touch-3 copy from [[content-engine/cold-dm-formula]] on 08-05: "yo did the thumbnail part land or was that too much at once?" Ace replied "I haven't even looked at it 💀 / mb". Founder closed with "let me know if any of it resonates with you". Nothing since.

> The small-question follow-up worked. It got a reply within the same minute. What it revealed is that the doc was never opened, which is a delivery problem rather than a copy problem. A Google Doc link in an IG DM is a tap, a load, and a scroll on mobile. Worth testing a different container.

## Not prospects

| @handle | What it is |
|---|---|
| `daybrade` | Sends reels constantly, no outreach in the thread. Personal contact |
| `passmesomedupe` | One message, "when shes black". Personal, not outreach. Excluded from the working list |
| `jeremy` | Inbound. Pitching the founder, asked "You get a chance to get signed up?" |
| `abdullah.index` | Inbound pitch. Sells Miro boards for long-form coaches, offered a free first build |
| `connie.um.partnership` | Inbound cold spam, "May I ask if you are a trader?" |
| `abdvl163` | Reel-sharing thread with an ops note, "recheck his dms are disabled". Internal |
| `mattt.fx` | Personal friend, congratulations thread going back to 2025 |

## Method note

The Composio Instagram connection was already authorized and covers DMs, which the vault did not record. Available tools: `INSTAGRAM_LIST_ALL_CONVERSATIONS`, `INSTAGRAM_LIST_ALL_MESSAGES`, `INSTAGRAM_GET_CONVERSATION`, `INSTAGRAM_GET_PAGE_CONVERSATIONS`, `INSTAGRAM_SEND_TEXT_MESSAGE`, `INSTAGRAM_SEND_IMAGE`, `INSTAGRAM_MARK_SEEN`.

Two gotchas cost time and are worth keeping:

- `INSTAGRAM_GET_USER_INFO` returns the Graph user id (`36083631624614340`). Messaging uses a different id (`17841469568516308`). Classifying threads against the Graph id marks every thread as inbound. Derive the messaging id from a message `from`/`to` field instead.
- `INSTAGRAM_LIST_ALL_MESSAGES` needs `fields: "id,created_time,from,to,message"` explicitly or message bodies come back empty.

Sending is possible through this bridge but nothing has been sent and nothing will be without explicit per-message approval.

## Source trail

- Live pull 2026-08-24, `dm-audit.json`, 175 threads enumerated
- [[clients/_pipeline/ig-inbox-audit-2026-07-28]] — the previous audit this one updates
- [[content-engine/cold-dm-formula]] — the standard the current opener diverges from
- [[playbooks/ig-followup-sequence]] — the sequence built off this audit

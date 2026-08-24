# Outreach log

Append-only ledger of every outreach event. One row per event. Log at the end of every session — takes 60 seconds.

**Event types:** `asset-built` · `sent` · `reply-in` · `follow-up-sent` · `booked` · `held` · `closed` · `dead`

| date | prospect | event | asset | channel | notes |
|---|---|---|---|---|---|
| 2026-05-15 | — | scaffolded | — | — | log created, ready for first events |
| 2026-05-29 | — | crm-built | — | — | 276 scraped leads scored into `lead-crm.md` via `tools/score_leads.py`. 27 IG-ready, 50 Tier A. Pipeline tracker created. Still 0 touches sent — next event must be a real `asset-built` / `sent`. |
| 2026-07-09 | Grant Zuccolotto | asset-built | landing-page angle + DM + email + Typeform draft | chat | Funnel leak diagnosed from creator profile: content goes straight to booking with no bridge. Assets drafted, page not yet provisioned. See `outreach/intel/grant-zuccolotto.md`. |
| 2026-07-09 | GRT Trading | asset-built | landing page + DM + email + standard Typeform wiring | funnels | Live page provisioned at `https://pulsify-funnels.pages.dev/grt-trading`. Founder correction applied same day: copied live Typeform, removed custom proof framing drift. See `outreach/intel/grt-trading.md`. |
| 2026-07-09 | Deevestments | asset-built | landing page + DM + email + standard Typeform wiring | funnels | Live page provisioned at `https://pulsify-funnels.pages.dev/deevestments`. Core leak = strong teaching, no real backend bridge. See `outreach/intel/deevestments.md`. |
| 2026-07-09 | Kyle Kirshner | asset-built | landing page + DM + email + standard Typeform wiring | funnels | Live page provisioned at `https://pulsify-funnels.pages.dev/kyle-kirshner`. Core leak = high-value Amazon teaching, no front door. See `outreach/intel/kyle-kirshner.md`. |
| 2026-07-26 | batch of 12 | sent | brand-audit offer (permission-ask opener) | IG DM | Backfilled 2026-08-24 from the live inbox pull. Never logged at the time. 5 replied, 7 silent. Handles in `clients/_pipeline/ig-inbox-audit-2026-07-28.md`. |
| 2026-08-02 | _acetrades_ | sent | Dormant channel repackage, Google Doc | IG DM | Backfilled. Doc link sent 6 days after he asked for it. |
| 2026-08-05 | _acetrades_ | follow-up-sent | small-question touch | IG DM | Backfilled. The [[content-engine/cold-dm-formula]] Option A copy, sent verbatim. **Replied within the same minute:** "I haven't even looked at it 💀 / mb". Silent 19 days since. First evidence that the small question gets an answer, and that a Doc link in an IG DM does not get opened. |
| 2026-08-05 | lukextrades | sent | Format reset + replacement VSL page, Google Doc | IG DM | Backfilled. He replied 08-11 "gonna look thru this all". Founder asked "hows content going?" 08-16. Silent 7 days. |
| 2026-08-11 | batch of 5+ | sent | brand-audit offer (same opener) | IG DM | Backfilled. All 5 still silent as of 2026-08-24. |
| 2026-08-11 | bergtrades | sent | Loom walkthrough | IG DM | Backfilled. He replied "send the doc over sure" 08-12. |
| 2026-08-16 | bergtrades | sent | Proof-relocation page, bergtrades.pages.dev | IG DM | Backfilled. He replied "Ok I'll check through" 08-17. Founder then promised "hol up ive found something exciting too" on 08-20 and never followed through. Open loop. |
| 2026-08-22 | batch of 23 | sent | brand-audit offer (same opener) | IG DM | Backfilled. All 23 silent. Four also received a 👏 reaction. Two went to warm personal threads. |
| 2026-08-22 | 9 silent threads | follow-up-sent | "do i just fk it and drop it right here anyway?" | IG DM | Backfilled. **Zero replies in 2 days.** Asks permission a second time, which is the same structural error as the opener. Diagnosis in `clients/_pipeline/ig-inbox-audit-2026-08-24.md`. |
| 2026-08-23 | batch of 4 | sent | brand-audit offer (same opener) | IG DM | Backfilled. All 4 silent. |
| 2026-08-24 | tb.tradez | booked | 3 built assets ready as call material | IG DM | Live pull confirmed a call agreed for 10am his time. Resolves the standing flag that this handle might be a founder research account. He is a real prospect. |
| 2026-08-24 | — | audit | live inbox pull, 175 threads | IG DM | 37 threads on delivered with no reply. Puller at `.claude/worktrees/admiring-hermann-913cc3/ig-report/dm-audit.ts`, read-only, re-runnable. Follow-up sequence built at `wiki/playbooks/ig-followup-sequence.md`, queue at `outreach/followup-tracker.md`. |

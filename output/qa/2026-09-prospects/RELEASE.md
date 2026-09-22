# September 22 SaaS feedback release

Final Pages release: a97bfaa5 (production main).

Implemented: native CRM with explicit vetting, board/list, review and drop/restore; Today last two calendar months, inbox/tracker current year, stale threads leave active outbound; no destructive purge. Existing queue items are checked against current approval/drop state. Overview cards and metrics carry icons. Search renamed Find conversations with purpose explained. Booking keyword signals quote their source; AI review is on demand, never automatically turns a WhatsApp request into a confirmed booking. Manual confirmed booked totals remain separate. Latest receipt distinguishes an earlier seen DM from a newer unanswered DM.

Verification: 119 backend tests pass; 17-section browser regression passes; focused CRM approval/drop, current snapshot media, fallback and 390px overflow checks pass. Desktop/mobile captures included. Read-only independent reviewer found four actionable defects, all fixed. API auth/tenant guards preserved; anonymous image requests return 401.

Live: recent 97 threads, current-year 282, active outbound 80 at check time. 22 images return 200 (21 restored originals plus profile). Five old story previews were absent from the recoverable backup. AI first live call exposed a response-format parsing failure; hardened parsing plus explicit keyword fallback shipped. Final live review returned 200/source=ai with no appointment evidence, correctly leaving booked unchanged. Only one thread has a recorded receipt in the imported live data; open rate cannot reconstruct receipts the provider never supplied. Imported leads remain unreviewed until the operator approves them; their total is not a qualification claim.

No customer-facing messages sent, inbox records deleted, or automatic booked claims written. Old Lead Studio asset tools remain in the legacy dashboard source; the primary CRM is now the focused review/pipeline surface.

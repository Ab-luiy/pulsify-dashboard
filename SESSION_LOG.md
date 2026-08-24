# Session Log

Running notes / carry-over items between Claude Code sessions.

---

## 2026-08-24

### Shipped
- **IG follow-up sequence** (`index.html`, CRM tab, card `#seqCard`). Five value-led
  touches over 30 days (Value asset -> Diagnosis -> Proof drop -> Direct ask ->
  Permission close), per the `crmNote` "do NOT re-spam" rule: nothing before day 15
  asks for anything. State lives on `state.overrides[name].seq`, so it rides the
  existing `/api/crm-sync` push to D1 and shows up in every browser.
  - Cadence is anchored to the *last touch*, not to enrolment - a late send pushes the
    tail out instead of stacking every remaining step as overdue.
  - Marking step 1 sent sets status `sent`; steps 2+ set `follow-up`. `replied` /
    `call-booked` / `won` / `dead` end the sequence automatically.
  - Bulk enrol acts on the current CRM filter and is confirm-gated (it writes to the
    live synced CRM). Nothing is ever sent automatically - each touch is marked by hand.
  - `Import DM threads` parses `handle | Name | niche | last-sent YYYY-MM-DD`, matches
    existing leads by handle or name, adds unknown handles as Instagram leads, and
    enrols the lot. A lead with a last-sent date starts at step 2, since the opener is
    already spent.

### Blocked - Instagram DM ingestion
- **No DM access from this environment.** Connected connectors are Fathom, Gmail,
  Google Calendar, Google Drive, Miro, Notion. `ig-report/` is analytics-only
  (Composio: profile, insights, reels/posts/stories) and its `COMPOSIO_API_KEY` is a
  GitHub Actions secret, not present locally.
- **"Delivered" vs "Seen" is not exposed by the Instagram Graph API at all**, even with
  full `instagram_manage_messages` scope. The queryable approximation is "we sent last,
  they never replied" - that is what the sequence is modelled on.
- To unlock automated thread pulls: IG Business account linked to a Facebook Page, a
  Meta app with `instagram_manage_messages` + `pages_manage_metadata`, then re-auth the
  Composio Instagram connection with those scopes. Until then the import box is the path.

---

## 2026-06-29

### TODO (next session)
- [ ] **Compare Gemini vs Perplexity** for handling transcripts + prompts in Lead Studio.
      Evaluate which produces better assets from the same YouTube transcript:
      quality/voice-match, extraction accuracy, length handling, and cost.
      Decide which should be the default `/generate` provider (or route per asset type).

### Context
- `/generate` Cloudflare Function currently routes to `gemini-2.5-flash` (free) with
  Claude Sonnet 4.5 fallback. Output capped at `max_tokens: 2048` (can truncate long
  assets — flagged for a possible bump).
- Transcripts are auto-ingested via Supadata Cloudflare Function (`lang=en`).
- Workflow decision: commit + push straight to `main` (Cloudflare deploys from main).

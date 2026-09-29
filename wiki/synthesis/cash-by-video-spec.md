---
type: synthesis
tags: [content, funnel, scaling]
sources: [[synthesis/dustin-varano-infoos-teardown]]
created: 2026-09-29
updated: 2026-09-29
---

# Cash by video: build spec

Every YouTube video a client posts gets its own short tracked link for the description, and the client portal ranks the videos by cash collected, not views. Founder asked for this spec on 2026-09-29 after the [[synthesis/dustin-varano-infoos-teardown]]. This page is the build contract: what the client sees, how each number is computed, what changes in the code, and when it counts as done. Ticket: pulsify-saas #36.

## Why this matters for Pulsify

Inbound YouTube is the revenue engine, and we tell clients to make deep, niche videos for a specific buyer even when the views are small. Today nothing in the portal proves that. A client sees views and nothing else, so they drift toward whatever gets views. This screen makes the case with their own money: the 500-view video that brought in a buyer sits above the 20,000-view video that brought in nobody, and the next video gets made like the one that paid. Later it also feeds the Growth loop: videos that made money become the examples YouTube ideation learns from ([[synthesis/growth-section-plan-2026-09-25]], "results close the loop").

## What the client sees

A new view in the client portal, YouTube section: **Videos by cash** (route `/app/portal/youtube/cash`, a tab next to the existing YouTube screens).

Top row, three numbers for the selected range: cash collected from YouTube, calls booked from YouTube, and the best video by cash (thumbnail and title).

Below that, one row per published video, sorted by cash collected (highest first; ties by calls booked, then applications):

| Column | Meaning |
|---|---|
| Video | Thumbnail, title, publish date, link to the video |
| Views | YouTube's public view count, refreshed every 6 hours |
| Clicks | Opens of this video's tracked link |
| Visits | Unique visitors whose first tagged visit came from this video |
| Applications | People credited to this video who opted in or applied |
| Calls | People credited to this video who booked a call |
| Buyers | People credited to this video with cash collected above zero |
| Cash collected | Their payments minus refunds, inside the range |
| Cash per 1,000 views | Cash collected / views x 1,000 |
| Link | Copy button for the video's tracked link, plus "not clicked yet" when it has zero clicks |

Two extra rows at the bottom, never ranked: "YouTube, no video tag" (people who arrived from youtube.com without a tagged link) and "Not from YouTube". A footer line counts cash we could not tie to any person, so the totals reconcile with the Payments page.

Clicking a video opens a side panel with the people credited to it: name, stage (applied, booked, paid), cash, and the date they first clicked.

Range picker: All time (default), last 90 days, last 30 days. The range filters payments, bookings and applications by when they happened, not by when the video was published.

Empty states, in this order, each with one action:
1. No YouTube handle saved: "Add your YouTube handle so we can list your videos." Button to Integrations (`/app/portal/access`).
2. Videos listed, no clicks on any link yet: "Paste each video's link in its description. Nothing counts until someone clicks it." The table still shows every video with its Copy button.
3. Clicks but no sales traced yet: the table shows, cash columns read $0, no special message.

The operator sees the same screen through the existing client view (impersonation). No separate operator screen in v1.

## Credit rules

One person, one video. A person (a contact email) is credited to the first video tag we ever saw on any of their visits. If they used two devices, we take the earliest tagged visit across every visitor id tied to their email. Later clicks from other videos are shown in their side panel but do not move the credit. Reason: the video that first sent them is the one to remake; splitting credit across videos would hide that and invites made-up weighting.

Cash follows the person, not the payment email. A payment is tied to a person in this order: a confirmed payment match to a contact (`payment_matches`, status confirmed), then the payment's `customer_email`. Anything left is the unlinked-cash footer. Refunds come off (`amount_cents - refunded_cents`).

A visit counts as "from a video" only when its URL carried `utm_source=youtube` and a `utm_content` that is one of this client's video ids (or `channel` for the channel link).

## Current state (verified in code 2026-09-29)

Most of the chain already exists:
- The landing page tracker (`output/standard-preview/js/funnel-integrations.js`) gives every browser a persistent `visitor_id`, reads the five `utm_*` parameters from the page URL, and sends them with every page view, opt-in and Typeform submission.
- `functions/event.js` stores page events with `visitor_id`, `utm_json`, referrer, IP and location in `page_events`, stores applications and opt-ins in `leads` (with `visitor_id` and `utm_json`), stamps the email onto that visitor's earlier events once they submit (`attachIdentityToEvents`), and records an `application` or `optin` touch in `pipeline_touches`.
- Bookings from Calendly and Cal.com record a `booking` touch (`functions/_shared/hooks.js`), and payments from Stripe, Whop and manual entry record a `payment` touch with `amount_cents` (`functions/_shared/payments.js`). `pipeline_touches` is one row per touch, keyed by client and contact email.
- `payment_matches` ties a payment to a contact when the paying email differs.
- Tracked short links exist: `asset_links` plus `functions/a/[token].js` log each open in `asset_events` and redirect. Today every open also fires a Discord "Asset opened" alert, built for prospect documents.
- A client's landing page is served at `https://pulsify-ai.com/{client-id}` (`functions/[slug].js`).
- The sync Worker `pulsify-sync` already calls the YouTube Data API with `YT_API_KEY` (secret confirmed set) on a 6-hourly cron, but only for the founder's own channel and only the latest upload (`workers/sync/src/jobs/youtube.js`).
- A client's YouTube handle is stored in `integrations` (provider `youtube`, `config.handle`), set from the portal's Integrations page.

What is missing: a list of each client's videos, one tracked link per video that tags the landing page visit, a fast way to look up visits by video tag, and the query and screen that join it all.

## Build pieces

**1. Migration (additive only).**
- New table `yt_videos`: `client_id`, `video_id`, `title`, `published_at`, `thumbnail_url`, `duration_seconds`, `views`, `likes`, `comments`, `synced_at`; primary key (`client_id`, `video_id`).
- `asset_links`: add `kind TEXT NOT NULL DEFAULT 'asset'` and `video_id TEXT`; unique index on (`client`, `video_id`) where `kind='video'`.
- `page_events`: add `utm_source TEXT` and `utm_content TEXT`; index (`client`, `utm_content`, `at`). Backfill both from `utm_json` with `json_extract` in the same migration.

**2. `event.js`.** `savePageEvent` also writes `utm_source` and `utm_content` from the payload. No other behavior changes. No change to the landing page or its tracker script (the landing-page standard stays untouched).

**3. Video link redirect (`functions/a/[token].js`).** For `kind='video'` links: target is the client's landing page (`https://pulsify-ai.com/{client}`) unless the link row has its own `target_url`; append `utm_source=youtube`, `utm_medium=video`, `utm_campaign={client}`, `utm_content={video_id}` while keeping any query already on the target; log the open in `asset_events`; send no Discord alert and no bell notification (a popular video would flood both). Existing `asset` links behave exactly as today.

**4. Video sync (`pulsify-sync`, new job `client-videos` on the existing 6-hourly cron).** For every non-archived client with a saved YouTube handle: resolve the channel by handle, read its uploads playlist (newest 200), fetch details in batches of 50, upsert `yt_videos`. For any video without a link, mint one (`kind='video'`, 8-character token, label = video title). Also mint one channel link per client (`utm_content=channel`) for the channel About section and pinned comments. Record each run in `sync_runs`. Public data only, no client sign-in needed, so this does not touch the parked client-integrations work (#15).

**5. Read API: `GET /api/video-cash?range=all|90d|30d`.** Client token auth through the existing client-auth path; operator access through impersonation. Returns the video rows, the two bucket rows, the unlinked-cash figure, the top-row totals and `generated_at`. The join, in words: tagged `page_events` give each visitor id its first video tag; `leads` and the email stamped on `page_events` tie visitor ids to a contact email; `pipeline_touches` supply that contact's applications, opt-ins and bookings; payments come in through confirmed matches or `customer_email`, net of refunds. Clicks come straight from `asset_events` by token. One query plan per request, no per-row queries.

**6. Portal screen** in pulsify-saas under `src/features/portal-youtube/` with a thin route at `src/app/portal/youtube/cash/page.tsx`, built on the existing design tokens and components. Copy follows the voice guide: plain, no hype, no emojis.

## Deliberately not in v1

- Splitting credit across several videos.
- View history charts, retention, click-through rate (those need YouTube Analytics through the client's own sign-in, parked with #15).
- Writing links into video descriptions for the client (needs write access to their channel).
- An AI read of each lead or alerts per click (separate items in the teardown).
- Landing pages hosted outside Pulsify. The tracker only runs on our pages.
- Telling Shorts apart from long-form. The public API has no reliable flag, so every upload is listed.

## Honest limits

- Only people who click the tracked link are counted. Someone who watched five videos and then typed the client's name into Google lands in "Not from YouTube". The screen undercounts YouTube; it never overcounts.
- A channel with a strike may not be able to add links (Dustin reported this for his student in the video; unverified by us).
- Payments tied to nobody stay in the unlinked footer until someone confirms a match on the Payments page.
- There is no paying client yet, so the screen will read empty until one exists, unless the founder's own funnel runs it first (open question below).

## Done when

- [ ] Migration applied on remote D1 before the code deploy; backfill leaves every existing `page_events` row with the same `utm_json`.
- [ ] Unit tests pass for: first-touch credit, two devices on one email, a later click from a second video not moving credit, refund netting, payment from a different email tied through a confirmed match, untagged YouTube referrer bucket, one contact with two payments counted once as a buyer.
- [ ] Redirect test: a video link lands on `/{client}` with all four UTM tags and any existing query kept; no Discord call; asset links unchanged.
- [ ] Sync test with mocked YouTube responses: paging, upsert, one link minted per new video, no duplicate links on the second run.
- [ ] Portal browser tests (mocked API) for the three empty states and cash-first sorting, both themes, phone width without horizontal scroll.
- [ ] Live check on a disposable test client: click a video link, submit the opt-in, record a manual payment, and see that video rise to the top with the right cash. Test rows deleted after.
- [ ] Backend and app suites green; deployed with the usual release order; ticket closed with what shipped.

## Open questions / gaps

- For the founder: run it on your own channel first? Your YouTube is the only live channel we have right now. It needs your own landing page served through our tracker (a Pulsify row in `client_config`) and your handle saved. Yes means real numbers before the first client signs.
- The 200-video cap per sync is a starting number, not a measured limit.

## Connections

- [[synthesis/dustin-varano-infoos-teardown]] — where the idea came from and what else we left out
- [[synthesis/growth-section-plan-2026-09-25]] — the loop this feeds later
- [[synthesis/landing-page-standard]] — why this spec avoids touching landing pages
- [[synthesis/pulsify-portal-master-architecture]] — portal structure this slots into

## Source trail

- Code read 2026-09-29: `output/standard-preview/js/funnel-integrations.js`, `functions/event.js`, `functions/a/[token].js`, `functions/[slug].js`, `functions/_shared/{pipeline-touches,payments,payment-matching,hooks}.js`, `migrations/{0002,0008,0010,0025,0027,0028}_*.sql`, `workers/sync/src/jobs/youtube.js`, `workers/sync/wrangler.toml`; pulsify-saas `src/features/portal/nav.ts`.
- Live D1 read 2026-09-29: no active client rows (one prospect, the rest archived); one YouTube integration row with no handle.

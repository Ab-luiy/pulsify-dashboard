# Phase 2 dashboard state inventory

Date: 2026-09-17  
Scope: Task 2.0 only. This document inventories the operator dashboard state before any Phase 2 schema, API, worker, or UI migration begins.

## Gate

No Task 2.1 schema work should begin until the founder reviews and approves this inventory. The main risks are losing the embedded outreach prospect seed, copying browser-held secrets into D1, or duplicating the existing CRM and payment tables.

## Measured production snapshot

The Phase 2 brief's size and lead-count figures are already stale. The current dashboard checkout contains:

| Asset | Measured state | Current read path | Current writer |
|---|---:|---|---|
| `dashboard-data-v2.json` | 7,343,452 bytes | Dashboard fetches on load and every 15 seconds | YouTube refresh workflow every 6 hours; Instagram refresh workflow daily |
| `yt_leads.json` | 594,029 bytes; 1,335 leads | Baked into `index.html` and also retained as JSON | YouTube lead workflow weekly |
| `yt_leads_meta.json` | 1,335 total; 374 new in latest run; 50 queries | Baked beside the lead array | YouTube lead workflow weekly |
| Embedded `#data` JSON in `index.html` | Static fallback plus operational state | Parsed synchronously at page load | Manual/code changes and lead injection workflow |

The large live JSON is mostly public YouTube/Instagram reporting data plus accumulated story/media payloads. The page starts from embedded state, then shallow-merges the fetched live data into it.

## Server and repository-backed state

| State | Source and shape | Reader | Writer and cadence | Scope | Phase 2 disposition |
|---|---|---|---|---|---|
| YouTube channel snapshot | `dashboard-data-v2.json.youtube.channel`: `name`, `handle`, `url`, `subscribers`, `videos`, `views`, `source` | Overview, content, income-adjacent dashboard cards | `tools/refresh_channel_stats.py`; GitHub Action `15 */6 * * *` | Pulsify operator workspace | Backfill the latest values to `snapshots`; write dated values to `metric_points`; refresh from the Worker every 6 hours. |
| Latest YouTube video | `dashboard-data-v2.json.youtube.latestVideo`: `id`, `title`, `url`, `thumbnail`, `durationIso`, `views`, `likes`, `comments`, `publishedAt`, `publishedLabel`, `source` | Overview/content latest-video UI | Same YouTube script and cadence | Pulsify operator workspace | Store the current object in `snapshots`; retain metric history only where useful. |
| YouTube analytics availability | `dashboard-data-v2.json.youtube.analytics`: availability flags/note; currently unavailable because the job has no OAuth analytics access | YouTube reporting UI | Same YouTube script and cadence | Pulsify operator workspace | Preserve the explicit unavailable state in the snapshot. Do not synthesize analytics. |
| Instagram profile | `dashboard-data-v2.json.instagram.profile`: id, username, name, biography, website, account type, followers, following, media count, profile picture | Overview and Instagram views | `ig-report/agent.ts`; GitHub Action daily at `0 5 * * *` | Pulsify operator workspace | Latest object to `snapshots`; follower/media time series to `metric_points`. |
| Instagram account metrics | `instagram.account`: 30-day reach, views, new followers, engaged accounts, interactions, profile-link taps, dated reach/follower/view series, availability | Instagram analytics and headline metrics | Same daily Instagram job | Pulsify operator workspace | Dated series to `metric_points`; latest rollup to `snapshots`. |
| Instagram content rollup | `instagram.content`: reel count, total/average reach and views, interactions, saves, shares, watch/hook averages, reach by post | Instagram/content views | Same daily Instagram job | Pulsify operator workspace | Latest rollup to `snapshots`; metric points only for dated measurements needed by charts. |
| Instagram audience | `instagram.audience`: countries, cities, gender, age breakdowns | Instagram audience view | Same daily Instagram job | Pulsify operator workspace | Latest object to `snapshots`; no synthetic history. |
| Instagram cadence | `instagram.cadence`: reels/posts/stories in seven days | Content overview | Same daily Instagram job | Pulsify operator workspace | Latest values to `snapshots` and, if retained historically, dated `metric_points`. |
| Instagram reels/posts | `instagram.reels[]`, `posts[]`, plus summaries; media records include identifiers, text/media fields, timestamps, permalink, thumbnail/media URLs, and available insights | Content/Instagram tables and cards | Same daily Instagram job | Pulsify operator workspace | Keep the latest provider payload in `snapshots` initially. Normalize only if a later UI/query requires it. |
| Instagram stories | `instagram.stories[]` plus summary; current job accumulates stories by provider ID and adds `capturedAt` | Stories view and content counters | Same daily Instagram job; accumulated on every run | Pulsify operator workspace | Backfill to `stories` using provider ID as the stable key. Worker owns future refreshes. |
| Content headline metrics | `dashboard-data-v2.json.content`: `igFollowers`, `igReach30d`, `igReelsShipped`; embedded fallback also includes YouTube, output, story, funnel, and revenue-per-view fields | Content and overview cards | Live subset written daily; remaining fields are embedded/manual | Pulsify operator workspace | Provider metrics to `metric_points`/`snapshots`; manually maintained counters to `operator_state` until an event source exists. |
| YouTube lead corpus | `yt_leads.json`; lead payload includes short keys such as `s`, `n`, `cu`, `ig`, `vt`, `vu`, `pd`, `lt`, `ol`, `tv`, `tw`, `sq`, `email`, `niche`, `score`, `tier`, `wound`, `bigfish`, `x`, `discord`, `website`, `links`, with `subs`/`excluded` and enrichment fields where present | Outreach Lead Studio | `tools/scrape_yt_leads.py`; weekly workflow `0 6 * * 1`; `tools/inject_yt_leads.py` bakes exact data into HTML | Shared operator lead pool; CRM fields become operator-specific | Backfill the payload unchanged to `yt_leads`; store scrape metadata in `yt_leads_meta`; preserve exclusion tags rather than deleting rows. |
| YouTube lead scrape metadata | `yt_leads_meta.json`: `scrapedAt`, `count`, `newThisRun`, `niches`, `queriesRun`, and filters | Lead Studio metadata/status | Weekly lead workflow | Shared operator lead pool | Backfill to `yt_leads_meta`; Worker updates after each run. |
| CRM overrides | Existing D1 `crm_overrides`, keyed by lead name with JSON data, client timestamp `_ts`/server timestamp, including status, batch, profile, transcript, notes, offer/problem, assets, and other drawer fields | Lead Studio merged prospect model | Browser `/api/crm-sync` POST after edits, 1.8-second debounce, every 45 seconds, and on tab hide | Operator/global workspace today | Keep existing table and merge contract unchanged. Do not duplicate into `operator_state`. |
| CRM manually added leads | Existing D1 `crm_added`, keyed by lead name; payload contract includes `{n,h,niche,dms,stage,_ts}` and may include source fields | Lead Studio | Same CRM sync path/cadence | Operator/global workspace today | Keep existing table and merge contract unchanged. |
| CRM removals | Existing D1 `crm_removed`, keyed by lead name; removal reason/note/time and lead context | Lead Studio | Same CRM sync path/cadence | Operator/global workspace today | Keep existing table and merge contract unchanged. |
| CRM sync generation | Existing D1 sync generation metadata plus browser `since`/pending marks | CRM sync/takeover flow | API and browser synchronization | Operator/global workspace today | Preserve existing generation and newest-`_ts`-wins behavior. |
| Payments ledger | Existing D1 `payments`: `id`, `client`, `amount_cents`, `currency`, `rail`, unique `reference`, `occurred_at`, `recorded_by`, `note`, `created_at` | Client overview APIs today; operator payment/income UI does not yet use it | Integration/manual server paths as payments are recorded | Per client, visible in operator aggregates | Reuse this ledger for operator payment and income views. Do not create a second payment table or copy totals into `operator_state`. |
| Client records | Existing D1 client/config/workspace APIs; shell fetches `/api/clients` | Workspace switcher and client surfaces | Existing client/provisioning flows | Per client | Reuse current tables/APIs. The embedded client array is a fallback to retire after parity. |
| Operator identity/session | Cloudflare Access identity via `/api/operator-bootstrap` | Shell, permissions, audit context | Access/session lifecycle | Per operator | Keep as the identity source; attach `operator_id` to new operator state and audit writes. |

The CRM tables exist in production and in the current API contract, but their base creation migration is not present in the checked-in `0002`-`0024` migration chain. Phase 2 must introspect production and add a non-destructive baseline migration or document the intentional out-of-band dependency before a clean-environment test can be trusted.

## Embedded operational state in `index.html`

| State | Shape | Reader | Writer and cadence | Scope | Phase 2 disposition |
|---|---|---|---|---|---|
| Founder label | `founder: "AB"` | Header/overview copy | Code/manual only | Operator/workspace | Either derive from operator identity or store display preferences in `operator_state`; do not treat as a metric. |
| Phase counters | `phase`, `phaseDay`, `phaseDaysTotal` | Overview and plan | Code/manual only | Operator/workspace | Backfill as `operator_state.operating_plan`; preserve exact current values. |
| 90-day counters | `planDay`, `planDaysTotal` | Plan/overview | Code/manual only | Operator/workspace | Backfill as `operator_state.operating_plan`; later compute only when start-date semantics are defined. |
| Phase checklist | `phase1Checklist[]` with eight task records | Plan view | Code/manual only; no durable UI writer | Operator/workspace | Backfill to `operator_state.plan_checklist`. Keep item IDs/order/status. |
| Goal targets | `targets.thirtyDay`, `.ninetyDay`, `.twelveMonth`; outreach, calls, closes, cash, YouTube/output, monthly revenue, active clients | Plan, overview, income | Code/manual only | Operator/workspace | Backfill to `operator_state.targets`. These are targets, not observations, so they do not belong in `metric_points`. |
| Outreach totals | `outreach.thisWeek`, `.thirtyDay`, `.allTime` | Overview/outreach | Code/manual only | Operator/workspace | Backfill the current snapshot to `operator_state`. Move to derived metrics only after dated outreach events exist. |
| Sales totals | `sales.callsBooked`, `callsHeld`, `proposalsSent`, `closed` | Overview/sales | Code/manual only | Operator/workspace | Backfill current snapshot. CRM status counts can replace some fields after parity is proven; they are not automatically equivalent. |
| Pipeline totals | `pipeline.hitList`, `dmd`, `replied`, `callBooked`, `callHeld`, `proposalSent`, `closed` | Overview/pipeline | Code/manual only | Operator/workspace | Backfill current snapshot; later derive only from canonical events/CRM with documented definitions. |
| Thirty-day trend | `trend30d.labels`, `outreach`, `calls`, `cash` parallel arrays | Dashboard charts and income | Code/manual only | Operator/workspace | Convert dated values to `metric_points` during backfill. Validate label/value lengths and dates before deleting the source. |
| Revenue summary | `revenue.mrr`, `cashCollected`, `performanceFeeAccruing`, `pipelineValue` | Overview, cashflow, income | Code/manual only | Operator aggregate | Preserve as a backfill snapshot for parity, then compute cash collected from `payments`. Keep MRR/performance fee/pipeline value as explicitly sourced metrics until their canonical inputs exist. |
| Funnel summary | `funnel.vslViews`, `vslCompletionRate`, `typeformStarts`, `typeformCompletes`, `calBookings`, `showRate` | Funnel and overview cards | Code/manual; browser connectors can mutate memory only | Operator/workspace | Backfill to `snapshots`/`metric_points` with source labels. Worker/API should own future pulls. |
| Content plan/config | `content`: targets, counters, funnel label, pillars, loop | Content view | Code/manual; select headline counters can be overridden locally | Operator/workspace | Separate observed metrics from editorial config. Put counters in metrics/snapshots and `funnel`/`pillars`/`loop` in `operator_state.content_config`. |
| Content production base | `contentProduction.stages[]`, `items[]`; items contain `id`, `title`, `type`, `layer`, `pillar`, `stage`, `owner`, `notes` | Content pipeline board | Embedded seed plus local browser patches | Operator/workspace | Merge base plus local patches during backfill, then store the full canonical pipeline in `operator_state.content_pipeline` unless a first-class content table is approved. |
| Client fallback array | `clients[]` with client display and operating fields | Legacy client/dashboard rendering | Code/manual only | Per client | Compare with D1 clients and retire after API parity. Do not backfill duplicate rows blindly. |
| CRM seed prospects | `crm.prospects[]`; historical Instagram/outreach prospects merged with YouTube and manually added leads | Lead Studio | Code/manual only; edits are stored separately in CRM D1 | Shared seed plus operator edits | **Data-loss risk:** untouched seed prospects may exist only in HTML. Before deleting embedded data, diff every seed against `crm_added`, `crm_overrides`, and `yt_leads`; backfill missing seeds into the canonical CRM source or retain an immutable seed table/file. |
| CRM note and legacy hit list | `crmNote`; `hitListLegacy[]` | Outreach UI/legacy compatibility | Code/manual only | Operator/workspace | Preserve note only if still rendered. Confirm `hitListLegacy` is empty/unused before deletion. |

## Browser-persisted state

| Storage key | Shape and behavior | Writer and cadence | Scope | Phase 2 disposition |
|---|---|---|---|---|
| `pulsify_metric_overrides_v1` | `{content:{ytSubs,longFormShipped,shortsShipped,igFollowers,igReelsShipped,igStoriesThisWeek,igReach30d}}`; overlays fetched/embedded values | Operator save/reset | Per browser, intended per operator | Backfill merged values once, then replace with authenticated writes to metrics or `operator_state` according to whether each value is observed or manually maintained. |
| `pulsify_content_pipeline_v1` | `{overrides:{itemId:patch},added:[item],removed:[itemId]}` | Immediate operator actions on add/edit/move/remove | Per browser, intended per operator | Merge with embedded base and backfill canonical pipeline. Keep a temporary read-once migration path until verified. |
| `pulsify_crm_v1` | `{overrides,added,removed,removedReasons,_stagesV2,_ytMigrated}` with per-record `_ts` | Immediate/debounced operator edits | Per browser cache of operator CRM | D1 is already canonical. Keep as offline/cache state during cutover, then reduce/remove after parity. |
| `pulsify_crm_sync_v1` | `{since,pending:{leadName:markTs},generation}` | CRM sync responses and pending edits | Per browser sync metadata | Keep only as sync/cache metadata; never import as business records independently of the CRM merge rules. |
| `pulsify_yt_leads_v1` | Legacy lead overrides keyed by channel URL; read once and marked migrated | Historical browser migration | Per browser | Preserve the read-once compatibility path until D1/backfill parity is confirmed, then remove. |
| `pulsifyHealth.v1` | `{targets:{cal,p,c,f,fi},body:{wNow,wGoal,bfNow,bfGoal,goalDate},entries:[{id,ts,date,food,meal,kcal,p,c,f,fi}]}` | Operator adds/deletes meals, changes targets/body, or resets | Per browser, intended per operator | Backfill to authenticated operator health state. The brief has no dedicated health schema: use namespaced `operator_state` initially or approve normalized `health_entries` if entry-level queries/audit are required. Preserve timestamps and entry IDs. |
| `pulsify_api_keys_v1` | `{ytApiKey,ytChannelId,igToken,calApiKey,tfToken,tfFormId}`; page polls providers directly every five minutes and mutates memory | Operator enters keys | Per browser/device; contains credentials | **Never backfill to D1 or `operator_state`.** Move required credentials to Worker secrets/provider integration storage, replace browser calls, then delete this key from UI/storage. |
| `pulsify_api_key` | Legacy AI/Claude key for Lead Studio generation | Operator enters key | Per browser/device; credential | **Never backfill.** Replace with a server-side secret/API route before deleting browser support. |
| `pulsify_funnels_admin_key` | Legacy funnels admin key | Operator enters key; read by legacy UI | Per browser/device; credential | **Never backfill.** Phase 1 Access identity replaces this mechanism; remove after confirming no remaining endpoint depends on it. |
| `pulsify_fn_access_token` | Legacy function access token | Operator enters/legacy code | Per browser/device; credential | **Never backfill.** Remove after all calls use Access-authenticated APIs. |
| `theme` | `light`, `dark`, or `system` | Operator theme choice | Per device | Keep local; no D1 migration needed. |
| `pulsify:workspace-location:{uid}` | `{view,clientId}` | Shell navigation | Per operator per browser | Keep local as UI resume state. Validate referenced client against `/api/clients`. |
| `pulsify:sidebar:{uid}` | Boolean collapsed/open state | Shell interaction | Per operator per browser | Keep local. |
| `pulsify:range:{uid}` | Selected date-range preset | Shell/report controls | Per operator per browser | Keep local. |
| `pulsify:custom-range:{uid}` | `{from,to}` | Shell/report controls | Per operator per browser | Keep local. |
| `pulsify:analytics:*`, `pulsify:bootstrap:*` | Reserved/ephemeral caches cleared on sign-out; no active dashboard writer found | Shell/cache code if activated | Per operator per browser | Do not backfill. Treat as disposable caches. |

LocalStorage cannot be backfilled remotely by a deployment. The cutover needs a one-time authenticated browser migration for existing operator devices, with an idempotency marker and a visible success/failure state. Server/repository data can be backfilled by script.

## Session-only and derived state

| State | Current source and shape | Writer/cadence | Scope | Phase 2 disposition |
|---|---|---|---|---|
| Payment view model | `D.payments` only renders when `live === true`; expected totals include collected, delta, MRR, subscriptions, refunds, on-time percentage, scheduled/past-due/failed amounts, average deal, outstanding, `types[]`, `txns[]`, `upcoming[]` | No current durable writer; current data files omit it | Operator aggregate with per-client transactions | Build from existing `payments` plus integration data. Preserve UI parity without persisting duplicate aggregate objects. |
| Payout roster | `CLOSERS = []` in page code | Code/manual only | Operator/workspace | No data to backfill. Future roster/attribution needs an explicit canonical source before it becomes real product state. |
| Payout calculator | Inputs `poDeal`, `poSetter`, `poCloser`; computes examples such as setter 5%, closer 10%, and operator fee options in memory | Operator typing; reset reloads | Browser session | Keep client-side unless saved scenarios are explicitly requested. It is a calculator, not a ledger. |
| Basic calculator | Expression string/result in memory | Operator typing | Browser session | Keep client-side. |
| Cashflow model | Runtime `CF_DATA`: month label, current/previous cash and MRR, deal stats, target, six-month arrays, sources, calendar year/month, bookings, today | Built once from `D.revenue` and targets; calendar navigation mutates memory | Operator aggregate/session | Replace financial values with API-derived payment/metric data. Keep calendar navigation local. Do not backfill zero-filled months or empty bookings as facts. |
| Calendar | `CF_DATA.bookings` is empty; year/month navigation is session-only; integration buttons are disabled | No durable event writer | Operator session; future booking records would be per client/operator | No booking data to migrate. Real booking ingestion belongs to the later integration phase. |
| Income view | Derived from `D.revenue`, `D.targets`, and `D.trend30d.cash` | Recomputed at render | Operator aggregate | Point the view at canonical payment, metric, and target APIs. Do not create a separate income record. |
| Direct-browser connector results | YouTube, Instagram, Calendly, and Typeform calls mutate `D` in memory every five minutes when browser keys exist | Browser polling | Per browser/session | Replace with Worker/API ingestion. No durable state exists to backfill beyond the underlying embedded/live values. |
| Shared filter/navigation state | Current tab/view, date range in memory, table filters/search/sort, drawers/modals, calendar month | User interaction | Browser session | Keep client-side. Persist only the already listed harmless shell preferences. |

## Proposed ownership after migration

| Canonical owner | State |
|---|---|
| `metric_points` | Dated YouTube/Instagram/funnel/revenue/output observations and the validated 30-day trend backfill |
| `snapshots` | Latest provider payloads and rollups needed to render without scanning metric history |
| `stories` | Instagram story records keyed by provider identity, including `capturedAt` |
| `yt_leads` and `yt_leads_meta` | Exact lead payloads and scrape-run metadata |
| Existing CRM tables/API | Lead edits, manually added leads, removals, sync generation |
| Existing `payments` table | Payment transactions used to derive cash collected and related operator/client views |
| `operator_state` | Operating-plan counters, targets, checklist, content configuration/pipeline, manual snapshots that lack event sources, and health state if no normalized health table is approved |
| Browser storage only | Theme, navigation resume, sidebar/range preferences, temporary caches, calculators, open UI state |
| Worker secrets/integration secret storage | YouTube and Composio credentials and any later provider credentials; never browser localStorage or general operator state |

## Backfill order and deletion gates

1. Introspect production D1 and reconcile the missing checked-in CRM table baseline before applying `0025`.
2. Create new tables without changing the existing CRM or payment contracts.
3. Backfill repository/server data: provider snapshots, dated metrics, stories, lead corpus/meta, embedded plan/targets/trends, and the embedded CRM seed diff.
4. Ship an idempotent, authenticated browser migration for metric overrides, content pipeline, and health state. Explicitly exclude every credential key.
5. Compare old and new sources in shadow mode: counts, latest timestamps, headline totals, plan/checklist values, CRM merged rows, and payment-derived cash.
6. Switch reads to APIs, then stop browser provider polling and GitHub Action writes.
7. Delete embedded/JSON fallbacks only after two consecutive successful scheduled Worker runs and parity evidence are recorded.

## Founder decisions required for Task 2.1

1. Approve `operator_state` as the initial home for the health log, or add normalized `health_entries` because meal-level querying and audit are product requirements.
2. Approve merging the embedded CRM seed into the existing canonical CRM data after a dry-run diff; leaving it in HTML would keep a hidden dependency.
3. Approve storing the merged content pipeline as `operator_state.content_pipeline` for Phase 2 rather than adding a first-class content-production schema now.
4. Confirm that local theme/navigation/filter/calculator state remains device-only and that no browser credential value is migrated.

Approval of this inventory authorizes Task 2.1 schema work with these boundaries. It does not authorize deletion of the legacy JSON, embedded seed, localStorage compatibility paths, or GitHub Actions until parity gates pass.

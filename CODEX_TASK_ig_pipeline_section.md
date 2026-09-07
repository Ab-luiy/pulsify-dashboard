# CODEX TASK — isolate the IG outreach pipeline in the dashboard CRM

Founder request 2026-08-24: a dedicated section in the dashboard pipeline for Instagram outreach only, with leads staged by how far through the follow-up sequence they are (opener sent, 1st / 2nd / 3rd follow-up, replied, booked).

The data is already done and live in D1. This task is the UI half only.

## What already exists (do not rebuild)

`index.html` on `origin/main` already has everything structural:

- CRM source filter chips at ~line 5830, `crmSourceFilter`, with `All / youtube / instagram / manual`.
- Status board rendered per status at ~line 8826 from `STATUSES` (~8256).
- `STATUSES = ["new","building","sent","follow-up","replied","call-booked","won","dead"]`
- `STATUS_LABELS` at 8259, `STATUS_MIGRATE` at 8261, `normStatus()` at 8262.
- Batch filter (`crmBatchFilter`) already wired to the override `batch` field.
- An Instagram tab with an `igFunnel` at ~7488 that counts IG leads, DMs sent and replies from the CRM.

## What is already in D1 (done, verified)

Database `pulsify-portal`, uuid `764a46f6-9f61-4f45-85b5-7e9a00e8be01`.

- `crm_added` — 87 rows, one per IG outreach thread. Payload matches the contract read from `ytAsProspects()`: `{n, h, niche, dms, stage:"new-lead", src:"instagram", _ts}`. `dms` is the real message count from the live inbox pull. `n` and `h` are both the IG handle, because the pull only exposes usernames.
- `crm_overrides` — 87 matching rows carrying `{status, batch, notes, _ts}`.
  - `status` distribution: `sent` 64, `follow-up` 12, `replied` 10, `call-booked` 1.
  - `batch` 1-7 maps to the real send batches: 1 = 2026-07-09/10, 2 = 07-18/20, 3 = 07-26/27, 4 = 08-02, 5 = 08-11, 6 = 08-22, 7 = 08-23.
  - `notes` reads e.g. `IG - opener 2026-07-26 - follow-up 1 sent 2026-08-22 - no reply 1d - touch 2 of 5`.

Source of truth for the staging logic: `tools/instagram-dm-audit/dm-audit.ts` (read-only inbox puller) and the dated snapshots in `raw-sources/instagram-dm-audit/`. Regenerating the SQL is scripted; ask Claude for `build-stages.js` if you need to re-derive.

## Change 0 — the CRM sync endpoint does not exist (root cause)

Found 2026-08-24 while debugging why the founder saw no leads. This blocks everything else, so do it first or the data can never reach a browser.

- `git ls-tree -r origin/main functions/` returns only `functions/generate.js` and `functions/transcript.js`. **There is no `crm-sync` anywhere in the repo.**
- `POST https://pulsify-funnels.pages.dev/api/crm-sync` returns **405**, which is the static-asset response, not a 401. `GET` falls through to the SPA HTML with 200. Both confirm no Pages Function is bound to that path.
- So `crmSyncNow()` in `index.html` (~9394) has been calling an endpoint that was never built. The client half shipped, the server half did not.
- Compounding it: `crmSyncKey()` reads `pulsify_funnels_admin_key` from localStorage, and the founder does not have that value. `ADMIN_KEY` on the pulsify-funnels Pages project is `secret_text`, so it cannot be read back from the Cloudflare API by anyone.
- Last pulsify-funnels deployment is 2026-07-18, and the project is Direct Upload (`source: null`), not git-connected. Anything written since then has never shipped.

**Also note the dashboard has no base prospect list.** `dashboard-data-v2.json` on `origin/main` has top-level keys `lastUpdated, youtube, instagram, content` and **no `crm` key**, so `D.crm.prospects` is always empty. Every non-YouTube lead lives only in `localStorage.pulsify_crm_v1`. That is the entire reason this is fragile.

Pick one, in preference order:

1. **Build the missing `functions/api/crm-sync.js` on pulsify-funnels**, matching the contract the client already implements: POST, `x-admin-key` header, body `{since, overrides, added, removed}`, response `{ok:true, state:{overrides,added,removed}, serverTs}`, reading and writing `crm_added` / `crm_overrides` / `crm_removed` in the `pulsify-portal` D1 (uuid `764a46f6-9f61-4f45-85b5-7e9a00e8be01`). Delta by `sts > since`. Needs CORS for the `https://pulsify-dashboard.pages.dev` origin, including the `OPTIONS` preflight, since `x-admin-key` plus a JSON content-type always preflights. Then redeploy funnels, which is overdue anyway.
2. **Or add a `crm` block to `dashboard-data-v2.json`** and have `mergedPros()` read `status`, `batch` and `notes` off the base prospect instead of only from `state.overrides`. Same-origin fetch, no key, no CORS. Less durable for edits, but it makes the pipeline visible to any browser immediately.

Until one of these lands, the only way to see the leads is pasting `output/ig-pipeline-load.js` into the console, which is what the founder is doing today.

## Change 1 — added leads must keep their own source

**The bug.** In `mergedPros()` (~line 8368):

```js
const addedTagged = state.added.map(p => Object.assign({ _source: "manual" }, p));
```

`_source` is hardcoded, so all 87 IG leads land under the `manual` chip. Clicking `IG` shows nothing. This is the single thing blocking the founder's request, because the IG chip is the "isolated section" he is asking for.

**The fix.** Respect the `src` field on the payload, defaulting to `manual` so nothing else regresses:

```js
const addedTagged = state.added.map(p => Object.assign({}, p, { _source: p.src || "manual" }));
```

Note the argument order matters. The current code puts the literal first so `p` overwrites it, but `p` has no `_source` key, which is why it always wins as `"manual"`.

Verify: the `IG` chip shows 87 leads, the `manual` chip shows 0, the `youtube` chip is unchanged.

## Change 2 — follow-up depth as real pipeline stages

Today every followed-up lead collapses into one `follow-up` column. The founder wants to see 1st, 2nd and 3rd separately.

Extend the vocabulary, keeping the existing order semantics:

```js
const STATUSES = ["new","building","sent","follow-up-1","follow-up-2","follow-up-3","replied","call-booked","won","dead"];

const STATUS_LABELS = {
  "new":"New", "building":"Freebies", "sent":"Opener sent",
  "follow-up-1":"Follow-up 1", "follow-up-2":"Follow-up 2", "follow-up-3":"Follow-up 3",
  "replied":"Replied", "call-booked":"Call booked", "won":"Won", "dead":"Dead"
};

const STATUS_MIGRATE = {
  "queued":"building", "researching":"building", "asset-built":"building",
  "contacted":"sent", "follow-up":"follow-up-1"
};
```

Requirements:

- `normStatus()` needs no change, it already falls through `STATUS_MIGRATE`, so legacy `follow-up` rows keep rendering while the data is migrated.
- Update `statusOrder` and `statusLabels` at ~8736/8737 to match. They duplicate the constants; consider pointing both at `STATUSES` / `STATUS_LABELS` instead of maintaining two copies.
- The `crmStatusFilter` `<select>` at ~5838 lists statuses in markup. Add the three options and relabel `sent` to "Opener sent".
- Check the board at 8826 still lays out with 10 columns rather than 8. If it overflows, the board should scroll horizontally rather than squeeze.
- `renderCrm()`'s status `<select>` at ~8954 is generated from `STATUSES`, so it picks the new values up for free. Confirm.

**Run this only after the UI ships**, to move the 12 legacy rows onto the new vocabulary:

```sql
UPDATE crm_overrides
SET data = json_set(data, '$.status', 'follow-up-1')
WHERE json_extract(data, '$.status') = 'follow-up'
  AND name IN (SELECT name FROM crm_added);
```

Deeper follow-up counts already exist in the August 24 data (4 threads are at 3 follow-ups, 2 at 2), so once the UI is live Claude will restage all 87 to exact depth from `raw-sources/instagram-dm-audit/dm-audit-2026-08-24-full.json`.

## Change 3 — an IG outreach section, not just a filter

The chip filters the existing board. The founder asked for a section. Minimum viable version, in the Instagram tab next to the existing `igFunnel`:

- A row of stage counts for IG-sourced leads only: Opener sent / Follow-up 1 / 2 / 3 / Replied / Call booked. Reuse the `.stage` markup the funnels already use so it inherits styling.
- A "needs a reply from us" callout listing IG leads at status `replied`. There are 10 and several have been waiting a month. This is the highest-value thing on the screen and it currently has no home.
- Each row links through to the lead in the CRM.

Do not invent new visual language. Match the existing funnel and card components in that tab.

## Constraints

- Base the commit on `origin/main`. The local checkout is 466 ahead / 362 behind and must not be pushed as-is. Live site is Cloudflare Pages from `origin/main`.
- `index.html` is ~1MB with `ytLeadsData` inlined. Do not reformat the file.
- Swap-back backup is `index-classic.html`.
- No D1 writes in this task beyond the one migration above, and only after the UI is live.
- Verify with `preview_eval` assertions rather than screenshots. The CRM DOM times out `preview_screenshot`, per the standing note in Claude's memory.

## Acceptance

1. `IG` chip isolates exactly 87 leads, `manual` shows 0, `youtube` unchanged.
2. Board renders 10 status columns without layout break, and scrolls if needed.
3. Legacy `follow-up` rows still render before the migration runs, and land in "Follow-up 1" after it.
4. Batch filter 1-7 splits the IG leads by real send batch.
5. The Instagram tab shows IG-only stage counts and the 10 replied leads awaiting a response.
6. Nothing about YouTube leads or existing prospects changes.

## Revert

```sql
-- Order matters: the subquery is empty once crm_added has been dropped.
DELETE FROM crm_overrides WHERE name IN (SELECT name FROM crm_added);
DELETE FROM crm_added;
```

`crm_added` was empty before 2026-08-24, so dropping it restores the prior state. The 34 pre-existing `crm_overrides` rows were not touched and must be preserved.

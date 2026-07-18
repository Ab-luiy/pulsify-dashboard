# CODEX TASK — Funnel view-tracking visibility (backend + operator console)

Author: Claude (Opus 4.8). Role split per standing directive: Claude specs + reviews + deploys, Codex builds.
Build in THIS worktree: `output/standard-preview/` under repo root
`C:/Users/Abdullah/Desktop/Pulsify-Brain/.claude/worktrees/modest-almeida-a9733b`.
Do NOT deploy. Do NOT commit is optional (sandbox may block it); Claude reviews the diff, verifies, and deploys.

## Why
Founder wants to see, per prospect, whether a lead opened the landing page and how deep
they watched the VSL, so the team can follow up on warm signals. The tracking pipe already
exists (`/event`, `page_events`, `watch_events`, `/api/campaigns`, `/leads`). Three real gaps
remain, plus discoverability. This task closes all four. Additive only — nothing that already
works may change behavior.

## HARD CONSTRAINTS
- Do NOT touch the landing templates `templates/canonical/*` or `templates/variant-02/*`.
  Codex owns those separately and is mid-iteration; none of this needs a template edit
  (IP/geo is read from Cloudflare request headers server-side, no beacon change).
- Do NOT change existing `/event`, `/api/campaigns`, `/leads`, `/api/settings` response
  contracts. Only ADD columns/fields/endpoints.
- ASCII punctuation only in every file (no em dashes, no curly quotes, no arrow glyphs).
  A prior pass shipped a mojibake em dash — write straight quotes and `->` only.
- User-facing copy follows the vault voice rules: direct, no "not X, it's Y", no
  "Here's the thing", no bold-lead bullets, no emoji.
- Every new SQL statement must be idempotent-safe on re-run where practical
  (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). ALTER TABLE ADD COLUMN is
  fine (D1 tolerates it once; migration is run once).

## Deliverables

### 1. Migration `migrations/0010_view_tracking.sql` (new)
```sql
-- IP + geo on funnel events (Cloudflare gives these free per request).
ALTER TABLE page_events ADD COLUMN ip TEXT;
ALTER TABLE page_events ADD COLUMN country TEXT;
ALTER TABLE page_events ADD COLUMN city TEXT;
ALTER TABLE page_events ADD COLUMN user_agent TEXT;
ALTER TABLE watch_events ADD COLUMN ip TEXT;
ALTER TABLE watch_events ADD COLUMN country TEXT;

-- Off-page asset tracking: a short link that redirects to any doc/URL and logs opens.
CREATE TABLE IF NOT EXISTS asset_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT NOT NULL UNIQUE,
  client      TEXT,
  label       TEXT,
  target_url  TEXT NOT NULL,
  lead_email  TEXT,
  created_at  TEXT NOT NULL,
  archived    INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS asset_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT NOT NULL,
  client      TEXT,
  lead_email  TEXT,
  ip          TEXT,
  country     TEXT,
  city        TEXT,
  user_agent  TEXT,
  referrer    TEXT,
  at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_links_client ON asset_links (client);
CREATE INDEX IF NOT EXISTS idx_asset_events_token ON asset_events (token);
```

### 2. `functions/event.js` — capture IP/geo (edit)
In `onRequestPost`, derive once near the top:
```js
const ip = request.headers.get("cf-connecting-ip") || null;
const country = (request.cf && request.cf.country) || request.headers.get("cf-ipcountry") || null;
const city = (request.cf && request.cf.city) || null;
const userAgent = request.headers.get("user-agent") || null;
```
Thread `ip, country, city, user_agent` into every `savePageEvent(...)` call and `ip, country`
into `saveWatch(...)`. Extend those two helper INSERTs (and their column lists) to include the
new columns. Keep all existing columns and behavior. If `request.cf` is undefined (local dev),
the header fallbacks or null must not throw.

### 3. `functions/a/[token].js` — tracked redirect (new)
Public, no auth (a prospect opens it). `onRequestGet({ request, env, params })`:
- `token = cleanToken(params.token)`; look up `asset_links` where `token=? AND archived=0`.
- If not found or no DB: 302 to `https://pulsify-funnels.pages.dev/` (safe fallback).
- If found: INSERT an `asset_events` row (token, client, lead_email from the link, ip, country,
  city, user_agent, referrer=`request.headers.get("referer")`, at=now). Validate the stored
  `target_url` is http/https before redirecting; if invalid, fallback redirect. Return a 302 to
  `target_url` with `cache-control: no-store`.
- Best-effort Discord alert reusing `sendDiscordAlert` from `_shared/integrations.js`:
  title "Asset opened", lines naming the label + lead_email/client. Wrap in try/catch; a failed
  alert must never block the redirect.
- Do the DB write with `waitUntil`-style best-effort but ensure the redirect still fires even if
  the insert throws (try/catch around the insert).

### 4. `functions/api/assets.js` — manage tracked links (new)
Admin-key auth identical to `functions/api/campaigns.js` `checkAuth` (x-admin-key vs env.ADMIN_KEY).
- `POST`: body `{ client, label, target_url, lead_email? }`. Validate `target_url` is http/https
  (reject otherwise 422). Generate `token` = 10-char url-safe random (crypto). Insert into
  `asset_links`. Return `{ ok:true, token, url: "<origin>/a/<token>", label, target_url }`.
- `GET ?client=<id>` (client optional; if absent, all): return each link joined with open stats:
  `{ token, label, target_url, lead_email, client, created_at, opens, unique_ips, last_open_at, url }`.
  Compute opens = COUNT(asset_events), unique_ips = COUNT(DISTINCT ip), last_open_at = MAX(at).
  Order by created_at DESC.
- `DELETE ?token=<token>`: set `archived=1` (soft delete). Return `{ ok:true }`.
- Include `onRequestOptions` CORS like the other api files.

### 5. Operator console UI (`admin.html` + `admin/console.js` + `admin/console.css`) — additive
Codex is mid-iteration on `admin/console.js`; make MINIMAL, well-scoped additions and do not
refactor existing functions.

(a) Per-prospect drill-down on the "Pages sent" board (route `campaigns`):
- Each campaign row already renders an Actions cell (see `renderCampaignRows`, ~line 2477, the
  "Open page"/"Preview alt" buttons). Add a third action button `View activity` that opens a
  detail panel/drawer for that client.
- The panel fetches `GET /leads?client=<client>` (x-admin-key) and renders the returned
  `viewers` array + `summary`. For each viewer show: a display label (email if present, else a
  short visitor id like `visitor 8f3a…`), watched percent, watch time (mm:ss from watch_seconds),
  plays, last watched (relative time), and whether they applied (viewer.email present in a
  `leads` entry). This is the "did THIS person watch" view. Sort watchers first, deepest watch
  first. Empty state: "No visitors have hit this page yet."
- Reuse existing helpers (`esc`, time formatters) already in console.js; do not invent parallel
  utilities.

(b) Tracked assets manager. Add a small panel — put it inside the `campaigns` route below the
  board, titled "Tracked assets" — that lets the operator:
  - Create a link: inputs for label, destination URL, optional client (prefill from the shared
    client selector), optional lead email; POST `/api/assets`; show the generated
    `/a/<token>` URL with a copy button.
  - List existing links (GET `/api/assets`) in a compact table: label, destination (truncated),
    opens, unique IPs, last open, copy-link, archive (DELETE). 
  - Wire a nav entry only if trivial; otherwise keep it within the campaigns route (preferred,
    fewer moving parts).

(c) Discoverability on Home (route `home`): the existing `/api/campaigns` summary is already
  loaded for the board. Add one line to the Home overview so tracking is visible without digging:
  a stat or sentence like "Pages with activity: N of M" sourced from the campaigns summary
  (`pages_with_activity` / `total_pages`). Do not restructure Home; one additive stat card or
  line is enough.

## Testing (required, Codex runs before returning)
- `node --check` on every changed/new .js file.
- A mocked-DB harness `tests/view-tracking.test.mjs` (Node, no network) that stubs `env.DB`
  (prepare/bind/first/all/run capture) and asserts:
  1. event.js: a `page` event POST stores ip/country/city/user_agent into the page_events insert
     bindings; a `wistia` event stores ip/country into watch_events bindings.
  2. `functions/a/[token].js`: known token -> inserts one asset_event and returns 302 to the
     stored target_url; unknown token -> 302 fallback, no throw; invalid stored url -> fallback.
  3. `functions/api/assets.js`: POST without x-admin-key -> 401; POST with bad target_url -> 422;
     POST valid -> returns token + `/a/<token>` url and inserts a row; GET returns opens/unique
     aggregates; DELETE sets archived.
- Confirm existing `/event` still handles typeform/optin/wistia/page branches (no regression):
  a page and a wistia POST still return `{ok:true}`.
- Print a one-line PASS/FAIL summary.

## Out of scope (do NOT do)
- No landing template edits. No deploy. No changes to auth/isolation in `/leads` or
  `client-integrations`. No new npm deps. No touching the dashboard repo.

When done, write a short summary to `VIEW_TRACKING_NOTES.md` at the worktree root: files changed,
migration name, test result, and the exact commands to (a) apply the migration to D1 and
(b) deploy — for Claude to run after review.
```

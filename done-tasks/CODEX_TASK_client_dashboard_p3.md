# CODEX TASK — Client dashboard P3: metrics layer + sequence paste-back

Founder-approved ("p3 fire", 2026-07-12). Spec: `wiki/synthesis/portal-content-studio-spec.md` (P3). P1 (auth+shell) and P2 (studio) are LIVE. No deploy, no remote D1, no commits — Claude reviews and deploys. Local wrangler is unavailable in your sandbox; verify with node --check + mocked-D1 handler tests like P2, and leave the HTTP pass to Claude.

## Read first

- `wiki/synthesis/portal-content-studio-spec.md` (metrics inventory — the doctrine this implements).
- `wiki/frameworks/story-sequence-system.md` (drop-off diagnostics: leave at slide 2 = hook failed, slide 7 = body failed; cadence floor 3/week, target 5-7; the seven types).
- P1/P2 code: `functions/_shared/client-auth.js`, `functions/api/client-dashboard.js`, `functions/api/studio-sequences.js`, `portal/index.html`, `admin/console.js`.

## Build

### 1. Migration (next number)

- `sequence_log`: id PK, client_id, posted_on (date), type, topic, slide_count, slide_views_json (array of ints, index = slide), dms INTEGER NULL, profile_visits INTEGER NULL, notes, created_at, updated_at. Index (client_id, posted_on).
- `account_snapshots`: id PK, client_id, taken_on (date), followers INTEGER, icp_leads INTEGER NULL, avg_views INTEGER NULL, notes, created_at. Index (client_id, taken_on).

### 2. Endpoints (all client-scoped via resolveClientAccess; admin key also accepted for entry on behalf of a client via ?client=)

- `functions/api/metrics-sequences.js`:
  - POST: create/update a sequence log entry (validate: slide_views array of non-negative ints, length <= slide_count, posted_on ISO date).
  - GET: list entries (last 60 days default) with computed per-entry: completion_pct (last/first views), dropoff_pct (1 - completion), biggest_drop_slide (index with the largest view decrease), diagnostic string: biggest drop at slide 2 -> "hook failed", at slides 6-8 -> "body failed before the ask", else "healthy" when completion >= 70%.
  - GET also returns week summaries: sequences_this_week vs floor 3 / target 5-7, type_mix counts for the current and prior week.
- `functions/api/metrics-weekly.js`:
  - POST: create an account snapshot.
  - GET: the weekly report — latest vs prior snapshot ONLY (week-over-week doctrine): follower delta, icp_leads delta, follower-to-view ratio (avg_views/followers), dollars_per_follower = (payments total, all time, from the existing payments table) / latest followers. Every metric returns null-safe with an instructive hint string when data is missing (never fake zeros as insight).

### 3. Performance section UI (portal/index.html — replace the empty state)

- "Log a sequence" form: date, type (the 7 + start-here), topic, per-slide views (comma-separated or dynamic fields), optional DMs + profile visits, notes.
- Sequence list: per entry a compact bar strip of slide views, completion %, the diagnostic label (plain text badge), DMs.
- Weekly card: this-week vs last-week deltas (followers, ICP leads, $/follower, follower-to-view), cadence status ("2 of 3 minimum this week"), type mix chips.
- "Log followers" mini-form for snapshots.
- All copy: sentence case, direct, no emojis/exclamations. Numbers formatted plainly.

### 4. Admin: same entry forms

In the admin console client view, add a Performance block with the same two forms + list (admin key auth, ?client= scoped) so the operator can log on behalf of clients.

### 5. Studio paste-back (small)

- In `/admin` studio review queue AND on a client's own draft card: a "Paste finished sequence" textarea + save. If the paste parses as the P2 JSON shape -> store to output_json; else store as `{raw_text: ...}` in output_json. Status stays/goes to 'review' on client paste; admin paste keeps current status. Endpoint: extend `functions/api/studio-sequences.js` with action "attach-output" (ownership/admin rules same as existing actions).

### 6. Content section (cheap win, if trivial)

If `content_items` table (existing) has per-client rows, render them read-only in the Content section (title, status, date). If the shape doesn't fit cleanly, leave the empty state and say so.

## Verify

`node --check` all touched files; mocked-D1 handler tests: log entry -> computed drop-off/diagnostics correct for a crafted views array (e.g. [1000,400,380,370,360,350,340,330] -> biggest drop slide 2 -> "hook failed"); weekly report math incl. dollars_per_follower; attach-output authz (client can't attach to another client's row). No deploy, no remote D1, no commits.

## Report

Append to AGENT_CHAT.md: files, migration number, computed-metric formulas as implemented, anything skipped. Clear your lock line.

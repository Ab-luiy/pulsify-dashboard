# September 20 bugfix release

Pages: `0249056e` on https://pulsify-ai.com (supersedes intermediate `8161e490`). Worker: `72ba99b5-4ea3-45d8-a297-17c3667ca93e`. Migration `0034_read_budget_indexes.sql` applied remotely: five indexes, successful import.

## Fixed

- Bell: rapid open/close animation crash; duplicate concurrent loads; incorrect unread counts beyond the loaded page; failed mark-read writes falsely shown as successful; repeated mounts; incorrect client/CRM origin routes. Client notification writes now broadcast to the client topic.
- Technical failures: new system notifications suppressed; historical system rows excluded from the feed and unread count. Failure records remain in sync_runs and delivery_failures. Technical Discord alerts removed from both recordFailure and Worker failure handling. Normal business notifications retained.
- Integrations: client credentials instead of hardcoded operator headers; client selector recovered on cold visits before bootstrap; retry states replace false empty/disconnected states; client-only previews do not expose operator payment-matching controls; read-only webhook mutation controls disabled. Shared JS/CSS moved from protected /admin paths to /shared, verified public 200 without weakening API authentication.
- Sections: stale response guards in Leads and Search; Outreach disposes push listeners and timers on exit; native dashboard activation ignores hidden/not-ready roots; clients alias resolves to Clients.
- Database budget: search recovery runs every 15 minutes instead of every minute; inbox recovery every five minutes. Immediate webhook/push paths unchanged. Bell fallback every two minutes, visible Outreach fallback every five minutes. New covering/partial indexes bound notification feeds and background lookups. Missing embeddings remain pending instead of being falsely marked indexed.

## Verification

86/86 backend tests. tests/bugfix-browser.cjs passes all 17 operator sections, bell rapid clicks, concurrent refreshes, failed writes, paged unread counts, cold Integrations entry, retry, client headers/read-only controls and mobile overflow. Browser APIs are mocked; no claim of authenticated production acceptance. Desktop/mobile images and bugfix-live.json beside this file. Live root/login/shared assets 200, anonymous protected APIs 401, Worker health 200.

## Production limitation

Cloudflare D1 returned code 7500: daily free-tier row-read allowance exhausted, reset midnight UTC (03:00 Istanbul). Some small indexed reads and the index import succeeded; broader reads were rejected. Do not infer complete recovery from those small successful queries. Authenticated live data acceptance remains to be performed after reset. No billing plan changed. Browser-control tooling was unavailable (kernel asset path error), so live UI acceptance was not performed.

Earlier Phase 5 review items remain in REVIEW.md; this release does not claim completion of the entire Phase 5 brief.

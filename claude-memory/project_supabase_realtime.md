---
name: project_supabase_realtime
description: Supabase is a push channel only (Realtime broadcast), not a database; project pulsify-realtime, publishable key as plain var, opaque payloads; Zernio is the IG inbox source
metadata:
  type: project
---

Decided 2026-09-19 with the founder: Supabase is NOT a migration target (it duplicates D1/R2/Pages/Access). It is used only as a live push channel. Org "Pulsify" (free), project `pulsify-realtime`, ref `tdriqapogyncrzravqip`, West EU (Paris). Only the publishable key is used, set as plain vars `SUPABASE_URL` / `SUPABASE_ANON_KEY` on both the Worker and Pages. No secret key anywhere.

**How it works:** `functions/_shared/realtime.js` broadcasts `{conversation_id|id, reason}` on topics `pulsify:operator` and `pulsify:client:<id>`; browsers subscribe through `shared/realtime.js` (`PulsifyRealtime.on(event, fn)`) and refetch details through Pulsify's own authenticated APIs. Payloads must stay opaque because the channel is public. REST broadcast works with the publishable key (202).

**Why:** the tracker needed replies to appear instantly; Cloudflare's equivalent (Durable Objects) needs Workers Paid, which the founder skipped.

**Also live the same day:** Zernio (zernio.com, approved Meta app) replaced Composio as the Instagram inbox source: hosted Instagram login, `message.read` webhooks, replayed history merged by participant id. Gotchas: message `id` IS the Graph mid; conversation `url` is `/direct/...` so the handle comes from `participantName`; free plan 60 req/min so the sweep locks and stops on 429. A parallel Claude session built an in-house notifications bell (`notifications` table, migration 0031) that should subscribe to the same channel.

**Next candidate use:** pgvector semantic search over DMs and client brains, only if the founder asks.

Related: [[feedback_keys_and_apis_are_mine]], [[project_ig_dm_bridge]], [[project_composio_ig_bridge]]

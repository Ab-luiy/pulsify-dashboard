---
name: transcript-ingest
description: Lead Studio auto-ingests real YouTube transcripts via a Supadata-backed Cloudflare Pages Function — needs SUPADATA_API_KEY env var set in Cloudflare
metadata: 
  node_type: memory
  type: project
  originSessionId: 74cef888-00e3-4238-9ef0-fe6867c7620b
---

The Lead Studio drawer has an **Auto-ingest transcripts** box (paste up to 3 YouTube URLs → "Pull transcripts") that fills the transcript field so the Short opener / Typeform / VSL generators run with zero manual paste. Built + deployed 2026-06-28 (commit e6c2135 on pulsify-dashboard).

Architecture: `functions/transcript.js` is a **Cloudflare Pages Function** at route `/transcript`. It POSTs `{urls:[...]}` and calls the **Supadata** API (`api.supadata.ai/v1/youtube/transcript?url=...&text=true`, header `x-api-key`) server-side, returning `{transcripts:[{url,videoId,lang,text}|{...,error}]}`. The page calls `/transcript` same-origin (no CORS).

**REQUIRED for it to work:** set `SUPADATA_API_KEY` in the Cloudflare Pages project (pulsify-dashboard) → Settings → Environment variables (Production), then redeploy. Until set, the function returns a clear "key not set" error. Supadata has a free tier (~100 transcripts/mo) then cents each.

**Why a paid API instead of free scraping:** tested 2026-06-28 — YouTube's WEB/ANDROID/IOS innertube clients are gated (400 "precondition check failed" / no caption tracks), the watch-page timedtext fetch returns empty without a proof-of-origin (PO) token, and public Invidious instances are dead/blocked. Free DIY caption pull is not reliable in 2026; a managed API (Supadata, or transcriptapi.com which powers youtubetotranscript.com) handles the tokens/proxies. Don't retry the free route expecting it to work.

This is the Poppy-AI-style ingest slice for the CRM. See [[lead-studio]] and [[deploy-pipeline]].

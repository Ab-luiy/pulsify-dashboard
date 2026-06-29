# Session Log

Running notes / carry-over items between Claude Code sessions.

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

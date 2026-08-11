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

---

## 2026-08-11

### TODO (next session)
- [ ] **Build a profile story sequence ("who I am" highlight).**
      A sequenced set of stories, saved as a highlight on the profile, that introduces
      who Louai is / what Pulsify does. Purpose: when we send outreach, prospects go
      check the profile — this highlight is what they land on and judge us by.
      - Build it from the inputs we already have in this repo (Pulsify positioning,
        content pillars, brand assets in `project/assets/`, existing YT/IG performance
        data) rather than starting from scratch.
      - **Hard requirement: it must be current.** Any numbers, results, client proof,
        offer wording, or screenshots in the sequence have to reflect where things
        actually stand today — no stale stats. Also decide a refresh cadence so it
        doesn't rot (this is the part that kills these highlights).

### Open questions (to confirm before building)
- Platform: Instagram highlight, or also mirrored to another profile?
- Length / beat count for the sequence, and what the closing CTA should be.
- Which proof points we're allowed to show publicly (client names vs anonymized).
- Format: static designed frames, talking-head clips, or a mix?

### Context
- Raised at end of session; user was signing off for the night and wanted this logged
  so it can be picked up fresh. Nothing built yet — this is a captured request only.

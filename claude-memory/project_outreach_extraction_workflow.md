---
name: project_outreach_extraction_workflow
description: "Standard outreach-asset workflow (WIP) — an LLM compresses transcripts into a quote-rich CREATOR BRIEF, paste into Claude to build the asset"
metadata: 
  node_type: memory
  type: project
  originSessionId: a78945f3-7141-4eee-8017-78639f3ab603
---

STANDARD outreach-asset workflow as of 2026-06-29 (marked WORK IN PROGRESS — fire it anytime, still refining). Splits generation into two stages so cheap/automatable transcript-chewing runs on a weaker model and Claude's quality is spent only on the final copy:

1. **Compress (cheap LLM):** paste the **extraction prompt** + 1–5 raw transcripts into Gemini/Perplexity → it outputs a tight, **quote-rich CREATOR BRIEF** (sub-niche, voice, unique mechanism, content beats, the gap). It writes NO asset, just the brief.
2. **Paste brief into Claude (here).**
3. **Claude asks which asset** (short opener / email sequence / ad scripts / Typeform / VSL/Loom).
4. **Claude builds it** at full quality off the brief, applying opener spec + Humanizer + who-we-are.

**LIVE ON DASHBOARD as of 2026-06-29 (pulsify-dashboard commit 61ad094, pushed to origin/main → Cloudflare):** the refined forensic extraction prompt now IS `buildAnalyzePrompt()` in Lead Studio (sub-niche precision, verbatim-quote-mandatory voice capture, mechanism reconstruction incl. contrarian belief, content beats, the gap). Added a **"Copy extraction prompt"** button next to "Build profile from transcript" → copies the prompt + transcript so the user can run it manually in Perplexity (the chosen path). The automated "Build profile" button still runs the same prompt through the `/generate` proxy. Deployed off a clean worktree based on origin/main (NOT the stale awesome-bassi/hopeful-sammet branches, which are 69 commits behind), verified via preview before push.

Reference copies of the prompts live as md files (authored in worktree `hopeful-sammet-1a2d31`):
- `lead-studio-extraction-prompt.md` — standalone version of the extraction prompt.
- `lead-studio-context-block.md` — the full "brain" context block (master reference; superset of what's on the dashboard). NOT deployed — the dashboard carries the condensed forensic extraction prompt, this file is the source we edit when changing it.

**Why:** external LLMs given a thin prompt produce generic voice/mechanism extraction and state the obvious — because the brain (ICP, sub-niche precision, voice/mechanism bar, Humanizer) lives with Claude, not in the prompt. Compressing first keeps the user's Claude session limit intact (paste a compact brief, not raw transcripts) while still getting Claude-grade final copy. Quality ranking: Claude/Opus ("here") > paid Perplexity models > free Gemini 2.5 Flash. The block narrows but does not close the gap.

**How to apply:** the make-or-break rule is the extraction MUST preserve VERBATIM quotes — paraphrase kills the signal Claude needs. Use paid Perplexity (pick Gemini 2.5 Pro or Claude/GPT in its model picker) for stage 1 when doing it manually, since it beats free Gemini Flash and is already paid for; reserve free Gemini API for the future automated/wired-into-dashboard path (Perplexity's API only serves its Sonar models, so it can't route "Gemini via Perplexity" programmatically). See [[project_lead_studio]], [[feedback_humanizer_copy]], [[project_yt_lead_criteria]], [[project_transcript_ingest]], [[feedback_content_targets_b2c_coaches]].

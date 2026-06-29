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

Two prompt files were authored 2026-06-29 (currently in worktree `hopeful-sammet-1a2d31`, need moving into the canonical brain to persist/back up):
- `lead-studio-extraction-prompt.md` — paste into the cheap LLM with transcripts (stage 1).
- `lead-studio-context-block.md` — the full "brain" context block (master reference; the thing to WIRE into the live dashboard `buildPrompt`/`generate.js` later so Generate ships it automatically).

**Why:** external LLMs given a thin prompt produce generic voice/mechanism extraction and state the obvious — because the brain (ICP, sub-niche precision, voice/mechanism bar, Humanizer) lives with Claude, not in the prompt. Compressing first keeps the user's Claude session limit intact (paste a compact brief, not raw transcripts) while still getting Claude-grade final copy. Quality ranking: Claude/Opus ("here") > paid Perplexity models > free Gemini 2.5 Flash. The block narrows but does not close the gap.

**How to apply:** the make-or-break rule is the extraction MUST preserve VERBATIM quotes — paraphrase kills the signal Claude needs. Use paid Perplexity (pick Gemini 2.5 Pro or Claude/GPT in its model picker) for stage 1 when doing it manually, since it beats free Gemini Flash and is already paid for; reserve free Gemini API for the future automated/wired-into-dashboard path (Perplexity's API only serves its Sonar models, so it can't route "Gemini via Perplexity" programmatically). See [[project_lead_studio]], [[feedback_humanizer_copy]], [[project_yt_lead_criteria]], [[project_transcript_ingest]], [[feedback_content_targets_b2c_coaches]].

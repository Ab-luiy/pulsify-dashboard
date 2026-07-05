---
name: project-batch-outreach-workflow
description: "Batch outreach asset generation — user vets/picks leads, Claude generates assets from a paste block"
metadata: 
  node_type: memory
  type: project
  originSessionId: efb2c9d7-2d57-4469-8ca9-cf51ad1e33d3
---

Standing outreach workflow as of 2026-07-05 (chat version, no build yet). The loop:

1. **User vets and selects leads manually.** There is a human stage of deciding whether a lead is actually good — that judgment is NOT in the scraped data and stays with the user. Claude does NOT pick leads.
2. User pastes a batch to Claude here, one block per lead:
   `LEAD / BRIEF / PROBLEM I SPOTTED / ASSET NEEDED` (asset = short opener | full email sequence | Typeform | ad scripts | landing copy).
3. Claude generates all assets in one pass, labeled per lead, Humanizer-clean, voice-matched. Short-opener style = gap question (make them name the hole), NOT reverse-pitch, NOT a "I built you X" claim before the wound is confirmed.
4. User copies each into the lead's asset history in [[project_lead_studio]] and sends.

**BRIEF quality drives output quality** — richest input is the Lead Studio Creator Profile (carries voice + verbatim quotes); a transcript URL is next; bare bio is thinnest. Video-title-only openers are fine conversation-starters but do NOT confirm the wound — that's the user's 15-min research pass.

Decision: run the chat version manually first; only spec a "batch generate" button into Lead Studio if it earns it. Don't build unprompted. Reference batch run: 2026-07-05 on outreach/lead-crm.md "Today's 10".

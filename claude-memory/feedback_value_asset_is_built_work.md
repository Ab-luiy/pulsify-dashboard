---
name: feedback-value-asset-is-built-work
description: "The governing rules for prospect value assets - built work not diagnosis, flows like an email, half the length, no pain stats"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 916c08ce-89c7-45f2-a572-b2dda72c8557
  modified: 2026-08-05T01:36:17.058Z
---

Six founder rulings from the 2026-08-02/04 prospect-asset builds (`_acetrades_`, `tb.tradez`, `lukextrades`). Full text in `wiki/playbooks/prospect-asset-doc-standard.md`; the pipeline is `wiki/playbooks/prospect-asset-sop.md`.

1. **A value asset is built work, not a diagnosis.** "Here is what I built for you, and here is where you could go differently." Observation gets four lines; four fifths of the page is finished output they could hand to an editor.
2. **Lead with the framework, not the audit.** Details earn a line, never a section. Frameworks drive what gets built and stop being visible as headings.
3. **Ease in like Ben Bader, then cut it in half.** Never open on a framework, it reads as though they missed page one. Hook on something they recognise, a beat, then the bridge. Under 1,500 words.
4. **Never open on stats that read as pain.** They already know their own numbers. 1,500 videos against 1,520 subscribers belongs at the close as a light sign we paid attention, or nowhere.
5. **Do not rewrite something broken, propose the real thing.** A page with no video, proof, price or form gets replaced, not reworded. Be a sharpshooter, not a yesman.
6. **It has to flow like an email.** Sections reference each other in the reader's logic. A stack of tips reads as a list; connected, it reads as a system, and the system is what people pay to have installed.

**Why:** three drafts of TB's doc were rejected for being analytical, generic and too long, and Luke's v1 opened by inflicting a stat he was already painfully aware of. The craft is now settled and written down, so no future build should relitigate it.

**How to apply:** run `wiki/playbooks/prospect-asset-sop.md` end to end. `tools/pull_creator_assets.py` pulls thumbnails, `tools/check_prospect_doc.py` enforces the ceiling and the voice checks, headless Chrome renders landing-page previews. Related: [[feedback-horizon-note-follower-reframe]], [[feedback-asset-library-and-suggestion-register]], [[feedback-plain-speech]].

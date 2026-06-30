---
name: project_landing_page_standard
description: APPROVED landing-page standard = merged Mason+Grant; structure + ownership; reference impl at output/merged-standard-mock/
metadata: 
  node_type: memory
  type: project
  originSessionId: 240756a4-ac13-4777-8711-e81bd3feb023
---

Approved 2026-06-30: Pulsify's default landing-page build is the **merged Mason + Grant standard** — Grant Garcia's structure (single page, video-first, nothing competing above the video, proof wall as the crescendo) wearing Mason Bowstead's premium skin (clean white, Inter Tight heavy headline, one accent CTA, narrow centered column).

Default section order (single page): brand mark → qualifier eyebrow → headline → subhead → VSL → one CTA → application (Typeform-style, directly under video) → proof wall → closing CTA (same destination) → footer. The mechanism/"model" section is DROPPED by default (optional, only after the application, never above the video). Proof header uses Luke Alexander style "People we've helped" (Mason's "Don't just take my word for it" is the alternate). Two-page **gate fork** (bare email opt-in → conversion page) is available when email capture is worth the friction; default is single page, no gate.

Full spec: [[wiki/synthesis/landing-page-standard]] (the source of truth — change only with user sign-off). Distilled from [[project_outreach_extraction_workflow]]'s reference set in `wiki/synthesis/prospect-funnel-reference-library.md`. Reference implementation: `output/merged-standard-mock/` (`index.html` = single-page default, `optin.html` = gate).

**Ownership:** Codex owns the DESIGN/polish of this asset and is building the reusable genericized template (handed off 2026-06-30 via AGENT_CHAT, likely landing in `assets/landing-page-standard/`). Structure + copy rules stay with the standard doc. Proof is the backbone — a page with an empty proof wall is not shippable; every proof slot must be replaced with the prospect's real screenshots/clips before launch.

**Skin = ONE canonical look = Codex's tokens** (from `output/frank-mason-replica-v2/css/style.css`): Inter (not Inter Tight), `--ink #131720`, accent `--blue #6871f4`, lavender, full-bleed white body, radial violet glow, glassy backdrop-blur pills + pulse-dot ring, 13px white video frame + solid blue play disc. NO-FREEHAND RULE: when *I* build a landing page I start from Codex's template/tokens and change only content — do NOT author new CSS/palette/framing. My earlier mock looked distinctly "Claude" (indigo #4f46e5, floating card on grey backdrop, Inter Tight, synthetic gradient video) and the user rejected that drift. Design changes are Codex's call, made once in the template.

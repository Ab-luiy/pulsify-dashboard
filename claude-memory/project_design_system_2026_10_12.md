---
name: project_design_system_2026_10_12
description: "2026-10-12 founder adopted a Kendo-derived design system made ours (pulsify-saas docs/design-system.md): Geist, 12px corners, black gradient page with a glow colour choice, widgets flat black"
metadata:
  node_type: memory
  type: project
  originSessionId: 5c21bdf1-a08c-428a-8f2d-72cbdc7eefd4
  modified: 2026-10-12T15:42:18.517Z
---

Founder 2026-10-12 shared Luke Alexander's Kendo design-system doc and said "go" to adopting its principles as ours. The written rules live in pulsify-saas `docs/design-system.md`. Follow them for every screen.

- **Type and shape:** Geist font, 12px corners on cards, no text smaller than 12px.
- **Components:**
  - Stat tiles with a change badge and a thick filled line (his complaint: "+230 since 1 Sept" looked like AI slop).
  - Pipeline as stage tabs plus rows.
  - "Next moves" as recommendation cards.
- **Background:** "more of a black gradient and let the rest be orange, or give me other colors". The page is a black gradient with a low glow along the top. The glow colour drives every accent: Ember (orange, the default), Gold, Rose, Violet, Emerald, picked in Settings → Appearance (`data-glow`). Widgets stay flat black.
- **Carousels:**
  - They come back finished and live in a Carousels tab under Instagram.
  - Clients edit words only, or highlight words and ask for a rewrite (backend action `rewrite`, Brain 9c2cdb1a).
  - No builders or method names.

**Why:** he called the earlier screens AI slop, vibe coded, depressing (blue glow, then pure black).

**How to apply:**
- Follow `docs/design-system.md`.
- Never add 20-24px corners, small-text subtitles or colour on card surfaces.
- Default glow: orange (Ember), founder confirmed 2026-10-13 ("orange is sick").
- Related: [[project_frontend_overhaul_2026_10_12]], [[feedback_two_direction_build]], [[feedback_perfection_standard]].

**Update 2026-10-13: editor, cutouts and Canva are live** (pulsify-saas 5906aa9, Pages f6cf3526).
- **Carousel editor** in the Instagram Carousels tab, with "Put text behind the person" (private `pulsify-cutout` Worker, Images segment).
- **Canva handoff:**
  - Canva app "Pulsify" (App ID AAHOGILsm6c, Public, still a draft) in the founder's Canva developer account; MFA is on.
  - Secrets: Pages `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET`.
  - Callback `/api/canva-connect`, return `/api/canva-return`.
- **Open:**
  - Canva must approve the public app before clients outside the founder's Canva team can sign in (submit from the portal; it needs one tested OAuth first).
  - Post to Instagram from the editor.


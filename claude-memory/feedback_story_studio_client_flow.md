---
name: feedback_story_studio_client_flow
description: 2026-10-09 founder direction for the client story studio - copy first and iterated, then guided design choices with suggestions per element, tiers so simple sequences stay simple, photo reuse, long line fitted by shrinking font
metadata:
  type: feedback
---

The story studio is for CLIENTS to use themselves in the app (founder, 2026-10-09). Flow: brief, then copy first (offer several angles, iterate until the client is happy, then full sequence copy), then design after photos are uploaded.

**Why:** the SaaS highlight took about 25 rounds because decisions were made by reacting to finished slides. Moving each decision earlier as a choice between suggestions cuts rounds.

**How to apply:** for every design element ask with suggestions and a default: font, underlines (yes/no and color), gradients (yes/no and colors), logo, charts, visuals, what it is about. Reuse the same photo once or twice then a blurred dimmed carry-over with a drop shadow, so few photos are needed. Keep simple sequences simple (written copy, short pills, one long line fitted by lowering font size slightly like Niksetting does); reserve the full designed treatment for offer launches, VSL, webinars. Playbook: wiki/playbooks/story-sequence-client-flow.md. Engine: tools/story_engine. Related: [[project_saas_story_launch]], [[feedback_saas_story_round4]].

**Build status 2026-10-10:** studio RELEASED 2026-10-10 (pulsify-saas main da7fb10, Brain 8d41db0, Pages deployment 9745f395), includes the own-AI prompt panel. Founder: Geist font, no paid plans until paying clients (Workers is on Free, so server render via Browser Run is rate limited; browser export is the default). Prospects may try the software for feedback and be upsold. Open tickets: #53 render spike (result posted), #54 studio.

Where it is: portal Instagram, My projects, open a story, "Design in the studio" (/portal/instagram/studio?id=). Docs: pulsify-saas/docs/story-studio.md. Release recipe that worked: fast-forward main in the release-main worktree, push, run npm run release there with PULSIFY_BRAIN pointing at the Brain, commit app/ in the Brain, wrangler pages deploy from output/standard-preview. The live site is behind sign-in, so verify from the deployment record, not curl.

**Designed tier 2026-10-10:** RELEASED (pulsify-saas main 9afb032, Brain d577fc87, Pages deployment 785a3cae; ticket #55). Logo, words behind you (client supplies the transparent cutout), numbers card, Q&A card, logos row. Export blocked until figures are real. Inbox card stays Pulsify-only. Backend answer for the founder: Cloudflare (Pages Functions, D1, R2, Vectorize, Workers AI), Supabase only as realtime push.


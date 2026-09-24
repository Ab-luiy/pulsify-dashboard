---
name: project-nextjs-migration
description: "2026-09-23 founder wants the live SaaS (output/standard-preview) moved to React + Next.js; Claude executes; gradual screen-by-screen, backend kept"
metadata:
  node_type: memory
  type: project
  originSessionId: 667d93ee-0214-4df3-8e69-9ddb9ae2fed0
  modified: 2026-09-23T10:41:53.369Z
---

Founder asked 2026-09-23 to adopt React + Next.js for the SaaS "for ease of code, better programming, a better SaaS", and to start improving the setup and migrating gradually. Claude builds it end to end (see [[codex-builds-claude-specs]] override).

Baseline measured that day: ~36k lines frontend (vanilla HTML/JS/CSS, admin/console.js 4.6k lines), ~17k lines backend in functions/ (60+ Pages Functions endpoints on D1, R2, Vectorize, Workers AI), 52 test files (node --test + headless-Chrome .cjs suites). App code lives inside the brain repo and gets hourly "auto: checkpoint" commits. Node 24, npm 11, wrangler 4.136.

Verified pricing 2026-09-23: React/Next/TS/Tailwind/shadcn free; Workers Free = 100k req/day, 10 ms CPU per invocation, 3 MiB gzipped worker cap; Workers Paid $5/mo min, 10 MiB cap, 10M req included; OpenNext supports Next 14/15/16; Vercel Hobby is non-commercial only, Pro $20/mo; GitHub Free = 2,000 Actions min/mo private.

**Why:** big-bang rewrite would freeze features and risk live client data; keep backend and auth, port UI one screen at a time.
**How to apply:** check the latest decision on hosting option and first screen before building; landing pages stay out of scope (locked standard).

**2026-09-24 LIVE:** full rebuild deployed (Pages c50692d4) at pulsify-ai.com/app (every operator screen) and /app/portal (every client portal area, gated by functions/app/portal/[[path]].js); signed-in check clean on all 36 pages. Legacy /admin and /portal still the defaults, NO cutover yet. Remaining: onboarding page (onboard/phase4.js), login screen (Codex PropelAuth, flag off), cutover (redirect /admin and /portal to /app, delete legacy views) only after founder uses it live. Business dashboard numbers mostly frozen 16 May 2026 in legacy; new one labels them.

**2026-09-23 CURRENT STATE (Claude rebuild, supersedes the Codex paragraph below):** hosting decided = Next.js static export at /app on the existing pulsify-funnels Pages project ($0, no Workers/OpenNext). Foundation rebuilt on the live console's exact tokens/Inter/theme key; Overview + Clients migrated and live (Pages aa534a96). START ANY FRONTEND TASK by reading `pulsify-saas/CLAUDE.md` (map + migration recipe), `docs/MIGRATION.md` (every legacy screen, files, APIs, wave) and `docs/DESIGN.md` - do not rescan the legacy tree. Next = Wave 2 daily loop (Today, CRM, Leads, Outreach, Find conversations, bell, palette). Release: `npm run release` in pulsify-saas, then wrangler deploy from Brain/output/standard-preview. Codex's first draft is on branch archive/codex-overview-draft (rejected: off-brand neon look, hand CSS).

**2026-09-23 Codex setup:** Founder explicitly directed Codex to build while Claude is on timeout and asked Claude to review later. New private repo: `https://github.com/Ab-luiy/pulsify-saas`, local checkout `C:/Users/Abdullah/Desktop/pulsify-saas`. It has Next.js 16 static export under `/app`, React, TypeScript, Tailwind, shadcn, Playwright, CI, and a first operator Overview wired to the existing `/api/operator-bootstrap`. The existing Pages middleware gates `/app` through the operator Access identity. Backend suite 131/131, local frontend checks and GitHub CI passed. The additive `/app` preview was deployed to the current Pages project at deployment `2b126e25`; `/admin` remains the default production UI. Anonymous live requests to `/app` and its assets redirect to `/admin`, and pages.dev redirects to the apex. Authenticated live browser acceptance remains to be checked. `docs/client-assistant.md` in the new repo defines tenant scope, reviewed knowledge and usage tracking for the planned delivery AI; there is no live client chat yet. Claude should review the repo, security boundary, and migration order before replacing any current screen.

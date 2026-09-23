---
name: project-nextjs-migration
description: "2026-09-23 founder wants the live SaaS (output/standard-preview) moved to React + Next.js; Claude executes; gradual screen-by-screen, backend kept"
metadata:
  node_type: memory
  type: project
  originSessionId: 667d93ee-0214-4df3-8e69-9ddb9ae2fed0
  modified: 2026-09-23T08:39:00.503Z
---

Founder asked 2026-09-23 to adopt React + Next.js for the SaaS "for ease of code, better programming, a better SaaS", and to start improving the setup and migrating gradually. Claude builds it end to end (see [[codex-builds-claude-specs]] override).

Baseline measured that day: ~36k lines frontend (vanilla HTML/JS/CSS, admin/console.js 4.6k lines), ~17k lines backend in functions/ (60+ Pages Functions endpoints on D1, R2, Vectorize, Workers AI), 52 test files (node --test + headless-Chrome .cjs suites). App code lives inside the brain repo and gets hourly "auto: checkpoint" commits. Node 24, npm 11, wrangler 4.136.

Verified pricing 2026-09-23: React/Next/TS/Tailwind/shadcn free; Workers Free = 100k req/day, 10 ms CPU per invocation, 3 MiB gzipped worker cap; Workers Paid $5/mo min, 10 MiB cap, 10M req included; OpenNext supports Next 14/15/16; Vercel Hobby is non-commercial only, Pro $20/mo; GitHub Free = 2,000 Actions min/mo private.

**Why:** big-bang rewrite would freeze features and risk live client data; keep backend and auth, port UI one screen at a time.
**How to apply:** check the latest decision on hosting option and first screen before building; landing pages stay out of scope (locked standard).

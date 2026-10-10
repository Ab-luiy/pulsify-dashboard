---
name: feedback_one_stack
description: HARD 2026-10-10 founder - one stack for everything we build: React + Next.js + TypeScript for every interface (landing pages too, no raw HTML), TypeScript on Cloudflare for every backend endpoint with shared Zod contracts, one repo; no paid plan until paying clients
metadata:
  type: feedback
---

Founder 2026-10-10: "Raw HTML isn't the go. I want the frontend and backend frameworks unified across everything we do and decide to build in the future." Landing pages and funnels included.

**Why:** pages, portals, prospect assets and the app each started in a different format; one stack means one way to build, test and hand over, and shared types between screens and API.

**How to apply:**
- New UI is React, Next.js, TypeScript, Tailwind and the shared shadcn components. Never write a hand-made HTML page or page-specific vanilla JS for new work. Pages render from typed data through components.
- New backend endpoints are TypeScript on Cloudflare (Pages Functions or Workers) with request and response shapes in a shared Zod contracts package. Existing JavaScript is ported by domain, not rewritten in one go.
- Next.js stays a static export (no paid plan until paying clients; OpenNext hits the 3 MiB Free worker cap). Per-lead URLs: a Pages Function serves the static page and injects link-preview tags (needs a spike).
- Internal tools (Python story engine, scripts) may use anything; whatever a client or prospect sees is on this stack.
- Rule page: wiki/playbooks/engineering-standard.md. Tickets on pulsify-saas: #59 epic, #56 landing and funnel pages (Codex), #57 backend to TypeScript, #58 one repo.
- This supersedes the raw-HTML implementation in [[project_landing_page_standard]] (the design stays locked) and widens [[project_nextjs_migration]] from the console to everything.

**Status 2026-10-11:** #57 started. Step one on pulsify-saas branch claude/backend-ts (packages/contracts, api/ scaffold, contract tests, docs/backend-typescript.md), NOT merged or released. Ports of existing endpoints edit Brain output/standard-preview/functions, which Codex still has locked, so wait for the locks to clear (or #58) before touching them.


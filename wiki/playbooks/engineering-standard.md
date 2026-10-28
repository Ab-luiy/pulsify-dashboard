---
type: playbook
tags: [funnel, scaling, product, standards]
sources: [[wiki/playbooks/pulse-system-stack]], [[wiki/synthesis/landing-page-standard]], [[wiki/synthesis/mvp-plan-2026-10-02]]
created: 2026-10-10
updated: 2026-10-10
---

# Engineering standard: one stack for everything

Founder decision 2026-10-10: everything Pulsify builds, now and later, uses one frontend framework and one backend framework. Raw HTML is not how we build. This page is the rule; the tickets on the pulsify-saas board are the migration.

## Why this matters for Pulsify

Funnel pages, portals, onboarding, prospect assets and the app each started in their own format (hand-written HTML, Jinja templates, plain-JavaScript functions, React). Every format costs a separate way to build, test, secure and hand to a client. One stack means one way to build a page, one place for shared components, and types that stop a screen and its API from disagreeing.

## The rule

1. **Every interface is React, Next.js and TypeScript.** Tailwind and the shared shadcn components for styling, TanStack Query where data is fetched, Zod for the shapes of data. That covers the app, landing pages, funnels, onboarding, legal pages, portals, previews and anything new. No hand-written HTML pages and no page-specific vanilla JavaScript for new work.
2. **Pages render from data.** A landing page is typed content (headline, video, proof, form) passed to shared components. The approved designs stay: the landing-page standard (canonical skin and Variant 02) is still the design source of truth, but it is built as components, not copied HTML.
3. **Every backend endpoint is TypeScript on Cloudflare** (Pages Functions and Workers). Request and response shapes are written once as Zod schemas in a shared contracts package that both the screens and the endpoints import.
4. **One repository** holds the app, the API and the contracts (pulsify-saas). The Brain repo goes back to being the vault: wiki, clients, raw sources and internal tooling.
5. **Internal tools may use anything.** The story engine (Python and headless Chrome) and similar scripts are tools for us. Whatever a client or prospect uses or sees is on this stack, including pages generated for a prospect.
6. **No paid plan until paying clients.** So Next.js stays a static export. Server-rendered Next.js through OpenNext on Workers is blocked by the 3 MiB worker size limit on the Free plan (checked 2026-09-23). Revisit it the day Workers Paid is justified.
7. **Per-lead pages (the `/{slug}` links).** A Pages Function serves the static Next page and puts the link-preview tags for that lead in the head; the page loads its content from the API. This needs a short spike before the funnel pages move.

## What this replaces

> ⚠️ Contradiction: [[synthesis/landing-page-standard]] and the "landing standard locked" decision describe a fill-in HTML template, owned by Codex. The design stays locked. The implementation as raw HTML is superseded by this page. Codex builds the Next.js version; the look must not change.

The 2026-09-23 decision to move the SaaS to React and Next.js gradually is widened from "the operator console" to "everything".

## Current state (2026-10-10)

- App screens (operator console and client portal): Next.js 16, React 19, TypeScript, Tailwind 4, static export at `/app`. The old `/admin` console is still plain JavaScript and is being replaced screen by screen (docs/MIGRATION.md in pulsify-saas).
- Backend: about 100 API files, 82 shared files and 15 worker files, all plain JavaScript, in the Brain repo under `output/standard-preview/functions` and `workers`.
- Pages not on the stack: the two landing templates, `index.html`, `privacy.html`, `terms.html`, `404.html`, `onboard`, `portal`, `portal-preview`, `docs`, and the Jinja prospect-asset documents.

## Migration order

1. Contracts package and TypeScript for every new endpoint (nothing moves yet).
2. Landing and funnel pages to Next.js, design unchanged (Codex implements, from the existing standard).
3. Legal, 404 and the remaining static pages.
4. Move the API into pulsify-saas and deploy from there, then port old endpoints to TypeScript by domain, each with its tests.
5. Finish the `/admin` screens.

## The agent stack (founder 2026-10-27)

Agents like Jane follow one standard too, the way pages follow React and Next.js. Nothing about a model call is hand-written.

| Job | Standard | In Jane |
|---|---|---|
| Talk to any model | AI SDK (`ai` 7, provider packages `@ai-sdk/google`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `workers-ai-provider`) | `functions/_shared/jane-models.ts`, the only door: `janeText`, `janeObject`, `janeStream` |
| Tools the model can call | `tool({ inputSchema: z.object(...) })` with a step limit (`isStepCount`) | the ten read-only lookups in `copy-agent.ts` |
| Structured answers | `Output.object({ schema })` with Zod, never hand-parsed JSON | evidence notes, answer and draft checks, memory, learnings |
| Streaming | `streamText`; our SSE events (`meta`, `lookup`, `status`, `delta`, `stats`, `done`) stay the contract with the screen | `janeStream` |
| Fallback and limits | next free model on a 429 or 503, usage per call into the usage panel | `janeRun`, `recordJaneUsage` |
| Knowledge | one compiled library (`build-copy-knowledge.mjs`), Vectorize for meaning search, D1 for chats and memory | 241 passages, 12 task cards |
| Quality | evidence notes before writing, a claim check on every answer, live evaluation with a synthetic client | `tools/eval-jane-live.mjs` |
| Tests | `MockLanguageModelV4` from `ai/test` runs the real SDK code paths with no network | `tests/_jane-mock.mjs` |

Rules for any new agent: model calls only through its `*-models.ts` door; every tool has a Zod input schema, is read-only unless a person approves, and takes the client from the signed-in session, never from the model; every structured answer is a Zod object; tool results and saved text are reference data, never instructions; a step and lookup budget bounds every loop. Not yet moved: Jane's other generators (stories, carousels, YouTube, thumbnails) still use `ai-provider.js`; port them by domain. Next step on the screen side: the AI SDK chat hook, replacing the hand-written stream reader. Details: Brain `output/standard-preview/docs/jane-knowledge.md`.

## Open questions

- Per-lead URLs and link previews on a static export need the spike in rule 7 before anything ships.
- Moving the API changes the release steps (today the app is built in pulsify-saas and deployed from the Brain). The release recipe must be rewritten in the same change.
- Which prospect-asset documents become Next.js pages and which stay downloadable files (docx or pdf) is not decided.

## Connections

- [[playbooks/pulse-system-stack]] — the product components this stack serves.
- [[playbooks/story-sequence-client-flow]] — the story studio is the first client feature built fully on this stack.

## Source trail

- Founder instruction in session, 2026-10-10: unify frontend and backend frameworks across everything, including landing pages; raw HTML is not the way.
- pulsify-saas package.json, `docs/MIGRATION.md`, Brain `output/standard-preview` inventory, 2026-10-10.

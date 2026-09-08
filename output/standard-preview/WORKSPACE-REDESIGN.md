# Workspace redesign, September 8

## Audit and execution plan

The previous portal added routes but retained full-page legacy forms, three overlapping visual layers and duplicate navigation. Type selection did not meaningfully differentiate the next step. The new design replaces the visible shell and route composition while retaining tested APIs, element contracts and saved tenant data.

1. Establish one neutral graphite/lavender palette, Inter/system typography, aligned cards, readable numeric type, bounded working widths and responsive navigation.
2. Build an icon rail and expandable section navigation, route history, back button, breadcrumbs and direct links. Split nested tasks rather than placing everything on an overview.
3. Replace Home with a concise operating dashboard. Separate Revenue overview/chart from transactions. Split Performance into overview, retention, history and logging. Keep Team, Plans and tasks focused.
4. Differentiate all nine story types with specific jobs, structures, materials, illustrative examples and guided brief steps. Keep the existing persisted slide editor and review lifecycle.
5. Bring the full supplied thumbnail archive into the authenticated gallery. Use real image examples for the four canonical layout patterns. Place title formulas before thumbnail and script work, with editable variables and a promise-check step.
6. Replace empty Copywriter cards with useful starting briefs, structured composition and AI generate/rewrite actions grounded in the client's saved brain. Generation remains separate from saving or publishing.
7. Rebuild Media as a dark contact sheet with upload drawer and previews. Rebuild Connections as branded cards opening a step-by-step connection drawer using the existing scoped form.
8. Restyle the operator dashboard consistently, retaining its cross-client tools. Verify every main route and nested path, back/history, mobile layouts, focus, unsaved edits, data isolation and real AI availability before deploying.

The September 8 request authorizes integrated AI and supersedes the older manual-only preference for this feature. The app must report provider errors honestly. It must never invent missing client proof or treat saved connection notes as social OAuth.

## Delivered

The client portal now has a new two-part sidebar and route-owned main screen. Instagram has nine differentiated story arcs, a three-step storyboard brief, editable per-panel design, and a panel AI helper. Reels are split into overview, capture and angle library. YouTube has three formats, five packaging steps, saved projects with reloadable links, four distinct layout examples and all 45 unique images from the supplied archive. Real video titles and their thumbnails can also be filed as references. Copywriter has six starting briefs, draft/rewrite/shorten/hook actions, editable output and persistent drafts.

Performance now separates overview, retention, sequence history and weekly progress; result entry opens a dialog. Revenue separates metric blocks and a monthly chart from transactions. Media uses an image contact sheet with upload and caption dialogs. Connections use eight real service marks and two-step setup panels. The operator console shares the palette and splits dashboard rollup, client health, activity, client portals and content reviews. All-time totals come from direct tenant-scoped database counts, not the recent performance window.

## AI and data boundaries

Cloudflare Workers AI is bound as AI, using @cf/meta/llama-3.3-70b-instruct-fp8-fast. The endpoint loads only the authenticated client's saved brain, excludes denied proof, limits use to 30 requests per client/day with a five-second burst interval, and blocks impersonated writes. The generation does not automatically save, send, or publish. Provider errors preserve editable copy. Additive migration 0022 creates the usage ledger. A live authenticated production request returned HTTP 200 with actual generated text. Temporary QA sessions were deleted after verification.

Instagram and YouTube connection cards remain delegated-access records: automatic inbox and analytics ingestion is still unconnected. Lead/DM records are manual; DM summarization works on pasted conversations. DocuSign-triggered provisioning remains future integration work. The separate SDR/outreach dashboard was not modified. No original published titles or performance results are invented for imported reference images. Raw portrait references contain source props; those props are not prescribed by the layout.

## Verification

- All 15 backend test files pass, including real SQLite record isolation and all-time counts, real SQLite AI quotas/context, impersonated AI denial, auth, registration, uploads and editor lifecycle regressions.
- The Playwright suite covers every section, all nine distinct story arcs, step/back navigation, storyboard persistence, font controls, panel AI application, five-step video saving, saved video/copy reload, AI failures preserving text, reference archive count, distinct layout images, repeated connection dialogs, media and results drawers, operator navigation, both themes and viewport widths 390/768/1440/2320. Browser writes are mocked; backend behavior is tested separately.
- Live authenticated Chrome passed across home, Instagram, YouTube, Copywriter, Performance, Revenue, Media, Connections and the story library without page errors. All eight service marks loaded. Public requests to AI, workspace records and protected thumbnail images returned 401.
- Cloudflare Pages Functions compiled successfully. Deployment uses the existing pulsify-funnels production project and additive D1 migration. Screenshots are in ignored .wrangler/qa.

Final production deployment: https://34510f3b.pulsify-funnels.pages.dev, served at https://pulsify-funnels.pages.dev. Live all-time summary returned correct tenant database totals, including two measured sequences older than the recent performance window.

# Codex task: prospect asset as a designed page

Build the first visual prospect asset, using bergtrades as the live case. Claude specced, Codex builds.

Read first: [[wiki/playbooks/prospect-asset-visual-standard]] is the governing spec. [[wiki/playbooks/prospect-asset-doc-standard]] still governs the writing. Do not restyle the copy.

## What this is

We send prospects a value asset after they reply. It has been a Word document. The founder ruled on 2026-08-13 that it becomes a designed page, because the asset is our product demonstration and a wall of body text demonstrates the wrong thing.

Governing principle: **build for a scroller, not a reader.** Every screen needs one thing visually interesting enough to earn the next scroll.

## Content source

All copy is written and approved. Do not rewrite it.

- `output/bergtrades-doc-content.md` — the teardown copy
- `output/bergtrades-doc-build.py` — the current docx build, contains the final approved wording for both documents including the VSL script
- `outreach/intel/bergtrades.md` — the full diagnosis, evidence and voice notes
- `C:\Users\Lenovoi\Desktop\Prospect Assets\bergtrades\yt-*.jpg` — 30 real thumbnails at max res

Two documents merge into one page: the teardown, then the VSL script as its own section.

## Design system

Reuse, do not invent:

- Tokens from `assets/landing-page-standard/`. `variant-02` is the monochrome dark build.
- Funnels source of truth is `output/standard-preview/` on brain main. Templates live in `output/standard-preview/templates/`.
- Headless Chrome renders at 1280 wide. Gotchas in `wiki/playbooks/prospect-asset-sop.md` phase 3b and `claude-memory/project_og_preview_path_urls.md` (window decorations eat ~90px of height, force explicit heights, `--user-data-dir` and `--no-sandbox` are required).

## Sections, in order

**1. Hero.** Title, one line naming who it was built for and what from. Not a wall.

**2. The finding.** Short. The strongest observation, with visual weight on the numbers.

**3. Evidence grid.** His four thumbnails as cards, each with title, view count and a one-line note. The two identical templates (`yt-SJkj4JfEczo.jpg` and `yt-8K4dFyrucXk.jpg`) must sit adjacent so a reader sees for themselves that they are the same file with one word changed. Annotate the recycled `peak +120.4R` on both with a callout. This is the highest-value visual on the page.

**4. Six titles, each with its thumbnail.** Non-negotiable per the standard: a title without an image is not a packaging recommendation. Card per title. Where we have no rendered thumbnail, show the reference thumbnail it is modelled on from his own channel (`yt-VjUpqe73wQw.jpg` and `yt-E6yw1uGNWBY.jpg` are the certificate format the rebuilds copy).

**5. The description block.** Show the current one and the rebuilt one side by side, in a code/terminal treatment. The point is that his mentorship link is missing from the current one, so mark the absence visually rather than describing it.

**6. Bio, as a rendered side-by-side.** Two Instagram profile mocks. Current on the left, rebuilt on the right. Same avatar, same 10K count, same highlight rail, same layout. Only the bio copy and the link destination change. Build the Instagram chrome faithfully. Do not invent UI, do not add badges or counts he does not have. Founder supplied the source screenshot in-session; rebuild clean rather than editing over it.

**7. The two-account split.** A simple diagram beats the paragraph. Two account cards, the job each one does, the flow from reach to receipts.

**8. The VSL, six steps.** Numbered, stepped, visually distinct from the teardown. Quotes he is meant to say out loud get a spoken-line treatment so they are obviously script and not commentary. Keep the `[YOUR PRICE]` and `[weeks, calls, group, access]` slots visible as fill fields, styled so they read as deliberate blanks.

**9. Retention diagnostics.** The four-item list from the VSL doc. Small, tight, end matter.

**10. Horizon note.** Quiet close. No CTA anywhere on the page.

## Delivery

- Hosted on pulsify-funnels at a clean path: `pulsify-funnels.pages.dev/matthew-bergin`. Path URLs already ship via `functions/[slug].js`.
- OG and Twitter tags so the pasted link renders a preview card. Already live per `claude-memory/project_og_preview_path_urls.md`. Per-lead `og:title`, shared `og:image` at `/assets/og-card.png`.
- **Do not put this behind `/a/{token}`.** A redirect URL reads as more suspicious, and the page already logs views and scroll on its own.
- Also render a PDF from the same HTML as a fallback for prospects who will not click a link. One source, two outputs.
- Deploy: `wrangler pages deploy . --project-name pulsify-funnels --branch main` from `output/standard-preview/`. Migration before code deploy if any is needed. **Always `--branch main`.**

## Blocked, do not invent

Two content blocks are specced but must not be filled until the founder supplies real data. Build the slots, leave them empty, do not fabricate:

1. **The packaging before/after case study.** A real client channel, both thumbnails, real before and after view counts. Not in the vault. `clients/fitfo/progress.md` records no YouTube baseline.
2. **Any revenue figure attached to the VSL framework.** `wiki/people/jeremy-haynes.md` carries no such number. Name the framework without a figure until sourced.

Never invent a stat. This is a hard rule in CLAUDE.md and the whole document argues for showing evidence rather than making claims, so a fabricated number would sink it.

## Done means

- Rendered at 1280 and at mobile width, and every screen looked at. Nothing ships unrendered.
- No horizontal overflow at any width. The bergsmentorship.com headline bug we are calling out on this very page is exactly this defect, so shipping it would be embarrassing.
- Zero console errors.
- Voice checks still pass: no em dashes, no curly quotes, no arrow glyphs.
- OG card verified by actually pasting the link somewhere that renders previews.

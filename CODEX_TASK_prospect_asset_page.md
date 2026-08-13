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

## Presentation, and this governs everything below

**It moves like a slideshow.** Sections fade in as they enter and fade back out as they leave, so moving through it feels like advancing a deck rather than scrolling a document. One idea per slide; if a section holds two arguments it becomes two slides.

- Fade plus a small translate on enter, fade on exit. Subtle. Nothing bouncing, spinning or flying across the viewport.
- Intersection observer only. **Never scroll-jack.** The reader keeps normal scroll control. Hijacking scroll on a phone gets the tab closed.
- Copy must be readable before JS runs or if it never runs. Never gate content behind an animation.
- Honour `prefers-reduced-motion`: fades collapse to instant, content still appears.

**Mobile is the primary view.** The prospect opens this from an Instagram DM, inside Instagram's in-app browser, on a phone, one-handed. That is the real viewport. Desktop is where we build it and where almost nobody reads it.

- Design at **390 wide first**, then let it grow. Never design at 1280 and shrink.
- Every image stays legible at phone width. Side-by-side comparisons stack, and the annotation has to survive the stack.
- No tables on mobile. Tier tables and evidence grids become stacked cards, never a table with a horizontal scrollbar.
- Generous line height, nothing under about 15px, real tap targets.
- Zero horizontal overflow at 390 checked as carefully as at 1280.

## Sections, in order

**1. Hero.** Title, one line naming who it was built for and what from. Not a wall.

**2. The economics. This is the opening argument and the hardest thing on the page.**

His own Whop, verified live 2026-08-13:

| Tier | Price | Members |
|---|---|---|
| The Trading Club, free Discord | Free | 3,500 (his own page says "3,600+ strong community") |
| VIP Lite, live trading calls | GBP 99/month | 2 |

Alongside 58 reviews at 5.0, 98 percent of them five star.

The argument: 3,600 people in the room and two of them pay. That is not a trust problem, because the people who reach him buy and then say so in public. Everything else on this page explains why so few reach him.

Give the two numbers enormous visual weight. They are the reason he keeps reading. Stack as cards on mobile, never a table.

**Do not use any figure for the 1-on-1 mentorship.** An earlier draft claimed 9 members and that number has no verified source. Free tier and VIP Lite only.

**3. The finding.** Short. The strongest observation, with visual weight on the numbers. Frame it as the explanation of section 2: this is *why* so few of the 3,600 ever get far enough to buy.

**3. Evidence grid.** His four thumbnails as cards, each with title, view count and a one-line note. The two identical templates (`yt-SJkj4JfEczo.jpg` and `yt-8K4dFyrucXk.jpg`) must sit adjacent so a reader sees for themselves that they are the same file with one word changed. Annotate the recycled `peak +120.4R` on both with a callout. This is the highest-value visual on the page.

**4. Six titles, each with its thumbnail.** Non-negotiable per the standard: a title without an image is not a packaging recommendation. Card per title. Where we have no rendered thumbnail, show the reference thumbnail it is modelled on from his own channel (`yt-VjUpqe73wQw.jpg` and `yt-E6yw1uGNWBY.jpg` are the certificate format the rebuilds copy).

**4b. His own channel already ran the experiment.** A short slide, four bars, his numbers off the `@matt.bergin` vlog channel with nothing added:

| Video | Views |
|---|---|
| When you know it all but you still aren't profitable (trading) | 1.7K |
| what its actually like making '30k' a month and why its not what you expect | 1.3K |
| Buying a 2023 RS5 at 22 | 401 |
| Audi RS5 Review | 331 |

The honest teardown beats the car roughly four to one on his own audience. One line of copy, let the bars carry it. This earns the right to everything the page says about leading with proof instead of lifestyle, because he proved it himself without meaning to.

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

## Section 3b: the proof block (unblocked 2026-08-13)

This is the single most persuasive thing on the page. It sits right after the evidence grid, because it proves the rule we just stated using our own client work.

Source: [[project_nick_case_study]]. Thumbnails at `Desktop\Prospect Assets\niicksfx\`.

Three founder-confirmed uploads Pulsify packaged on a channel that was around 200 subscribers at the time:

| File | Title | Views |
|---|---|---|
| `yt-3QDKzi4nFl8.jpg` | watch us breakdown our 6 figure trading systems live. (step-by-step) | 814 |
| `yt-KnbqLjGzD3k.jpg` | trading mentor exposes trading mentorships | 737 |
| `yt-enVq8W8N6mU.jpg` | my $30k/mo secret that stopped me from blowing accounts (step by step) | 314 |

Against a median of roughly 125 views on the uploads immediately before. Show that median as the baseline, visually.

Annotate each thumbnail with what it is doing: arrows and labels on the first, the speech-bubble question on the second, the named blueprint on the third. The annotation is the teaching.

**Do not overclaim.** Views settled back after that batch before climbing again. The copy says those uploads spiked and the top two are still the channel's best a year later. It does not say the channel was transformed. A case study that overstates is worse than none in a document arguing for evidence over claims.

## Do not invent

One block stays constrained. Attach **over $10m** to the framework, never to us. "The framework we use, which has done over $10m in info product and mentorship sales" is fine. "The framework that generated us over $10m" is false and must never appear. Do not name Jeremy Haynes in prospect-facing copy.

Never invent a stat. Hard rule in CLAUDE.md, and the whole document argues for showing evidence rather than making claims.

## Done means

- Rendered at 1280 and at mobile width, and every screen looked at. Nothing ships unrendered.
- No horizontal overflow at any width. The bergsmentorship.com headline bug we are calling out on this very page is exactly this defect, so shipping it would be embarrassing.
- Zero console errors.
- Voice checks still pass: no em dashes, no curly quotes, no arrow glyphs.
- OG card verified by actually pasting the link somewhere that renders previews.

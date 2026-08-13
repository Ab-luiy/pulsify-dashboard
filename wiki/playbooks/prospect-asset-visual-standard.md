---
type: playbook
tags: [outreach, assets, design, docs, funnel]
sources: [[playbooks/prospect-asset-doc-standard]], [[playbooks/prospect-asset-sop]], founder directive 2026-08-13
created: 2026-08-13
updated: 2026-08-13
---

# Prospect asset visual standard

Founder directive 2026-08-13. This supersedes the layout half of [[playbooks/prospect-asset-doc-standard]] for every asset built from now on. The writing rules on that page still hold. What changes is that the asset stops being a document and starts being a designed page.

The trigger was the bergtrades build. It was structurally correct, passed every voice check, and the founder's read was that it looked bland: "leading out with a big bulky paragraph, people really cannot read nowadays."

## Why this matters for Pulsify

The asset is the product demonstration. We sell packaging, positioning and funnels, and we have been demonstrating that with an unstyled Word document. A prospect who opens a wall of Georgia body text has already formed a view of our design ability before reading a sentence.

The old standard optimised for density. That was right about words and wrong about form. A dense document is still a document, and a document loses to a page.

## The governing principle

**Build for a scroller, not a reader.**

Founder's framing: assume the prospect has the same scrolling habit as everyone else, where the next thing has to be worth continuing for. The asset should reward scrolling the way a feed does. Every screen needs one thing that is visually interesting enough to pull them to the next.

The reaction we want at the end is not "that was thorough." It is "this guy knows what he's talking about," and that judgment gets made on how it looks long before it gets made on what it says.

**Design it as if it were a landing page.** Not a report, not a PDF, not a Word file with pictures in it. The mental model is a well-built one-page site with sections, cards, annotated images and visual hierarchy.

## What must be visual rather than written

These four were called out by name. None of them may ship as a paragraph again.

**1. Every title comes with its thumbnail.** We sell packaging, so a title without the image beside it is not a packaging recommendation, it is a suggestion. Each rebuilt title gets a rendered thumbnail treatment next to it. If we cannot render one, we show the reference thumbnail it is modelled on.

**2. Bio audits are rendered side by side.** Never a code block of replacement text. Two Instagram profile mocks, their current bio on the left, the rebuilt one on the right, both drawn to look like the real Instagram profile UI. Same avatar, same follower count, same layout, only the copy and the link change. The founder supplies the profile screenshot; we rebuild it clean rather than editing over the top of theirs.

Keep the mock faithful to how Instagram actually looks. Do not invent UI, do not add badges or counts they do not have, and do not restyle the app. The point is that the new bio is read in situ, where the difference is obvious, rather than as text on a page where it gets skimmed.

**3. The packaging before and after is proof, and it needs real numbers.** The strongest block we can put in any of these is a real case: here is what the thumbnail and title were, here is what we rebuilt them to, here is what the video did before and after, on a channel of this size.

> ⚠️ Gap as of 2026-08-13: we do not have this case documented. The founder has referenced a roughly 200-subscriber channel that reached about 1K in six months, with a repackaged video hitting around 900 views. `clients/fitfo/progress.md` records no YouTube baseline at all and the subscriber count was never stated, so the numbers are not in the vault and the thumbnails are not saved. **Nothing goes in a prospect asset until the founder supplies the channel, both thumbnails and the real figures.** Never invent a stat, per CLAUDE.md.

**4. Emphasis is designed, not implied.** Numbers, the finding, the rebuilt strings and the before/after deltas get visual weight: scale, colour, a card, a callout. Annotation on images is encouraged. Arrows pointing at the specific defect in their own screenshot do more work than a sentence describing where to look.

## Register: sell, do not brief

Second founder correction on the same pass. The bergtrades doc read as operational lingo written for another operator.

The prospect should finish the asset able to tell right from wrong in their own business. Treat it as a very short course rather than a task list. State what good looks like, state what theirs does, and let the gap do the persuading.

Practically: fewer instructions, more demonstrated contrast. Anywhere the old draft said "do X," prefer showing X beside their current version.

This does not loosen the suggestion register from [[playbooks/prospect-asset-library]]. It is still "you could." Authority stays on the diagnosis and stays off the prescription.

## Framing a replacement asset when they already have several

Founder directive, written from the Berg VSL case where he had multiple VSLs in rotation.

Do not open on the mess. "You have four VSLs and you have clearly been testing a lot" is a diagnosis of their effort and it reads as criticism of work they were proud of.

Open on the replacement instead. The shape:

> You have tested a lot of these. I built you one, off the limited information I have from the outside. It is built on the framework we use for this, which is the one behind [PROVEN RESULT - source it or leave it out].

Then the asset itself.

> ⚠️ Gap as of 2026-08-13: the founder wants this framed with a figure attached to the framework, referenced verbally as $50 million in information and mentorship sales. `wiki/people/jeremy-haynes.md` carries no revenue figure and nothing else in the vault supports it. **Until sourced, name the framework without the number.** An unverifiable figure in a document whose entire argument is "show the document, do not make the claim" is the one contradiction that would sink it.

## Delivery, and the link-trust problem

The founder's concern, and it is the real constraint: a `docs.google.com` link renders a preview with a thumbnail and people click it. An unrecognised domain with a generated URL reads as a phishing risk and does not get clicked.

Most of this is already solved on pulsify-funnels and was shipped 2026-07-09, see [[project_og_preview_path_urls]]:

- **OG and Twitter card tags are live on every template.** A pasted link renders a preview card with a 1200x630 image and a per-lead title. This is the thumbnail-and-preview behaviour the founder wants.
- **Clean per-lead paths are live.** `pulsify-funnels.pages.dev/{lead-slug}`, so the URL carries the prospect's name rather than a token. Unknown slugs never render another client's page.
- **View tracking is already on the page itself**, per [[project_funnel_view_tracking]]. Opens, scroll depth and watch percentage land in the admin board with no redirect needed.

Two rules that follow:

**Never send these behind `/a/{token}`.** The redirect exists for tracking a Google Doc we cannot instrument. A redirect URL is more suspicious than a plain one, and the hosted page is already instrumented, so the redirect buys nothing and costs trust.

**A custom domain is the remaining fix and it is a founder decision.** `pulsify-funnels.pages.dev` is the part that still reads as an unrecognised host. Cloudflare Pages custom domains are free, and the build notes record that origins are computed per-request so a domain change needs no code work. Open, pending the founder buying one.

**PDF fallback.** Build one HTML source and render a PDF from it for any prospect who will not click a link. Same source, no second design pass.

## Build path

Claude specs and does the thinking, Codex executes the design and the build, per [[feedback_codex_builds_claude_specs]] and the founder's instruction on this pass.

Reuse rather than reinvent:

- Design tokens from `assets/landing-page-standard/`. `variant-02` is the monochrome dark build.
- Funnels source of truth is `output/standard-preview/` on brain main.
- Headless Chrome renders at 1280 wide. Gotchas are recorded in [[playbooks/prospect-asset-sop]] phase 3b, and the window-decoration height loss is in [[project_og_preview_path_urls]].

## What does not change

Everything in [[playbooks/prospect-asset-doc-standard]] about what the words do still stands:

- A value asset is built work, not a diagnosis. Roughly four fifths finished output.
- Ease in the way Ben Bader opens, then cut it in half.
- It has to flow like an email, one spine, sections referencing each other.
- Their own words quoted verbatim, real numbers only, no invented stats.
- No CTA.
- The horizon note at the close.
- Nothing ships unrendered. Look at every page or screen before it goes.

The word ceiling is now a guide rather than a gate, because a designed page carries copy differently from a text document. Density still wins. The test moves from word count to whether every screen earns the next scroll.

## Connections

- [[playbooks/prospect-asset-doc-standard]] — the writing rules, still in force
- [[playbooks/prospect-asset-sop]] — order of operations, phase 3b covers rendering
- [[playbooks/prospect-asset-library]] — which asset for which wound
- [[frameworks/bio-optimization-system]] — what goes in the rebuilt bio
- [[content-engine/thumbnail-layout-patterns]] — what goes in the rebuilt thumbnails

## Open questions / gaps

- The packaging before-and-after case study has no recorded numbers or thumbnails. Highest-value missing asset in the whole system.
- The $50M framework figure is unsourced and cannot ship until it is.
- Custom domain undecided, and it is the last piece of the link-trust problem.
- Still zero reply data on any prospect asset. This standard is a craft judgment, not a tested one, same as the last.

## Source trail

- Founder directive, 2026-08-13, after reviewing the bergtrades build
- The bergtrades build, `output/bergtrades-doc-build.py`
- [[project_og_preview_path_urls]], [[project_funnel_view_tracking]]

---
type: playbook
tags: [outreach, assets, design, docs, funnel]
sources: [[playbooks/prospect-asset-doc-standard]], [[playbooks/prospect-asset-sop]], founder directive 2026-08-13
created: 2026-08-13
updated: 2026-08-17
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

## Presentation: it moves like a slideshow

Founder directive 2026-08-13, second design pass.

The asset reads as a sequence of slides rather than one long static column. Sections fade in as they enter and fade back out as they leave, so moving through it feels like advancing through a deck rather than scrolling a page.

Why it matters: the fade is what converts passive scrolling into anticipation. Each section arriving on its own is the thing that makes the next one worth reaching. A static page shows the reader how much is left and invites a skim; a sequence reveals one idea at a time and holds them.

Requirements:

- One idea per slide. If a section has two arguments in it, it is two slides.
- Fade and a small translate on enter, fade on exit. Nothing that bounces, spins or flies across the viewport.

**Things should pop, and that is not the same as being subtle.** Founder directive 2026-08-13, third design pass: elements need presence when they arrive, because the reader is scrolling on reflex and the arrival is what earns the next one. The distinction that matters:

- **Premium pop:** a card lifting slightly as it lands, a number scaling up into place, a badge appearing a beat after the image it annotates, depth from shadow and layering, a highlight that draws the eye to the one thing that matters on that slide. It reads as expensive and considered.
- **Cheap animation:** bouncing, spinning, sliding across the screen, everything moving at once, motion for its own sake. It reads as a template.

The test is whether the motion directs attention to something specific. A number scaling up because it is the point of the slide is pop. A card sliding in because sliding looks busy is noise.

Sequence within a slide, do not fire everything at once. Image, then its annotation, then the copy. That stagger is what makes it feel built rather than dumped.

This does not contradict [[feedback_dashboard_quality_bar]]. Premium and decluttered still governs. Pop is about presence and hierarchy, not volume.
- Driven by an intersection observer, never by scroll-jacking. The reader keeps normal control of their scroll. Hijacking it on a phone is the fastest way to get the tab closed.
- Content must be present and readable with JavaScript disabled or before it runs. Never gate the copy behind an animation that might not fire.
- Honour `prefers-reduced-motion`. Fades collapse to instant, content still appears.

## Mobile is the primary view, not the second one

Founder directive 2026-08-13, same pass, and it follows from how the asset is actually delivered.

The prospect gets this as a link in an Instagram DM. They open it inside Instagram's in-app browser, on a phone, one-handed, probably within seconds of reading the message. **That is the real viewport.** Desktop is where we build it and where almost nobody reads it.

So mobile is the design target and desktop is the adaptation, not the reverse.

- Design at 390 wide first, then let it grow. Never design at 1280 and shrink.
- Every image must stay legible at phone width. A thumbnail comparison that only works side by side on desktop has to stack, and the annotation has to survive the stack.
- Tables are the usual casualty. A tier table or an evidence grid becomes stacked cards on mobile, not a table with a horizontal scrollbar.
- Tap targets, generous line height, no text under about 15px.
- Test in a real mobile viewport with device emulation on, not just a narrow desktop window. Instagram's in-app browser is more constrained than mobile Safari or Chrome.
- Zero horizontal overflow at any width, checked at 390 as carefully as at 1280.

## What must be visual rather than written

These four were called out by name. None of them may ship as a paragraph again.

**1. Every title comes with its thumbnail.** We sell packaging, so a title without the image beside it is not a packaging recommendation, it is a suggestion. Each rebuilt title gets a rendered thumbnail treatment next to it. If we cannot render one, we show the reference thumbnail it is modelled on.

**2. Bio audits are rendered side by side.** Never a code block of replacement text. Two Instagram profile mocks, their current bio on the left, the rebuilt one on the right, both drawn to look like the real Instagram profile UI. Same avatar, same follower count, same layout, only the copy and the link change. The founder supplies the profile screenshot; we rebuild it clean rather than editing over the top of theirs.

Keep the mock faithful to how Instagram actually looks. Do not invent UI, do not add badges or counts they do not have, and do not restyle the app. The point is that the new bio is read in situ, where the difference is obvious, rather than as text on a page where it gets skimmed.

**3. The packaging before and after is proof, and it needs real numbers.** The strongest block we can put in any of these is a real case: here is what the thumbnail and title were, here is what we rebuilt them to, here is what the video did before and after, on a channel of this size.

**Resolved 2026-08-13. The case is Nick, `@niicksfx`.** Full detail in [[project_nick_case_study]]; thumbnails at `Desktop\Prospect Assets\niicksfx\`. Founder confirmed the three uploads Pulsify packaged:

| Title | Views | What the thumbnail does |
|---|---|---|
| watch us breakdown our 6 figure trading systems live. (step-by-step) | 814 | "TRADING IS THIS EASY" on a yellow bar, arrows labelling both men "6-FIGURE TRADER" |
| trading mentor exposes trading mentorships | 737 | Speech bubbles posing the viewer's own question back at them |
| my $30k/mo secret that stopped me from blowing accounts (step by step) | 314 | A named blueprint diagram in frame, six labelled boxes |

Preceding uploads ran a median of roughly 125 views. 814 against 125 is about 6.5x, and the top two are still the channel's best a year on.

**State it honestly.** Views settled back after that batch before climbing again, so those specific uploads spiked; the channel was not permanently transformed. A case study that overclaims is worse than none, particularly in a document whose whole argument is show the evidence rather than make the claim.

**The transferable principle, and it is the one to teach:** something concrete and legible carries the claim inside the frame. Arrows and annotation, a speech bubble asking the viewer's real question, a named diagram, a real document. Not one big styled word. This is why the case study belongs in every packaging asset: it demonstrates the rule with our own work instead of asserting it.

**4. Emphasis is designed, not implied.** Numbers, the finding, the rebuilt strings and the before/after deltas get visual weight: scale, colour, a card, a callout. Annotation on images is encouraged. Arrows pointing at the specific defect in their own screenshot do more work than a sentence describing where to look.

## How precise to be

Founder correction 2026-08-13, after a build stalled on wanting a source for a number nobody outside the business could have.

**These are surface reads and they are supposed to be.** We work from what is public: their channel, their view counts, their pages, whatever their Whop or their bio exposes. Revenue, enrolment, churn, ad spend and margin are invisible to us and always will be. Demanding certainty on those makes the asset unwriteable.

So:

- **Infer freely from what is public.** Two hundred views against a nine hundred view median is a real observation and it does not need their analytics to be worth saying.
- **Hedge honestly when hedging is honest.** "Roughly", "looks like", "from the outside" cost nothing and they are accurate. The prospect knows we cannot see inside.
- **Do not block on a gap.** If a number cannot be stood behind, cut it or soften it and keep building. Stopping the whole asset to chase one figure is the wrong trade.

**The one line that still holds:** do not state a specific number about *their* business that we cannot see and they can check. Their view counts are fair game because they are public and they match. "You have nine mentorship clients" is not, because they know the real figure and a wrong one ends the conversation on the spot.

That is the whole rule. Everything else is judgment, and the bias should be toward shipping.

## Read the vault before writing, not after

Founder directive 2026-08-13, after the first Berg build shipped copy that read as AI-written while the assets that would have fixed it sat unopened.

**Every asset is written from the vault's own sources, every time.** Writing from instinct and checking against the standard afterwards does not work. The order is read first, then write.

Minimum reading before a line is written:

| Job | File |
|---|---|
| Kill AI tells, pre-send checklist | [[content-engine/copy-voice-guide]] |
| Copy rules | `copywriting.skill`, `raw-sources/prompts/_voice-guard.md` |
| Writing a client VSL | `raw-sources/prompts/client-vsl-writer-prompt.md` |
| VSL structure, plus real dissected examples | `raw-sources/frameworks/VSL-Frameworks-Jeremy-Haynes.md`, [[synthesis/vsl-pattern-lab]] |
| Bios | [[synthesis/niksetting-extractions/12-instagram-bio-that-converts]] |
| Conversion assets | [[synthesis/niksetting-extractions/04-conversion-content-five-assets]] |
| Register and authority | [[people/niksetting]], [[people/soowei-goh]] |

**Register:** explain the way Niksetting or SooWei would. Declarative, from a system, authority on the diagnosis. Never "yeah, and you could also."

## Highlights: the permanent rail

Founder directive 2026-08-13, stated explicitly for Berg **and every creator after him**. This is now the recommended highlight structure in every profile audit:

1. **Start here** or **New here?** â€” orients a first-time visitor
2. **My Story**
3. **RESULTS** â€” nothing in it but results

Highlights named `YouTube`, `Testimonials`, `Few Certs`, `Few Trades` come out. Those are folders, not jobs. A highlight rail has one purpose, which is walking a stranger from arrival to proof in three taps.

## Order sections by effort, easiest first

Attention is the constraint, so the document opens with what they could fix in ten minutes and moves toward the heavier work. Leading with the biggest lift loses them before the easy wins land.

## Three links, maximum, in the description

Landing page first, Instagram second, one optional third. No Discord invite, no link shorteners. A shortener is the only unbranded thing on the page and it reads as a redirect.

## The close: proof, delivery, ask

Founder directive 2026-08-13. **This replaces the horizon note as the ending of every asset**, and it reverses the long-standing no-CTA rule from [[playbooks/prospect-asset-doc-standard]].

Why it changed: the horizon note reassures a creator that their follower count is not the constraint. That lands for someone at 500 followers. It reads as condescending to someone at 10K with 58 five-star reviews. And an asset that ends on encouragement gives a warm reader nothing to do.

**Three short paragraphs maximum. The visuals carry the weight, not the prose.**

1. **We have done this before.** One line naming that we have fixed the same thing for creators in their niche and outside it. Never a case-study essay.
2. **The proof block.** The strongest figure set as type, its receipt screenshot, the remaining metrics, then the client photos. Full shape below.
3. **The shared diagnosis.** Two paragraphs naming what those creators all had wrong and why this prospect is further along. Superseded the "what they would get" delivery line on 2026-08-17, which read as sales.
4. **CTA button** worded so it assumes the decision. "Set this up for me" over "book a call" â€” by this point the reader is asking how they get it, not whether it works.

### The close, and this is the standard for every asset

Founder-approved 2026-08-17 on the bergtrades rebuild, replacing the drifting proof band ruled 2026-08-16. Two attempts were rejected before this one and both failure modes are worth keeping.

**Failure one: sparse.** A two-layer parallax band, then a scattered constellation of tiles. Founder's read: "this is not cutting it at all." Both were eight objects floating in a large black stage, which reads as a moodboard and contradicts this vault's own density principle. Density is the argument.

**Failure two: the money was hidden.** Every figure was locked inside a 200px screenshot, so the largest type in a section about $98,000 was the heading. The section never actually said its own number.

**The shape, top to bottom:**

1. **Heading.** One line. "we've done this before."
2. **The number as type.** The single strongest figure at `clamp(74px, 15.5vw, 178px)`, weight 800, tabular figures, tracking -0.058em. The biggest thing in the section and usually on the page. One supporting line beneath it, every figure in that line read off the screenshot that follows.
3. **The receipt.** The screenshot proving that number, immediately below it, full column width in a light card. Claim and evidence touch.
4. **The metrics grid.** Remaining proof screenshots, two columns desktop and one column mobile, sized so the numbers are legible on the page rather than only in the alt text. Roughly 430px wide on desktop. Crop each to the part carrying the number.
5. **The people row.** Every client photo, one row, full bleed, lit and sharp at full brightness.
6. **Closing copy.** Two short paragraphs, per the shared-diagnosis rule below.
7. **CTA.**

**The room.** The same client photos also tile the whole section background: 24 tiles at 25% width, shuffled so no face sits beside or under itself, with rotating `object-position` values so repeats do not read as a pattern. Exposure `brightness(0.42) saturate(0.82)`, opacity 1.

**Never dissolve people with opacity and blur.** Founder's exact objection: "is there a way we can get the pictures to appear instead of them being translucent." Blur and grayscale are what make a photograph read as a watermark. Darken with exposure and hold legibility with a scrim instead. Same final luminance, completely different read.

**Two depths, one set of photos.** The row is lit foreground, the wall is dim ambience. That contrast is what lets the copy say "everyone up there" and have it land. Founder rejected an earlier version precisely because the sentence named a group the design never presented.

**The scrim carries legibility, not the photos.** Asymmetric on desktop, roughly 0.9 alpha under the copy column falling to 0.26 on the open side, so photographs genuinely read where nothing sits over them. Even, around 0.68, on mobile where copy runs full width.

**Verify contrast on a ground-only render.** Hide every copy block, screenshot that, and sample the true background beneath each text run. Sampling a normal render measures glyph antialiasing and returns nonsense; this cost a full pass to learn. The bergtrades close measures 11.25:1 at worst against AA's 4.5.

**Motion.** Tiles gather toward the centre at ~0.9 scale and settle into place as the section scrolls through, driven off one `--spread` variable. Drive it from the scroll event as well as the rAF loop so it stays correct when the loop is paused, throttled or offscreen. Rest geometry reads from `offsetLeft`/`offsetTop`, which transforms do not affect.

**Anything that only reveals on hover is broken.** The prospect is on a phone. Any reveal must also be driven by distance from the middle of the viewport so scrolling alone surfaces it. Pointer hover feeds a separate variable and `max()` picks the higher of the two.

**Closing copy: the shared diagnosis.** Founder directive 2026-08-16. Open by naming that the creators shown all had the same thing wrong, that we fixed it, and that the numbers followed. Then one paragraph on why this prospect is further along than they were, built only from things already shown earlier in the asset.

The thread must be the one the asset already argued. For bergtrades that was packaging, because sections 1 and 4 both diagnose it. Naming the page's own argument is not a new claim; inventing a shared thread is.

Casual and friendly. The rejected version pitched a dashboard and portal, and the founder's note was that it "triggers sales resistance where they stop seeing through the thing." Drop the deliverables pitch. The CTA already says what happens next.

**Banned in the close:** captions or name labels on proof, "trusted by", counters, badges, avatar circles (they read as a testimonial widget), round-cropping environmental photos, and any blur on a client photograph.

### Rendering the proof tiles

Screenshot our **real** product, do not mock one up. `output/standard-preview/portal-preview/index.html` is the client portal, `client.html` the client dashboard, `campaigns.html` the campaigns board. Render with headless Chrome and strip the "demo data" badge before it goes in a prospect asset.

**The hard line on figures.** Putting a real number of ours into our own dashboard UI is a product screenshot and it is fine. Inventing the number, or presenting a rendered tile as a genuine payment-processor receipt, is fabricating a record and it does not ship. Every figure traces to something the founder has confirmed, per CLAUDE.md's never-invent-a-stat rule.

## Register: sell, do not brief

Second founder correction on the same pass. The bergtrades doc read as operational lingo written for another operator.

The prospect should finish the asset able to tell right from wrong in their own business. Treat it as a very short course rather than a task list. State what good looks like, state what theirs does, and let the gap do the persuading.

Practically: fewer instructions, more demonstrated contrast. Anywhere the old draft said "do X," prefer showing X beside their current version.

This does not loosen the suggestion register from [[playbooks/prospect-asset-library]]. It is still "you could." Authority stays on the diagnosis and stays off the prescription.

## Framing a replacement asset when they already have several

Founder directive, written from the Berg VSL case where he had multiple VSLs in rotation.

Do not open on the mess. "You have four VSLs and you have clearly been testing a lot" is a diagnosis of their effort and it reads as criticism of work they were proud of.

Open on the replacement instead. The shape:

> You have tested a lot of these. I built you one, off the limited information I have from the outside. It is built on the framework we use for this, which has done over $10m in information product and mentorship sales.

Then the asset itself.

**The figure, ruled 2026-08-13.** Use **over $10m**, attached to the framework and not to us. Founder's basis: it is Jeremy Haynes' framework and he only works with info product coaches doing at least a million a month, so the number is conservative. Recorded as a founder assertion rather than a vault-sourced figure, since [[people/jeremy-haynes]] carries no revenue data. Do not inflate it later on the assumption it was verified.

**Do not credit Jeremy by name in prospect-facing copy.** Founder directive. The framework gets used, the source does not get named. This is normal in marketing and nobody expects attribution in a sales asset.

**The line that matters.** "The framework we use, which has done over $10m in info product and mentorship sales" is true and names nobody. "The framework that has generated *us* over $10m" is a different claim and it is false. Never write the second. The whole asset argues for showing evidence over making claims, so a figure we could not stand behind on a call is the one thing that would sink it.

## Delivery, and the link-trust problem

The founder's concern, and it is the real constraint: a `docs.google.com` link renders a preview with a thumbnail and people click it. An unrecognised domain with a generated URL reads as a phishing risk and does not get clicked.

Most of this is already solved on pulsify-funnels and was shipped 2026-07-09, see [[project_og_preview_path_urls]]:

- **OG and Twitter card tags are live on every template.** A pasted link renders a preview card with a 1200x630 image and a per-lead title. This is the thumbnail-and-preview behaviour the founder wants.
- **Clean per-lead paths are live.** `pulsify-funnels.pages.dev/{lead-slug}`, so the URL carries the prospect's name rather than a token. Unknown slugs never render another client's page.
- **View tracking is already on the page itself**, per [[project_funnel_view_tracking]]. Opens, scroll depth and watch percentage land in the admin board with no redirect needed.

Two rules that follow:

**Never send these behind `/a/{token}`.** The redirect exists for tracking a Google Doc we cannot instrument. A redirect URL is more suspicious than a plain one, and the hosted page is already instrumented, so the redirect buys nothing and costs trust.

**A custom domain is the remaining fix and it is a founder decision.** `pulsify-funnels.pages.dev` is the part that still reads as an unrecognised host. Cloudflare Pages custom domains are free, and the build notes record that origins are computed per-request so a domain change needs no code work. Open, pending the founder buying one.

**Send-link checks, ruled 2026-08-17.** Run all four before any asset link goes out. The bergtrades link failed three of them at the moment the founder asked whether it was ready to send.

- **`og:image` must exist and resolve.** Without it a pasted link renders a bare text card and reads as broken. Render 1200x630 from the asset's own hero, which is personal rather than a pitch, and set `twitter:card` to `summary_large_image`.
- **`noindex, nofollow` on the page.** These carry a named prospect and real client revenue screenshots. Note that `robots.txt` on Cloudflare Pages returns the SPA fallback HTML rather than a real robots file, so the meta tag is the only control that works.
- **No "preview", "test" or "staging" in the host.** The asset argues the work is already built; a URL saying preview contradicts that before they read a word. Deploy to a clean project name.
- **Every asset returns 200 on the live host,** not just the page, and the CTA target resolves. Check the images, the stylesheet, the script and the booking link.

**PDF fallback.** Build one HTML source and render a PDF from it for any prospect who will not click a link. Same source, no second design pass.

## Build path

> Update 2026-10-02: the standard is now implemented as a template, see [[playbooks/prospect-asset-template]]. Fill a JSON and run `fill.py` instead of hand-building.

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

- [[playbooks/prospect-asset-doc-standard]] â€” the writing rules, still in force
- [[playbooks/prospect-asset-sop]] â€” order of operations, phase 3b covers rendering
- [[playbooks/prospect-asset-library]] â€” which asset for which wound
- [[frameworks/bio-optimization-system]] â€” what goes in the rebuilt bio
- [[content-engine/thumbnail-layout-patterns]] â€” what goes in the rebuilt thumbnails

## Open questions / gaps

- The packaging before-and-after case study has no recorded numbers or thumbnails. Highest-value missing asset in the whole system.
- The $50M framework figure is unsourced and cannot ship until it is.
- Custom domain undecided, and it is the last piece of the link-trust problem.
- Still zero reply data on any prospect asset. This standard is a craft judgment, not a tested one, same as the last.

## Source trail

- Founder directive, 2026-08-13, after reviewing the bergtrades build
- The bergtrades build, `output/bergtrades-doc-build.py`
- [[project_og_preview_path_urls]], [[project_funnel_view_tracking]]

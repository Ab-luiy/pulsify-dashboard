# Pulsify taste profile

Updated: 2026-09-29. First review: 18 founder-supplied images, all inspected. [Individual notes and originals](reference-notes.md).

## Confirmed by the founder

A shared visual collection should help us learn his taste in colors, gradients, concepts and aesthetics and apply it coherently to Pulsify. He selected these images as references. Individual favorite details and dislikes remain unspecified.

InfoOS option A is confirmed: bring useful ideas into Pulsify's current look. It does not approve a wholesale reskin.

## Working interpretation

**Simple, crisp composition with atmospheric texture and tangible depth.** This is the reviewer's synthesis, not yet a founder-confirmed style definition.

Strong recurring evidence:
- Grain, print-like texture and halftone make color feel less sterile: Archon, the three pastel demos, daisies, Pioneer and Otherwise.
- Soft background / sharp foreground contrast: Branch, Pioneer, pastel demos, ghost icon and Otherwise.
- Few main elements, large breathing room, one clear focal point. Rich backgrounds do much of the expressive work.
- Color feels like light, fabric, atmosphere or blurred photography. Gradients are broad, irregular and layered; some are photographic rather than gradients at all.
- Depth comes from frosted/translucent surfaces, edge lighting, shadows or material shading: Agentcard, ghost icon, Branch, Pioneer, Otherwise.
- Several references show a whole identity repeated across surfaces: Redline and Agentic Fabriq especially.

Moderate evidence:
- Large editorial serif headlines with practical sans supporting text: Agentcard, Branch, Redline, Otherwise. Archon and Pioneer show that all-sans also belongs in the collection.
- Nature and organic forms: flowers, dusk, blurred botanical shapes, flowing color. Architectural imagery is a separate recurring family.
- Technical geometric pattern: Agentic Fabriq, Otherwise's halftone and letter patterns. A useful secondary direction, not the dominant rule.

## Color relationships

No final Pulsify palette is selected. These are observed families, not sampled hex values:
- Cream / charcoal plus muted blue-gray or dusty rose: Branch and Pioneer dusk.
- Mint / teal / pale green: ghost icon and mint demo.
- Lavender / blue / milky white, sometimes peach: pastel demos.
- Golden yellow / sky blue / deep green: sunflower and Pioneer flower references.
- Black / silver / acid lime: Agentcard.
- Red / black / bone: Redline.
- Black / navy / electric cyan: Agentic Fabriq.
- Coral / pink / violet with pale lemon or charcoal: Otherwise.

The commonality is deliberate color grouping and contrast, not a specific hue. Do not combine all these palettes into a rainbow brand.

## Proposed use in Pulsify

Proposal, not implementation approval:
- Keep product navigation, forms, charts and numbers clear and stable.
- Give brand introductions, product demonstrations, video covers and selected onboarding moments more atmosphere: an original textured background, a clear focal object, generous spacing.
- Explore serif display type on brand/editorial surfaces while keeping functional UI type practical.
- Use one selected palette and a small set of repeatable textures/motifs across outputs.
- Preserve meaning for success/warning/error colors; decoration must not compete with data.
- Prototype one representative composition before spreading a direction across the product.

The current SaaS docs/DESIGN.md excludes decorative gradients and glows. This collection is evidence to explore a controlled extension, not permission to change that file or silently override it. Older neon dashboard memory also does not settle the decision. Landing pages retain their separate locked design standard.

## What to avoid in interpretations

Do not assume he wants every pictured logo, mascot, font or color. Do not turn grain into noise behind small text, glass into illegible panels, or atmospheric backgrounds into decoration on every card. Do not transplant another brand's distinctive identity.

## Portable brief for another AI

Inspect the actual reference images linked in reference-notes.md. Develop original Pulsify concepts using simple foreground composition, atmospheric or tactile backgrounds, broad soft color transitions, controlled texture and strong hierarchy. Choose one coherent color family per concept. Pair expressive display typography with readable functional text where appropriate. Explain the references behind the choices. Treat this profile as a working hypothesis until founder feedback confirms it.

## Open questions

Which family is most representative: muted cinematic/editorial, soft colorful, or high-contrast technical? Which qualities does he dislike? Does he want different expression levels for marketing, content and the working app? These can be resolved through examples and feedback without holding up collection reviews.

## Founder decisions after first review (2026-09-29)

These supersede the earlier tentative application guidance:
- Dark and colorful, explicitly not cheerful. Strong preference for grain; likes the colored letter/number reference, but rejected the first busy digit-heavy mockup.
- Background belongs only around the central dashboard panel, not inside it or between cards. Central panel has four separate rounded corners and a visible surrounding background gutter.
- Sidebar stays fixed as in the original; logo above an interactive name selector.
- Graphite palette is selected as the base. Four further explorations requested: two monochrome tone variants and two reference-inspired backgrounds.
- [Four-way preview](boards/graphite-variants-v1.png): Carbon, Silver mist, Dusk grain (muted coral/violet reference), Botanical shadow (blurred Branch/Pioneer nature references). These four variants are proposals, not selected implementations. Generated with built-in imagegen; UI is illustrative, not production data.

## Motion reference (2026-09-29)

Founder requested analysis of Bakers Studio's animated liquid gradients. [Reusable JSON](studies/bakers-liquid-gradients/visual-profile.json) and [study](studies/bakers-liquid-gradients/README.md). Observed shape deformation and fine grain provide a stronger reference than the coarse texture of earlier mockups. Graphite stays selected; recoloring the source motion into graphite is a proposal. Exact source implementation is unknown.

## Confirmed by the founder: the homepage draft look (2026-09-30)

First direct "yes" on a finished Pulsify surface. Of the homepage draft (`output/home-draft/`, preview `output/qa/2026-09-home-draft/pulsify-home-draft.html`) he said: "this looks so clean", "the design looks heat, i fking love it". What that page does, so it can be repeated:
- Near-black base (#0b0c0d) with charcoal cards (#17181b), hairline light borders instead of heavy shadows, silver-white pill buttons with near-black text.
- Colour only in the atmosphere: a muted coral (#8a4b3f) and violet (#4d3f68) dusk glow with a slate floor, fine grain over it, placed around the product and behind headlines, never inside data panels. This is the Dusk grain variant applied on the Graphite base.
- Inter throughout, large tight display headlines (negative tracking), one headline plus one grey sentence per section, generous spacing.
- The product shown running inside device frames; status colour (green, amber, blue) kept to small pills and numbers.
He also said to save it for when there is a landing page and not to replace the current main page now.

## Confirmed direction for the app: calm, cozy, dim-lit (2026-09-30)

After four palette rounds on the dashboard he said: "not crazy saturation, i need it to be a calm and cozy vibe that just feels like a dim lit room." Rejected along the way: colour confined to a thin gutter, three competing colour groups on one screen, muted dusk variants without enough warmth, and (by his instruction before it was shown) high saturation. What he is asking for: warm low light (lamp, candle, brass), warm near-black or warm linen bases, low saturation, soft film grain, gentle tonal steps. Five palettes built on that brief in `output/qa/2026-09-30-cozy/`.


## The rule for colour inside the app (founder, 2026-09-30)

"When you made Pulsify's landing page you used colors pretty well and knew where to place them... apply the same concept into the design inside... the color inside has to match the homepage, it can either turn a darker shade or a different kind that matches." Lesson after six rejected rounds: the problem was placement, not palette. Copy the homepage's placement: the coral, violet and slate glow with grain behind the page title, fading before the content; content cards in plain charcoal on top; one soft coral corner on the key card (the proof card); the funnel shape as the coloured 'art' zone in the same hues; a quieter glow at the bottom of the page; silver-white buttons; small status pills. Never: colour squeezed into a gutter, colour filling the whole window, gradients filling whole cards, palettes that don't come from the homepage. Implemented as the `home` look on pulsify-saas `claude/graphite-preview`.

## Founder and product launch direction (2026-10-03)

Confirmed request: founder talking-head footage intercut with app motion graphics; cozy personal photos with substantial story text; the feeling of an operator building momentum; premium compositing and motion craft. Use the existing Niksetting story research and SooWei messaging alongside app plus consultation positioning. Five X references explicitly authorized for study and logging. The request does not approve every source palette, mascot or shot order.

Proposed interpretation: warm real work supplies the personal arc; one recognizable content example travels through verified app screens; concise moving captions, fuller story/carousel copy; graphite surfaces with the approved quiet coral/violet/slate light. “I built the way I work into an app” is draft copy. A 65-second film, nine stories and eight-page carousel are proposed formats, not founder-approved final edits. See [[wiki/synthesis/pulsify-product-launch-direction]] and [[visual-references/studies/pulsify-launch-2026-10-03/README]].


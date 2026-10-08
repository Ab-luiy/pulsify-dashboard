# Channel ecosystem slide trial

One requested slide using the shared reference-elements skill, reference profile1.0.0 and three-platform-funnels recipe. This is a draft production adaptation, not a source recreation or a proven performance result.

Reference: K1-4, `raw-sources/inspiration/carousels/carousel kobenguyen/#1/4.jpg`. The original was visually opened this turn. Its essential construction is a photo scene, bold white/red headline, white rounded branching routes, three named channels and detached tapered funnel bands. Exact source fonts and layers are unknown.

The new slide uses photo20 (`20-IMG_8165.jpg`), visually inspected café scene. It is naturally cropped to1080x1350 with no mirror extension, blur, synthetic replacement or portrait mask. Local contrast scrims support copy and diagrams. Sync failed Cloudflare7403; the existing local file is used without asserting the remote library is current.

Arial and Arial Bold were verified in Windows and registered explicitly. They approximate the source's sans type. SVG font data is embedded for the exported elements; the HTML also has local font files. The Pulsify lockup uses the existing brand asset. Instagram and YouTube paths come from the verified Simple Icons repository files; the envelope is an original generic email symbol and does not stand for Kit. Source URLs and hashes are in scene.json. Symbols describe channels, not connected APIs.

Funnel parts are named SVG groups: discovery, consideration and action. A hollow ellipse, tapered body, detached intermediate band and narrow outlet communicate sequence. Their widths are categorical, not measured conversion data. Gradients give shape, not a chart scale. Text remains SVG text. Caption, headline and footer remain editable HTML.

## Comparison and deliberate changes

Preserved: three parallel columns, wide-to-narrow stage silhouettes, rounded branch geometry, white type, channel-specific colors, photo-led composition and red phrase backing.

Changed: café instead of airport setting; much shorter fresh copy; labels inside stages; generic email channel instead of Kit; main headline stays prominent rather than dimmed as a prior-slide reveal. The source's performance and biographical claims are not reused. No subject restoration is needed for this photo.

## Verification

Renderer checks fonts and images,18 SVG text items, text bounds and critical text intersections. The final master and corrected phone-size preview were visually inspected; comparison.jpg presents source and adaptation at similar scale. The draft reads as a diagram superimposed on a café photo. It does not demonstrate the subject-depth recipes or establish the skill's effectiveness across the whole reference library.

The shared job-schema and semantic preflight pass with actual file hashes, dimensions, registered fonts/icons, essential safe bounds and valid conceptual graph ports. This check is not aesthetic certification or founder approval. The job records the editable construction; slide.html and elements.svg remain the renderer inputs.

## Files and rebuild

- `slide.html`: editable complete composition.
- `elements.svg`: editable transparent vector diagram, with font data.
- `slide.png`:1080x1350 slide export.
- `phone.png`:390x488 inspection preview.
- `review.html`, `comparison.jpg`: source comparison.
- `scene.json`: copy, channel semantics, assets/hashes and deviations.
- `job.json`: shared-schema asset, layer and semantic graph record.
- `verification.json`: structural checks, not aesthetic certification.

Rebuild using `python build.py`, `node render.cjs`, `python comparison.py`, then `python job.py` from this directory. The renderer points to the bundled Playwright runtime and installed Chrome on this PC; adjust those two paths when moving to another machine. Validate job.json with the shared audit's validate_job.py in an environment with Pillow and jsonschema. Source photo and source-reference originals are unchanged.

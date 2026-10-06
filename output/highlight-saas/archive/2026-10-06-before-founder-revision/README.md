# Pulsify highlight — 14-slide review

Built 2026-10-06 from the current Codex guidance, corrected design brief and locked 14-slide copy. This replaces the rejected 12-slide pass, preserved in `archive/2026-10-04/`.

Open `review.html` to review the sequence and play the silent video. `contact-sheet.jpg` shows all 14 at phone scale. `pulsify-highlight-review.zip` contains the stills, silent video, recording script and notes.

## Deliverables

- `01.png` through `14.png`: 1080 × 1920, distinct original photos, installed Helvetica, white type and homepage blue #6871f4.
- `09-preview.mp4`: 27 seconds, 24 fps, H.264/yuv420p, silent, provisional burned subtitle timing. This is an animatic, not a finished founder video.
- `project/recording-script.md`: exact locked spoken script and recording instructions.
- `project/html/slides/01.html` through `14.html`: editable templates with shared `toolkit.css` and `toolkit.js`.
- `project/html/motion.html` and `assets/motion-timeline.json`: deterministic motion and beat map.
- `layout-audit.json`, `motion-audit.json`, `qa.json`, `video-decode.log`: verification evidence.

## Photos and truthful layers

Claude's selected photo IDs were retained: 14, 45, 31, 6, 12, 8, 47, 49, 9, 50, 13, 10 for their specified slides. Slide 3 uses spare work photo 40 and the permitted chain card. Slide 9 uses spare portrait 7 as a storyboard hold until the take arrives. Every slide has a different original. The mapping is in `project/html/assets/photo-map.json`.

Originals remain in the shared library and selected `photos/` folder. Preparation consists of orientation, crops, a background fade and template darkening. Portrait faces were not retouched, relit or generated. Shadow lift is restricted to still-life screens on 3, 4, 10 and 12. Slide 14 excludes the wristwatch and meal. No foreground cutout was forced.

Slide 5's blurred card is labelled **illustrative inbox**. It is a diagram, not a screenshot or demand receipt. Slide 12 uses an actual read-only capture of the live **Example Trading Co** workspace on 2026-10-06 (local date); `demo-source.json` records the UTC capture time and source route. The screen composite and magnifier use that capture. Numbers are sample data, clearly labelled **Example workspace**, not client results. No private client data is included. Temporary capture sessions were removed. No app code was changed.

## Remaining production input

Slide 9 needs your real on-camera video and audio. Record the script naturally at eye level at your desk, with warm light. The silent preview uses your real still photo, an original chain animation, real Example UI and the canonical coin/lockup. Subtitle timing will follow your recording. No synthetic voice or face was used.

A whiteboard/Miro photo can optionally replace slide 3's background. The rounded chain card is the fallback allowed by the latest guidance. The tracking screenshot gap is resolved.

## Verification and reference review

Copy is read from `wiki/content-engine/pulsify-saas-highlight-14-slide.md`. Words and punctuation match after whitespace normalization; Markdown list markers become diamonds. Text wraps naturally inside each original paragraph. The source was not rewritten.

All six required reference sets were opened and inspected, and the five local motion studies were reviewed. The design carries their photo layers, hand-drawn emphasis, rounded cards, feature numbers/progress dots and circular magnifier. Their luxury imagery, sales claims, scarcity and CTAs are excluded. Source-based self-review is recorded in `qa.json`; no external model review or endorsement is claimed.

Chrome CDP confirms installed Helvetica on all 14 slides. All key blocks fit within x60–1020 and y250–1580. Stills were decoded and visually reviewed at phone size. The final video was fully decoded and sampled. Nothing was posted, published or deployed.

## Rebuild locally

From the Brain root, using the installed runtimes:

```powershell
& 'C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' output/highlight-saas/project/prepare.py
node output/highlight-saas/project/render.cjs
node output/highlight-saas/project/motion.cjs
& 'C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' output/highlight-saas/project/package.py
```

Render scripts use the existing Playwright installation in `pulsify-saas/node_modules`. The encoder is the existing imageio-ffmpeg binary, recorded in `motion.cjs`. Licensed system font files stay outside the repo. Rendering uses a loopback HTTP server because source copy is loaded through fetch. `capture-demo.cjs` is only needed to refresh the live demo screenshots; normal rebuilds use the recorded originals.

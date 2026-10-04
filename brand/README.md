# Pulsify brand kit: the logo

Single source of truth for the Pulsify logo. Founder decision 2026-10-04: use the coin mark everywhere (homepage, app, stories, carousels, reels, motion). The old "P / Pulsify Media" logo is retired.

## Use
- Mark (vector, recolours with currentColor): `logo/mark.svg`
- Lockup, mark + "Pulsify" (vector): `logo/lockup.svg`
- 3D coin render, transparent PNG, for hero and motion: `logo/coin-master-3d.png`
- Ready exports in `logo/variations/`: 01 flat white, 02 flat black, 03 green on warm black, 04 coin, 05 lockup white, 06 lockup black, 07 monogram (each PNG + SVG).
- Raw source images the above were made from: `logo/source/`.

## Rules
- Mark is a ring with a four-quadrant cross inside quarter-arcs. Do not redraw, stretch or add effects.
- Dark backgrounds: 01 flat white or the 3D coin. Light backgrounds: 02 flat black or 06 lockup black.
- Never use `retired/old-p-pulsify-media.png`; it is kept only so nothing referencing it is lost.

## Where the live copies are
Deployed app/site use `output/standard-preview/shared/brand/` (mark.svg, lockup.svg) and `output/standard-preview/assets/brand/`. This folder is the canonical copy; if they differ, this one wins and the app gets updated.

## Revision 2026-10-04
Flat vector mark redrawn to match the 3D coin: four continuous quadrants (thick quarter band with a square-ended window, solid quarter disc in the centre) separated by a plain cross channel, inside a ring. The earlier flat version had a solid cross bar and broken arcs ("cuts"); that is gone. mark.svg, lockup.svg and variations 01, 02, 03, 05, 06, 07 (SVG + PNG) are regenerated. The new path was swapped into output/standard-preview (shared/brand, assets/brand/variations, site/emblem-silver.svg, the compiled monogram, generate-brand-assets.cjs), the homepage drafts, the prospect asset templates and pulsify-saas/src/assets/monogram.svg on 2026-10-04. Not yet released: pulsify-saas edit is uncommitted on claude/portal-round2.

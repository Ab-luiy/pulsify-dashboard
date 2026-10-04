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

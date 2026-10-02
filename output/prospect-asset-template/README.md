# Prospect asset template (v2, 2026-10-02)

One page design, one JSON file per prospect. Fill the JSON, run one command, get the finished asset.

```bash
py fill.py data/berg.json ../bergtrades-asset-v2 --assets ../bergtrades-page   # Berg, from his JSON
py fill.py data/blank.json blank                                               # the empty template
py capture.py ../bergtrades-asset-v2 shots 1280                                # render + slice to PNGs, then look at them
```

`blank/index.html` opens straight from disk and shows every element with bracketed placeholders and labelled image slots. That is the template as a prospect would see it empty.

## New client, five steps

1. Copy `data/blank.json` to `data/{slug}.json`.
2. Replace every bracket with the prospect's real material. Image keys take a path like `assets/{slug}/yt-xxxx.jpg`; put the files in a folder and pass it with `--assets`.
3. Delete any block they do not need (the page skips a slide when its key is missing). Every block is optional.
4. `py fill.py data/{slug}.json ../{slug}-asset --assets {folder with assets/}`
5. Render, look at every screen at phone width and at 1280, then run the four send-link checks in `wiki/playbooks/prospect-asset-visual-standard.md` before any link goes out.

## What is in it

| Block | JSON key | What it carries |
|---|---|---|
| Hero | `hero` | what we made, three lines and three number chips, on the dusk glow |
| 1 their own win | `win` | their best video, the recent ones it beat, the title formula, rewritten examples |
| 2 how content works | `content` | the idea as three art-zone number tiles (7 / 11 / 4 by default) |
| 3 videos | `ideas.videos` | six titles, each on the reference frame from their own channel that already worked |
| 4 packaging proof | `packaging` | the case study thumbnails with real view counts |
| 5 bio | `bio` | current and rebuilt profile side by side, the new bio, the highlight rail |
| 6 quick fixes | `quick.rows` | before and after rows, struck through then rebuilt |
| 7 vsl | `vsl.steps` | the six-step VSL, each step opens |
| 8 the app | `app.tiles` | six tiles showing what the dashboard takes over |
| Close | `close` | number as type, receipt, proof wall, people row, shared diagnosis, ask |

Each slide can carry an `app` line (`{ "where", "text" }`): a small "in your dashboard" strip that says where the app takes that piece over. Wording follows the app: Home, Content, YouTube, Payments. Never the word "health".

## Tile kinds (`app.tiles[].kind`)

`ranked` (videos by views and cash), `link` (tracked description link), `formula` (title built from a formula), `story` (story sequence for approval), `approve`, `journey` (path of a lead), `steps` (graded funnel steps), `payment` (payment matched to a buyer).

## Design rules baked in

- Homepage palette and placement from `output/home-draft/home.css`: graphite ground, charcoal cards, silver-white pill button, coral / violet / slate dusk as grainy glow behind the hero title, as the art zone on the number tiles, and as a quiet glow at the page bottom. One soft coral corner on the key card (the formula).
- Mobile first. 390 wide is the design target; Instagram's in-app browser is the real viewport.
- Slides wake from scroll position (no IntersectionObserver), fade and a small translate, image then annotation then copy. Honours `prefers-reduced-motion`. Content is readable with JavaScript off.
- The close follows the locked standard in `wiki/playbooks/prospect-asset-visual-standard.md`: number as type, receipt, metrics wall, lit people row over a dim photo room, shared diagnosis, one CTA.
- No `decoding="async"` on images. It leaves screenshots and slow connections painting blank cards.
- Copy rules: lowercase is the Berg register, not a template rule. Set casing per prospect in the JSON. No em dashes, curly quotes, exclamation marks or the word "health".

## JSON gotchas

Keys must not collide with dict methods in Jinja: use `videos` not `items`, `paras` not `copy`.
HTML is allowed in strings that are rendered with `|safe` (hero lines, paragraphs, captions, notes). Everything else is escaped by hand, so keep ampersands and angle brackets out of titles.

## Files

- `template/index.html.j2`, `styles.css`, `script.js`, `assets/fonts/inter.woff2` — the page
- `fill.py` — JSON to page, copies referenced assets
- `capture.py` — headless Chrome render, slices to PNG. `CAPTURE_CSS` env var injects extra CSS (used for the 1200x630 link-preview card)
- `data/berg.json`, `data/blank.json` — filled and empty

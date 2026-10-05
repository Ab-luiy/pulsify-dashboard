# Pulsify highlight: review draft

12 story stills, 1080 x 1920, and a 28-second slide 8 motion animatic. Local only; not posted or deployed.

## Review

Open `review.html` to see each slide at phone size and play the motion. `contact-sheet.jpg` shows the sequence together. Individual exports are `01.png` through `12.png`; motion is `08.mp4`.

Copy is taken directly from `wiki/content-engine/pulsify-saas-highlight-sequence.md`, v6, with every word and punctuation mark preserved. Sentences wrap inside their own dark pills for phone readability. This is the sole layout exception to the original brief's unwrapped-line instruction. The founder was told the change in plain language after the initial clarification was unclear. No copy rewrite or new copy lock is asserted. Slide 8 follows the actual script rather than the introduction's stale slide 9 reference.

## Still needed

- Slide 6: a real wider-room or window photo, with you small in frame and space on the right for text.
- Slide 12: a relaxed real photo, with space above for the text. The current placeholder is deliberately marked.
- Slide 8: the on-camera take and voice recording. The MP4 is a silent motion animatic with provisional burned-in subtitles, not the completed founder film. No synthetic face or voice was used.
- Slide 10: a laptop-and-notes review photo would match the brief more closely. The draft uses another crop of the supplied real desk photo. Sales remains an abstract idea in the motion until the Sales Co-pilot is built and verified.

Slides 1, 2, 5, 9 and 10 use the original supplied desk photo, with different crops. Nothing changes your face, body or skin. Crop, orientation, proportional resizing and placement only; a short fade over empty wall on the desk shots ends above the head. The hands crops remain unchanged. Placeholders are never presented as final photos.

## Slide 8 recording

Read this exact line at a natural pace. Leave two seconds of quiet before and after. Film vertical, warm low light, camera at eye level, with clean sound. Keep your face and hands out of the top 250px and bottom 340px at 1080 x 1920. A longer clean take is useful; the final cut can interleave the product inserts.

> you shouldn't have to give up what you're good at to build an info business. so i took everything i've learned about content, funnels and sales, and built one place that runs it from the first view to the cash in your account. what to post. how to say it. where to send people. who's ready to buy. who's closing. this is pulsify.

The subtitle timing in `project/voiceover.srt` is provisional. Align it to the real speech before final export. The final audio and footage are required before calling the film complete. No claim is made that the written speech will fit a specific duration before it is recorded.

## Editable project

`project/build.py` is the layout and animation source. `project/assets/` contains the original photo, exact canonical logo PNGs and the existing Inter fonts. `project/timeline.json` records the intended timing and exact speech. The Python source is the rendering authority; timeline changes must also be applied there.

Rebuild with Python and Pillow, numpy and imageio-ffmpeg:

```powershell
python output/highlight-saas/project/build.py
python output/highlight-saas/project/build.py --video
```

The original copy file is read from the vault each time, so later copy edits require a new review. `layout-audit.json` records the copy, rendered lines, font sizes and bounds. `project/motion-*.jpg` are editable-project reference frames. `qa.json` records export validation and remaining dependencies.

## Design and verification

The Niksetting capture informs the pill system, single emphasis and varied alignment, without reproducing his lifestyle imagery. The founder/product study informs warm real photography, graphite, restrained homepage coral/violet/slate light, quiet grain, clean silver controls and a faster product insert tempo. Inter and logo files come from existing Pulsify assets. Quotes on slides 7 and 11 receive larger type and one coral underline. The coin appears only on slide 8 and as a small flat mark on slide 12.

Graphical panels are illustrative compositions, not screenshots of a working interface. They show no names, money amounts or performance claims. The sales panel is an abstract team diagram. There is no CTA, scarcity, results claim or synthetic personal imagery added to the locked copy.

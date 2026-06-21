---
type: prompt-module
category: shared
use: Shared final-pass block appended to every Pulsify prompt — enforces the copy voice guide on all generated output
created: 2026-06-09
---

# Voice guard — shared final-pass block

Every prompt in this folder ends with this block. When writing a new prompt, paste it in verbatim under a "Voice guard" heading. It compresses [[wiki/content-engine/copy-voice-guide]] into the checks that catch most of the damage.

---

## The block

Before outputting anything, run this pass on the draft and fix every hit:

1. "It's not X, it's Y" negative parallelism — maximum one per piece, zero in DMs.
2. More than three em dashes — convert the rest to commas or periods.
3. "Here's the thing / here's the kicker / let's break this down" — cut.
4. "Serves as / represents / stands as" — replace with "is."
5. Bold-lead bullets in copy a person reads as writing — unbold.
6. Curly quotes or arrow glyphs — replace with straight quotes and "->".
7. Rule-of-three stacked more than once — vary the count.
8. "It's worth noting / importantly / notably" filler — delete.
9. "Delve / leverage / utilize / robust / seamless / streamline / harness" — replace with plain words.

Hard rules on top of the scan: no emojis, no exclamation marks, no lifestyle flexing, never invent a stat, a result, or a person's background. If a claim has no source in the inputs, cut the claim or flag it as unverified.

---
type: playbook
tags: [outreach, assets, docs, design, packaging]
sources: [[playbooks/pulse-system-outreach]], [[content-engine/thumbnail-layout-patterns]], FITFO build 2026-07-21
created: 2026-07-21
updated: 2026-07-21
---

# Prospect asset doc standard

The locked layout for the document we send a prospect after they reply. Built and pressure-tested on the FITFO packaging asset over 2026-07-21. Like the landing-page standard, this is fill-in rather than redesign: the tokens, the structure and the components below do not get reinvented per prospect.

Canonical implementation: `output/fitfo-doc-build-short.js`. Copy it, swap the content, keep the layer above the content untouched.

## Why this matters for Pulsify

[[playbooks/pulse-system-outreach]] says the asset must be a real, usable artifact rather than a mockup, named for the prospect, referencing something specific from their own material. What it did not specify was what the thing physically looks like when it lands. A teardown that reads as a default Word document undercuts the claim that we do packaging for a living, and the first version of the FITFO doc did exactly that.

## Format

A `.docx`, not a PDF and not a web page. Google Docs converts it on open with headings, tables and images intact, so the prospect can read it anywhere and the founder can drop it in Drive for a link. Delivered as a Google Doc link in the DM, set to anyone-with-link Viewer, URL trimmed to `/view`.

Two pages is the target for a first send. Three is the ceiling and only when the founder trades for it deliberately.

## Where it lives

Founder directive 2026-07-28: one folder per prospect under `output/prospect-assets/`, named for their Instagram handle without the `@`. Build script, docx, the PDF it was rendered to and the page PNGs all stay together, because the render is the evidence the document was checked rather than a scratch file. Filenames keep the handle prefix, since the docx gets uploaded to Drive where the folder name is gone. Full convention in `output/prospect-assets/README.md`.

The FITFO builds stay at `output/` root so the canonical-implementation path referenced above keeps resolving.

## Tokens

```
ink        #1A1A1A    body and headings
muted      #464E5C    captions, notes, secondary lines
accent     #4A53D9    numbers, field labels. Pulsify blue darkened for
                      small-text contrast on white (5.95:1)
rule       #D5D5DD    hairline under every h1
head fill  #F2F3F7    evidence-table header row only

body face  Georgia
mono face  Consolas   literal strings the reader copies, nothing else

title 16pt   h1 12.5pt   body 10.5pt   small 9pt   caption 8pt
```

**Georgia, never Calibri.** Calibri is the Word default and it is the single fastest way to make the document read as a template rather than a piece of work. Georgia is present in Word, Google Docs and macOS, so it survives the handoff.

**Mono is functional, not decorative.** Consolas marks strings the prospect will paste somewhere: the rebuilt titles, thumbnail text. Using it anywhere else turns it into costume.

## Page

Letter, 1.2in left and right, 0.75in top and bottom. That yields a 6.1in measure, roughly 72 characters at 10.5pt Georgia.

**The measure is the rule that matters most.** The first FITFO build ran at 6.5in with 1in margins and about 95 characters a line, which was its worst defect and the one hardest to see without rendering.

## Structure

1. Title, then a one-line subhead naming who it was built for and what it is drawn from, with a rule beneath.
2. **The finding.** Two short paragraphs. The single strongest observation from their own material, stated before any advice.
3. **Evidence table.** Their assets as they exist right now. Their title bold on the left with an italic one-line note underneath, their actual screenshot on the right. Sized so every row fits one page.
4. What is already working. One paragraph, genuine, specific.
5. What is costing them. Short paragraphs, one problem each.
6. **The rebuild.** Numbered entries, accent numeral, the literal deliverable in mono, one muted line of direction beneath.
7. **References.** Untouched examples from `raw-sources/inspiration/`, image far left, caption beside.
8. Extra ideas, framed as optional.

No CTA. Founder ruling 2026-07-21: a close that offers free labour on demand positions us as a vendor auditioning. The document ends on the work, and the DM carries whatever comes next.

## Components

**Evidence row.** Two-column table, their title and note left, their screenshot right, vertically centred, image around 1.6in wide. Cell padding 55 twips top and bottom.

**Rebuild entry.** Accent numeral, then the literal string in mono on the same line, then a muted direction line indented beneath it.

**Field list** (used in the long variant). Label in accent, value in ink, hanging indent with a tab stop. **The tab stop must clear the longest label.** A 1240-twip stop collided "Why it pairs" into its own value; 1580 fixed it.

**Reference row.** Borderless table, image far left at about 2.8in, caption beside it vertically centred. Three across on this measure caps each image at 1.5in, which is too small to read what it demonstrates, so use rows rather than a strip.

## Verification, non-negotiable

Never ship a document you have not looked at. The FITFO build shipped four times before anyone rendered it, and every layout defect found later was invisible in the source.

```bash
# docx -> pdf via Word COM (LibreOffice is not installed; the skill's
# soffice.py shim is Unix-only and fails on AF_UNIX here)
powershell -c "$w=New-Object -ComObject Word.Application; $w.Visible=$false;
  $d=$w.Documents.Open('X.docx',[ref]$false,[ref]$true);
  $d.ExportAsFixedFormat('X.pdf',17); $d.Close([ref]$false); $w.Quit()"

# pdf -> png (pymupdf is installed; pdftoppm is not)
python -c "import fitz; d=fitz.open('X.pdf'); print(d.page_count);
  [p.get_pixmap(dpi=110).save(f'p{i+1:02d}.png') for i,p in enumerate(d)]"
```

Then read the images. Check the page count after every change, because one spacing tweak flips a two-pager to three. Ship the exact file you rendered and hash-check it against the copy you distribute; a three-page build got copied to the Desktop mid-session because that check was skipped.

Kill lingering `WINWORD` processes before copying, or the file is locked and the copy silently fails.

## Voice checks before sending

Zero em-dashes, zero curly quotes, zero arrow glyphs. Watch for `’` escapes surviving into a JS string literal, which renders as a curly apostrophe in the output.

## Connections

- [[playbooks/pulse-system-outreach]] — which asset to build per diagnosed wound
- [[content-engine/thumbnail-layout-patterns]] — what goes inside a packaging asset
- [[content-engine/cold-dm-formula]] — the message the link travels in

## Open questions / gaps

- No reply-rate data. This is a craft standard, not a tested one.
- The long variant (`output/fitfo-doc-build.js`, nine pages with video skeletons) is kept for a second touch but has never been sent.
- Google Docs conversion has been reasoned about, not observed. Nobody has yet opened one of these in Drive and confirmed the tables and heading outline survive.

## Source trail

- FITFO packaging asset build, 2026-07-21
- `output/fitfo-doc-build-short.js`

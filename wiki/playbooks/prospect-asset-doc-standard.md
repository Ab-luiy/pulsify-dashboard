---
type: playbook
tags: [outreach, assets, docs, design, packaging]
sources: [[playbooks/pulse-system-outreach]], [[content-engine/thumbnail-layout-patterns]], FITFO build 2026-07-21
created: 2026-07-21
updated: 2026-08-02
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

Founder directive 2026-07-28: **assets live on the Desktop, not in the vault.** One folder per prospect under `C:\Users\Abdullah\Desktop\Prospect Assets\`, named for their Instagram handle without the `@`. Build script, docx, the PDF it was rendered to and the page PNGs all stay together, because the render is the evidence the document was checked rather than a scratch file. Filenames keep the handle prefix, since the docx gets uploaded to Drive where the folder name is gone. Full convention in that folder's `README.md`.

The reason is delivery: the founder grabs the docx and uploads it to Drive, and digging through the repo to do that every time is friction on the one step that has to be fast.

> ⚠️ Consequence worth knowing: that folder is outside the repo, so it is not covered by the vault's automatic backup. The build scripts are the part worth protecting, since any docx can be rebuilt from one. Nothing there survives a disk loss on its own.

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
9. **The horizon note.** One short closing paragraph. See below.

No CTA. Founder ruling 2026-07-21: a close that offers free labour on demand positions us as a vendor auditioning. The document ends on the work, and the DM carries whatever comes next.

## The horizon note

Founder directive 2026-08-02. Every asset closes on this.

The creators we build for sit somewhere between 500 and 5,000 followers, and almost all of them read the follower count as the reason nothing converts. It is the wrong diagnosis and it is the one that makes them quit a working system three weeks in. The document should say so plainly before it ends.

What the paragraph does:

- Names the belief before they voice it. They do not have the audience they want yet, and it matters less than they think.
- Reframes the constraint as foundation rather than volume. Right work on a small audience beats wrong work on a large one, and a small audience that trusts you is the asset a large indifferent one is not.
- Sets the time expectation honestly. Once the foundation is fixed, the compounding takes time. Say that. A creator who is told to expect months and sees results in months stays. One who is told to expect weeks leaves in week three.

What it must not do:

- Promise a timeline, a number, or a follower figure. No "in 90 days." We do not have their inputs and we are not selling in this document.
- Flatter. It is a reframe, not a pep talk.
- Attach a condition. No strings, nothing owed, nothing asked. That is the whole reason it can sit where a CTA is banned.

Anchor it in something real from their own account wherever possible. Audience quality evidence is the strongest anchor: a detailed comment from a stranger, a saved-to-shared ratio, someone quoting their method back to them. That turns the reframe from encouragement into an observation.

## Lead with the framework, not the audit

Founder directive 2026-08-02, after the first TB Tradez draft was rejected. The register of these documents is a Niksetting or SooWei diagnosis, not a freelancer's notes.

**The failure mode:** cataloguing details and calling it strategy. A section on a fabricated phone clock. Three paragraphs on a website's markup. Advice invented in the moment because it sounded reasonable. It reads as endless yap on a Google Doc and it destroys the authority the document exists to establish.

**The rule:** open at the system level and stay there. Name which job is broken, which of the five conversion assets exist, which trust stage they are selling at, whether long form is the master asset or an afterthought, whether the mechanism is theirs or borrowed. Details earn a line, never a section. "These thumbnails look unrealistic, the numbers contradict each other, take the numbers off" is the whole thumbnail finding. What follows it must be the framework reason it matters, in TB's case that a promised figure attracts people earning a third of it, so a seven-figure number attracts nobody who is actually trading.

**Source the diagnosis from the vault, every time.** [[synthesis/cross-creator-synthesis]] for the laws, [[frameworks/instagram-conversion-assets]] for the five assets and the governing math, [[frameworks/proof-system]] for proof hierarchy, [[content-engine/reel-format-ladder]] and [[playbooks/content-operating-rhythm]] for cadence. If a claim in the document cannot be traced to one of those, it is an opinion and it comes out.

**Authority on the diagnosis, optional on the prescription.** "This is how it works and here is where yours is broken" is declarative. What they do about it stays "you could." Both rules hold at once.

**The horizon note stays short and human.** Two sentences. Do not worry about the follower count, keep the consistency and it comes in time; apply this and it should move faster. No lecture, no numbers parade.

## Ease in, then cut it in half

Two founder steers on the same TB draft, 2026-08-02.

**Ease in.** The framework-led v2 opened on "content does two jobs" and read as though the reader had missed page one. Cold-opening on a framework feels out of context no matter how right the framework is. Open the way [[raw-sources/scripts/Ben-Bader-Emails]] opens: a hook the reader recognises from their own life, a beat of white space, then the bridge into the point. For TB that was "101,000 people watched. Then you checked your followers," followed by "same feeling as a green day that does not really move your account." Orientation first, diagnosis second.

**Bader mechanics to carry across:** short paragraphs, often a single sentence. White space as punctuation. The one-line paragraph used for the landing beat. Plain conversational register, no polish. Concrete analogies drawn from the reader's own world rather than from marketing. Name the reader's inner objection before answering it. What does not carry: the crude language and the flexing.

**Then cut half.** The valuable version is short. Five pages of Google Doc reads as work to get through, and the reaction we want is "this was the most valuable thing I read this week," which is a function of density, not volume. TB v2 was 1,719 words, v3 is 1,203 with every section intact. What got cut was the second and third paragraph of each section, which were almost always restatement.

**Working rule:** two pages of prose plus the image tables. If a section needs three paragraphs, one of them is repeating the other two.

## Upgrades queued

Ratified and in force:

- **The horizon note** (2026-08-02, founder directive). Section above.

Proposed 2026-08-02, not yet ratified. Recorded so they do not evaporate:

1. **Page one stands alone.** Finding, evidence table, rebuild on page one. Everything else optional and below the fold.
2. **Falsifiability test on the finding.** If that exact sentence could be sent to another creator in the same niche, it is an observation and not a diagnosis. Rewrite until it only fits them.
3. **Name what we deliberately left alone.** One sentence. Selectivity reads as expertise and it keeps the asset from being a full audit that leaves nothing to buy.
4. **Send behind a tracked link.** The `/a/{token}` redirect and per-prospect view tracking are already live on pulsify-funnels. Sending the doc behind one tells us whether it was opened without asking the prospect anything.
5. **Outcome columns in the build log.** Sent date, opened, replied, what they said. Three real rows are worth more than another layout pass, and right now every asset in the library has zero reply data.

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

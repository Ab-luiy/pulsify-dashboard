# Prospect asset build: tb.tradez / TB Tradez, v4
# Founder steer 2026-08-02: a value asset is BUILT WORK, not a diagnosis with a framework attached.
# Observation gets four lines. Everything else is finished work he can pick up and use.
# Layout follows wiki/playbooks/prospect-asset-doc-standard.md. Fill in, do not redesign.

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

INK    = RGBColor(0x1A, 0x1A, 0x1A)
MUTED  = RGBColor(0x46, 0x4E, 0x5C)
ACCENT = RGBColor(0x4A, 0x53, 0xD9)
RULE, HEAD = "D5D5DD", "F2F3F7"
BODY, MONO = "Georgia", "Consolas"

SHOTS = r"C:\Users\Lenovoi\Desktop\Prospect Assets\tb-tradez"
OUT   = os.path.join(SHOTS, "tbtradez-built-for-you.docx")


def set_font(run, name=BODY, size=10.5, color=INK, bold=False, italic=False):
    run.font.name, run.font.size, run.font.color.rgb = name, Pt(size), color
    run.bold, run.italic = bold, italic
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts"); rpr.append(rf)
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rf.set(qn(a), name)


def spacing(p, before=0, after=7, line=1.22):
    pf = p.paragraph_format
    pf.space_before, pf.space_after, pf.line_spacing = Pt(before), Pt(after), line


def para(doc, text, size=10.5, color=INK, after=7, before=0, bold=False,
         italic=False, name=BODY, indent=0, line=1.22):
    p = doc.add_paragraph()
    spacing(p, before, after, line)
    if indent:
        p.paragraph_format.left_indent = Inches(indent)
    set_font(p.add_run(text), name, size, color, bold, italic)
    return p


def bottom_rule(p, color=RULE, sz=6):
    ppr = p._element.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr"); b = OxmlElement("w:bottom")
    b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz))
    b.set(qn("w:space"), "4"); b.set(qn("w:color"), color)
    bdr.append(b); ppr.append(bdr)


def shade(cell, fill):
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), fill)
    tcpr.append(shd)


def cell_border(cell, color=RULE, sz=4):
    tcpr = cell._tc.get_or_add_tcPr()
    bs = OxmlElement("w:tcBorders"); b = OxmlElement("w:bottom")
    b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz))
    b.set(qn("w:space"), "0"); b.set(qn("w:color"), color)
    bs.append(b); tcpr.append(bs)


def heading(doc, text):
    return para(doc, text, size=12.5, bold=True, before=14, after=3)


def dot(doc, text, after=3):
    return para(doc, text, size=10, after=after, indent=0.15, line=1.2)


def mono_line(doc, num, text):
    p = doc.add_paragraph()
    spacing(p, 8, 1, 1.18)
    if num:
        set_font(p.add_run(f"{num}.  "), BODY, 10.5, ACCENT, bold=True)
    set_font(p.add_run(text), MONO, 9.5, INK)
    return p


def sub_line(doc, text):
    return para(doc, text, size=9, color=MUTED, after=2, indent=0.22, line=1.18)


doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
sec.left_margin = sec.right_margin = Inches(1.2)
sec.top_margin = sec.bottom_margin = Inches(0.75)

normal = doc.styles["Normal"]
normal.font.name, normal.font.size, normal.font.color.rgb = BODY, Pt(10.5), INK
rpr = normal.element.get_or_add_rPr(); rf = OxmlElement("w:rFonts")
for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
    rf.set(qn(a), BODY)
rpr.append(rf)

# --- title + ease in ------------------------------------------------------
para(doc, "101,000 people watched. Then you checked your followers.",
     size=16, bold=True, after=2, line=1.1)
sub = para(doc, "Built for TB, August 2026. Everything below is finished work, not notes.",
           size=9, color=MUTED, after=12, line=1.2)
bottom_rule(sub)

para(doc, "Same feeling as a green day that does not really move your account. Something big "
          "happened, nothing changed.")
para(doc, "That reel did a hundred and one thousand views and you are at 2,243 followers. "
          "Everything you have not made yet is sitting in that gap. It is not a reach problem, "
          "it never was.")
para(doc, "So rather than write you a list of things that are wrong, I built the pieces out. "
          "Take whatever is useful and bin the rest.", after=12)

# --- what I noticed -------------------------------------------------------
heading(doc, "Four things, quickly")
dot(doc, "Your best reel is the one anybody could have made. Your best thinking, the 140 point "
         "read, did 1,141 views.")
dot(doc, "Four uploads, one photograph. Nobody who clicked the first has a reason to click the "
         "second.")
dot(doc, "The phone in those thumbnails reads 1:89, and they say $1,600,000 while the Bali one "
         "says $27,540. Take the numbers off entirely.")
dot(doc, "Liquidity, market structure and candlesticks are ICT. Your own idea, think in "
         "objectives, is buried at the end of a reel.", after=6)
para(doc, "That last one is what everything below is built on.", size=9, color=MUTED)

# --- the bio --------------------------------------------------------------
heading(doc, "Your bio, rewritten")
para(doc, "Yours currently promises free teaching and giveaways, which brings people who want "
          "free things. This one names a pain and a method, so it brings people who have the "
          "problem.", size=9, color=MUTED, after=6)
mono_line(doc, None, "19. nq futures.")
mono_line(doc, None, "i teach one thing: why price takes your stop before your target")
mono_line(doc, None, "the objectives method, free on youtube")
para(doc, "Keep the link. Point it at the channel once three of the videos below are up, not "
          "before.", size=9, color=MUTED, before=6)

# --- the six videos -------------------------------------------------------
heading(doc, "Six videos, with the outlines")
para(doc, "All from things you have already said on camera. Film these as the long form and cut "
          "the reels out of them, rather than making both separately.",
     size=9, color=MUTED, after=4)

videos = [
    ("think in objectives (the fix for getting stop hunted)",
     "Thumbnail: objective at your stop. Your chart, the higher timeframe gap marked below the "
     "stop, face small, hands empty.",
     ["Open on the moment: you got stopped, then it ran your way without you.",
      "Why it happened. Objectives sitting under your stop that price had to take first.",
      "The two questions before entry, walked through on one live chart."]),
    ("how i caught 140 points on nq before the open (step-by-step)",
     "Thumbnail: 9:31, one entry. Real chart, entry marked, nothing in your hands.",
     ["The bias before the open: swept sell side, bullish order flow, previous day and FOMC "
      "highs as draws.",
      "The 15 minute gap as the condition, and both ways you were prepared to trade it.",
      "The break of structure, the entry, the one to one, and what you would do differently."]),
    ("the 30 minute gap nobody has traded all cycle (full breakdown)",
     "Thumbnail: nobody traded this. The gap highlighted, nothing else in frame.",
     ["Everyone faded this setup because of the 30 minute gap underneath.",
      "Why you did not: this market has not manipulated into a single 30 minute gap all cycle.",
      "How to check that yourself before the open, so it is a rule rather than a feeling."]),
    ("$70 away from passing an eval, then this (full breakdown)",
     "Thumbnail: $70 short. The real eval screen, your own.",
     ["The trade that left you $70 short and what was going through your head.",
      "What you did next, honestly, including anything that made it worse.",
      "The rule you now have so it cannot happen the same way twice."]),
    ("why 90% fail, and it isn't discipline (full breakdown)",
     "Thumbnail: not discipline. At the desk, hood down, hands empty.",
     ["The usual answer, discipline, and why it explains nothing.",
      "What is actually happening: no defined objective, so every stop feels personal.",
      "The one change that fixes it, which is the same idea as video one, said differently."]),
    ("the 5 rules i'd give myself at 17 (step-by-step)",
     "Thumbnail: before my first eval. Being nineteen is the part nobody can copy off you.",
     ["Where you started and what you actually believed then.",
      "The five rules, one at a time, with the mistake each one came from.",
      "What you would skip entirely if you were starting today."]),
]
for i, (t, thumb, beats) in enumerate(videos, start=1):
    mono_line(doc, i, t)
    sub_line(doc, thumb)
    for b in beats:
        sub_line(doc, "  " + b)

# --- thumbnails rebuilt ---------------------------------------------------
heading(doc, "Your four current thumbnails, rebuilt")

LW, RW = Inches(3.85), Inches(2.25)
rows = [
    ("Liquidity Explained in Under 9 Mins",
     "Rebuild: your own chart with liquidity resting above and below, both marked, face in the "
     "bottom corner. One word: RESTING.",
     "yt-1FlbO1Xm4xE.jpg"),
    ("Market Structure",
     "Rebuild: two structure breaks side by side, one valid one not. Words: WHICH ONE COUNTS.",
     "yt-xyJ2LMZTldc.jpg"),
    ("How to Read Candlesticks",
     "Rebuild: three candles at real size, zoomed until they fill the frame. Words: JUST THESE "
     "THREE.",
     "yt-mVm6Dhz21hg.jpg"),
    ("Why 90% Fail",
     "Rebuild: you at the desk, hood down, hands empty, screen behind you. Words: NOT "
     "DISCIPLINE.",
     "yt-ouT5JtOJHQs.jpg"),
]
t = doc.add_table(rows=len(rows) + 1, cols=2)
t.alignment = WD_TABLE_ALIGNMENT.LEFT
t.autofit = False
hh = t.rows[0]
for c, label in zip(hh.cells, ("What to put there instead", "What is there now")):
    c.text = ""
    p = c.paragraphs[0]; spacing(p, 3, 3, 1.12)
    set_font(p.add_run(label), BODY, 9, MUTED, bold=True)
    shade(c, HEAD); cell_border(c)
hh.cells[0].width, hh.cells[1].width = LW, RW
for i, (title_text, note, img) in enumerate(rows, start=1):
    r = t.rows[i]
    left, right = r.cells[0], r.cells[1]
    left.text = ""
    p1 = left.paragraphs[0]; spacing(p1, 4, 2, 1.18)
    set_font(p1.add_run(title_text), BODY, 9.5, INK, bold=True)
    p2 = left.add_paragraph(); spacing(p2, 0, 4, 1.18)
    set_font(p2.add_run(note), BODY, 8.5, MUTED)
    right.text = ""
    p3 = right.paragraphs[0]; spacing(p3, 3, 3, 1.0)
    p3.add_run().add_picture(os.path.join(SHOTS, img), width=Inches(1.95))
    left.width, right.width = LW, RW
    cell_border(left); cell_border(right)

para(doc, "No numbers on any of them. A figure in your marketing brings people earning about a "
          "third of it, so $1,600,000 brings someone daydreaming about half a million who has "
          "never funded an account. $70 away from passing brings the person holding an evaluation "
          "right now, and he is your whole market.",
     size=9, color=MUTED, before=7)
para(doc, "Also drop \"TB Trading Concept\" off the end of the titles. It eats the characters "
          "that show in search.", size=9, color=MUTED)

# --- the story sequence ---------------------------------------------------
heading(doc, "A story sequence, written out")
para(doc, "Seven slides. Post it as one run. This is the version with nothing to sell in it, "
          "which is right for where you are, and it puts your own idea in front of people daily "
          "instead of once.", size=9, color=MUTED, after=6)

slides = [
    ("1", "you got stopped out.\nthen it ran straight to your target.\nwithout you.",
     "Your chart. The stop marked, and the move that happened after it."),
    ("2", "and you called it bad luck.\nor told yourself it was discipline.\nit was neither.",
     "Same chart, zoomed out one step. No text on the image."),
    ("3", "price is not hunting you.\nit is going somewhere.\nthe only question is where first.",
     "The higher timeframe gap sitting under your stop, circled."),
    ("4", "stop asking where your stop is.\nstart asking what is sitting at it.",
     "Plain slide, your text on a dark screenshot. This is the line people screenshot."),
    ("5", "1h gap under your stop.\nnothing above your target.\nprice has a reason to go down "
          "first.\nevery time.",
     "Both levels marked on one chart, stop and target labelled."),
    ("6", "so wait for that gap to get taken.\nthen take the long.\nsame setup. different odds.",
     "The entry after the manipulation, one to one marked."),
    ("7", "i put the full version on youtube.\nno email, no dm.\nit is just up there.",
     "Phone-raw shot of you at the desk, screen visible. Link sticker to the video."),
]
for n, text, photo in slides:
    p = doc.add_paragraph()
    spacing(p, 7, 1, 1.18)
    set_font(p.add_run(f"Slide {n}  "), BODY, 9.5, ACCENT, bold=True)
    set_font(p.add_run(text.replace("\n", "  /  ")), MONO, 9, INK)
    sub_line(doc, photo)

para(doc, "Slide 4 is the whole sequence. Everything before it earns it and everything after it "
          "proves it. If you only ever post one thing on repeat, post that line.",
     size=9, color=MUTED, before=7)

# --- the lead magnet ------------------------------------------------------
heading(doc, "The one page that would start your list")
para(doc, "You have 1,200 people in a room you do not own. This is the smallest thing that fixes "
          "that.", size=9, color=MUTED, after=6)
mono_line(doc, None, "the 4 questions i ask before every entry (one page, 30 seconds)")
sub_line(doc, "What is at my stop. What is at my target. Which timeframe owns each one. Has the "
              "nearer one been taken yet.")
sub_line(doc, "One page, your handwriting or a plain doc, no design needed. Given for an email, "
              "not a follow. Put it in the bio and at the end of every video.")

# --- where you could go differently --------------------------------------
heading(doc, "Where you could go differently")
para(doc, "Ask every person who joins the Discord what made them join, and write the answers "
          "down. Within a month you stop guessing which content works. Likes will not tell you "
          "this; the people who comment are almost never the people who buy.")
para(doc, "And the site is a checkout, not a funnel. Everything on it is a transaction and "
          "nothing on it captures anybody, so every visitor is borrowed. The one page above would "
          "sit better there than the giveaway does.")

# --- close ----------------------------------------------------------------
heading(doc, "Last thing")
para(doc, "Do not worry too much about the follower count. Keep the consistency you already have "
          "and it comes in time on its own. There are people at two or three thousand earning "
          "more than people at two hundred thousand, and the difference is never the size.")
para(doc, "Put some of this in and it should move quicker than it is moving now.", after=0)

doc.save(OUT)
print("saved:", OUT)
print("bytes:", os.path.getsize(OUT))

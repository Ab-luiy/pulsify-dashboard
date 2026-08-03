# Prospect asset build: lukextrades / Luke, v2
# Founder steer 2026-08-03: stop diagnosing. Value first. The stats read as pain and he already
# knows them, so they go at the end as a light sign we paid attention. Half the words.

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

INK    = RGBColor(0x1A, 0x1A, 0x1A)
MUTED  = RGBColor(0x46, 0x4E, 0x5C)
ACCENT = RGBColor(0x4A, 0x53, 0xD9)
RULE = "D5D5DD"
BODY, MONO = "Georgia", "Consolas"

SHOTS = r"C:\Users\Lenovoi\Desktop\Prospect Assets\lukextrades"
OUT   = os.path.join(SHOTS, "lukextrades-you-already-did-the-hard-part.docx")


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


def cell_border(cell, color=RULE, sz=4):
    tcpr = cell._tc.get_or_add_tcPr()
    bs = OxmlElement("w:tcBorders"); b = OxmlElement("w:bottom")
    b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz))
    b.set(qn("w:space"), "0"); b.set(qn("w:color"), color)
    bs.append(b); tcpr.append(bs)


def heading(doc, text):
    return para(doc, text, size=12.5, bold=True, before=14, after=3)


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

# --- title ----------------------------------------------------------------
para(doc, "you already did the hard part", size=16, bold=True, after=2, line=1.1)
sub = para(doc, "Built for Luke, August 2026. All of this is done, none of it is homework.",
           size=9, color=MUTED, after=12, line=1.2)
bottom_rule(sub)

# --- the pattern ----------------------------------------------------------
heading(doc, "Your best video already told you what to make next")
para(doc, "\"How I Passed a 50K Alpha Futures Zero Eval in 1 Trade.\" Seven minutes, and it is "
          "still your biggest.")
para(doc, "Three things are doing that work. A prop firm people already type into the search bar "
          "by name. A number. And \"in 1 trade,\" which is the impossible version of a thing that "
          "normally takes people weeks.")
para(doc, "It is also the same format that feeds the codes in your bio, which means the video "
          "that performs best and the thing that pays you are already the same video. You have "
          "made it once.", after=6)

vids = [
    ("how i passed a 50k fundednext eval in 2 days (every trade)",
     "Same shape, different firm. You have three codes and one video. This is the series."),
    ("how i passed a topone eval on the first attempt (step-by-step)",
     "Third firm, third video. Each one gets searched by name by people already about to buy."),
    ("i failed 3 evals before this one, here is what changed (full breakdown)",
     "The one nobody in the niche will make. Being the guy who publishes the failures is a "
     "position no amount of uploading can buy."),
    ("passing an eval in 1 trade vs 30 days, which actually holds (full data)",
     "Your own two approaches against each other. Your backtest calendar is the thumbnail and it "
     "has already outperformed everything else on the channel."),
    ("every trade i took to pass, all of them (step-by-step)",
     "The calendar screenshot again. Nobody shows the whole month including the red days."),
]
for i, (t, d) in enumerate(vids, start=1):
    mono_line(doc, i, t)
    sub_line(doc, d)

para(doc, "The recaps can stay if you enjoy them. \"NQ Trade Recap - July 29 - 10am Po3 + 5m "
          "Cont\" just cannot do this job, because nobody searches a date.",
     size=9, color=MUTED, before=7)

# --- thumbnails -----------------------------------------------------------
heading(doc, "One readable thing per thumbnail")

LW, RW = Inches(3.85), Inches(2.25)
rows = [
    ("This is your whole screen.",
     "Browser tabs, the address bar, the Ask Gemini button, the watchlist with Bitcoin in it. At "
     "the size it actually appears, none of it can be read.",
     "yt-vobnj3gOYrU.jpg"),
    ("Same again, Discord tab included.",
     "The one thing legible at thumbnail size is the banner along the bottom, which is an advert "
     "for three prop firms.",
     "yt-ymp2l0wGXdw.jpg"),
    ("This one outperformed everything around it.",
     "A few large green numbers, one red. Nothing else in frame.",
     "yt-9WL6DWwoZ0E.jpg"),
]
t = doc.add_table(rows=len(rows), cols=2)
t.alignment = WD_TABLE_ALIGNMENT.LEFT
t.autofit = False
for i, (title_text, note, img) in enumerate(rows):
    left, right = t.rows[i].cells[0], t.rows[i].cells[1]
    left.text = ""
    p1 = left.paragraphs[0]; spacing(p1, 5, 2, 1.18)
    set_font(p1.add_run(title_text), BODY, 9.5, INK, bold=True)
    p2 = left.add_paragraph(); spacing(p2, 0, 5, 1.18)
    set_font(p2.add_run(note), BODY, 8.5, MUTED)
    right.text = ""
    p3 = right.paragraphs[0]; spacing(p3, 4, 4, 1.0)
    p3.add_run().add_picture(os.path.join(SHOTS, img), width=Inches(1.95))
    left.width, right.width = LW, RW
    cell_border(left); cell_border(right)

para(doc, "Crop to the one element that matters, lose the browser chrome, and put your face in a "
          "corner. There is not a single face anywhere on the channel.", before=7)

# --- the landing page -----------------------------------------------------
heading(doc, "Your 1 on 1 page, rewritten")
para(doc, "Yours lists six deliverables that every mentorship page in the niche lists. Same "
          "offer, written from the buyer's side.", size=9, color=MUTED, after=6)

mono_line(doc, None, "for the trader who keeps failing evals with a strategy that already works")
sub_line(doc, "Three months, one on one, with someone trading the same instrument you are.")
sub_line(doc, "")
sub_line(doc, "A weekly call where we go through your trades, not mine.")
sub_line(doc, "You can message me before you take it, instead of after you blow the account.")
sub_line(doc, "Every trade reviewed, including the ones you would rather not show me.")
sub_line(doc, "A written plan every week, and somebody who notices when you ignore it.")
sub_line(doc, "The part where we work out why you keep breaking your own rules.")

para(doc, "Three things it still needs that only you have. Your funded screenshots, dated, "
          "numbers visible. The price on the page rather than after an email. And one line "
          "naming who it is not for, because a page that turns nobody away reads like it will "
          "take anybody.", size=9, color=MUTED, before=7)

# --- the linktree ---------------------------------------------------------
heading(doc, "Your Linktree, reordered")
mono_line(doc, None, "1  apply to work 1 on 1 with me")
mono_line(doc, None, "2  join the free discord")
mono_line(doc, None, "3  my youtube, daily uploads")
mono_line(doc, None, "4  prop firm discounts, code LUKEX")
mono_line(doc, None, "5  instagram, tiktok, x")
para(doc, "The three firm links become one. As three separate rows the page reads as an "
          "affiliate hub with a mentorship attached rather than the other way round, and the "
          "application is currently eighth. Same on Instagram, where five of the seven highlights "
          "are other companies' logos.", size=9, color=MUTED, before=6)

# --- close ----------------------------------------------------------------
heading(doc, "Last thing")
para(doc, "Forty four uploads a week is the part almost nobody sticks at, and it is the one "
          "thing here that cannot be taught or bought. None of the above asks you to make more. "
          "It is all pointing the same output at something that compounds.")
para(doc, "One more, and it costs nothing: ask everyone who joins the Discord what made them "
          "join, and write it down. Within a month you stop guessing which of the videos is "
          "doing the work.", after=0)

doc.save(OUT)
print("saved:", OUT)
print("bytes:", os.path.getsize(OUT))

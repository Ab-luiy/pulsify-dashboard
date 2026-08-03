# Prospect asset build: tb.tradez / TB Tradez, v3
# Founder steers 2026-08-02: framework-led, Ben Bader easing-in voice, HALF the length.
# Layout layer follows wiki/playbooks/prospect-asset-doc-standard.md. Fill in, do not redesign.

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
REFS  = r"C:\Users\Lenovoi\Downloads\Pulsify-Brain\raw-sources\inspiration\thumbnail-retouch-references"
OUT   = os.path.join(SHOTS, "tbtradez-the-conversion-job.docx")


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


def no_borders(table):
    bs = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement("w:" + edge); e.set(qn("w:val"), "none"); bs.append(e)
    table._tbl.tblPr.append(bs)


def heading(doc, text):
    return para(doc, text, size=12.5, bold=True, before=13, after=3)


def rebuild(doc, num, title_text, direction_text):
    p = doc.add_paragraph()
    spacing(p, 8, 1, 1.18)
    set_font(p.add_run(f"{num}.  "), BODY, 10.5, ACCENT, bold=True)
    set_font(p.add_run(title_text), MONO, 9.5, INK)
    para(doc, direction_text, size=9, color=MUTED, after=7, indent=0.22, line=1.18)


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
sub = para(doc, "Built for TB, August 2026, from your reels, your uploads, your own words on "
                "camera and tbtradez.com.", size=9, color=MUTED, after=12, line=1.2)
bottom_rule(sub)

para(doc, "Same feeling as a green day that does not really move your account. Something big "
          "happened, nothing changed.")
para(doc, "A hundred and one thousand people sat through that reel and you have 2,243 followers. "
          "Everything you have not made yet is sitting in the gap between those two numbers, so "
          "it is worth knowing exactly where it goes.")

# --- the frame + math -----------------------------------------------------
heading(doc, "Content does two jobs. You built one.")
para(doc, "Getting found is the first job, and you are good at it. Most people never make "
          "anything that reaches a hundred thousand strangers.")
para(doc, "Turning them into people who pay you is a separate job, on separate surfaces, and "
          "being excellent at the first one does nothing for it.")
para(doc, "Here is the part worth sitting with. Take ten thousand followers: roughly three "
          "thousand know who you are, eight hundred know your name, a hundred trust you, eighteen "
          "ever pay. Five per cent is the ceiling on any audience.")
para(doc, "Run 2,243 through that and you get about four people who would pay you today.")
para(doc, "That is the real reason your money currently comes from discount codes. There is "
          "nobody else in there yet. And another hundred thousand views does not move that "
          "number, it only widens the top.")

# --- the five assets ------------------------------------------------------
heading(doc, "Five things do the converting")
para(doc, "Every dollar a creator collects arrives through one of these. Running one is not a "
          "system. The system is all five going at once for months.", size=9, color=MUTED, after=6)

L, R = Inches(2.0), Inches(4.1)
assets = [
    ("Story sequences", "Not running. The asset that does most of the work: daily, closes, "
                        "qualifies people before they ever message you."),
    ("A lead magnet",   "Not running. A discount code and a giveaway capture nobody."),
    ("A conversion surface", "Not running. Your channel is trying to be broad and deep at once."),
    ("Proof content",   "Not running. Every number on the account is your own. Not one student "
                        "result anywhere."),
    ("Email",           "Not running. Discord is your whole owned layer, and Discord owns it."),
]
at = doc.add_table(rows=len(assets) + 1, cols=2)
at.alignment = WD_TABLE_ALIGNMENT.LEFT
at.autofit = False
h = at.rows[0]
for c, label in zip(h.cells, ("The asset", "Where you are")):
    c.text = ""
    p = c.paragraphs[0]; spacing(p, 3, 3, 1.12)
    set_font(p.add_run(label), BODY, 9, MUTED, bold=True)
    shade(c, HEAD); cell_border(c)
h.cells[0].width, h.cells[1].width = L, R
for i, (name, state) in enumerate(assets, start=1):
    r = at.rows[i]
    for c, txt, bold, size in ((r.cells[0], name, True, 9.5), (r.cells[1], state, False, 9)):
        c.text = ""
        p = c.paragraphs[0]; spacing(p, 3, 3, 1.18)
        set_font(p.add_run(txt), BODY, size, INK if bold else MUTED, bold)
        cell_border(c)
    r.cells[0].width, r.cells[1].width = L, R

para(doc, "Zero of five. Which sounds worse than it is, because none of it needs more reach and "
          "none of it needs you to be a better trader. You already cleared the hard part.",
     before=7)
para(doc, "It also explains the Discord CTA. Trust runs admirable, likeable, credible, trustable, "
          "and only the last one buys. That reel earned admirable and then asked at stage one.")

# --- the thumbnails -------------------------------------------------------
heading(doc, "Your last four uploads")

LW, RW = Inches(3.85), Inches(2.25)
rows = [
    ("Liquidity Explained in Under 9 Mins", "0 views.", "yt-1FlbO1Xm4xE.jpg"),
    ("Market Structure", "69 views. Same photograph.", "yt-xyJ2LMZTldc.jpg"),
    ("How to Read Candlesticks", "220 views. Same photograph.", "yt-mVm6Dhz21hg.jpg"),
    ("Why 90% Fail", "133 views. Same photograph.", "yt-ouT5JtOJHQs.jpg"),
]
t = doc.add_table(rows=len(rows) + 1, cols=2)
t.alignment = WD_TABLE_ALIGNMENT.LEFT
t.autofit = False
hh = t.rows[0]
for c, label in zip(hh.cells, ("Your title", "What all four look like")):
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
    set_font(p2.add_run(note), BODY, 8.5, MUTED, italic=True)
    right.text = ""
    p3 = right.paragraphs[0]; spacing(p3, 3, 3, 1.0)
    p3.add_run().add_picture(os.path.join(SHOTS, img), width=Inches(1.95))
    left.width, right.width = LW, RW
    cell_border(left); cell_border(right)

para(doc, "One picture, four videos. Nobody who clicked the first has a reason to click the "
          "second. The phone also reads 1:89, and those four say $1,600,000 while the Bali one "
          "says $27,540.", before=7)
para(doc, "The fix is not better numbers. It is no numbers, and not because they look "
          "unrealistic. Because of who they bring.")
para(doc, "A number in your marketing pulls in people earning about a third of it. $1,600,000 "
          "brings someone daydreaming about half a million who has never funded an account. "
          "\"$70 away from passing an eval\" brings the person who is $70 away from passing an "
          "eval, and he is your entire market.")
para(doc, "Your face in those images is real and unretouched. That is the asset. The reel that "
          "reached a hundred thousand people had nothing in frame but you talking.")

# --- category of one ------------------------------------------------------
heading(doc, "The big one: whose method is this")
para(doc, "Liquidity, market structure, candlesticks are ICT, and hundreds of channels already "
          "own them. Your site says ICT strategy. Your reel closes with follow to learn "
          "everything I know about ICT. So the channel is building an audience for somebody "
          "else's method.")
para(doc, "The thing that is actually yours is sitting at the end of a reel with nothing attached "
          "to it. Think in objectives. Do not ask where your stop is, ask what objectives sit at "
          "your stop against what sits at your target, and wait for the higher timeframe one to "
          "get taken first.")
para(doc, "Name it. Teach it. Repeat it long past the point it bores you, because the day you are "
          "sick of saying it is roughly the day other people start saying it back.")
para(doc, "Nobody has ever paid for liquidity explained. They pay for the specific way one person "
          "sees it.")

# --- the videos -----------------------------------------------------------
heading(doc, "Six you could make")
para(doc, "All from things you have already said on camera. Film these as the long form and cut "
          "the reels out of them, rather than making both separately.",
     size=9, color=MUTED, after=6)

rebuild(doc, 1, "think in objectives (the fix for getting stop hunted)",
        "Thumbnail: objective at your stop. Your idea, named, first. Everything else points back "
        "at this one.")
rebuild(doc, 2, "how i caught 140 points on nq before the open (step-by-step)",
        "Thumbnail: 9:31, one entry. Real chart, entry marked, face small in the corner, nothing "
        "in your hands.")
rebuild(doc, 3, "the 30 minute gap nobody has traded all cycle (full breakdown)",
        "Thumbnail: nobody traded this. Your strongest opinion, currently thirty seconds long.")
rebuild(doc, 4, "$70 away from passing an eval, then this (full breakdown)",
        "Thumbnail: $70 short. The real eval screen. A number you can stand behind, aimed at the "
        "person holding an evaluation right now.")
rebuild(doc, 5, "why 90% fail, and it isn't discipline (full breakdown)",
        "Thumbnail: not discipline. At the desk, hood down, hands empty. Same topic, with a turn "
        "on it and a picture that is not the other four.")
rebuild(doc, 6, "the 5 rules i'd give myself at 17 (step-by-step)",
        "Thumbnail: before my first eval. Being nineteen is the part nobody can copy off you.")

para(doc, "The four already up do not need deleting. Four different pictures, and titles without "
          "\"TB Trading Concept\" on the end, which eats the characters that show in search.",
     size=9, color=MUTED, before=7)

# --- references -----------------------------------------------------------
heading(doc, "What that looks like elsewhere")
para(doc, "Two from other channels, untouched. Same move in both: the proof is the picture and "
          "the text stays out of the way.", size=9, color=MUTED, after=6)

ref_rows = [
    ("XQB7y00msmc-HD.jpg",
     "Screen recording. The figures are the biggest thing in the frame, the face sits in the "
     "corner. No headline, no arrows, nothing added."),
    ("KnbqLjGzD3k-HD.jpg",
     "No numbers anywhere. The question the video answers is just written on the picture. Quiet "
     "works in this niche."),
]
rt = doc.add_table(rows=len(ref_rows), cols=2)
rt.alignment = WD_TABLE_ALIGNMENT.LEFT
rt.autofit = False
no_borders(rt)
for i, (f, cap) in enumerate(ref_rows):
    lc, rc = rt.rows[i].cells[0], rt.rows[i].cells[1]
    lc.text = ""
    p1 = lc.paragraphs[0]; spacing(p1, 4, 4, 1.0)
    p1.add_run().add_picture(os.path.join(REFS, f), width=Inches(2.5))
    rc.text = ""
    p2 = rc.paragraphs[0]; spacing(p2, 4, 4, 1.18)
    set_font(p2.add_run(cap), BODY, 8.5, MUTED)
    lc.width, rc.width = Inches(2.65), Inches(3.45)

# --- site + the question --------------------------------------------------
heading(doc, "Two quick ones")
para(doc, "Your site is a checkout, not a funnel. Every thing on it is a transaction and nothing "
          "on it captures anybody, so every visitor is borrowed and you lose the lot the day a "
          "platform decides something about one of your accounts.")
para(doc, "And you have 1,200 people in that Discord who each joined because of one specific "
          "thing they watched. You have never asked them which one. Ask, keep asking, write the "
          "answers down, and inside a month you stop guessing what works. Likes will not tell you "
          "this; the people who comment are almost never the people who buy.")

# --- close ----------------------------------------------------------------
heading(doc, "Last thing")
para(doc, "Do not worry too much about the follower count. Keep the consistency you already have "
          "and it comes in time on its own. There are people at two or three thousand earning "
          "more than people at two hundred thousand, and the difference is never the size.")
para(doc, "Put some of this in and it should move quicker than it is moving now.", after=0)

doc.save(OUT)
print("saved:", OUT)
print("bytes:", os.path.getsize(OUT))

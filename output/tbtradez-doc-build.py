# Prospect asset build: tb.tradez / TB Tradez, v2
# Framework-led per founder steer 2026-08-02: bird's eye first, our frameworks, authority voice.
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


def spacing(p, before=0, after=8, line=1.25):
    pf = p.paragraph_format
    pf.space_before, pf.space_after, pf.line_spacing = Pt(before), Pt(after), line


def para(doc, text, size=10.5, color=INK, after=8, before=0, bold=False,
         italic=False, name=BODY, indent=0, line=1.25):
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
    return para(doc, text, size=12.5, bold=True, before=15, after=3)


def rebuild(doc, num, title_text, direction_text):
    p = doc.add_paragraph()
    spacing(p, 9, 1, 1.2)
    set_font(p.add_run(f"{num}.  "), BODY, 10.5, ACCENT, bold=True)
    set_font(p.add_run(title_text), MONO, 9.5, INK)
    para(doc, direction_text, size=9, color=MUTED, after=8, indent=0.22, line=1.2)


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
para(doc, "You built the traffic. You never built the conversion.",
     size=16, bold=True, after=2, line=1.1)
sub = para(doc, "Built for TB from his account, his uploads, his transcripts and tbtradez.com. "
                "August 2026.", size=9, color=MUTED, after=13, line=1.2)
bottom_rule(sub)

# --- the frame ------------------------------------------------------------
heading(doc, "There are two jobs, not one")
para(doc, "Content does two separate jobs and most people only ever build the first. Traffic "
          "content gets you found. Conversion content turns the people who found you into people "
          "who buy from you. They are different formats, different frequencies, different "
          "surfaces, and being excellent at one does nothing for the other.")
para(doc, "One reel of yours did 101,000 views. You have 2,243 followers. That is not a reach "
          "problem and it never was. It is the clearest version of the traffic job running "
          "without the conversion job existing, and it is the single most common way a good "
          "trader stays broke.", after=13)

# --- the math -------------------------------------------------------------
heading(doc, "The math on an audience your size")
para(doc, "Operators who have run this at scale describe the same decomposition. Of ten thousand "
          "followers, roughly three thousand know who you are, eight hundred know your name, one "
          "hundred trust you, and eighteen will ever pay you. The ceiling is about five per cent "
          "of any audience, and one per cent is already good.")
para(doc, "Scaled to 2,243, that is somewhere near four people who would pay you today. Four. "
          "That is not pessimism, it is why the affiliate codes and the free room are where your "
          "money currently is: you do not yet have enough people at the trust stage to sell "
          "anything else to.")
para(doc, "Another hundred thousand views does not change that number. Moving people down the "
          "stages does. Everything below is about that.")

# --- the five assets ------------------------------------------------------
heading(doc, "The five things that convert, and where you are on them")
para(doc, "Every dollar a creator collects comes through one of five assets. One of them is not "
          "a system. The system is what happens when all five run at once, for months.",
     size=9, color=MUTED, after=6)

CONTENT_L, CONTENT_R = Inches(2.05), Inches(4.05)
assets = [
    ("Story sequences",
     "Not running. Three highlights, none of them a sequence. This is the asset that does most "
     "of the work: daily, closes, qualifies for you before anyone speaks to you."),
    ("A personalized lead magnet",
     "Not running. The site offers a discount code and a giveaway. Neither captures an email, so "
     "nothing you have built is yours to keep."),
    ("A conversion surface",
     "Not running. Your main channel is trying to be broad and deep at once, so it is neither."),
    ("Proof content",
     "Not running. Every number on your account is your own claimed number. There is not one "
     "student result anywhere."),
    ("Email",
     "Not running. Discord is your entire owned layer, and Discord owns it, not you."),
]
at = doc.add_table(rows=len(assets) + 1, cols=2)
at.alignment = WD_TABLE_ALIGNMENT.LEFT
at.autofit = False
hdr = at.rows[0]
for c, label in zip(hdr.cells, ("The asset", "Where you are")):
    c.text = ""
    p = c.paragraphs[0]; spacing(p, 3, 3, 1.15)
    set_font(p.add_run(label), BODY, 9, MUTED, bold=True)
    shade(c, HEAD); cell_border(c)
hdr.cells[0].width, hdr.cells[1].width = CONTENT_L, CONTENT_R
for i, (name, state) in enumerate(assets, start=1):
    r = at.rows[i]
    for c, txt, bold, size in ((r.cells[0], name, True, 9.5), (r.cells[1], state, False, 9)):
        c.text = ""
        p = c.paragraphs[0]; spacing(p, 4, 4, 1.2)
        set_font(p.add_run(txt), BODY, size, INK if bold else MUTED, bold)
        cell_border(c)
    r.cells[0].width, r.cells[1].width = CONTENT_L, CONTENT_R

para(doc, "Zero of five. That is the whole audit, and it is also good news, because nothing on "
          "that list requires more reach and none of it requires you to be a better trader.",
     size=9, color=MUTED, before=7, after=4)

# --- trust stages ---------------------------------------------------------
heading(doc, "You are asking at the wrong stage")
para(doc, "Trust is built in an order and the order cannot be skipped. People find you admirable, "
          "then likeable, then credible, then trustable. Only the last one buys. Almost everyone "
          "sells at stage one, and it falls flat, and they blame the offer.")
para(doc, "Your 101,000 reel got you admirable. The ask on it was join the free Discord, at stage "
          "one, from a stranger who had watched you for thirty seconds. It converted about the "
          "number you would expect. The two stages in the middle are built by proof and by "
          "repetition, and right now you own neither.")

# --- the thumbnails -------------------------------------------------------
heading(doc, "Your last four uploads")

LEFT_W, RIGHT_W = Inches(3.85), Inches(2.25)
rows = [
    ("Liquidity Explained in Under 9 Mins", "0 views.", "yt-1FlbO1Xm4xE.jpg"),
    ("Market Structure", "69 views. Same photograph.", "yt-xyJ2LMZTldc.jpg"),
    ("How to Read Candlesticks", "220 views. Same photograph.", "yt-mVm6Dhz21hg.jpg"),
    ("Why 90% Fail", "133 views. Same photograph.", "yt-ouT5JtOJHQs.jpg"),
]
t = doc.add_table(rows=len(rows) + 1, cols=2)
t.alignment = WD_TABLE_ALIGNMENT.LEFT
t.autofit = False
h = t.rows[0]
for c, label in zip(h.cells, ("Your title", "What all four look like")):
    c.text = ""
    p = c.paragraphs[0]; spacing(p, 3, 3, 1.15)
    set_font(p.add_run(label), BODY, 9, MUTED, bold=True)
    shade(c, HEAD); cell_border(c)
h.cells[0].width, h.cells[1].width = LEFT_W, RIGHT_W
for i, (title_text, note, img) in enumerate(rows, start=1):
    r = t.rows[i]
    left, right = r.cells[0], r.cells[1]
    left.text = ""
    p1 = left.paragraphs[0]; spacing(p1, 5, 2, 1.2)
    set_font(p1.add_run(title_text), BODY, 9.5, INK, bold=True)
    p2 = left.add_paragraph(); spacing(p2, 0, 5, 1.2)
    set_font(p2.add_run(note), BODY, 8.5, MUTED, italic=True)
    right.text = ""
    p3 = right.paragraphs[0]; spacing(p3, 4, 4, 1.0)
    p3.add_run().add_picture(os.path.join(SHOTS, img), width=Inches(1.95))
    left.width, right.width = LEFT_W, RIGHT_W
    cell_border(left); cell_border(right)

para(doc, "One picture, four videos, so nobody who clicked the first has a reason to click the "
          "second. The phone reads 1:89, which is not a time, and the four say $1,600,000 while "
          "the Bali one says $27,540. Drop the numbers off the thumbnails entirely.",
     size=9, color=MUTED, before=7, after=8)
para(doc, "The reason to drop them is not that they look unrealistic, although they do. It is "
          "who they attract. A promised number pulls in people earning about a third of it, so "
          "$1,600,000 pulls in someone imagining half a million and nobody who is actually "
          "trading. \"$70 away from passing an eval\" pulls in the person who is $70 away from "
          "passing an eval, and that person is your entire market.")
para(doc, "Your face in those images is real and unretouched. That is the part worth keeping. "
          "Your own numbers already agree with this: the reel that reached a hundred thousand "
          "people has no money in the frame at all.")

# --- long form ------------------------------------------------------------
heading(doc, "Long form is the master asset and you have it backwards")
para(doc, "The people who make this work do not make reels and separately make videos. They film "
          "the long form first, then everything else is cut out of it. The reels, the story "
          "slides, the highlights and the proof posts all come out of one recording, which is why "
          "their output looks consistent and takes them less time than yours takes you.")
para(doc, "You are already shipping long form on schedule, which is the part most people never "
          "manage. Seventeen minutes on market structure, thirteen on candlesticks, inside two "
          "weeks. Point the reels at it and the whole account starts pulling in one direction.")

# --- category of one ------------------------------------------------------
heading(doc, "You are building an audience for somebody else's method")
para(doc, "Liquidity, market structure, candlesticks. Those are ICT concepts and hundreds of "
          "channels already own them. Your site says ICT strategy, your reel closes with follow "
          "to learn everything I know about ICT. Every video you publish is competing against "
          "people who have taught that exact concept for years, and none of it belongs to you.")
para(doc, "Your own idea is sitting at the end of a reel with nothing attached. Think in "
          "objectives: do not ask where your stop is, ask what objectives exist at your stop "
          "against what exists at your target, and wait for the higher timeframe one to be taken "
          "first. Name that, teach it, repeat it far past the point it bores you, and it stops "
          "being a tip and becomes the reason someone chooses you over the other four hundred "
          "people teaching liquidity.")
para(doc, "That is also the only thing anyone ever pays for. Nobody buys liquidity explained. "
          "They buy the specific way you see it, which they cannot get anywhere else.")

# --- the videos -----------------------------------------------------------
heading(doc, "Six that would do the job")
para(doc, "All of these come from something you have already said on camera. Nothing here needs "
          "a new idea.", size=9, color=MUTED, after=6)

rebuild(doc, 1, "think in objectives (the fix for getting stop hunted)",
        "Thumbnail: objective at your stop. Your chart, the higher timeframe gap marked below the "
        "stop. Your idea, named, first. Every other video should point back at this one.")
rebuild(doc, 2, "how i caught 140 points on nq before the open (step-by-step)",
        "Thumbnail: 9:31, one entry. The real chart with your entry marked, face small in the "
        "corner. Nothing in your hands.")
rebuild(doc, 3, "the 30 minute gap nobody has traded all cycle (full breakdown)",
        "Thumbnail: nobody traded this. The gap highlighted and nothing else in frame. The "
        "strongest opinion you have voiced, and it is currently thirty seconds long.")
rebuild(doc, 4, "$70 away from passing an eval, then this (full breakdown)",
        "Thumbnail: $70 short. The real eval screen. A number you can stand behind beats one you "
        "cannot, and it attracts the person actually holding an evaluation.")
rebuild(doc, 5, "why 90% fail, and it isn't discipline (full breakdown)",
        "Thumbnail: not discipline. You at the desk, hood down, hands empty. Same topic you "
        "published, with a turn on it and a picture that is not the other four.")
rebuild(doc, 6, "the 5 rules i'd give myself at 17 (step-by-step)",
        "Thumbnail: before my first eval. Your reach audience already told you they want this, "
        "and being nineteen is the part nobody can copy off you.")

para(doc, "The four already up do not need deleting. Four different pictures and titles without "
          "\"TB Trading Concept\" on the end, which eats the characters that show in search and "
          "adds nothing.", size=9, color=MUTED, before=8, after=4)

# --- references -----------------------------------------------------------
heading(doc, "What this looks like elsewhere")
para(doc, "Three from other channels, untouched. The same two moves in all of them: the proof is "
          "the picture, and the text stays out of the way.",
     size=9, color=MUTED, after=8)

ref_rows = [
    ("XQB7y00msmc-HD.jpg",
     "Screen recording. The figures are the biggest thing in the frame and the face sits in the "
     "corner. No headline, no arrows, nothing added."),
    ("3QDKzi4nFl8-HD.jpg",
     "Real desk, real window, two real people mid-work. One short line across the top and a "
     "label on each of them. Nothing staged, no lifestyle in shot."),
    ("KnbqLjGzD3k-HD.jpg",
     "Same two traders, and no numbers anywhere. The question the video answers is just written "
     "on the picture. Quiet works in this niche."),
]
rt = doc.add_table(rows=len(ref_rows), cols=2)
rt.alignment = WD_TABLE_ALIGNMENT.LEFT
rt.autofit = False
no_borders(rt)
for i, (f, cap) in enumerate(ref_rows):
    lc, rc = rt.rows[i].cells[0], rt.rows[i].cells[1]
    lc.text = ""
    p1 = lc.paragraphs[0]; spacing(p1, 5, 5, 1.0)
    p1.add_run().add_picture(os.path.join(REFS, f), width=Inches(2.55))
    rc.text = ""
    p2 = rc.paragraphs[0]; spacing(p2, 5, 5, 1.2)
    set_font(p2.add_run(cap), BODY, 8.5, MUTED)
    lc.width, rc.width = Inches(2.7), Inches(3.4)

# --- the site -------------------------------------------------------------
heading(doc, "The site is a checkout, not a funnel")
para(doc, "Everything on tbtradez.com is a transaction. A code, a giveaway, a free room. There is "
          "no capture layer anywhere on it, which means every visitor you send there is borrowed "
          "and you lose all of them the day a platform decides something about your account.")
para(doc, "It is also the wrong ask for who is arriving. Someone who watched thirty seconds of a "
          "reel is not ready to open a funded account under your code. The page that should sit "
          "there gives them something specific to their own situation, takes an email for it, and "
          "lets the follow-up do the work the page cannot.")

# --- the ask people never make -------------------------------------------
heading(doc, "One question you are not asking")
para(doc, "There are 1,200 people in your Discord. Every one of them moved for a reason, and "
          "usually because of one specific piece of content. Ask them what made them join, ask "
          "everyone who ever pays you the same thing, and write the answers down. Inside a month "
          "you stop guessing which content does the work.")
para(doc, "Likes and comments will not tell you this. The people who engage are almost never the "
          "people who buy, which is why engagement is the worst signal on the platform and buyer "
          "answers are the best one.")

# --- horizon note ---------------------------------------------------------
heading(doc, "One last thing")
para(doc, "Do not worry too much about the follower count. Keep the consistency you already have "
          "and it comes in time, on its own. Followers have never been what gates this: there are "
          "people at two or three thousand earning more than people at two hundred thousand, and "
          "the difference is always the conversion side, never the size.")
para(doc, "If you put the things above in, you should see it move faster than it is moving now.",
     after=0)

doc.save(OUT)
print("saved:", OUT)
print("bytes:", os.path.getsize(OUT))

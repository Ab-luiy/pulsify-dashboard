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

# --- references -----------------------------------------------------------
para(doc, "Two from other channels, untouched, so you can see what that looks like when "
          "somebody does it properly.", size=9, color=MUTED, before=10, after=6)

refs = [
    ("XQB7y00msmc-HD.jpg",
     "Also a screen recording, same as yours. The figures are the biggest thing in the frame, "
     "the face sits small in a corner, and nothing has been added on top. No headline, no "
     "arrows, no banner. This is the tidy version of what you are already making."),
    ("KnbqLjGzD3k-HD.jpg",
     "No numbers anywhere. Two real faces in a real room, and the question the video answers "
     "written straight onto the picture. Quiet works in this niche, and there is not one face on "
     "your channel."),
]
REFS = r"C:\Users\Lenovoi\Downloads\Pulsify-Brain\raw-sources\inspiration\thumbnail-retouch-references"
rt = doc.add_table(rows=len(refs), cols=2)
rt.alignment = WD_TABLE_ALIGNMENT.LEFT
rt.autofit = False
bs = OxmlElement("w:tblBorders")
for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
    e = OxmlElement("w:" + edge); e.set(qn("w:val"), "none"); bs.append(e)
rt._tbl.tblPr.append(bs)
for i, (f, cap) in enumerate(refs):
    lc, rc = rt.rows[i].cells[0], rt.rows[i].cells[1]
    lc.text = ""
    p1 = lc.paragraphs[0]; spacing(p1, 5, 5, 1.0)
    p1.add_run().add_picture(os.path.join(REFS, f), width=Inches(2.5))
    rc.text = ""
    p2 = rc.paragraphs[0]; spacing(p2, 5, 5, 1.18)
    set_font(p2.add_run(cap), BODY, 8.5, MUTED)
    lc.width, rc.width = Inches(2.65), Inches(3.45)

# --- the landing page -----------------------------------------------------
heading(doc, "Your 1 on 1 page needs replacing, not rewriting")
para(doc, "The Carrd page has no video, no proof, no price and no form. \"Apply here\" opens an "
          "email, which means every application you have ever had left no record, no follow up "
          "and no way to know who was interested and went quiet.")
para(doc, "It also asks a stranger to commit to three months on the strength of six bullets they "
          "have read on every other mentorship page in the niche. Nothing on it proves you can "
          "teach, which is a different thing from proving you can trade, and it is the thing "
          "being bought.")
para(doc, "What belongs there instead is a video page with the application inside it. Top to "
          "bottom:", after=6)

page = [
    ("Headline", "How I passed a 50K Alpha Futures eval in one trade, and how I teach it. Lead "
                 "with the real result, not the product name. You already have the result."),
    ("One line under it", "Who this is for. \"For traders who keep failing evals with a strategy "
                          "that already works.\""),
    ("The video", "Large, immediately, nothing above it except the headline. Six to twelve "
                  "minutes."),
    ("The form", "Embedded directly under the video, on the page. Not an email address. This is "
                 "the piece that changes everything, because it gives you a record of every "
                 "person who was interested."),
    ("Proof", "Underneath the form. Your funded screenshots to start, student results as they "
              "arrive. If there is nothing yet, the section stays off rather than announcing the "
              "gap."),
    ("The same button again", "One destination, repeated. Never a second offer."),
]
for label, note in page:
    p = doc.add_paragraph()
    spacing(p, 6, 1, 1.18)
    set_font(p.add_run(label + ".  "), BODY, 9.5, ACCENT, bold=True)
    set_font(p.add_run(note), BODY, 9, MUTED)

para(doc, "The video, six beats", size=10, bold=True, before=11, after=3)
sub_line(doc, "1. The result, who it is for, and how it works. In that order, in the first "
              "minute. Not your background.")
sub_line(doc, "2. The exact frustration. Passing sim, failing funded. The strategy works and the "
              "account still dies.")
sub_line(doc, "3. Why that happens and what you do differently. Let them judge the logic, not "
              "the claim.")
sub_line(doc, "4. Proof. Result first, backstory second. Never the other way round.")
sub_line(doc, "5. What they get, who it is for, and what it costs. Say the price out loud. "
              "Anyone still watching at that point can hear it.")
sub_line(doc, "6. One instruction: fill in the form below.")

para(doc, "The form, six questions", size=10, bold=True, before=11, after=3)
sub_line(doc, "What are you trading now, and for how long. How many evals have you taken and "
              "what happened. What is the strategy you are running. What do you think is "
              "actually going wrong. What can you invest in fixing it. How soon do you want to "
              "start.")
para(doc, "Those six do the filtering so you are not spending an hour on somebody who was never "
          "going to buy, and the answers tell you what to say on the call before it starts.",
     size=9, color=MUTED, before=5)

# --- kill the linktree ----------------------------------------------------
heading(doc, "Drop the Linktree, send them to the channel")
para(doc, "Ten options is a menu, and a menu makes somebody choose. Most people choose nothing "
          "and close it. Right now the only thing on that page that pays you properly is eighth, "
          "under three discount codes.")
para(doc, "One link straight to YouTube does more, because that is where you already are. The "
          "person who lands there does not pick from a list, they watch you trade for seven "
          "minutes, and the codes and the application are waiting in the description of every "
          "video by the time they actually want them.")
para(doc, "Nothing is lost. A code clicked by somebody who just watched you pass an eval "
          "converts better than one clicked off a menu by somebody who has not, and the "
          "highlight rail can carry the same job on Instagram, where five of the seven are "
          "currently other companies' logos.", size=9, color=MUTED)

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

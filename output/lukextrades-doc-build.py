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
sub_line(doc, "1. The result, who it is for, and how it works, in the first minute. Not your "
              "background.")
sub_line(doc, "2. The exact frustration. Passing sim, failing funded, strategy works and the "
              "account still dies.")
sub_line(doc, "3. Why that happens and what you do differently.")
sub_line(doc, "4. Proof. Result first, backstory second.")
sub_line(doc, "5. What they get and what it costs. Say the price out loud.")
sub_line(doc, "6. One instruction: fill in the form below.")

para(doc, "The form, six questions", size=10, bold=True, before=11, after=3)
sub_line(doc, "What are you trading now, and for how long. How many evals have you taken and "
              "what happened. What is the strategy you are running. What do you think is "
              "actually going wrong. What can you invest in fixing it. How soon do you want to "
              "start.")
para(doc, "Those six do the filtering so you are not spending an hour on somebody who was never "
          "going to buy, and the answers tell you what to say on the call before it starts.",
     size=9, color=MUTED, before=5)

# --- the preview ----------------------------------------------------------
para(doc, "So rather than describe it, here it is with your copy already in it. Two versions of "
          "the same page.", size=9, color=MUTED, before=11, after=6)

PREVIEW = r"C:\Users\Lenovoi\Downloads\Pulsify-Brain\output\lukextrades-preview"
for shot, cap in (
    ("mono-hero.png",
     "The headline leads with the result you already have, and the video sits above everything "
     "else on the page."),
    ("gold-hero.png",
     "Same page, warmer. This one is centred and probably reads better to a YouTube audience "
     "arriving from a description link."),
    ("mono-apply.png",
     "The application is on the page rather than in your inbox. Every person who starts it "
     "leaves a record, whether they finish it or not."),
):
    p = doc.add_paragraph()
    spacing(p, 4, 3, 1.0)
    p.add_run().add_picture(os.path.join(PREVIEW, shot), width=Inches(4.5))
    para(doc, cap, size=8.5, color=MUTED, after=9, line=1.18)

# --- the description ------------------------------------------------------
heading(doc, "Your YouTube description")
para(doc, "Every video is a chance to send somebody somewhere, and right now the description is "
          "doing none of that. Short is the point.", size=9, color=MUTED, after=6)
mono_line(doc, None, "i trade nq.")
mono_line(doc, None, "")
mono_line(doc, None, "my free training: lukextrades.com")
mono_line(doc, None, "instagram: instagram.com/lukextrades")
mono_line(doc, None, "")
mono_line(doc, None, "prop firm discounts, code LUKEX: [your link]")
para(doc, "Free training first, because that is the one that leads anywhere. The codes stay, "
          "they just sit below the thing that builds the relationship instead of above it.",
     size=9, color=MUTED, before=7)

# --- kill the linktree ----------------------------------------------------
heading(doc, "Your offer is the eighth link on your own page")
para(doc, "Counted it. Apply to work 1 on 1 with me sits at position eight on the Linktree, under "
          "three prop firm discount codes and two social links. On Instagram, five of your seven "
          "highlights are other companies' logos.")
para(doc, "So the two surfaces a stranger actually lands on are both mostly advertising somebody "
          "else, and the only thing that pays you properly is the hardest thing to find on "
          "either.")
para(doc, "One link to the channel instead of ten. The person who lands there watches you trade "
          "for seven minutes rather than picking off a menu, and the training and the codes both "
          "sit in the description of every video by the time they want them. There is a version "
          "of that description below.")

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

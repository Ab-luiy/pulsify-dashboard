# Prospect asset build: lukextrades / Luke
# Per wiki/playbooks/prospect-asset-sop.md. Built work, four fifths deliverable.
# Luke's shape: effort aimed at the wrong format. Do not let this read like TB's or Ace's.

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
para(doc, "you already did the hard part", size=16, bold=True, after=2, line=1.1)
sub = para(doc, "Built for Luke, August 2026. All of this is done, none of it is homework.",
           size=9, color=MUTED, after=12, line=1.2)
bottom_rule(sub)

para(doc, "1,500 videos. 1,520 subscribers.")
para(doc, "Forty four uploads a week. Nobody else in this niche is doing that, and it is the "
          "one thing in this whole business that cannot be bought, taught or faked.")
para(doc, "So this is not a work-harder document. Everything below assumes the output stays "
          "exactly where it is and only changes what it is pointed at.", after=12)

# --- three things ---------------------------------------------------------
heading(doc, "Three things, quickly")
dot(doc, "One video on your channel did 681 views against a floor around 50. It was 56 minutes "
         "long, it had a number in the title, and you have not made another one like it since "
         "the sequel.")
dot(doc, "Your thumbnails are unedited screenshots of your whole desktop. Browser tabs, address "
         "bar, watchlist, all of it.")
dot(doc, "Your 1 on 1 page is the eighth link on your Linktree, underneath three prop firm "
         "discount codes.", after=6)

# --- the format -----------------------------------------------------------
heading(doc, "The one that worked, and five more like it")
para(doc, "\"90% Winrate Backtesting IFVGs on NQ\" did 681. Everything around it does 19 to 73. "
          "That video is long, it has a number in the title, it does not expire, and it is the "
          "only thing on the channel somebody could find on purpose by typing something into a "
          "search bar.")
para(doc, "\"NQ Trade Recap - July 29 - 10am Po3 + 5m Cont\" is a filename. Nobody searches a "
          "date. It is dead the morning after it goes up, and you are making six a day.")
para(doc, "The trade worth considering: keep the daily recaps if you enjoy them, but give one "
          "of them up each week and put that time into one long one instead.",
     after=6)

vids = [
    ("i backtested 200 ifvg trades, here's the real win rate (full data)",
     "The direct sequel to the one that worked, with a bigger sample. Thumbnail: your P&L "
     "calendar, same as last time, because that is the one that already performed."),
    ("90% winrate ifvgs, 3 months later (full breakdown)",
     "Follow up on the exact video that did 681, live results against the backtest. Anyone who "
     "watched the first one has to click this."),
    ("every trade i took in july, all of them (step-by-step)",
     "Your calendar screenshot is the thumbnail and it is already proven. Nobody in the niche "
     "shows the whole month including the red days."),
    ("why my backtest failed live (full breakdown)",
     "The one nobody else will make. Being the guy who publishes the failure is a position no "
     "amount of uploading can buy."),
    ("how i passed a fundednext eval, every trade (step-by-step)",
     "You already made this, it did 48. Same video, this title, a thumbnail with one readable "
     "thing in it."),
]
for i, (t, d) in enumerate(vids, start=1):
    mono_line(doc, i, t)
    sub_line(doc, d)

# --- thumbnails -----------------------------------------------------------
heading(doc, "Your thumbnails")

LW, RW = Inches(3.85), Inches(2.25)
rows = [
    ("This is your whole screen.",
     "Browser tabs, the TradingView URL, the Ask Gemini button, the full watchlist with Bitcoin "
     "prices. At the size this actually appears, none of it can be read.",
     "yt-vobnj3gOYrU.jpg"),
    ("Same again, and your Discord tab is in it.",
     "The only thing in the frame anyone can read at thumbnail size is the banner along the "
     "bottom, which is an advert for three prop firms.",
     "yt-ymp2l0wGXdw.jpg"),
    ("This one did 681 views.",
     "A handful of large green numbers and one red one. Nothing else in the frame. It is the "
     "only thumbnail on the channel with one readable thing in it.",
     "yt-9WL6DWwoZ0E.jpg"),
]
t = doc.add_table(rows=len(rows), cols=2)
t.alignment = WD_TABLE_ALIGNMENT.LEFT
t.autofit = False
for i, (title_text, note, img) in enumerate(rows):
    r = t.rows[i]
    left, right = r.cells[0], r.cells[1]
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

para(doc, "One readable thing per thumbnail. The calendar has one. The desktop screenshot has "
          "forty at two per cent each. Crop to the single element that matters, kill the browser "
          "chrome, and put your face in a corner of it, because there is not a single face "
          "anywhere on the channel.", before=7)

# --- the landing page -----------------------------------------------------
heading(doc, "Your 1 on 1 page, rewritten")
para(doc, "Yours lists six deliverables that every mentorship page in the niche lists, so "
          "nothing on it answers why you. Same offer below, written from the buyer's side.",
     size=9, color=MUTED, after=6)

mono_line(doc, None, "for the trader who keeps failing evals with a strategy that already works")
sub_line(doc, "Three months, one on one, with someone trading the same instrument you are.")
sub_line(doc, "")
sub_line(doc, "A weekly call where we go through your trades, not mine.")
sub_line(doc, "You can message me before you take it, instead of after you blow the account.")
sub_line(doc, "Every trade reviewed, including the ones you would rather not show me.")
sub_line(doc, "A short call after the close each day, recorded if you cannot make it.")
sub_line(doc, "A written plan every week, and somebody who notices when you ignore it.")
sub_line(doc, "The part where we work out why you keep breaking your own rules.")

para(doc, "Three things that page still needs and only you can supply. Your own funded account "
          "screenshots, dated, with the numbers visible. The price, stated on the page rather "
          "than after an email. And one line naming who this is not for, because a page that "
          "turns nobody away reads like it will take anybody.", size=9, color=MUTED, before=7)

# --- the linktree ---------------------------------------------------------
heading(doc, "Your Linktree, reordered")
para(doc, "The thing that pays you properly is currently eighth, under three affiliate codes. "
          "This order takes about a minute.", size=9, color=MUTED, after=6)
mono_line(doc, None, "1  apply to work 1 on 1 with me")
mono_line(doc, None, "2  join the free discord")
mono_line(doc, None, "3  my youtube, daily uploads")
mono_line(doc, None, "4  prop firm discounts, code LUKEX")
mono_line(doc, None, "5  instagram, tiktok, x")
para(doc, "The three prop firm links collapse into one. Three separate rows makes the page read "
          "as an affiliate hub with a mentorship attached, rather than the other way round. Same "
          "goes for the highlight rail on Instagram, where five of the seven are other "
          "companies' logos.", size=9, color=MUTED, before=6)

# --- not content ----------------------------------------------------------
heading(doc, "Four things that are not content")
notes = [
    ("Your income has a ceiling built into it.",
     "Affiliate commission pays once at signup whether they pass or blow the account, so the "
     "number is capped by how many strangers you can send, forever. The 1 on 1 is the only "
     "thing you own, and it is the hardest thing on your page to find."),
    ("Start collecting student proof before you need it.",
     "Whoever you coach next will pass an eval at some point. Their screenshot, where they "
     "started, the message they send you. Ask now and keep a folder, because a mentorship sells "
     "on transfer rather than on your own results, and you cannot go back and collect it later."),
    ("Ask everyone who joins the Discord what made them join.",
     "Write the answers down. Within a month you stop guessing which of the 1,500 did the work. "
     "Likes will not tell you, the people who comment are almost never the people who buy."),
    ("You are running two accounts with two personalities.",
     "Your best Instagram posts are jokes and opinions, 4,000 to 7,000 views on 599 followers. "
     "Your charts there do 213. None of that voice appears on YouTube, where the audience "
     "actually is."),
]
for title_text, note in notes:
    p = doc.add_paragraph()
    spacing(p, 7, 1, 1.18)
    set_font(p.add_run(title_text), BODY, 10, INK, bold=True)
    sub_line(doc, note)

# --- close ----------------------------------------------------------------
heading(doc, "Last thing")
para(doc, "Do not worry too much about the subscriber count. You have already proved you can do "
          "the part almost nobody sticks at, and that is the part that cannot be taught. Keep "
          "the consistency and it comes in time on its own.")
para(doc, "Put some of this in and it should move quicker than it is moving now.", after=0)

doc.save(OUT)
print("saved:", OUT)
print("bytes:", os.path.getsize(OUT))

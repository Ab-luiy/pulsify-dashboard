# Prospect asset build: _acetrades_ / Andersen Henry
# Layout layer follows wiki/playbooks/prospect-asset-doc-standard.md. Fill in, do not redesign.

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

INK    = RGBColor(0x1A, 0x1A, 0x1A)
MUTED  = RGBColor(0x46, 0x4E, 0x5C)
ACCENT = RGBColor(0x4A, 0x53, 0xD9)
RULE   = "D5D5DD"
HEAD   = "F2F3F7"

BODY = "Georgia"
MONO = "Consolas"

OUT_DIR = r"C:\Users\Lenovoi\Desktop\Prospect Assets\acetrades"
OUT = os.path.join(OUT_DIR, "acetrades-what-your-numbers-decided.docx")


def set_font(run, name=BODY, size=10.5, color=INK, bold=False, italic=False):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.bold = bold
    run.italic = italic
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), name)


def spacing(p, before=0, after=8, line=1.25):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line


def para(doc, text, size=10.5, color=INK, after=8, before=0, bold=False,
         italic=False, name=BODY, indent=0, line=1.25):
    p = doc.add_paragraph()
    spacing(p, before, after, line)
    if indent:
        p.paragraph_format.left_indent = Inches(indent)
    r = p.add_run(text)
    set_font(r, name, size, color, bold, italic)
    return p


def bottom_rule(p, color=RULE, sz=6):
    ppr = p._element.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(sz))
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), color)
    bdr.append(bottom)
    ppr.append(bdr)


def shade(cell, hexfill):
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hexfill)
    tcpr.append(shd)


def cell_bottom_border(cell, color=RULE, sz=4):
    tcpr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(sz))
    bottom.set(qn("w:space"), "0")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    tcpr.append(borders)


def cell_text(cell, text, size=9.5, color=INK, name=BODY, align=None, bold=False):
    cell.text = ""
    p = cell.paragraphs[0]
    spacing(p, 3, 3, 1.15)
    if align:
        p.alignment = align
    r = p.add_run(text)
    set_font(r, name, size, color, bold)


def heading(doc, text):
    return para(doc, text, size=12.5, bold=True, before=15, after=3)


def title_line(doc, num, title_text):
    p = doc.add_paragraph()
    spacing(p, 0, 1, 1.2)
    r1 = p.add_run(f"{num}.  ")
    set_font(r1, BODY, 10.5, ACCENT, bold=True)
    r2 = p.add_run(title_text)
    set_font(r2, MONO, 9.5, INK)
    return p


def direction(doc, text):
    return para(doc, text, size=9, color=MUTED, after=9, indent=0.22, line=1.2)


doc = Document()
os.makedirs(OUT_DIR, exist_ok=True)

sec = doc.sections[0]
sec.page_width = Inches(8.5)
sec.page_height = Inches(11)
sec.left_margin = Inches(1.2)
sec.right_margin = Inches(1.2)
sec.top_margin = Inches(0.75)
sec.bottom_margin = Inches(0.75)

normal = doc.styles["Normal"]
normal.font.name = BODY
normal.font.size = Pt(10.5)
normal.font.color.rgb = INK
rpr = normal.element.get_or_add_rPr()
rf = OxmlElement("w:rFonts")
for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
    rf.set(qn(attr), BODY)
rpr.append(rf)

# --- 1. title -------------------------------------------------------------
para(doc, "Ace trades: what your own numbers already decided",
     size=16, bold=True, after=2, line=1.1)
sub = para(doc, "Built for Andersen Henry from his Instagram reels, his own transcripts, "
                "and the ACE TRADES YouTube channel. August 2026.",
           size=9, color=MUTED, after=13, line=1.2)
bottom_rule(sub)

# --- 2. the finding -------------------------------------------------------
heading(doc, "The finding")
para(doc, "Your teaching content beats your money content, and it is not close. The three reels "
          "at the top of your grid are all how-to covers. The payout screenshots sit near the "
          "floor. The lowest post on the whole account is the one where you are in a blazer at "
          "a desk.")
para(doc, "Nobody had to tell your audience what they wanted. They already voted, and they have "
          "been voting for a while.")

# --- 3. evidence table ----------------------------------------------------
heading(doc, "Your own grid")

rows = [
    ("How to bottom tic continuation trades", "7,371"),
    ("Join the Discord to catch these live (payout cards)", "4,244"),
    ("How to Top Tic", "4,176"),
    ("Life after getting SL edged", "2,947"),
    ("Pass your account in 1 day", "2,731"),
    ("How To Top Tic", "2,583"),
    ("Tradecopia payout cards", "1,986"),
    ("Top One Futures, closed trade", "1,751"),
    ("Tradecopia payout, $4,49x", "1,056"),
    ("Talking head, blazer, gaming chair", "811"),
]

table = doc.add_table(rows=len(rows) + 1, cols=2)
table.alignment = WD_TABLE_ALIGNMENT.LEFT
table.autofit = False
table.columns[0].width = Inches(4.7)
table.columns[1].width = Inches(1.4)

hdr = table.rows[0]
cell_text(hdr.cells[0], "Reel", size=9, color=MUTED, bold=True)
cell_text(hdr.cells[1], "Views", size=9, color=MUTED, bold=True,
          align=WD_ALIGN_PARAGRAPH.RIGHT)
for c in hdr.cells:
    shade(c, HEAD)
    cell_bottom_border(c)

for i, (label, views) in enumerate(rows, start=1):
    r = table.rows[i]
    cell_text(r.cells[0], label)
    cell_text(r.cells[1], views, name=MONO, align=WD_ALIGN_PARAGRAPH.RIGHT)
    for c in r.cells:
        cell_bottom_border(c)
    r.cells[0].width = Inches(4.7)
    r.cells[1].width = Inches(1.4)

para(doc, "The top three are all method. Two of the bottom three are payouts. The last one is "
          "the most produced thing on the page.",
     size=9, color=MUTED, before=6, after=4)

# --- 4. what is working ---------------------------------------------------
heading(doc, "What is already working")
para(doc, "More than you probably give yourself credit for. Under the June 29 reel, someone "
          "back-tested your setup on their own time and then wrote the whole thing out in your "
          "comments: the .588, the .5 entry, the one to three, which side becomes the bias when "
          "both get swept. 356 people liked that comment. Strangers do not do that for content "
          "they half-watched, and you did not ask them to.")
para(doc, "Your rules are also genuinely teachable. Sweep of London high or low, two five-minute "
          "closures in the opposite direction, mark the swing high, two closures back above it, "
          "fib plus volume profile, then the level where volume agrees. Invalidation if it "
          "resweeps with two closures against you. That is a system another person can actually "
          "run, which is rarer in this space than it sounds.")

# --- 5. what it costs -----------------------------------------------------
heading(doc, "What it is costing you")
para(doc, "The bottom tick reel carries a full rule set and three worked trades inside ninety "
          "seconds. You can hear the strain in your own words: \"this one's gonna go really "
          "fast,\" then boom, boom, boom. That is a twenty-minute lesson at sprint pace. It is "
          "also your best performing post on the account, which means it is winning while "
          "compressed.")
para(doc, "The YouTube channel has two videos from four months ago at 176 and 63 views, covering "
          "AMD, FVGs and IFVGs. That is what most of the space teaches. Since then you named your "
          "own model and built your own rules around top tic and bottom tic entries. So it does "
          "not read like a failed channel. It reads like a channel from before you had your own "
          "thing to say.")
para(doc, "And there is nowhere to send anyone. No link in the bio. Somebody finishes a reel, "
          "wants the long version, and the only door on the page is a Discord invite stuck on "
          "the video.")

# --- 6. the rebuild -------------------------------------------------------
heading(doc, "Seven you could make")
para(doc, "All of these come from things you have already said on camera. Nothing here needs a "
          "new idea, only room.",
     size=9, color=MUTED, after=8)

items = [
    ("how i bottom tick retracements, 3 trades (step-by-step)",
     "Thumbnail: two closures, then entry. Your own five-minute chart with the swing high "
     "marked. This is the topic your audience already picked, so it is the safest first upload."),
    ("don't avoid choppy days, they paid me $1,100 (full breakdown)",
     "Thumbnail: unusable to them. The exact session everyone was calling chop. Cheap to shoot "
     "and it argues with the whole niche at once."),
    ("the ace model that made $1,100 in a day (full system)",
     "Thumbnail: sweep, retrace, done. Your TradingView chart with the levels already marked. "
     "The flagship, once two videos have proven the format."),
    ("1 hour a night fixed my trading psychology (do this)",
     "Thumbnail: not a mindset issue. Replay software on screen instead of a chart. This is the "
     "strongest thing you have said in any clip, and it is the one that could outrun the channel."),
    ("watch me take $[your figure] off one sweep live (step-by-step)",
     "Thumbnail: london high, 9:31am. Two monitors, real room, no staging. Drop your own number "
     "in. We are not going to put words in your mouth about a trade."),
    ("the [number] setups in the ace model explained (full system)",
     "Thumbnail: setup 3 is the one. A clean numbered board. You have said setup three out loud, "
     "so people know there is a set. Nobody knows how big it is."),
    ("i taught the amd model wrong, here's the ace version (full system)",
     "Thumbnail: four months ago, wrong. Your old blazer frame on the left, the hoodie and chart "
     "frame on the right. Reclaims your most-watched upload under your own name, and the two "
     "images make the point before anyone reads a word."),
]

for i, (t, d) in enumerate(items, start=1):
    title_line(doc, i, t)
    direction(doc, d)

# --- 7. order -------------------------------------------------------------
heading(doc, "An order that would make sense")
para(doc, "1, then 2, then 3, then 4, then 5, then 6. Lead with the thing your audience already "
          "rewarded, follow with the cheapest one to shoot, then the flagship once the format has "
          "proven itself twice. Number 7 works as the opener instead if you would rather say the "
          "reset out loud.")

# --- 8. the bio -----------------------------------------------------------
heading(doc, "The bio")
para(doc, "There is no link. That is the smallest fix on this list and the only one that costs "
          "nothing to make: no filming, no editing, just a field.")
para(doc, "A link to the channel would do four things. It gives the reach somewhere to land, "
          "because 1,698 followers pulling 2,000 to 7,400 views a reel means most of the people "
          "watching you are not following you yet. It answers the curiosity your reels create and "
          "cannot satisfy in ninety seconds. It puts something permanent in front of the Discord, "
          "so people arrive having watched you teach for fifteen minutes rather than arriving "
          "cold. And a video keeps working at 2am four weeks from now, which a live room cannot "
          "do.")
para(doc, "Worth waiting until two or three of the new ones are up, though. Sending traffic to "
          "the AMD videos right now would undersell what you are doing today.")

# --- 9. smaller notes -----------------------------------------------------
heading(doc, "Three smaller things")
para(doc, "\"Sauce\" is yours. It closes both YouTube titles and it is in your captions. Right "
          "now it sits in the spot where the promise usually goes, so it is doing the shape of a "
          "hook without carrying anything. It could carry something.")
para(doc, "Your comment replies are video topics. You are answering real technical questions "
          "there, one person at a time, and those questions arrived pre-validated. The session "
          "hours answer alone is a video.")
para(doc, "Your highlights are Trades, Trade Recaps, Students and Payouts. All four prove. None "
          "of them explain. Somebody can confirm you make money four different ways and still "
          "leave the page not knowing what the ACE MODEL actually is.")

# --- 10. horizon note -----------------------------------------------------
heading(doc, "One last thing")
para(doc, "You have 1,698 followers and your reels run 2,000 to 7,400 views, with one that "
          "cleared 8,000 likes. Your reach is already running well past the size of your "
          "audience. That means the follower count is not the thing holding this up. It is the "
          "number that moves last, not the one that decides.")
para(doc, "Everything above is foundation work, and foundations are slow to show up in the "
          "numbers. That is normal rather than a sign it is not working. Most people in your "
          "position quit somewhere around week three, which is usually right before it starts "
          "to compound.", after=0)

doc.save(OUT)
print("saved:", OUT)
print("bytes:", os.path.getsize(OUT))

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
          "been voting for a while. The bottom tick reel carries a full rule set and three "
          "worked trades inside ninety seconds, and you can hear the strain in your own words: "
          "\"this one's gonna go really fast,\" then boom, boom, boom. That is a twenty-minute "
          "lesson at sprint pace, and it is still the best thing on the account.")

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

# --- 4. the proof problem -------------------------------------------------
heading(doc, "The proof problem nobody in your niche talks about")
para(doc, "Payout screenshots are the one kind of proof everybody can fake and everybody knows "
          "it. Your audience has scrolled past a thousand of them. That is most of why the "
          "$4,49x post sits at 1,056 and a how-to sits at 7,371. It is not that they doubt you. "
          "The format itself stopped carrying weight years ago.")
para(doc, "The proof you cannot fake is already on your page, and you did not make it. Someone "
          "back-tested your setup on their own time and posted the whole thing in your comments: "
          "the .588, the .5 entry, the one to three, which side becomes the bias when both get "
          "swept. 356 people liked it. Nobody does that for a fake. That comment is worth more "
          "than every payout card on the account put together, and it is sitting in a thread "
          "that will be gone in a month.")
para(doc, "There is a second thing underneath it, and it decides whether anyone ever pays you to "
          "teach. Your payouts prove you can trade. They do not prove you can hand it over. "
          "Those are different products. People do not buy a mentorship because the mentor is "
          "good, they buy it because they believe the thing he does can be transferred to them. "
          "That comment is the only artifact on your page that proves transfer, because it is a "
          "stranger running your rules and getting somewhere with them.")
para(doc, "Which makes the Students highlight the most valuable real estate you own, and the "
          "least developed thing on the profile.")

# --- 5. what it costs -----------------------------------------------------
heading(doc, "What it is costing you")
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
          "new idea, only room. Roughly in this order: lead with what your audience already "
          "rewarded, follow with the cheapest one to shoot, save the flagship until the format "
          "has proven itself twice. Number seven works as the opener instead if you would rather "
          "say the reset out loud.",
     size=9, color=MUTED, after=8)

items = [
    ("how i bottom tick retracements, 3 trades (step-by-step)",
     "Thumbnail: two closures, then entry. Your five-minute chart, swing high marked. The topic "
     "your audience already picked, so it is the safest first upload."),
    ("don't avoid choppy days, they paid me $1,100 (full breakdown)",
     "Thumbnail: unusable to them. The exact session everyone was calling chop. Cheap to shoot "
     "and it argues with the whole niche at once."),
    ("the ace model that made $1,100 in a day (full system)",
     "Thumbnail: sweep, retrace, done. Your chart with the levels already marked. The flagship."),
    ("1 hour a night fixed my trading psychology (do this)",
     "Thumbnail: not a mindset issue. Replay software on screen instead of a chart. The "
     "strongest thing you have said in any clip, and the one that could outrun the channel."),
    ("watch me take $[your figure] off one sweep live (step-by-step)",
     "Thumbnail: london high, 9:31am. Two monitors, real room, no staging. Your number goes in "
     "the slot. We are not putting words in your mouth about a trade."),
    ("the [number] setups in the ace model explained (full system)",
     "Thumbnail: setup 3 is the one. A clean numbered board. You have said setup three out loud, "
     "so people know a set exists. Nobody knows how big it is."),
    ("i taught the amd model wrong, here's the ace version (full system)",
     "Thumbnail: four months ago, wrong. Old blazer frame left, hoodie and chart frame right. "
     "Reclaims your most-watched upload under your own name, and the images make the point "
     "before anyone reads a word."),
]

for i, (t, d) in enumerate(items, start=1):
    title_line(doc, i, t)
    direction(doc, d)

# --- 7. owning the words --------------------------------------------------
heading(doc, "Owning the words")
para(doc, "Top tic. Bottom tic. Setup three. Two five-minute closures. Those are yours, and "
          "nobody else's videos come up for them.")
para(doc, "That matters far more on YouTube than on Instagram, and the reason is worth knowing. "
          "Instagram pushes your reel at people who were not looking for it. YouTube gets "
          "searched by people who already have the problem and went hunting for the answer. "
          "Those are different viewers, and the second one is much closer to paying somebody.")
para(doc, "Right now if a person hears \"bottom tick the retracement\" in a clip and goes looking "
          "for what it means, they find nothing. That lane is empty and it has your name on it. "
          "Every video built on your own vocabulary claims a term nobody is competing for, and "
          "terms compound in a way individual posts never do. The moment other people start "
          "using your words to describe what they are doing, you stop being a trader who posts "
          "and start being the person the method is named after. That is the difference between "
          "an account people enjoy and a thing people pay to be let into.")

# --- 8. what it looks like built -----------------------------------------
heading(doc, "What it looks like once it is built")
para(doc, "Right now the path stops. Somebody watches you teach a whole setup in ninety seconds, "
          "wants more, and lands on a profile with nowhere to go.")
para(doc, "Built out, the same person watches the reel, follows the link into fifteen minutes of "
          "you actually teaching, and only then walks into the room. Three steps, one direction, "
          "and none of it needs you to be awake.")
para(doc, "The part that changes what you can sell is what it does to the conversation. Today "
          "anyone who messages you starts from zero, and you end up proving yourself in a chat "
          "window one person at a time. When somebody has already watched three or four of your "
          "videos, the proving is finished before they type. The conversation stops being about "
          "whether you are legitimate and becomes about whether they are a fit. Those people are "
          "the easiest to say yes to, and the easiest to turn away, and both of those are worth "
          "having.")

# --- 9. the two loops -----------------------------------------------------
heading(doc, "Two loops almost nobody closes")
para(doc, "Ask why. Everyone who joins the Discord, or pays you for anything, moved for a "
          "specific reason and usually because of one specific piece of content. Ask them what "
          "made them actually do it. Ask every time, write the answers down, and within a month "
          "you will know which video does the work instead of guessing at it forever. It is one "
          "question and almost nobody asks it.")
para(doc, "Answer once, in public. You are handling real technical questions in your comments "
          "one person at a time. Anything you get asked twice is a video. Anything somebody "
          "hesitates over in the DMs is a video. The questions that keep coming back are the "
          "ones standing between a person and working with you, and answering them publicly "
          "means you stop having the same conversation fifty times.")

# --- 10. the bio ----------------------------------------------------------
heading(doc, "The bio")
para(doc, "There is no link. It is the smallest fix here and the only one that costs nothing to "
          "make. 1,698 followers pulling 2,000 to 7,400 views a reel means most of the people "
          "watching you are not following you yet, and every one of them currently hits a dead "
          "end. Worth waiting until two or three of the new videos are up, though. Sending "
          "traffic to the AMD videos today would undersell what you are doing now.")

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

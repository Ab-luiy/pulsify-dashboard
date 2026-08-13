# Prospect asset build: bergtrades / Matthew Bergin
# Founder steers 2026-08-13:
#   - Loom said "thumbnails need to look better". Channel data says the opposite, so the doc
#     leads on proof leaving the frame, not on design quality.
#   - Drop the banned-account angle entirely. Two accounts stay, reframed as a split.
#   - Landing pages are fine. One line each on the defects, no section.
#   - The VSL rewrite is the centrepiece. Jeremy Haynes 6-step, from the raw framework
#     (Hook / Why you / Buying motives / Offer / Objections / Qualification+CTA), not the
#     wiki page's variant.
# Layout layer copied verbatim from output/lukextrades-doc-build.py. Do not redesign.

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

SHOTS = r"C:\Users\Lenovoi\Desktop\Prospect Assets\bergtrades"
OUT   = os.path.join(SHOTS, "bergtrades-the-proof-is-on-the-wrong-page.docx")


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


def cell_pad(cell, tw=55):
    tcpr = cell._tc.get_or_add_tcPr()
    m = OxmlElement("w:tcMar")
    for side in ("top", "bottom"):
        e = OxmlElement(f"w:{side}")
        e.set(qn("w:w"), str(tw)); e.set(qn("w:type"), "dxa")
        m.append(e)
    tcpr.append(m)


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


def beat(doc, label, text):
    p = doc.add_paragraph()
    spacing(p, 7, 2, 1.2)
    set_font(p.add_run(label + "  "), BODY, 10.5, ACCENT, bold=True)
    set_font(p.add_run(text), BODY, 10.5, INK)
    return p


def quote(doc, text):
    p = para(doc, text, size=10, color=MUTED, italic=True,
             indent=0.28, after=6, before=4, line=1.2)
    return p


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
para(doc, "The proof is on the wrong page", size=16, bold=True, after=2, line=1.1)
p = para(doc, "Built for Matthew Bergin, from your channel, your two pages and three of your videos",
         size=9, color=MUTED, after=10)
bottom_rule(p)

# --- the finding ----------------------------------------------------------
para(doc, "Your best thumbnail is one you didn't make.")
para(doc, "It's a screen recording with the macOS menu bar still in it and a subtitle burnt across "
          "the bottom. 1.8K views, your channel record. The two you designed most carefully this "
          "month did 62 and 181.")
para(doc, "That isn't a lesson about design. Look at what was in the frames that worked. Week 1 of "
          "Road to $2M had a whiteboard with ROAD TO 2 MIL in marker and real Alpha Capital "
          "certificates with Matthew Simon Bergin printed on them. Week 7 had five payout certs and "
          "$14,000 PAID OUT. The Leon video had a Miro board full of his payout screenshots.")
para(doc, "Every frame carrying a document you could read did between 500 and 1.2K. Every frame "
          "carrying a designed graphic and a single word did between 62 and 373. The polish went up, "
          "the proof went out, and the views followed the proof.")

# --- evidence table -------------------------------------------------------
rows = [
    ("Road to $2,000,000 in Funding | Week 1",
     "1.2K views. Marker on a whiteboard, certificates with your legal name on them.",
     "yt-VjUpqe73wQw.jpg"),
    ("$81 payout to over $1,000,000 in funding (heres how Leon did it)",
     "1.1K views. A raw screen grab of a Miro board. You didn't design it and it outperformed.",
     "yt-JsYfn3IdFyo.jpg"),
    ("How to Create a Day Trading Strategy.",
     "181 views. One word, one stat, no document.",
     "yt-8K4dFyrucXk.jpg"),
    ("How to Backtest a Day Trading Strategy.",
     "62 views. The same file as the one above with the word swapped, same +120.4R in the corner.",
     "yt-SJkj4JfEczo.jpg"),
]

tbl = doc.add_table(rows=0, cols=2)
tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
tbl.autofit = False
for title, note, img in rows:
    r = tbl.add_row()
    c0, c1 = r.cells
    c0.width, c1.width = Inches(4.1), Inches(2.0)
    for c in (c0, c1):
        cell_pad(c); cell_border(c)
    c0.paragraphs[0]._element.getparent().remove(c0.paragraphs[0]._element)
    p = c0.add_paragraph(); spacing(p, 0, 2, 1.18)
    set_font(p.add_run(title), BODY, 10, INK, bold=True)
    p = c0.add_paragraph(); spacing(p, 0, 0, 1.18)
    set_font(p.add_run(note), BODY, 9, MUTED, italic=True)
    p = c1.paragraphs[0]; spacing(p, 0, 0, 1.0)
    path = os.path.join(SHOTS, img)
    if os.path.exists(path):
        p.add_run().add_picture(path, width=Inches(1.75))

# --- what it is costing ---------------------------------------------------
heading(doc, "The part that's actually costing you")
para(doc, "thetradingclub.uk has seven student stories on it. TzFred made $20k from prop firms. JJ "
          "went from sparky to full time in 77 days. H1rvey went from Amazon driver to day trader in "
          "four months. An 18 year old moved to Thailand to trade with you. Plus 58 five star reviews.")
para(doc, "None of them are videos.")
para(doc, "You made one, the Leon one, it did 1.1K and became one of your best uploads, and then you "
          "went back to How to Create a Day Trading Strategy. You're writing good titles for a page "
          "nobody visits and running tutorials on the channel people actually watch. Everything "
          "below is that same argument in different clothes.")

# --- titles ---------------------------------------------------------------
heading(doc, "Six titles, from your own students")
para(doc, "These aren't invented. Five of the six are already written on your VIP page. They just "
          "aren't videos yet.", after=2)

titles = [
    ("Amazon driver to funded day trader in 4 months (how H1rvey did it)", None),
    ("He was a sparky 77 days ago. Now he trades full time.", None),
    ("$20,000 from prop firms with one mechanical model (TzFred's numbers)", None),
    ("I lost 27R in a month and posted every trade. Here's the data.",
     "Your April 20 to May 22 drawdown, 108R down to 81R. You already show it inside a video "
     "nobody clicked. On its own it's the strongest upload on the channel, because nobody else "
     "in this niche will make it."),
    ("Road to $5,000,000 in Funding | Week 1",
     "Restarts the series that built the channel. You finished at $2,150,000 and stopped. "
     "The running number was the format."),
    ("I let my students audit every trade I took for 30 days", None),
]
for i, (t, note) in enumerate(titles, 1):
    mono_line(doc, i, t)
    if note:
        sub_line(doc, note)

# --- thumbnails -----------------------------------------------------------
heading(doc, "The thumbnails those need")
para(doc, "Same rule for all six, and it's the rule you already proved.")
para(doc, "Put a document in the frame that a stranger can read. Certificate, payout screenshot, "
          "journal row, equity curve with your name on it. Handwriting is fine, and it's better than "
          "fine. The marker on the whiteboard is why Week 1 worked.")
para(doc, "Your face reacting to the document, not posed in front of a backdrop.")
para(doc, "Then kill the template. Your last two are the same file with one word changed, and both "
          "carry the same peak +120.4R in the corner. Anyone who sees the second one has already "
          "seen it.")

# --- description ----------------------------------------------------------
heading(doc, "The description, in this order")
para(doc, "You had this right and then dropped it. Your older videos open with your mentorship link. "
          "Your newest opens with a linktw.in shortener and the mentorship link isn't in it at all. "
          "Put it back:", after=3)
for line in [
    "Apply for 1-on-1 mentorship: https://bergsmentorship.com",
    "Join the VIP team: https://www.thetradingclub.uk/",
    "Free trading group: https://discord.gg/zybQKdwXx4",
    "Instagram: https://www.instagram.com/bergtrades.ig/",
]:
    mono_line(doc, None, line)
para(doc, "Affiliates below that, after your own offers. Right now five prop firm and software links "
          "sit above a mentorship link that isn't there. The shortener is the only unbranded link on "
          "the page and it reads like a redirect.", before=8)

# --- two accounts ---------------------------------------------------------
heading(doc, "The two accounts")
para(doc, "You post on both, so give each one a job rather than running the same energy twice.")
para(doc, "@bergtrades.ig has 10K followers and 16 posts. The audience is already there and there's "
          "nothing for them to do when they arrive. It could carry you: your story, your takes, the "
          "drawdowns, the story sequences and the highlights.")
para(doc, "@battmergin then carries one thing, students. Every payout, every JJ and every H1rvey. "
          "The account with the reach builds the trust, the account with the receipts closes it.")
para(doc, "A bio for the 10K account, since it's doing none of the work at the moment:", after=3)
for line in [
    "Day trader, UK. Mechanical, not discretionary.",
    "Every trade I take is public.",
    "My students take the same trades I do -> YouTube",
]:
    mono_line(doc, None, line)
para(doc, "YouTube belongs in that bio. It isn't in either one right now, so the only door out of "
          "10K followers is a second account and then a cold application form.", before=8)

# --- the VSL pointer ------------------------------------------------------
heading(doc, "Your VSL")
para(doc, "You've got more than one running and they're doing different jobs. The free training one "
          "shows what you do. The other is you telling people the mentorship is good. That second one "
          "is the one worth replacing, and it's the same argument again: it makes a claim where it "
          "could show a document.")
para(doc, "That one I rewrote in full rather than commenting on, so it's the second file. Six steps, "
          "your story sitting in step two, your own drawdown used as the credibility beat. Read it "
          "with your own voice in your head and cut anything that doesn't sound like you.")

# ==========================================================================
# SECOND DOCUMENT: the VSL script
# ==========================================================================
def build_vsl():
    d = Document()
    s = d.sections[0]
    s.page_width, s.page_height = Inches(8.5), Inches(11)
    s.left_margin = s.right_margin = Inches(1.2)
    s.top_margin = s.bottom_margin = Inches(0.75)
    n = d.styles["Normal"]
    n.font.name, n.font.size, n.font.color.rgb = BODY, Pt(10.5), INK
    r = n.element.get_or_add_rPr(); f = OxmlElement("w:rFonts")
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        f.set(qn(a), BODY)
    r.append(f)
    return d


doc2 = build_vsl()
para(doc2, "Your VSL, rewritten", size=16, bold=True, after=2, line=1.1)
p = para(doc2, "For the mentorship page. Jeremy Haynes' six step structure, written from your own "
               "material", size=9, color=MUTED, after=10)
bottom_rule(p)

para(doc2, "Six steps, in this order, nothing in between. The order is the part that does the work: "
           "people decide whether to keep watching before you've earned the right to explain "
           "anything, so credibility comes second and the offer doesn't arrive until they want it.")

doc1 = doc     # park the main teardown
doc = doc2     # the six steps below write into the VSL script
beat(doc, "1. Hook.", "Say what you'll do for them, in one line.")
quote(doc, "\"I'm Berg. I'm going to teach you a mechanical day trading model you can run in about "
           "45 minutes a day, and you'll be able to check my results against yours the whole time.\"")
para(doc, "No build up, no backdrop, no what's going on guys. If people drop in the first fifteen "
          "seconds, this line is the reason.", after=4)

beat(doc, "2. Why you.", "Immediately after the hook. This is where your story goes, and it goes "
                         "here rather than at the top because they need a reason to sit through it.")
sub_line(doc, "Where you were. 10 pip stops and 30 pip targets. Some days that was a swing trade, "
              "some days you got wicked in and out inside a minute, and you never knew which.")
sub_line(doc, "What changed. You started measuring the range with the fib tool and basing the entry, "
              "the stop and the target on that range instead of a fixed pip count. Your words: the "
              "most important change you ever made.")
sub_line(doc, "What it bought. Three years profitable. 40 years of backtested data. 60 accounts, "
              "three model variations, about 45 minutes a day. Nine winning months a year and three "
              "losing ones, and you say the three out loud.")
sub_line(doc, "The life. Thailand, the apartment, the team, traders flying out to Koh Samui to trade "
              "next to you. Add whatever personal detail you actually want here. I'm not putting "
              "words in your mouth on that part.")
para(doc, "Plant the objection handler while you're here:", before=6, after=2)
quote(doc, "\"I lost 27R between April and May. It's on my channel. Worst run I've had on record and "
           "I published it, because if I hide that from you then nothing else I show you is worth "
           "anything.\"")

beat(doc, "3. Buying motives.", "The longest section. Cascade through why people actually come to "
                                "you, most common first.")
sub_line(doc, "They've been at it a year or two, they know the content, they're still not profitable. "
              "That's your own video title. It goes first because it's most of them.")
sub_line(doc, "They're stuck on the prop firm treadmill, pass fail pass fail. You have a real answer: "
              "split the capital, risk high enough on evals to actually clear them.")
sub_line(doc, "They can't hold a system for a fortnight, so it's psychology and not strategy. "
              "Mechanical removes the decision.")
sub_line(doc, "They're doing it alone. Lone wolf syndrome. That one's yours, use the name.")

beat(doc, "4. The offer.", "State the price.")
mono_line(doc, None, "\"It's [YOUR PRICE]. Here's what that gets you: [weeks, calls, group, access].\"")
para(doc, "Hiding it gets you more calls and worse ones. Saying it means everyone who books has "
          "already decided they can pay.", before=6, after=4)

beat(doc, "5. Objections.", "Real ones only. You answer these on camera already, they just aren't "
                            "in the VSL.")
sub_line(doc, "I'd have to be at a laptop all day. You spend 45 minutes. Limit orders, phone alerts, "
              "four levels.")
sub_line(doc, "How long until I'm profitable. You teach the model in under four weeks and you're "
              "straight that the skill takes one to two years. Say both. Anyone who leaves over that "
              "was quitting in week three anyway.")
sub_line(doc, "I've tried loads of strategies. That's the whole reason you show the data instead of "
              "the claim.")
para(doc, "Pull the rest off your actual sales calls. The ones you hear most are the ones that go in.",
     before=6, after=4)

beat(doc, "6. Qualification and CTA.", "You already do this better than almost anyone selling in "
                                       "this niche.")
quote(doc, "\"If you're not a serious trader and you're not looking to commit hours of your week, "
           "please do not apply. I don't want you involved.\"")
para(doc, "Keep it word for word. Then one action. Application form, then the call. Not two links, "
          "not a Discord detour.")

para(doc, "One note on filming it. Every VSL you've got is shot against the view. The frames that "
          "work on your channel are the ones with a document in them, and the same thing applies "
          "here: if there's a certificate or a payout on screen while you talk about step two, the "
          "story stops being a story and starts being evidence.", before=12)

heading(doc, "How to tell if it's working")
para(doc, "Same framework, the diagnostic half of it. You won't need to guess which part is broken "
          "if you watch the graph.")
sub_line(doc, "Steep drop in the first fifteen seconds means the hook is wrong. Not the video, the "
              "first line. Rewrite that and nothing else.")
sub_line(doc, "A gradual decline all the way down is normal and you should ignore it. People leave "
              "when they've decided, and deciding early is the point.")
sub_line(doc, "Play rate under 10 percent is a page problem, not a video problem. It means the "
              "headline promised something the video isn't, or there's too much on the page above "
              "it. 30 percent and up is healthy.")
sub_line(doc, "People watching the whole thing repeatedly isn't automatically good. It can mean "
              "they're confused and going back for it. You want them to get it and act.")
para(doc, "Worth moving the player to Wistia for that, since it gives you the drop-off graph per "
          "second. Vimeo won't show you where they left, and where they left is the whole point.",
     before=6)

OUT2 = os.path.join(SHOTS, "bergtrades-vsl-rewritten.docx")
doc2.save(OUT2)
print("saved:", OUT2)

doc = doc1     # back to the main teardown

# --- pages ----------------------------------------------------------------
heading(doc, "Four small things on the page")
para(doc, "The browser tab on bergsmentorship.com says My Framer Site, which is the Framer default "
          "and the title that shows every time you paste that link. The headline renders wider than "
          "the window so it's clipped at both edges, worse on a phone, and it's two different fonts "
          "across the two lines. The note above the video about signing in can come down, the player "
          "is Vimeo now and loads fine. And the apply button could take a solid fill.")
para(doc, "Your story sequences, your reels and your free training page I'd leave exactly as they "
          "are. The teaching was never the problem here.")

# --- horizon note ---------------------------------------------------------
heading(doc, "One last thing")
para(doc, "You're at 2.5K subs and 10K followers, and I'd guess the follower count feels like the "
          "reason none of this converts yet. It isn't. You're sitting on seven student "
          "transformations, 58 reviews and three years of public data, which is more proof than most "
          "people twice your size have, and it's filed in the wrong place.")
para(doc, "Fix where it lives and give it a few months. That part isn't fast, but it compounds, and "
          "you've already done the hard half.")

doc.save(OUT)
print("saved:", OUT)

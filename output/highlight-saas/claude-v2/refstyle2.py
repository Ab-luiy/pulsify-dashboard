"""Slides 6, 7, 8 rebuilt to the reference standard (wiki/content-engine/story-design-reference-standard.md).
Real-looking artifacts, mixed type (Helvetica regular/bold + Georgia serif), one emphasis device per phrase.
  06e  browser window: 14 crammed tabs, chatgpt open at 2:07 AM, red hand-drawn ring (Nik seq3 marker boxes + Siggy annotation)
  07e  timeline: big month labels + light word, coloured dots, message cards in the viewer's own voice (Nik seq2 slide 2)
  08e  translucent bands bleeding off the right edge, bold title + serif subtitle, outlined labels (Nik seq2 slide 3)
Run: python refstyle2.py [06e 07e 08e]"""
import sys
from engine import *

SERIF = "Georgia,'Times New Roman',serif"
SANS = "Helvetica,Arial,sans-serif"
CARD = '#1e1f22'
AMBER, ORANGE = '#e6b04d', '#f07d3a'


def marker(text, bg=RED, fg='#fff'):
    return f'<span style="background:{bg};color:{fg};font-weight:700;padding:0 10px 4px;border-radius:4px">{text}</span>'


def line(html, size=44, weight=400, mt=0, color=INK, family=SANS, ls=-0.6, lh=1.25):
    return f'<div style="font-family:{family};font-size:{size}px;font-weight:{weight};letter-spacing:{ls}px;line-height:{lh};color:{color};margin-top:{mt}px">{html}</div>'


def hand_ring(x, y, w, h, color=RED, sw=6):
    """Loose hand-drawn ellipse (two overlapping strokes, open end), like a marker circle."""
    cx, cy, rx, ry = x + w / 2, y + h / 2, w / 2, h / 2
    d1 = f'M{cx - rx * .92:.0f} {cy - ry * .25:.0f} C {cx - rx * 1.02:.0f} {cy - ry * 1.15:.0f}, {cx + rx * 1.05:.0f} {cy - ry * 1.18:.0f}, {cx + rx * 1.0:.0f} {cy + ry * .05:.0f} S {cx - rx * .7:.0f} {cy + ry * 1.25:.0f}, {cx - rx * 1.0:.0f} {cy + ry * .1:.0f} S {cx - rx * .4:.0f} {cy - ry * 1.05:.0f}, {cx + rx * .2:.0f} {cy - ry * 1.08:.0f}'
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
            f'<path d="{d1}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/></svg>')


# ------------------------------------------------------------------ 06e  the 2am browser
def browser_card(left, top, width, height):
    favs = [('C', '#10a37f'), ('N', '#f1f1ee'), ('Y', '#ff3d3d'), ('I', '#d6249f'), ('D', '#4285f4'), ('G', '#ea4335'), ('C', '#00c4cc'),
            ('T', '#25f4ee'), ('S', '#0f9d58'), ('C', '#006bff'), ('D', '#4285f4'), ('N', '#f1f1ee'), ('C', '#10a37f'), ('Y', '#ff3d3d')]
    tabs = ''
    for i, (ch, col) in enumerate(favs):
        act = i == 12
        fg = GRAPH if col in ('#f1f1ee', '#25f4ee', '#00c4cc') else '#fff'
        tabs += (f'<div style="flex:1 1 0;min-width:0;height:54px;margin-top:20px;border-radius:12px 12px 0 0;background:{"#35363a" if act else "transparent"};'
                 f'border-right:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center">'
                 f'<div style="width:24px;height:24px;border-radius:6px;background:{col};color:{fg};font:700 15px/24px {SANS};text-align:center">{ch}</div></div>')
    lights = ''.join(f'<i style="display:block;width:16px;height:16px;border-radius:50%;background:{c}"></i>' for c in ('#ff5f57', '#febc2e', '#28c840'))
    bubble = (f'<div style="align-self:flex-end;max-width:70%;background:#303030;border-radius:24px;padding:16px 24px;font:400 28px/1.3 {SANS};color:#ececec">'
              f'give me 10 viral hooks for my trading page. make them sound like the big accounts</div>')
    hooks = ['1. The one setup I would trade forever', '2. Stop doing this if you trade forex', '3. Why most traders blow their first account', '4. What the top 1% do differently']
    answer = ''.join(f'<div style="font:400 26px/1.25 {SANS};color:#d6d6d6;margin-top:12px">{h}</div>' for h in hooks)
    return (f'<div class="abs" style="left:{left}px;top:{top}px;width:{width}px;height:{height}px;border-radius:24px;background:#202124;overflow:hidden;'
            f'border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 70px rgba(0,0,0,.6)">'
            f'<div style="height:74px;background:#202124;display:flex;align-items:flex-start;padding:0 18px">'
            f'<div style="display:flex;gap:9px;margin:28px 18px 0 4px">{lights}</div>'
            f'<div style="flex:1;display:flex;min-width:0">{tabs}</div>'
            f'<div style="font:700 22px/74px {SANS};color:#bdbdbd;margin-left:14px;white-space:nowrap">2:07 AM</div></div>'
            f'<div style="height:58px;background:#35363a;display:flex;align-items:center;padding:0 22px">'
            f'<div style="flex:1;height:38px;border-radius:19px;background:#202124;font:400 22px/38px {SANS};color:#bdbdbd;padding-left:22px">chatgpt.com</div></div>'
            f'<div style="height:{height - 132}px;background:#212121;display:flex;flex-direction:column;padding:30px 40px">'
            f'{bubble}<div style="margin-top:22px;font:700 26px {SANS};color:#ececec">Here are 10 hooks:</div>{answer}</div></div>')


def s06e():
    img = prep_photo_full(37, 'p06.png')
    body = scene(img, .55, .45, .78)
    body += at(250, line("so you try harder.", 76, 700, ls=-2.6, lh=1.05)
               + line("more posts. more tools.", 44, mt=26)
               + line("another chatgpt tab at " + marker("2am"), 44, mt=10, lh=1.45))
    bx, by, bw, bh = 50, 560, 980, 520
    body += browser_card(bx, by, bw, bh)
    body += hand_ring(bx + 108, by - 6, bw - 290, 92)
    body += f'<div class="abs" style="left:{bx + bw - 260}px;top:{by - 72}px;font:700 42px {SANS};color:{RED};transform:rotate(-5deg)">14 tabs open</div>'
    body += '<div class="abs" style="left:0;top:1080px;width:1080px;height:480px;background:linear-gradient(180deg,rgba(11,12,13,0),rgba(11,12,13,.72) 22%,rgba(11,12,13,.72) 78%,rgba(11,12,13,0))"></div>'
    body += at(1130, line("you start copying what the big names do.", 44)
               + line("and you end up promoting their format instead of building your own.", 44, mt=18)
               + line("meanwhile the thing that actually pays you gets " + ul("<b>less of your time.</b>"), 44, mt=34, lh=1.35))
    return body


# ------------------------------------------------------------------ 07e  the timeline that goes quiet
def msg_card(left, top, width, name, stamp, text, reacts='', big=False):
    av = 64 if big else 54
    fs = 32 if big else 27
    r = ''
    if reacts:
        r = f'<div style="display:flex;gap:8px;margin-top:10px">' + ''.join(
            f'<span style="background:#2b2d31;border-radius:10px;padding:3px 12px;font:400 22px {SANS};color:#dbdee1">{x}</span>' for x in reacts.split('|')) + '</div>'
    return (f'<div class="abs" style="left:{left}px;top:{top}px;width:{width}px;background:{CARD};border:1.5px solid rgba(255,255,255,.22);'
            f'box-shadow:0 18px 40px rgba(0,0,0,.55);padding:{22 if big else 18}px 26px;display:flex;gap:18px">'
            f'<div style="width:{av}px;height:{av}px;border-radius:50%;flex:none;background:linear-gradient(140deg,#6b6d74,#3a3b40);color:#fff;'
            f'font:700 {av // 2}px/{av}px {SANS};text-align:center">y</div>'
            f'<div style="min-width:0"><div style="font:700 {fs}px {SANS};color:#f2f3f5">{name} <span style="font-weight:400;font-size:{fs - 8}px;color:#949ba4;margin-left:8px">{stamp}</span></div>'
            f'<div style="font:400 {fs}px/1.3 {SANS};color:#dbdee1;margin-top:4px">{text}</div>{r}</div></div>')


def s07e():
    img = prep_photo_full(26, 'p07.png')
    body = scene(img, .78, .55, .72)
    body += at(250, line("that's where most people " + ul("<b>plateau.</b>"), 64, 400, ls=-2, lh=1.12)
               + line("then they pick the main business, because that's what keeps food on the table.", 42, mt=26)
               + line("and the info side dies quietly.", 42, mt=14)
               + line("none of that is your fault.", 42, mt=14, family=SERIF, ls=0, color='#e8e6e1'))
    # rows: (label, sub, colour, dot x, dot y, card left, card top, card width, card side)
    rows = [('month 1', 'all in', EMERALD, 320, 790, 380, 730, 650, 'right'),
            ('month 3', 'grinding', AMBER, 760, 1020, 50, 965, 660, 'left'),
            ('month 4', 'busy season', ORANGE, 320, 1235, 380, 1180, 650, 'right')]
    cards = [msg_card(380, 730, 650, 'you', 'Mon 21:14', 'starting the info side this month. posting every day from today', '🔥 3'),
             msg_card(50, 965, 660, 'you', 'Thu 02:07', 'posted again. 41 views. no idea what is working'),
             msg_card(380, 1180, 650, 'you', 'Sat 23:50', 'main business is crazy right now. i will post next week')]
    svg = f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
    labels = ''
    prev = None
    for i, (lab, sub, col, dx, dy, cl, ct, cw, side) in enumerate(rows):
        ex = cl if side == 'right' else cl + cw
        svg += f'<line x1="{dx}" y1="{dy}" x2="{ex}" y2="{dy}" stroke="{col}" stroke-width="3"/>'
        if prev:
            svg += f'<line x1="{prev[0]}" y1="{prev[1]}" x2="{dx}" y2="{dy}" stroke="{prev[2]}" stroke-width="3" opacity=".9"/>'
        svg += f'<circle cx="{dx}" cy="{dy}" r="19" fill="{col}"/>'
        prev = (dx, dy, col)
        lx = 60 if side == 'right' else 800
        labels += (f'<div class="abs" style="left:{lx}px;top:{dy - 58}px;width:{240 if side == "right" else 260}px">'
                   f'<div style="font:700 60px/1 {SANS};letter-spacing:-2px;color:#fff">{lab}</div>'
                   f'<div style="font:400 30px {SANS};color:#c9c9c9;margin-top:6px">{sub}</div></div>')
    # last: the big card, month 6
    svg += f'<line x1="{prev[0]}" y1="{prev[1]}" x2="540" y2="1388" stroke="{prev[2]}" stroke-width="3"/><circle cx="540" cy="1388" r="21" fill="{RED}"/></svg>'
    last = msg_card(80, 1428, 920, 'you', '9 weeks later', 'haven\'t posted since march. i\'ll get back to it when things calm down', '', big=True)
    last_label = (f'<div class="abs" style="left:600px;top:1340px"><span style="font:700 60px/1 {SANS};letter-spacing:-2px;color:#fff">month 6</span>'
                  f'<span style="font:400 30px {SANS};color:#c9c9c9;margin-left:14px">quiet</span></div>')
    ring = hand_ring(262, 1448, 180, 54, '#ffffff', 5)
    body += svg + ''.join(cards) + labels + last + last_label + ring
    return body


# ------------------------------------------------------------------ 08e  translucent bands over the walkway
def s08e():
    img = prep_photo_full(47, 'p08.png')
    body = scene(img, .82, .55, .35)
    body += at(250, line("here's what most people miss.", 64, 700, ls=-2.2, lh=1.08)
               + line("the top of every niche is <b>3 or 4 names.</b>", 42, mt=20))
    # bands: (top, left edge at top, left edge at bottom, height, title, serif sub)
    bands = [(500, 560, 600, 150, '3 or 4 names', 'everyone already knows them'),
             (668, 400, 450, 170, 'new faces, every month', 'they bring something new'),
             (856, 250, 300, 170, 'you, sounding like you', 'the way in is your own voice')]
    svg = f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
    txt = ''
    for i, (t, l_top, l_bot, h, title, sub) in enumerate(bands):
        op = [.62, .7, .78][i]
        col = f'rgba(52,170,160,{op})' if i < 2 else f'rgba(95,214,164,{op})'
        svg += f'<polygon points="{l_top},{t} 1080,{t} 1080,{t + h} {l_bot},{t + h}" fill="{col}"/>'
        cx = (l_top + 1080) / 2 + 30
        txt += (f'<div class="abs" style="left:{l_top + 70}px;top:{t + 26}px;width:{1080 - l_top - 90}px">'
                f'<div style="font:700 {48 if i else 44}px/1.05 {SANS};letter-spacing:-1.2px;color:#fff">{title}</div>'
                f'<div style="font:400 30px/1.2 {SERIF};color:#f2f2ee;margin-top:8px">{sub}</div></div>')
    labs = [('TOP', 90, 520, '#7fe3d8'), ('NEW', 150, 700, '#7fe3d8'), ('YOU', 80, 890, EMERALD)]
    for i, (lab, x, y, col) in enumerate(labs):
        txt += f'<div class="abs" style="left:{x}px;top:{y}px;padding:0 16px 6px;border:4px solid {col};font:700 58px/1.1 {SANS};letter-spacing:-1px;color:{col};background:rgba(11,12,13,.25)">{lab}</div>'
    svg += ('<line x1="150" y1="602" x2="205" y2="696" stroke="#fff" stroke-width="3"/>'
            '<line x1="205" y1="782" x2="150" y2="886" stroke="#fff" stroke-width="3"/></svg>')
    body += svg + txt
    body += '<div class="abs" style="left:0;top:1040px;width:1080px;height:520px;background:linear-gradient(180deg,rgba(11,12,13,0),rgba(11,12,13,.62) 20%,rgba(11,12,13,.62) 80%,rgba(11,12,13,0))"></div>'
    body += at(1080, line("but new people break in every single month.", 42)
               + line("not because they're bigger. because they bring something new.", 42, mt=14)
               + line("people always want a new face with a new idea.", 42, mt=14)
               + line("\"you don't need to be first. you need to " + marker("sound like you.", SILVER, GRAPH) + "\"", 56, 700, mt=34, ls=-1.8, lh=1.25))
    return body


D = {'06e': s06e, '07e': s07e, '08e': s08e}

if __name__ == '__main__':
    which = sys.argv[1:] or list(D)
    for n in which:
        render(n, page(D[n]()))
    w, h = 540, 960
    sheet = Image.new('RGB', (3 * (w + 12) + 12, h + 24), (22, 22, 22))
    for i, n in enumerate(['06e', '07e', '08e']):
        fp = os.path.join(HERE, n + '.png')
        if os.path.exists(fp):
            sheet.paste(Image.open(fp).convert('RGB').resize((w, h), Image.LANCZOS), (12 + i * (w + 12), 12))
    sheet.save(os.path.join(HERE, 'sheet-e.jpg'), quality=92)
    print('sheet ok')

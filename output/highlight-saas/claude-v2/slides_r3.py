"""Round 3: components with jobs (Codex forensic audit). Slides 2, 5, 8, 10, 11, 12.
Natural photos (cover crop, no blur/mirror), real product crops tagged 'example workspace'.
Run: python slides_r3.py [02 05 ...]"""
import sys
from engine import *

PROD = os.path.join(ROOT, 'output', 'highlight-saas', 'project', 'html', 'assets', 'product')
TAG = 'example workspace &middot; sample data'


def crop(src, box, out, scale=1.0):
    im = Image.open(os.path.join(PROD, src)).convert('RGB')
    s = im.width / 1200 if scale == 'ui' else 1.0
    b = tuple(int(v * s) for v in box)
    c = im.crop(b)
    pth = os.path.join(HERE, 'img', out)
    safe_save(c, pth)
    return pth.replace('\\', '/'), c.size


def back(inner, extra=''):
    """native close-fitting text backing"""
    return (f'<div style="display:inline-block;background:rgba(11,12,13,.66);padding:12px 26px 18px;border-radius:22px;{extra}">{inner}</div>')


def badge(n, total=3, top=250):
    dots = ''
    for i in range(total):
        on = i < n
        dots += f'<div style="width:22px;height:22px;border-radius:50%;background:{SILVER if on else "transparent"};border:3px solid {SILVER}"></div>'
        if i < total - 1:
            dots += f'<div style="width:46px;height:3px;background:{SILVER};opacity:.7"></div>'
    return at(top, f'<div style="display:flex;align-items:center;gap:30px"><div style="width:92px;height:92px;border-radius:50%;background:{SILVER};color:{GRAPH};'
              f'display:grid;place-items:center;font-size:56px;font-weight:700;letter-spacing:-2px;box-shadow:0 12px 34px rgba(0,0,0,.45)">{n}</div>'
              f'<div style="display:flex;align-items:center;gap:10px">{dots}</div></div>')


def shot(path, w, left, top, extra=''):
    return (f'<img src="file:///{path}" class="abs" style="left:{left}px;top:{top}px;width:{w}px;border-radius:28px;'
            f'border:1px solid rgba(255,255,255,.22);box-shadow:0 26px 70px rgba(0,0,0,.6);{extra}">')


def tag(top, left=72, text=TAG):
    return at(top, f'<div class="label" style="font-size:22px;text-shadow:0 2px 10px rgba(0,0,0,.8)">{text}</div>', left=left)


def bgdiv(img):
    return f'<div class="bg" style="background-image:url(\'file:///{img}\')"></div>'


def topfade(h, a=.74):
    return f'<div class="abs" style="left:0;top:0;width:1080px;height:{h}px;background:linear-gradient(180deg,rgba(11,12,13,{a}) 0%,rgba(11,12,13,{a*.6:.2f}) 78%,rgba(11,12,13,0) 100%)"></div>'


def check_(c, size=54):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 54 54" style="flex:none"><circle cx="27" cy="27" r="24" fill="none" stroke="{c}" stroke-width="5"/>'
            f'<path d="M15 28 L24 37 L40 18" fill="none" stroke="{c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def xmark_(c, size=54):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 54 54" style="flex:none"><circle cx="27" cy="27" r="24" fill="none" stroke="{c}" stroke-width="5"/>'
            f'<path d="M17 17 L37 37 M37 17 L17 37" fill="none" stroke="{c}" stroke-width="6" stroke-linecap="round"/></svg>')


# ------------------------------------------------------------------ 02 quantity contrast: one craft vs a pile of parts
def s02():
    img = prep_photo(20, 'q02.png', focus=(.5, .5))
    big = (f'<div style="width:380px;height:330px;border-radius:44px;background:{SILVER};color:{GRAPH};display:flex;flex-direction:column;justify-content:flex-end;padding:34px;'
           f'box-shadow:0 22px 60px rgba(0,0,0,.55)"><div style="font-size:26px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.6">one business</div>'
           f'<div style="font-size:78px;line-height:.95;font-weight:700;letter-spacing:-3px;margin-top:12px">your craft</div></div>')
    names = ['content', 'traffic', 'page', 'calls', 'team', 'cash']
    small = ''.join(f'<div style="width:170px;height:96px;border-radius:24px;background:rgba(150,152,158,.5);border:1px solid rgba(255,255,255,.22);color:{INK};'
                    f'display:grid;place-items:center;font-size:32px;font-weight:700;letter-spacing:-.8px">{n}</div>' for n in names)
    pile = (f'<div style="width:490px"><div style="font-size:26px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:{INK};opacity:.85;margin-bottom:14px;'
            f'text-shadow:0 2px 12px rgba(0,0,0,.8)">a second business</div><div style="display:flex;flex-wrap:wrap;gap:14px">{small}</div></div>')
    body = bgdiv(img)
    body += at(250, back(p("you're already good at what you do.", 84, 700, lh=1.03, ls=-3.1)))
    body += at(530, back(p("trading. tiktok shop. whatever it is.", 46, 400, '#cfcfd2')))
    body += at(640, back(p("and you know a mentorship can make you more than the thing itself.", 46), 'max-width:900px'))
    body += at(840, back(p("but info is a whole business on its own.", 46, 700)))
    body += at(960, f'<div style="display:flex;gap:56px;align-items:flex-end">{big}{pile}</div>')
    body += at(1370, back(p("so now you're learning", 58, ls=-1.8) + f'<div style="margin:12px 0 8px -4px">{block("two businesses", 124)}</div>' + p("at once.", 58, ls=-1.8), 'padding:20px 30px 26px'))
    return body


# ------------------------------------------------------------------ 05 dot path with the leak
def s05():
    img = prep_photo(38, 'q05.png', focus=(.5, .5))
    cols = ['#f2c230', '#f08a24', RED, '#e0407f', SILVER]
    lines = ["you post something.", "a couple of people dm you.", "you lose half of them in the chat.", "the ones who book don't close.",
             "and you have no idea " + ul("which post") + " brought any of them in."]
    ys = [300, 560, 820, 1080, 1340]
    cx = 112
    svg = '<svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920">'
    for i in range(4):
        svg += f'<line x1="{cx}" y1="{ys[i]+64}" x2="{cx}" y2="{ys[i+1]+(30-34 if i<3 else 40-44)}" stroke="{INK}" stroke-width="4" opacity=".8"/>'
    for i in (2, 3):
        y0 = ys[i] + 150
        svg += (f'<path d="M{cx} {ys[i]+64} C {cx} {y0}, {cx+260} {y0}, 900 {y0+10}" fill="none" stroke="{RED}" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round"/>'
                f'<path d="M880 {y0-14} L 912 {y0+10} L 880 {y0+34}" fill="none" stroke="{RED}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
                f'<text x="740" y="{y0+52}" font-family="Helvetica,Arial" font-weight="700" font-size="36" fill="#ff6a64">gone</text>')
    for i, c in enumerate(cols):
        r = 34 if i < 4 else 44
        svg += f'<circle cx="{cx}" cy="{ys[i]+(30 if i<4 else 40)}" r="{r}" fill="{c}"/>'
        if i == 4:
            svg += f'<text x="{cx}" y="{ys[i]+62}" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="64" fill="{GRAPH}">?</text>'
    svg += '</svg>'
    body = bgdiv(img) + svg
    for i, (t, y) in enumerate(zip(lines, ys)):
        sz = 60 if i < 4 else 54
        body += at(y - (0 if i < 4 else 14), back(p(t, sz, 700, lh=1.12, ls=-1.8)), left=190, width=800)
    body += tag(1560, text='illustrative path &middot; no figures')
    return body


# ------------------------------------------------------------------ 08 quantity contrast: four big tiles, new ones breaking in
def s08():
    img = prep_photo(47, 'q08.png', focus=(.5, .5))
    big = ''.join(f'<div style="width:196px;height:196px;border-radius:40px;background:{SILVER};box-shadow:0 18px 50px rgba(0,0,0,.55)"></div>' for _ in range(4))
    smalls = ''
    for i in range(14):
        x = (i % 7) * 136; y = (i // 7) * 100
        smalls += f'<div class="abs" style="left:{x}px;top:{y}px;width:96px;height:80px;border-radius:22px;background:{EMERALD};opacity:{.35 + .65 * (i % 7) / 6:.2f}"></div>'
    pile = f'<div style="position:relative;height:190px;width:936px">{smalls}</div>'
    body = bgdiv(img) + topfade(1000, .78)
    body += at(250, p("here's what most people miss.", 66, 700, lh=1.04, ls=-2.4))
    body += at(380, p("the top of every niche is 3 or 4 names.", 44, 400, ls=-1))
    body += at(470, f'<div style="display:flex;gap:20px;justify-content:space-between">{big}</div>')
    body += (f'<svg class="abs" style="left:0;top:670px" width="1080" height="110" viewBox="0 0 1080 110"><path d="M540 100 C 540 70, 540 50, 540 14" fill="none" stroke="{EMERALD}" stroke-width="8" stroke-linecap="round"/>'
             f'<path d="M508 40 L 540 8 L 572 40" fill="none" stroke="{EMERALD}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    body += at(790, f'<div class="label" style="color:{EMERALD};margin-bottom:14px;text-shadow:0 2px 10px rgba(0,0,0,.8)">new faces, every single month</div>{pile}')
    body += at(1060, back(p("but new people break in every single month.", 42, ls=-1) + p("not because they're bigger. because they bring something new.", 42, ls=-1, mt=8) + p("people always want a new face with a new idea.", 42, ls=-1, mt=8), 'max-width:936px'))
    body += at(1370, f'<div style="font-size:60px;line-height:1.08;font-weight:700;letter-spacing:-2.2px;text-shadow:0 2px 20px rgba(0,0,0,.7)">"you don\'t need to be first. you need to {block("sound like you.", 60, pad="0 16px 10px", radius=14)}"</div>')
    return body


# ------------------------------------------------------------------ 10 / 11 / 12  number badge + progress dots + real product
def s10():
    img = prep_photo(49, 'q10.png', focus=(.72, .5))
    c, (cw, ch) = crop('write.png', (390, 225, 1030, 445), 'c10.png', 'ui')
    h = round(936 * ch / cw)
    body = bgdiv(img) + topfade(760, .72)
    body += badge(1)
    body += at(370, p("now you sit down and you already know what to make.", 68, 700, lh=1.05, ls=-2.4))
    body += shot(c, 936, 72, 640)
    body += tag(640 + h + 14)
    body += at(640 + h + 70, back(p("it's written in " + block("your voice", 52, pad="0 18px 10px", radius=14) + ", so you don't sound like everyone else.", 44, ls=-1, lh=1.4)
                                    + p("the people who see it land somewhere that sells.", 44, ls=-1, mt=10) + p("and we work through it with you.", 44, 700, ls=-1, mt=10)))
    return body


def s11():
    img = prep_photo(41, 'q11.png', focus=(.5, .5))
    t1 = os.path.join(PROD, 'funnel-calls.png').replace('\\', '/'); t2 = os.path.join(PROD, 'funnel-cash.png').replace('\\', '/')
    rows = (f'<div style="display:flex;align-items:center;gap:22px;margin-top:20px">{check_(EMERALD)}<div style="font-size:50px;font-weight:700;letter-spacing:-1.4px">you see who\'s closing.</div></div>'
            f'<div style="display:flex;align-items:center;gap:22px;margin-top:12px">{xmark_(RED)}<div style="font-size:50px;font-weight:700;letter-spacing:-1.4px">who\'s not.</div></div>')
    body = bgdiv(img) + topfade(760, .74)
    body += badge(2)
    body += at(370, p("then the sales side.", 92, 700, lh=1, ls=-3.4) + rows)
    body += shot(t1, 600, 72, 760) + shot(t2, 600, 408, 940)
    body += tag(1200)
    body += at(1270, back(p("who's hitting their calls. who's hitting your numbers.", 42, ls=-.9) + p("no more guessing what happened on a call.", 42, ls=-.9, mt=8) + p("no scripts to write yourself.", 42, 700, ls=-.9, mt=8)))
    return body


def s12():
    img = prep_photo(46, 'q12.png', focus=(.5, .5))
    sp = os.path.join(PROD, 'funnel-flow.png')
    W0, H0 = Image.open(sp).size
    strip = sp.replace('\\', '/')
    lens, (lw, lh_) = crop('funnel-flow.png', (int(W0 * 4 / 7), 0, W0, H0), 'c12.png')
    sh = round(936 * H0 / W0); lh = round(936 * lh_ / lw)
    ytop = 560; ylens = ytop + sh + 120
    x0 = 72 + round(936 * 4 / 7)
    svg = (f'<svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920">'
           f'<rect x="{x0}" y="{ytop-6}" width="{72+936-x0}" height="{sh+12}" rx="14" fill="none" stroke="{SILVER}" stroke-width="5"/>'
           f'<line x1="{x0}" y1="{ytop+sh+6}" x2="72" y2="{ylens}" stroke="{SILVER}" stroke-width="3"/>'
           f'<line x1="{72+936}" y1="{ytop+sh+6}" x2="{72+936}" y2="{ylens}" stroke="{SILVER}" stroke-width="3"/></svg>')
    body = bgdiv(img) + topfade(560, .78)
    body += badge(3)
    body += at(370, p("and every post is tracked. who watched, who clicked, who booked, who paid.", 44, ls=-.8, lh=1.22))
    body += shot(strip, 936, 72, ytop, 'border-radius:22px') + svg
    body += shot(lens, 936, 72, ylens)
    body += tag(ylens + lh + 14)
    qy = ylens + lh + 70
    body += at(qy, back('<div style="font-size:84px;line-height:1.02;font-weight:700;letter-spacing:-3.6px">"you never post ' + block("blind", 84, pad="0 20px 10px", radius=14) + ' ' + ul('again."') + '</div>', 'padding:16px 30px 28px'))
    return body


SL = {'02': s02, '05': s05, '08': s08, '10': s10, '11': s11, '12': s12}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(SL)):
        render('r3_' + n, page(SL[n]()))

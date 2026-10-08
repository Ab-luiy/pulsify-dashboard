"""Round 4 (founder 2026-10-08): natural cover crops only (no zoom-out, no mirror), punchy one-line copy,
Apple-ad product heroes (10-12), the whole-chain expertise slide (3). Run: python slides_r4.py [01 02 ...]"""
import sys
import numpy as np
from engine import *
from slides_r3 import PROD, crop, back, badge, tag, bgdiv, check_, xmark_

SANS = "Helvetica,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',serif"
MARK = os.path.join(ROOT, 'brand', 'logo', 'variations', '01-flat-white.png')
CUT = os.path.join(HERE, 'img', 'cutout.png')


def U(f):
    return os.path.join(HERE, 'img', f).replace('\\', '/')


def top(h, a=.72):
    return f'<div class="abs" style="left:0;top:0;width:1080px;height:{h}px;background:linear-gradient(180deg,rgba(11,12,13,{a}) 0%,rgba(11,12,13,{a*.55:.2f}) 80%,rgba(11,12,13,0) 100%)"></div>'


def bottom(y, a=.7):
    return f'<div class="abs" style="left:0;top:{y}px;width:1080px;height:{H-y}px;background:linear-gradient(0deg,rgba(11,12,13,{a}) 0%,rgba(11,12,13,{a*.5:.2f}) 70%,rgba(11,12,13,0) 100%)"></div>'


# ------------------------------------------------------------------ 01
def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def s01():
    import cv2
    orig = ImageOps.exif_transpose(Image.open(find_photo(14))).convert('RGB')
    sc = H / orig.height
    big = orig.resize((round(orig.width * sc), H), Image.LANCZOS)
    x0 = int((big.width - W) * .317)
    base = big.crop((x0, 0, x0 + W, H))
    a = Image.open(CUT).convert('RGBA').split()[3].resize(big.size, Image.LANCZOS).crop((x0, 0, x0 + W, H))
    m = Image.fromarray((smooth(np.asarray(a).astype(np.float32) / 255, .18, .92) * 255).astype(np.uint8))
    flat = Image.open(MARK).convert('RGBA').resize((660, 660), Image.LANCZOS)
    al = Image.new('L', (W, H), 0)
    al.paste(flat.split()[3], (780 - 330, 780 - 330))
    white = Image.new('L', (W, H), 255)
    bloom = Image.merge('RGBA', (white, white, white, al.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * .75))))
    sharp = Image.merge('RGBA', (white, white, white, al.point(lambda v: int(v * .34))))
    warm = Image.new('RGB', (W, H), (150, 96, 78))
    wa = al.filter(ImageFilter.GaussianBlur(60)).point(lambda v: int(v * .5))
    scn = ImageChops.screen(base, ImageChops.multiply(warm, Image.merge('RGB', (wa, wa, wa))))
    scn = Image.alpha_composite(Image.alpha_composite(scn.convert('RGBA'), bloom), sharp).convert('RGB')
    out = Image.composite(base, scn, m)
    pth = os.path.join(HERE, 'img', 'r4_s1.png')
    safe_save(dither(out), pth)
    sh = 'text-shadow:0 0 22px rgba(0,0,0,.8)'
    body = bgdiv(pth.replace('\\', '/'))
    body += at(250, p("i've been working on this", 38, 400, lh=1.1, ls=-.8) + f'<div style="margin:12px 0 10px -4px">{block("all year", 104)}</div>'
               + p("up until today.", 62, 700, lh=1, ls=-2.4), width=480, extra=sh)
    body += at(880, p("i noticed something every creator i've worked with has in common.", 40, 400, lh=1.22, ls=-.9), width=470, extra=sh)
    body += at(1130, p("everyone is stuck on the " + ul("same problem."), 60, 700, lh=1.12, ls=-2.2), width=480, extra=sh)
    return body


# ------------------------------------------------------------------ 02
def s02():
    img = prep_photo(20, 'r4_02.png', focus=(.5, .5))
    big = (f'<div style="width:380px;height:330px;border-radius:44px;background:{SILVER};color:{GRAPH};display:flex;flex-direction:column;justify-content:flex-end;padding:34px;'
           f'box-shadow:0 22px 60px rgba(0,0,0,.55)"><div style="font-size:26px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.6">business one</div>'
           f'<div style="font-size:78px;line-height:.95;font-weight:700;letter-spacing:-3px;margin-top:12px">your craft</div></div>')
    names = ['content', 'traffic', 'page', 'calls', 'team', 'cash']
    small = ''.join(f'<div style="width:170px;height:96px;border-radius:24px;background:rgba(150,152,158,.5);border:1px solid rgba(255,255,255,.22);color:{INK};'
                    f'display:grid;place-items:center;font-size:32px;font-weight:700;letter-spacing:-.8px">{n}</div>' for n in names)
    pile = (f'<div style="width:490px"><div style="font-size:26px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:{INK};margin-bottom:14px;'
            f'text-shadow:0 2px 12px rgba(0,0,0,.8)">business two: info</div><div style="display:flex;flex-wrap:wrap;gap:14px">{small}</div></div>')
    body = bgdiv(img)
    body += at(250, back(p("you're already good at what you do.", 84, 700, lh=1.03, ls=-3.1)))
    body += at(520, back(p("trading. tiktok shop. whatever it is.", 46, 400, '#cfcfd2')))
    body += at(630, back(p("a mentorship can make you more than the thing itself.", 46), 'max-width:936px'))
    body += at(760, back(p("but info is its own business.", 56, 700)))
    body += at(900, f'<div style="display:flex;gap:56px;align-items:flex-end">{big}{pile}</div>')
    body += at(1330, back(p("so now you're running", 58, ls=-1.8) + f'<div style="margin:12px 0 8px -4px">{block("two businesses", 124)}</div>' + p("at once.", 58, ls=-1.8), 'padding:20px 30px 26px'))
    return body


# ------------------------------------------------------------------ 03 the whole chain (expertise as a shiny object)
def buddies():
    cols = [EMERALD, '#f2c230', '#f08a24', '#e0407f', '#7aa7ff', SILVER]
    out = ''
    for i, c in enumerate(cols):
        x = 24 + i * 52; y = 66 + (i % 2) * 14
        arm = -8 if i % 2 else 8
        out += (f'<g stroke="{c}" stroke-width="4.5" stroke-linecap="round" fill="none"><circle cx="{x}" cy="{y-22}" r="11" fill="{c}" stroke="none"/>'
                f'<path d="M{x} {y-10} Q {x+3} {y+8} {x} {y+26}"/><path d="M{x-16} {y+2+arm} Q {x} {y-4} {x+16} {y+2-arm}"/>'
                f'<path d="M{x} {y+26} L {x-12} {y+46}"/><path d="M{x} {y+26} L {x+12} {y+46}"/></g>')
    return f'<svg width="330" height="130" viewBox="0 0 330 130">{out}</svg>'


def miro():
    cs = ['#f2c230', EMERALD, '#7aa7ff', '#e0407f', '#f08a24', SILVER]
    out = ''
    pts = [(10, 14), (122, 8), (234, 26), (66, 80), (176, 76), (258, 82)]
    for (x, y), c in zip(pts, cs):
        out += f'<rect x="{x}" y="{y}" width="64" height="54" rx="10" fill="{c}" opacity=".92"/>'
    out += (f'<path d="M74 41 L 122 35 M186 35 L 234 53 M98 80 L 98 62 M208 76 L 208 62 M240 80 L 266 92" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>')
    return f'<svg width="330" height="140" viewBox="0 0 330 140">{out}</svg>'


def brandfig():
    out = ''
    for r, o in ((62, .22), (46, .4), (30, .7)):
        out += f'<circle cx="165" cy="70" r="{r}" fill="none" stroke="{EMERALD}" stroke-width="4" opacity="{o}"/>'
    out += (f'<circle cx="165" cy="58" r="14" fill="{SILVER}"/><path d="M137 98 Q 165 62 193 98 Z" fill="{SILVER}"/>')
    for x, y in ((64, 40), (270, 96), (90, 112), (252, 34)):
        out += f'<circle cx="{x}" cy="{y}" r="9" fill="{SILVER}" opacity=".85"/><circle cx="{x}" cy="{y+12}" r="0"/>'
    out += f'<path d="M73 44 L 122 62 M262 94 L 208 80 M99 110 L 130 92 M243 40 L 200 56" stroke="{EMERALD}" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>'
    return f'<svg width="330" height="140" viewBox="0 0 330 140">{out}</svg>'


def pagechips():
    names = ['vsl', 'webinar', 'profile funnel', 'ascension', 'challenge']
    return '<div style="display:flex;flex-wrap:wrap;gap:8px;width:330px;justify-content:flex-end">' + ''.join(
        f'<span style="padding:6px 16px 10px;border-radius:999px;background:{SILVER if i == 0 else "rgba(255,255,255,.14)"};color:{GRAPH if i == 0 else INK};font-size:26px;font-weight:700;letter-spacing:-.4px">{n}</span>' for i, n in enumerate(names)) + '</div>'


def teamfig():
    def person(x, c, lab, head=True):
        return (f'<circle cx="{x}" cy="46" r="20" fill="{c}"/><path d="M{x-30} 112 Q {x} 54 {x+30} 112 Z" fill="{c}"/>'
                f'<path d="M{x-22} 44 Q {x} 8 {x+22} 44" fill="none" stroke="{INK}" stroke-width="4"/><circle cx="{x-22}" cy="48" r="5" fill="{INK}"/>'
                f'<text x="{x}" y="134" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="22" fill="{INK}">{lab}</text>')
    return f'<svg width="330" height="140" viewBox="0 0 330 140">{person(70, EMERALD, "setters")}{person(165, "#f2c230", "closers")}{person(260, "#7aa7ff", "setters")}</svg>'


def payicons():
    out = ''
    for n in ('stripe.svg', 'whop.png', 'fanbasis.png'):
        out += f'<img src="file:///{U(n)}" style="width:92px;height:92px;border-radius:22px;box-shadow:0 10px 26px rgba(0,0,0,.5)">'
    return f'<div style="display:flex;gap:16px;justify-content:flex-end">{out}</div>'


def s03():
    img = prep_photo(27, 'r4_03.png', focus=(.5, .5))
    rows = [('content', '', miro()), ('personal brand', 'people start buying into you', brandfig()), ('traffic', '', buddies()),
            ('landing page', '', pagechips()), ('sales team', 'talented closers + setters', teamfig()), ('cash in the bank', '', payicons())]
    body = bgdiv(img) + top(300, .6) + bottom(1200, .55)
    body += at(236, p("the whole chain.", 84, 700, lh=1, ls=-3.2))
    for i, (lab, sub, vis) in enumerate(rows):
        y = 340 + i * 190
        last = i == 5
        num = (f'<div style="width:62px;height:62px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:34px;font-weight:700;'
               f'background:{EMERALD if last else "transparent"};color:{GRAPH if last else INK};border:4px solid {EMERALD if last else INK}">{i+1}</div>')
        subh = f'<div style="font-size:25px;color:{MUTE};margin-top:6px;letter-spacing:-.3px;line-height:1.15">{sub}</div>' if sub else ''
        body += at(y, f'<div style="height:176px;border-radius:34px;background:rgba(14,15,17,.7);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;gap:22px;padding:0 24px 0 28px;'
                      f'box-shadow:0 14px 40px rgba(0,0,0,.4)">{num}<div style="width:330px;flex:none"><div style="font-size:{52 if len(lab)<14 else 46}px;font-weight:700;letter-spacing:-1.8px;line-height:1">{lab}</div>{subh}</div>'
                      f'<div style="flex:1;display:flex;justify-content:flex-end">{vis}</div></div>')
    body += at(1490, p("most people have never run it.", 36, ls=-.6, lh=1.2) + p("some don't even know what a kpi is.", 36, ls=-.6, lh=1.2) + p("and that's fine. nobody teaches you this part.", 38, 700, ls=-.8, mt=8), extra='text-shadow:0 2px 14px rgba(0,0,0,.8)')
    return body


# ------------------------------------------------------------------ 04 (approved, unchanged copy and layout; natural crop)
def s04():
    img = prep_photo(31, 'r4_04.png')
    items = ["you want to post, but you don't know what to say", "you know what to say, but nobody's watching",
             "people are watching, but you don't know where to send them", "calls are booked, but you can't tell who's closing and who isn't"]
    rows = ''.join(f'<div style="display:flex;gap:30px;align-items:flex-start;padding:28px 0;border-top:1px solid rgba(255,255,255,.18)">{xmark_(RED)}'
                   f'<div style="font-size:48px;line-height:1.2;letter-spacing:-1px;width:800px">{t}</div></div>' for t in items)
    return bgdiv(img) + bottom(600, .72) + at(660, p("it breaks somewhere:", 104, 700, lh=1, ls=-4.2)) + at(840, rows)


# ------------------------------------------------------------------ 05
def s05():
    img = prep_photo(38, 'r4_05.png', focus=(.5, .5))
    cols = ['#f2c230', '#f08a24', RED, '#e0407f', SILVER]
    lines = ["you post something.", "a couple people dm you.", "you lose half of them in the chat.", "the ones who book don't close.",
             "no idea " + ul("which post") + " brought any of them in."]
    ys = [300, 560, 820, 1080, 1340]
    cx = 112
    svg = '<svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920">'
    for i in range(4):
        svg += f'<line x1="{cx}" y1="{ys[i]+64}" x2="{cx}" y2="{ys[i+1]-4 if i<3 else ys[i+1]-4}" stroke="{INK}" stroke-width="4" opacity=".8"/>'
    for i in (2, 3):
        y0 = ys[i] + 120
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
        body += at(y, back(p(t, 54, 700, lh=1.12, ls=-1.7), '' if i == 4 else 'white-space:nowrap'), left=176, width=860)
    body += tag(1560, text='illustrative path &middot; no figures')
    return body


# ------------------------------------------------------------------ 06 / 07 reference copies on natural photos
S = 1080 / 828
px = lambda v: round(v * S)


def red_ul(t):
    return (f'<span style="position:relative;display:inline-block">{t}<span style="position:absolute;left:0;right:-6px;bottom:-{px(9)}px;height:{px(7)}px;background:{RED};border-radius:4px"></span></span>')


def xrow(t):
    return (f'<div style="display:flex;align-items:center;gap:{px(8)}px;line-height:1.08"><span style="color:{RED};font-weight:700;font-size:{px(44)}px">&#10005;</span><span>{t}</span></div>')


def s06():
    img = prep_photo(37, 'r4_06.png', focus=(.5, .5))
    t = f'font-family:{SANS};font-weight:700;color:#fff;letter-spacing:{-px(1.4)}px;text-shadow:0 2px 14px rgba(0,0,0,.45)'
    body = bgdiv(img) + top(1650, .7)
    body += (f'<div class="abs" style="left:{px(78)}px;top:{px(258)}px;width:{px(700)}px;{t};font-size:{px(38)}px">'
             f'<div style="line-height:1.15">so you {red_ul("try harder.")}</div>'
             f'<div style="margin-top:{px(46)}px">{xrow("more posts")}{xrow("more tools")}{xrow("another chatgpt tab at 2am")}</div>'
             f'<div style="margin-top:{px(46)}px;line-height:1.15">you start copying the big names.</div>'
             f'<div style="margin-top:{px(40)}px"><span style="background:rgba(11,12,13,.92);padding:{px(4)}px {px(10)}px {px(8)}px;border-radius:{px(5)}px;line-height:1.6;'
             f'-webkit-box-decoration-break:clone;box-decoration-break:clone">and end up promoting <span style="color:{RED}">their</span> format instead of building your own.</span></div>'
             f'<div style="margin-top:{px(44)}px;line-height:1.14">MEANWHILE THE THING THAT PAYS YOU GETS</div>'
             f'<div style="line-height:1.14">{red_ul("LESS OF YOUR TIME.")}</div></div>')
    return body


def s07():
    img = prep_photo(26, 'r4_07.png', focus=(.5, .5))
    base = f'font-family:{SANS};color:#fff;font-size:{px(31)}px;line-height:1.36;letter-spacing:-.3px;text-shadow:0 2px 12px rgba(0,0,0,.5)'
    bullet = lambda h: (f'<div style="display:flex;gap:{px(10)}px"><span style="flex:none">&bull;</span><span>{h}</span></div>')
    body = bgdiv(img) + top(1100, .8)
    body += f'<div class="abs" style="left:{px(47)}px;top:{px(266)}px;width:{px(720)}px;{base}">that\'s where most people <b>plateau.</b></div>'
    body += (f'<div class="abs" style="left:{px(47)}px;top:{px(350)}px;width:{px(700)}px;font-family:{SERIF};color:#fff;font-size:{px(29)}px;line-height:1.3;text-shadow:0 2px 12px rgba(0,0,0,.5)">none of that is your fault.</div>')
    body += (f'<div class="abs" style="left:{px(60)}px;top:{px(452)}px;width:{px(710)}px;border:{px(2.2)}px solid {RED};padding:{px(12)}px {px(14)}px {px(12)}px {px(12)}px;{base}">'
             + bullet("then they pick the <b>main business</b>, because that's what keeps <b>food on the table.</b>")
             + bullet("and the info side <b>dies quietly.</b>") + '</div>')
    return body


# ------------------------------------------------------------------ 08
def s08():
    img = prep_photo(47, 'r4_08.png', focus=(.5, .5))
    big = ''.join(f'<div style="width:196px;height:196px;border-radius:40px;background:{SILVER};box-shadow:0 18px 50px rgba(0,0,0,.55)"></div>' for _ in range(4))
    smalls = ''
    for i in range(14):
        x = (i % 7) * 136; y = (i // 7) * 100
        smalls += f'<div class="abs" style="left:{x}px;top:{y}px;width:96px;height:80px;border-radius:22px;background:{EMERALD};opacity:{.35 + .65 * (i % 7) / 6:.2f}"></div>'
    body = bgdiv(img) + top(1000, .78)
    body += at(250, p("here's what most people miss.", 66, 700, lh=1.04, ls=-2.4))
    body += at(380, p("the top of every niche is 3 or 4 names.", 42, 400, ls=-.9))
    body += at(470, f'<div style="display:flex;gap:20px;justify-content:space-between">{big}</div>')
    body += (f'<svg class="abs" style="left:0;top:670px" width="1080" height="110" viewBox="0 0 1080 110"><path d="M540 100 L 540 14" fill="none" stroke="{EMERALD}" stroke-width="8" stroke-linecap="round"/>'
             f'<path d="M508 40 L 540 8 L 572 40" fill="none" stroke="{EMERALD}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    body += at(790, f'<div class="label" style="color:{EMERALD};margin-bottom:14px;text-shadow:0 2px 10px rgba(0,0,0,.8)">new faces, every month</div><div style="position:relative;height:190px;width:936px">{smalls}</div>')
    body += at(1080, back(p("new people break in every single month.", 42, ls=-.9) + p("not bigger. they bring something new.", 42, ls=-.9, mt=8) + p("people want a new face with a new idea.", 42, ls=-.9, mt=8)))
    body += at(1380, f'<div style="font-size:62px;line-height:1.08;font-weight:700;letter-spacing:-2.3px;text-shadow:0 2px 20px rgba(0,0,0,.8)">you don\'t need to be first.<br>you need to {block("sound like you.", 62, pad="0 16px 10px", radius=14)}</div>')
    return body


# ------------------------------------------------------------------ 10-12 Apple-ad heroes
def hero(path, w, left, topy, rx=10, ry=-16, rz=0, glow=EMERALD):
    return (f'<div class="abs" style="left:{left-120}px;top:{topy-120}px;width:{w+240}px;height:{w*.6+240}px;background:radial-gradient(closest-side,{glow}55,transparent 72%);filter:blur(10px)"></div>'
            f'<div class="abs" style="left:{left}px;top:{topy}px;width:{w}px;perspective:1800px"><img src="file:///{path}" style="width:{w}px;display:block;border-radius:30px;'
            f'transform:rotateX({rx}deg) rotateY({ry}deg) rotateZ({rz}deg);border:1.5px solid rgba(255,255,255,.35);box-shadow:0 60px 120px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.06),inset 0 0 0 1px rgba(255,255,255,.1)"></div>')


def s10():
    img = prep_photo(49, 'r4_10.png', focus=(.72, .5))
    c, (cw, ch) = crop('write.png', (395, 225, 1030, 575), 'r4c10.png', 'ui')
    body = bgdiv(img) + top(900, .85) + bottom(1100, .8)
    body += badge(1)
    body += at(380, p("now you already know what to make.", 98, 700, lh=1.0, ls=-4))
    body += hero(c, 920, 80, 760, 8, -14, 0, '#6a7cff')
    body += tag(1340, text=TAGTXT)
    body += at(1400, p("it's written in " + block("your voice", 50, pad="0 18px 10px", radius=14) + ".", 42, ls=-1, lh=1.35)
               + p("you don't sound like everyone else.", 42, ls=-1, mt=6) + p("and we work through it with you.", 42, 700, ls=-1, mt=14), extra='text-shadow:0 2px 14px rgba(0,0,0,.8)')
    return body


TAGTXT = 'example workspace &middot; sample data'


def s11():
    img = prep_photo(41, 'r4_11.png', focus=(.5, .5))
    t1 = U2('funnel-calls.png'); t2 = U2('funnel-cash.png')
    body = bgdiv(img) + top(900, .8) + bottom(1250, .8)
    body += badge(2)
    body += at(380, p("you see who's closing.<br>who's " + ul("not."), 98, 700, lh=1.02, ls=-4))
    body += hero(t1, 760, 60, 740, 8, -16, -2, EMERALD)
    body += hero(t2, 760, 260, 1020, 8, 14, 2, '#6a7cff')
    body += tag(1340, text=TAGTXT)
    body += at(1400, p("who's hitting their calls. who's hitting your numbers.", 38, ls=-.8) + p("no more guessing. no scripts to write yourself.", 38, 700, ls=-.8, mt=10), extra='text-shadow:0 2px 14px rgba(0,0,0,.85)')
    return body


def U2(f):
    return os.path.join(PROD, f).replace('\\', '/')


def s12():
    img = prep_photo(46, 'r4_12.png', focus=(.5, .5))
    sp = os.path.join(PROD, 'funnel-flow.png')
    W0, H0 = Image.open(sp).size
    lens, _ = crop('funnel-flow.png', (int(W0 * 4 / 7), 0, W0, H0), 'r4c12.png')
    body = bgdiv(img) + top(700, .8) + bottom(1150, .8)
    body += badge(3)
    body += at(380, p("every post is tracked.", 92, 700, lh=1.0, ls=-3.8) + p("who watched. who clicked. who booked. who paid.", 38, ls=-.8, mt=18))
    body += hero(sp.replace('\\', '/'), 940, 70, 640, 10, 0, 0, '#6a7cff')
    body += hero(lens, 940, 70, 880, 8, 0, 0, EMERALD)
    body += tag(1290, text=TAGTXT)
    body += at(1340, back('<div style="font-size:92px;line-height:1.02;font-weight:700;letter-spacing:-3.8px">you never post ' + block("blind", 92, pad="0 20px 10px", radius=14) + '<br>' + ul('again.') + '</div>', 'padding:16px 30px 28px'))
    return body


# ------------------------------------------------------------------ 13 / 14
def s13():
    img = prep_photo(18, 'r4_13.png', focus=(.5, .5))
    body = bgdiv(img) + top(900, .72)
    body += at(262, p("none of this was built overnight.", 88, 700, lh=1.02, ls=-3.2)
               + p(ul("every framework was tested first."), 50, 700, ls=-1.2, mt=38)
               + p("then it became one place that does the heavy lifting, so you keep doing what you're good at.", 44, ls=-1, mt=30))
    return body


def s14():
    img = prep_photo(34, 'r4_14.png', focus=(.5, .5))
    body = bgdiv(img) + top(900, .78)
    body += at(262, p("right now it's only for the people i work with.", 64, 700, lh=1.05, ls=-2.2)
               + p("it's getting sharper every week.", 44, ls=-1, mt=28)
               + p("and i'm not stopping until this is a seven-figure company.", 44, ls=-1, mt=12))
    return body


SL = {'01': s01, '02': s02, '03': s03, '04': s04, '05': s05, '06': s06, '07': s07, '08': s08, '10': s10, '11': s11, '12': s12, '13': s13, '14': s14}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(SL)):
        render('r4_' + n, page(SL[n]()))

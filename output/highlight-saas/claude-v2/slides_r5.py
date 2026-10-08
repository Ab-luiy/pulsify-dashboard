"""Round 5 (founder 2026-10-08): Brez typography, few photos reused 2-3x with a blurred/dimmed carry-over,
designed (not screenshot) app cards, no 'example workspace' tags. Run: python slides_r5.py [01 02 ...]"""
import sys
import numpy as np
import final1 as F
from engine import *
import slides_r4 as R4
from slides_r4 import U, buddies, miro, brandfig, pagechips, payicons, red_ul, xrow, px, bgdiv, check_, xmark_, top, bottom

SANS = "Helvetica,Arial,sans-serif"
SH = 'text-shadow:0 2px 16px rgba(0,0,0,.55)'


def dim_photo(pid, out, focus=(.5, .5), blur=10, dark=.55):
    pth = prep_photo(pid, 'tmp_' + out, focus=focus)
    im = Image.open(pth).convert('RGB').filter(ImageFilter.GaussianBlur(blur))
    im = ImageChops.multiply(im, Image.new('RGB', im.size, (int(255 * dark),) * 3))
    q = os.path.join(HERE, 'img', out)
    safe_save(im, q)
    return q.replace('\\', '/')


def bz(text, size=58, mt=0, color='#fff', lh=1.12, extra=''):
    return f'<div style="font-family:{SANS};font-weight:700;color:{color};font-size:{size}px;line-height:{lh};letter-spacing:{-size*0.03:.1f}px;margin-top:{mt}px;{SH};{extra}">{text}</div>'


def rul(t):
    return (f'<span style="position:relative;display:inline-block">{t}<span style="position:absolute;left:0;right:-6px;bottom:-9px;height:8px;background:{RED};border-radius:4px"></span></span>')


def redw(t):
    return f'<span style="color:{RED}">{t}</span>'


def blackbox(t, size=46):
    return (f'<span style="background:rgba(11,12,13,.94);padding:6px 14px 12px;border-radius:7px;line-height:1.6;-webkit-box-decoration-break:clone;box-decoration-break:clone;'
            f'font-size:{size}px;font-weight:700;color:#fff">{t}</span>')


def carry(body, blur=7, op=.28):
    return f'<div class="abs" style="inset:0;filter:blur({blur}px);opacity:{op}">{body}</div>'


# ------------------------------------------------------------------ 01
def s01():
    F.FOCUS_X = .459
    base = F.photo_with_seamless_top()
    m = F.cutout_matte()
    flat = Image.open(F.b.MARKPNG).convert('RGBA').resize((820, 820), Image.LANCZOS)
    a = Image.new('L', (W, H), 0)
    a.paste(flat.split()[3], (440 - 410, 980 - 410))
    white = Image.new('L', (W, H), 255)
    bloom = Image.merge('RGBA', (white, white, white, a.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * .75))))
    sharp = Image.merge('RGBA', (white, white, white, a.point(lambda v: int(v * .4))))
    warm = Image.new('RGB', (W, H), (150, 96, 78))
    wa = a.filter(ImageFilter.GaussianBlur(60)).point(lambda v: int(v * .5))
    scn = ImageChops.screen(base, ImageChops.multiply(warm, Image.merge('RGB', (wa, wa, wa))))
    scn = Image.alpha_composite(Image.alpha_composite(scn.convert('RGBA'), bloom), sharp).convert('RGB')
    out = Image.composite(base, scn, m)
    pth = os.path.join(HERE, 'img', 'r5_s1.png')
    safe_save(dither(out), pth)
    c = 'text-align:center;left:0;width:1080px'
    body = bgdiv(pth.replace('\\', '/'))
    body += (f'<div class="abs" style="top:236px;{c}"><div style="font-size:40px;font-weight:400;letter-spacing:-1px">i\'ve been working on this</div>'
             f'<div style="margin:14px 0 14px">{block("all year", 130)}</div><div style="font-size:66px;font-weight:700;letter-spacing:-2.6px">up until today.</div></div>')
    body += (f'<div class="abs" style="top:1330px;{c};padding:0 90px;width:1080px"><div style="font-size:38px;line-height:1.2;letter-spacing:-.8px;{SH}">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:58px;font-weight:700;letter-spacing:-2.2px;line-height:1.1;margin-top:26px;{SH}">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return body


# ------------------------------------------------------------------ 02
def icon(kind, c=INK):
    s = {'candles': f'<path d="M24 18v50M24 30h0M48 8v60M72 24v44" stroke="{c}" stroke-width="5" stroke-linecap="round"/><rect x="16" y="30" width="16" height="24" rx="3" fill="{EMERALD}"/><rect x="40" y="20" width="16" height="30" rx="3" fill="{RED}"/><rect x="64" y="34" width="16" height="22" rx="3" fill="{EMERALD}"/>',
         'bag': f'<path d="M20 30h56l-5 46H25z" fill="none" stroke="{c}" stroke-width="5" stroke-linejoin="round"/><path d="M34 30v-6a14 14 0 0128 0v6" fill="none" stroke="{c}" stroke-width="5"/>',
         'funnel': f'<path d="M12 18h72L56 52v26l-16-8V52z" fill="none" stroke="{c}" stroke-width="5" stroke-linejoin="round"/>',
         'phone': f'<rect x="28" y="10" width="40" height="70" rx="9" fill="none" stroke="{c}" stroke-width="5"/><circle cx="48" cy="68" r="3" fill="{c}"/>',
         'cal': f'<rect x="16" y="22" width="64" height="54" rx="9" fill="none" stroke="{c}" stroke-width="5"/><path d="M16 38h64M34 14v14M62 14v14" stroke="{c}" stroke-width="5" stroke-linecap="round"/>',
         'cash': f'<circle cx="48" cy="46" r="30" fill="none" stroke="{c}" stroke-width="5"/><path d="M56 34c-4-4-18-4-18 5s18 4 18 13-14 9-19 4M48 28v40" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round"/>'}[kind]
    return f'<div style="width:128px;height:128px;border-radius:34px;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.4);display:grid;place-items:center;box-shadow:0 14px 34px rgba(0,0,0,.4)"><svg width="84" height="84" viewBox="0 0 96 96">{s}</svg></div>'


def s02():
    img = prep_photo(20, 'r5_02.png', focus=(.5, .5))
    g1 = ''.join(icon(k) for k in ('candles', 'bag'))
    g2 = ''.join(icon(k) for k in ('phone', 'funnel', 'cal', 'cash'))
    cap = lambda t: f'<div style="font-size:34px;font-weight:700;letter-spacing:-.8px;margin-top:16px;{SH}">{t}</div>'
    body = bgdiv(img) + top(1000, .66) + bottom(1100, .6)
    body += at(250, bz("you're already good at what you do.", 78, lh=1.05) + bz("trading. tiktok shop. whatever it is.", 46, 24, '#d6d6d8', extra='font-weight:400')
               + bz("and you know a mentorship can make you more than the thing itself.", 46, 22, extra='font-weight:400'), width=900)
    body += at(790, bz("but " + rul("info is a whole business") + " on its own.", 54), width=930)
    body += at(960, f'<div style="display:flex;align-items:flex-start;gap:30px"><div><div style="display:flex;gap:14px">{g1}</div>{cap("your craft")}</div>'
                    f'<div style="font-size:84px;font-weight:700;margin-top:10px;{SH}">+</div><div><div style="display:flex;gap:14px">{g2}</div>{cap("the info business")}</div></div>')
    body += at(1330, bz("so now you're learning", 54) + bz(f'two businesses<br>{redw("at once.")}', 110, 10, lh=1.0, extra='letter-spacing:-4.4px'), width=960)
    return body


# ------------------------------------------------------------------ 03 / 04 (same photo)
def s03_body():
    rows = [('content', '', miro()), ('personal brand', 'people start buying into you', brandfig()), ('traffic', '', buddies()),
            ('landing page', '', pagechips()), ('sales team', 'talented closers + setters', team2()), ('cash in the bank', '', payicons())]
    out = at(236, bz("the whole chain.", 88, lh=1.0))
    for i, (lab, sub, vis) in enumerate(rows):
        y = 340 + i * 190
        last = i == 5
        num = (f'<div style="width:62px;height:62px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:34px;font-weight:700;'
               f'background:{EMERALD if last else "transparent"};color:{GRAPH if last else INK};border:4px solid {EMERALD if last else INK}">{i+1}</div>')
        subh = f'<div style="font-size:25px;color:{MUTE};margin-top:6px;letter-spacing:-.3px;line-height:1.15">{sub}</div>' if sub else ''
        out += at(y, f'<div style="height:176px;border-radius:34px;background:rgba(14,15,17,.7);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;gap:20px;padding:0 24px 0 24px;'
                     f'box-shadow:0 14px 40px rgba(0,0,0,.4)">{num}<div style="width:300px;flex:none"><div style="font-size:{52 if len(lab)<14 else 44}px;font-weight:700;letter-spacing:-1.8px;line-height:1">{lab}</div>{subh}</div>'
                     f'<div style="flex:1;display:flex;justify-content:flex-end">{vis}</div></div>', left=170, width=838)
    # funnel column
    stages = [('top of funnel', 0, 3, '#7aa7ff'), ('middle', 3, 1, '#f2c230'), ('bottom', 4, 2, EMERALD)]
    fun = ''
    for lab, r0, n, c in stages:
        y0 = 340 + r0 * 190; hgt = n * 190 - 14
        wl = 98 - r0 * 15; wr = 98 - (r0 + n) * 15
        fun += (f'<svg class="abs" style="left:56px;top:{y0}px" width="104" height="{hgt}" viewBox="0 0 104 {hgt}"><path d="M{(104-wl)/2} 0 L{(104+wl)/2} 0 L{(104+wr)/2} {hgt} L{(104-wr)/2} {hgt} Z" fill="{c}" opacity=".88"/></svg>'
                f'<div class="abs" style="left:56px;top:{y0}px;width:104px;height:{hgt}px;display:grid;place-items:center"><div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:22px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:{GRAPH}">{lab}</div></div>')
    out += fun
    out += at(1500, bz("most people have never run it.", 36, lh=1.2, extra='font-weight:400') + bz("some don't even know what a kpi is.", 36, lh=1.2, extra='font-weight:400')
              + bz("and that's fine. nobody teaches you this part.", 38, 8), width=960)
    return out


def team2():
    def person(x, c, lab):
        return (f'<circle cx="{x}" cy="48" r="22" fill="{c}"/><path d="M{x-32} 118 Q {x} 62 {x+32} 118 Z" fill="{c}"/>'
                f'<text x="{x}" y="140" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="24" fill="{INK}">{lab}</text>')
    return f'<svg width="260" height="150" viewBox="0 0 260 150">{person(70, "#f2c230", "closer")}{person(190, "#7aa7ff", "setter")}</svg>'


def s03():
    img = prep_photo(27, 'r5_03.png', focus=(.5, .5))
    return bgdiv(img) + top(300, .6) + bottom(1200, .6) + s03_body()


def s04():
    img = dim_photo(27, 'r5_04.png', blur=9, dark=.55)
    items = ["you want to post, but you don't know what to say", "you know what to say, but nobody's watching",
             "people are watching, but you don't know where to send them", "calls are booked, but you can't tell who's closing and who isn't"]
    rows = ''.join(f'<div style="display:flex;gap:{px(14)}px;align-items:flex-start;margin-top:{px(34)}px"><span style="color:{RED};font-weight:700;font-size:{px(52)}px;line-height:1">&#10005;</span>'
                   f'<div style="font-size:{px(38)}px;line-height:1.16;font-weight:700;letter-spacing:-1.4px;{SH}">{t}</div></div>' for t in items)
    body = bgdiv(img) + carry(s03_body(), 8, .22)
    body += at(480, f'<div style="font-size:112px;line-height:1;font-weight:700;letter-spacing:-4.4px;{SH}">it {rul("breaks")}<br>somewhere:</div>' + rows, width=940)
    return body


# ------------------------------------------------------------------ 05 / 06 (same photo)
def s05_body():
    cols = ['#f2c230', '#f08a24', RED, '#e0407f', SILVER]
    lines = ["you post something.", "a couple people dm you.", "you lose half of them in the chat.", "the ones who book don't close.",
             "no idea " + ul("which post") + " brought any of them in."]
    ys = [300, 560, 820, 1080, 1340]
    cx = 112
    svg = '<svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920">'
    for i in range(4):
        svg += f'<line x1="{cx}" y1="{ys[i]+64}" x2="{cx}" y2="{ys[i+1]-4}" stroke="{INK}" stroke-width="4" opacity=".8"/>'
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
    out = svg
    for i, (t, y) in enumerate(zip(lines, ys)):
        out += at(y, R4.back(p(t, 54, 700, lh=1.12, ls=-1.7), '' if i == 4 else 'white-space:nowrap'), left=176, width=860)
    return out


def s05():
    return bgdiv(prep_photo(38, 'r5_05.png', focus=(.5, .5))) + s05_body()


def s06():
    img = dim_photo(38, 'r5_06.png', blur=10, dark=.5)
    body = bgdiv(img) + carry(s05_body(), 8, .12)
    body += (f'<div class="abs" style="left:{px(78)}px;top:{px(258)}px;width:{px(700)}px;font-family:{SANS};font-weight:700;color:#fff;letter-spacing:{-px(1.4)}px;{SH};font-size:{px(38)}px">'
             f'<div style="line-height:1.15">so you {red_ul("try harder.")}</div>'
             f'<div style="margin-top:{px(46)}px">{xrow("more posts")}{xrow("more tools")}{xrow("another chatgpt tab at 2am")}</div>'
             f'<div style="margin-top:{px(46)}px;line-height:1.15">you start copying the big names.</div>'
             f'<div style="margin-top:{px(40)}px"><span style="background:rgba(11,12,13,.92);padding:{px(4)}px {px(10)}px {px(8)}px;border-radius:{px(5)}px;line-height:1.6;-webkit-box-decoration-break:clone;box-decoration-break:clone">'
             f'and end up promoting <span style="color:{RED}">their</span> format instead of building your own.</span></div>'
             f'<div style="margin-top:{px(44)}px;line-height:1.14">MEANWHILE THE THING THAT PAYS YOU GETS</div><div style="line-height:1.14">{red_ul("LESS OF YOUR TIME.")}</div></div>')
    return body


# ------------------------------------------------------------------ 07 / 08 (same photo)
def s07_body():
    return (at(250, bz("that's where most people", 74, lh=1.04) + bz(rul("plateau."), 118, 4, lh=1.0, extra='letter-spacing:-5px'), width=960)
            + at(640, bz("then they pick the " + redw("main business") + ", because that's what keeps food on the table.", 50, lh=1.14), width=930)
            + at(930, bz("and the info side " + rul("dies quietly."), 62, lh=1.1), width=930)
            + at(1130, bz("none of that is your fault.", 54, lh=1.1, extra='font-weight:400;font-family:Georgia,serif'), width=930))


def s07():
    img = prep_photo(26, 'r5_07.png', focus=(.5, .5))
    return bgdiv(img) + top(1300, .75) + s07_body()


def s08():
    img = dim_photo(26, 'r5_08.png', blur=9, dark=.5)
    dots = ''.join(f'<div style="width:112px;height:112px;border-radius:50%;background:{SILVER};opacity:.92"></div>' for _ in range(4))
    you = f'<div style="width:112px;height:112px;border-radius:50%;border:6px solid {RED};display:grid;place-items:center;font-size:34px;font-weight:700">you</div>'
    body = bgdiv(img) + carry(s07_body(), 8, .1)
    body += at(250, bz("here's what most people miss.", 66, lh=1.05) + bz("the top of every niche is 3 or 4 names.", 48, 22, extra='font-weight:400'), width=940)
    body += at(560, f'<div style="display:flex;gap:26px;align-items:center">{dots}<div style="font-size:60px;font-weight:700;color:{RED}">+</div>{you}</div>')
    body += at(760, bz("but a new face breaks in every month.", 58, lh=1.08) + bz("not a guru. not bigger.<br>just someone new, with a new idea.", 50, 26, lh=1.12, extra='font-weight:400'), width=940)
    body += at(1160, bz("people follow someone they don't feel " + rul("below."), 58, lh=1.1), width=940)
    body += at(1390, bz("you don't have to be a guru.<br>you just have to sound like " + redw("you."), 64, lh=1.06), width=940)
    return body


# ------------------------------------------------------------------ 10-12 designed cards (frosted glass, no screenshots)
GLASS = ('background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.07));backdrop-filter:blur(26px);border:1.5px solid rgba(255,255,255,.34);'
         'border-radius:44px;box-shadow:0 50px 100px rgba(0,0,0,.55);color:#fff')


def card(inner, top_, h, tilt=-8, left=70, w=940):
    return (f'<div class="abs" style="left:{left}px;top:{top_}px;width:{w}px;height:{h}px;perspective:2000px"><div style="width:100%;height:100%;{GLASS};transform:rotateY({tilt}deg) rotateX(3deg);padding:44px 46px">{inner}</div></div>')


def frame(lines, hot=0):
    sk = ''.join(f'<div style="height:11px;border-radius:6px;background:rgba(255,255,255,{.7 if i==0 else .35});width:{w}%;margin-top:11px"></div>' for i, w in enumerate((92, 78, 64)))
    return (f'<div style="width:236px;height:380px;border-radius:26px;background:linear-gradient(170deg,rgba(255,255,255,.2),rgba(255,255,255,.06));border:1.5px solid rgba(255,255,255,.4);padding:26px 22px;position:relative">'
            f'<div style="font-size:26px;font-weight:700;line-height:1.1;letter-spacing:-.8px">{lines}</div>{sk}'
            f'<div style="position:absolute;left:22px;bottom:26px;width:{70+hot*14}px;height:8px;border-radius:4px;background:{RED}"></div></div>')


def s10():
    img = prep_photo(49, 'r5_10.png', focus=(.72, .5))
    inner = (f'<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:30px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.75">copywriter</div>'
             f'<div style="display:flex;align-items:center;gap:10px;padding:8px 20px 12px;border-radius:999px;background:rgba(95,214,164,.2);border:1.5px solid {EMERALD};font-size:28px;font-weight:700;color:{EMERALD}"><span style="width:14px;height:14px;border-radius:50%;background:{EMERALD}"></span>your voice</div></div>'
             f'<div style="margin:30px 0 0 auto;width:640px;background:{SILVER};color:{GRAPH};border-radius:30px 30px 8px 30px;padding:18px 28px 24px;font-size:36px;font-weight:700;letter-spacing:-1px;line-height:1.12">a story sequence that gets them to book.</div>'
             f'<div style="display:flex;gap:22px;margin-top:34px;justify-content:space-between">{frame("the thing nobody tells you", 1)}{frame("here is why it breaks", 2)}{frame("so i built this", 3)}</div>')
    body = bgdiv(img) + top(900, .78) + bottom(1100, .6)
    body += at(250, bz("now you sit down and you already know what to make.", 66, lh=1.06)
               + bz("it's written in " + rul("your voice") + ", so you don't sound like everyone else.", 48, 24, lh=1.15, extra='font-weight:400'), width=940)
    body += card(inner, 930, 640)
    body += at(1620, bz("the people who see it land somewhere that sells. and we work through it with you.", 32, lh=1.2, extra='font-weight:400'), width=940)
    return body


def s10_body_for_carry():
    return ''


def s11():
    img = dim_photo(49, 'r5_11.png', focus=(.72, .5), blur=8, dark=.6)
    rows = ''
    for ini, c, calls, show, close, cash, wd in (('S', EMERALD, 41, '93%', '46%', '$118,400', 100), ('A', '#7aa7ff', 33, '88%', '37%', '$74,200', 66), ('J', '#f2c230', 27, '85%', '30%', '$41,900', 40)):
        rows += (f'<div style="display:flex;align-items:center;gap:20px;margin-top:22px"><div style="width:62px;height:62px;border-radius:50%;background:{c};color:{GRAPH};display:grid;place-items:center;font-size:32px;font-weight:700;flex:none">{ini}</div>'
                 f'<div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:30px;font-weight:700;letter-spacing:-.6px"><span style="opacity:.75">{calls} calls &middot; {show} showed &middot; {close} closed</span><span>{cash}</span></div>'
                 f'<div style="height:12px;border-radius:6px;background:rgba(255,255,255,.14);margin-top:12px"><div style="height:12px;border-radius:6px;width:{wd}%;background:{c}"></div></div></div></div>')
    inner = (f'<div style="font-size:30px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.75">sales team</div>{rows}'
             f'<div style="margin-top:34px;display:flex;align-items:baseline;justify-content:space-between"><div style="font-size:30px;opacity:.75;font-weight:700;letter-spacing:.08em;text-transform:uppercase">cash collected</div>'
             f'<div style="font-size:112px;font-weight:700;letter-spacing:-5px;color:{EMERALD};line-height:1">$234,500</div></div>')
    body = bgdiv(img)
    body += at(250, bz("then the sales side.", 84, lh=1.0)
               + f'<div style="display:flex;gap:18px;align-items:center;margin-top:24px">{check_(EMERALD)}{bz("you see who\'s closing.", 50)}</div>'
               + f'<div style="display:flex;gap:18px;align-items:center;margin-top:10px">{xmark_(RED)}{bz("who\'s " + rul("not."), 50)}</div>', width=940)
    body += card(inner, 790, 640, 8)
    body += at(1490, bz("who's hitting their calls. who's hitting your numbers.", 38, lh=1.2) + bz("no more guessing what happened on a call. no scripts to write yourself.", 36, 8, lh=1.2, extra='font-weight:400'), width=940)
    return body


def s12():
    img = dim_photo(49, 'r5_12.png', focus=(.72, .5), blur=8, dark=.75)
    pts = [(0, 100), (12, 86), (25, 71), (40, 60), (55, 52), (70, 41), (85, 34), (100, 31)]
    Wc, Hc = 850, 300
    xy = lambda a, b: (a / 100 * Wc, 20 + (100 - b) / 100 * (Hc - 40))
    path = 'M' + ' L'.join(f'{xy(a, b)[0]:.0f} {xy(a, b)[1]:.0f}' for a, b in pts)
    chart = (f'<svg width="{Wc}" height="{Hc+40}" viewBox="0 0 {Wc} {Hc+40}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{EMERALD}" stop-opacity=".55"/><stop offset="1" stop-color="{EMERALD}" stop-opacity="0"/></linearGradient></defs>'
             f'<path d="{path} L{Wc} {Hc-20} L0 {Hc-20} Z" fill="url(#g)"/><path d="{path}" fill="none" stroke="{EMERALD}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
             + ''.join(f'<line x1="{x}" y1="10" x2="{x}" y2="{Hc-20}" stroke="rgba(255,255,255,.18)" stroke-width="2"/> <text x="{x if 0<x<845 else (6 if x==0 else 840)}" y="{Hc+22}" text-anchor="{'middle' if 0<x<845 else ('start' if x==0 else 'end')}" font-family="Helvetica,Arial" font-size="26" fill="rgba(255,255,255,.7)">{l}</text>' for x, l in ((0, 'start'), (212, '25%'), (425, '50%'), (637, '75%'), (845, 'end')))
             + f'<circle cx="{xy(55,52)[0]:.0f}" cy="{xy(55,52)[1]:.0f}" r="16" fill="#fff"/><circle cx="{xy(55,52)[0]:.0f}" cy="{xy(55,52)[1]:.0f}" r="30" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/></svg>')
    stats = ''.join(f'<div style="flex:1"><div style="font-size:66px;font-weight:700;letter-spacing:-2.5px;line-height:1;color:{c}">{v}</div><div style="font-size:24px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.7;margin-top:6px">{l}</div></div>'
                    for v, l, c in (('41.2k', 'watched', '#fff'), ('3,870', 'clicked', '#fff'), ('212', 'booked', '#fff'), ('$64k', 'paid', EMERALD)))
    inner = (f'<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:30px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.75">one post, tracked</div>'
             f'<div style="font-size:26px;font-weight:700;padding:8px 18px 12px;border-radius:999px;background:rgba(255,255,255,.18)">clicked here</div></div>'
             f'<div style="margin-top:14px">{chart}</div><div style="display:flex;gap:10px;margin-top:20px">{stats}</div>')
    body = bgdiv(img)
    body += at(250, bz("every post is tracked.", 84, lh=1.0) + bz("who watched, how far they got, who clicked, who booked, who paid.", 42, 18, lh=1.15, extra='font-weight:400'), width=940)
    body += card(inner, 760, 700, -8)
    body += at(1530, bz(f'"you never post {rul("blind")} again."', 64, lh=1.05), width=940)
    return body


# ------------------------------------------------------------------ 13 / 14 (same photo)
def s13_body():
    return at(262, bz("none of this was built overnight.", 90, lh=1.02) + bz(rul("every framework was tested first."), 52, 38)
              + bz("then it became one place that does the heavy lifting, so you keep doing what you're good at.", 44, 28, extra='font-weight:400'), width=940)


def s13():
    return bgdiv(prep_photo(18, 'r5_13.png', focus=(.5, .5))) + top(900, .72) + s13_body()


def s14():
    img = dim_photo(18, 'r5_14.png', blur=9, dark=.5)
    body = bgdiv(img) + carry(s13_body(), 6, .35)
    body += at(930, bz("right now it's only for the people i work with.", 70, lh=1.04) + bz("it's getting sharper every week.", 48, 34, extra='font-weight:400')
               + bz("and i'm not stopping until this is a " + rul("seven-figure company."), 54, 26), width=940)
    return body


SL = {'01': s01, '02': s02, '03': s03, '04': s04, '05': s05, '06': s06, '07': s07, '08': s08, '10': s10, '11': s11, '12': s12, '13': s13, '14': s14}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(SL)):
        render('r5_' + n, page(SL[n]()))

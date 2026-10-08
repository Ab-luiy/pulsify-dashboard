"""Round 7 (founder notes after round 6): palette locked to red/black/white/green, Kobey-style red gradient label boxes,
fanned ('folded') icon groups, slide 2 mock-ups, Stripe-style chart under slide 3, hybrid slide 5, black-matte Pulsify chat on 10,
setters+closer card on 11, stacked tracking message on 12, rings + logo behind 13/14. Run: python slides_r7.py [02a 02b 03 ...]"""
import sys
from engine import *
import slides_r6 as R6
import slides_r5 as R5
import slides_r4 as R4
from slides_r6 import brand, pngtile, coin, MARKU, NOISE
from slides_r5 import bz, rul, redw, carry, dim_photo, SH, SANS
from slides_r4 import U, bgdiv, top, bottom, check_, xmark_

GREEN = EMERALD
RG = 'linear-gradient(100deg,#ff4a43 0%,#c9201b 55%,#7d0f0c 100%)'


def rbox(t, size, pad='4px 22px 14px', r=14):
    """Kobey-style red gradient label box."""
    return (f'<span style="display:inline-block;background:{RG};color:#fff;padding:{pad};border-radius:{r}px;font-size:{size}px;font-weight:700;letter-spacing:{-size*.04:.1f}px;'
            f'line-height:1.02;box-shadow:0 10px 30px rgba(201,32,27,.45);white-space:nowrap">{t}</span>')


def tile(kind, size=150, rot=0, left=0, top_=0, z=1):
    return f'<div style="position:absolute;left:{left}px;top:{top_}px;transform:rotate({rot}deg);z-index:{z}">{kind}</div>'


def fan(tiles, size, w=None, h=None, gapf=.62):
    """Overlapping, tilted tiles that read as a folded stack."""
    n = len(tiles)
    gap = size * gapf
    w = w or int(size + gap * (n - 1) + 24)
    out = ''
    for i, t in enumerate(tiles):
        rot = (i - (n - 1) / 2) * 11
        out += tile(t, size, rot, 12 + i * gap, (abs(i - (n - 1) / 2)) * 8, i + 1)
    return f'<div style="position:relative;width:{w}px;height:{h or int(size + 30)}px">{out}</div>'


def lab(t, size=34, w=None):
    return f'<div style="text-align:center;font-size:{size}px;font-weight:700;letter-spacing:-.8px;margin-top:10px;white-space:nowrap;{SH}">{t}</div>'


# ------------------------------------------------------------------ 02 (two mock-ups)
def craft_tiles(size):
    tk = brand('tiktok', '#000', size=size, extra=f'<div style="position:absolute;right:-8px;bottom:-8px;width:{size*.38:.0f}px;height:{size*.38:.0f}px;border-radius:14px;background:#fe2c55;display:grid;place-items:center">'
                                            f'<svg width="{size*.24:.0f}" height="{size*.24:.0f}" viewBox="0 0 96 96"><path d="M20 30h56l-5 46H25z" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><path d="M34 30v-6a14 14 0 0128 0v6" fill="none" stroke="#fff" stroke-width="9"/></svg></div>')
    return [(brand('tradingview', '#2962FF', size=size), 'trading'), (tk, 'tiktok shop'), (brand('shopify', '#95BF47', size=size), 'e-commerce'), (brand('amazon', '#FF9900', '#111', size=size), 'amazon fba')]


def info_groups(size):
    yt = brand('youtube', '#FF0000', size=size)
    ig = brand('instagram', 'linear-gradient(45deg,#f9a03f,#e1306c,#833ab4)', size=size)
    cal = brand('caldotcom', '#111827', size=size)
    pay = [brand('stripe', '#635BFF', size=size), pngtile(U('whop.png'), size), pngtile(U('fanbasis.png'), size)]
    return [(fan([yt, ig], size), 'content + audience'), (fan([cal, brand('calendly', '#006BFF', size=size)], size), 'sales calls'), (fan(pay, size, w=int(size * 2.05)), 'payments')]


def s02a():
    img = prep_photo(20, 'r7_02.png', focus=(.5, .5))
    sz = 150
    craft = '<div style="display:flex;gap:22px">' + ''.join(f'<div>{t}{lab(c, 32)}</div>' for t, c in craft_tiles(sz)) + '</div>'
    info = '<div style="display:flex;gap:34px;align-items:flex-start">' + ''.join(f'<div>{g}{lab(c, 32)}</div>' for g, c in info_groups(128)) + '</div>'
    body = bgdiv(img) + top(1100, .68) + bottom(1100, .62)
    body += at(236, bz("you're already good at what you do.", 80, lh=1.04), width=940)
    body += at(430, craft)
    body += at(700, bz("a mentorship, or teaching it with your own offer, can make you more than the thing itself.", 44, lh=1.18, extra='font-weight:400'), width=940)
    body += at(880, f'<div style="font-size:50px;font-weight:700;letter-spacing:-1.6px;margin-bottom:14px;{SH}">but</div>' + rbox("info is a whole business", 66) + f'<div style="font-size:50px;font-weight:700;letter-spacing:-1.6px;margin-top:16px;{SH}">on its own.</div>')
    body += at(1190, info)
    body += at(1480, bz("so now you're running", 40, extra='font-weight:400') + f'<div style="margin-top:6px">{rbox("two businesses at once.", 74)}</div>', width=960)
    return body


def s02b():
    img = prep_photo(20, 'r7_02b.png', focus=(.5, .5))
    def panel(title, inner, w):
        return (f'<div style="width:{w}px;border-radius:40px;background:linear-gradient(160deg,rgba(255,255,255,.18),rgba(255,255,255,.05));border:1.5px solid rgba(255,255,255,.34);padding:26px 24px 28px;box-shadow:0 30px 70px rgba(0,0,0,.5)">'
                f'<div style="font-size:26px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.8;margin-bottom:18px">{title}</div>{inner}</div>')
    c = craft_tiles(92)
    p1 = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 8px">' + ''.join(f'<div>{t}{lab(n, 24)}</div>' for t, n in c) + '</div>'
    ig = info_groups(70)
    p2 = '<div style="display:flex;flex-direction:column;gap:16px">' + ''.join(f'<div style="display:flex;align-items:center;gap:14px"><div style="flex:none;width:150px">{g}</div><div style="font-size:26px;font-weight:700;letter-spacing:-.5px;line-height:1.1">{n}</div></div>' for g, n in ig) + '</div>'
    plus = f'<div style="width:78px;height:78px;border-radius:50%;background:{RG};display:grid;place-items:center;font-size:58px;font-weight:700;margin:0 -30px;z-index:3;padding-bottom:6px;box-shadow:0 10px 30px rgba(201,32,27,.5);align-self:center">+</div>'
    body = bgdiv(img) + top(1100, .7) + bottom(1000, .66)
    body += at(236, bz("you're already good at what you do.", 80, lh=1.04) + bz("a mentorship, or teaching it with your own offer, can make you more than the thing itself.", 42, 20, lh=1.18, extra='font-weight:400'), width=940)
    body += at(640, f'<div style="font-size:48px;font-weight:700;letter-spacing:-1.6px;{SH}">but</div><div style="margin-top:6px">{rbox("info is a whole business", 64)}</div><div style="font-size:48px;font-weight:700;letter-spacing:-1.6px;margin-top:12px;{SH}">on its own.</div>')
    body += at(980, f'<div style="display:flex;align-items:stretch;justify-content:center">{panel("what you do", p1, 430)}{plus}{panel("the info business", p2, 480)}</div>', left=48, width=984)
    body += at(1450, f'<div style="font-size:40px;font-weight:700;letter-spacing:-1.2px;{SH}">so now you&#39;re running</div><div style="margin-top:6px">{rbox("two businesses at once.", 70)}</div>', width=960)
    return body


# ------------------------------------------------------------------ 03
def funnel_stages():
    def fun(c, f, i):
        return (f'<svg width="74" height="64" viewBox="0 0 96 86"><path d="M4 4h88L60 44v34L36 70V44z" fill="rgba(255,255,255,.12)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
                f'<clipPath id="q{i}"><rect x="0" y="{86*(1-f)}" width="96" height="86"/></clipPath><path d="M4 4h88L60 44v34L36 70V44z" fill="{c}" clip-path="url(#q{i})"/></svg>')
    out = ''
    for i, (l, c, f) in enumerate((('top', '#ffffff', 1.0), ('middle', '#ff4a43', .62), ('bottom', GREEN, .3))):
        out += f'<div style="text-align:center">{fun(c, f, i)}<div style="font-size:18px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;line-height:1.1">{l}<br><span style="opacity:.6">of funnel</span></div></div>'
    return f'<div style="display:flex;gap:22px">{out}</div>'


def brandfig():
    out = ''
    for r, o in ((62, .22), (46, .4), (30, .7)):
        out += f'<circle cx="165" cy="70" r="{r}" fill="none" stroke="#fff" stroke-width="4" opacity="{o}"/>'
    out += '<circle cx="165" cy="58" r="14" fill="#fff"/><path d="M137 98 Q 165 62 193 98 Z" fill="#fff"/>'
    for x, y in ((64, 40), (270, 96), (90, 112), (252, 34)):
        out += f'<circle cx="{x}" cy="{y}" r="9" fill="{GREEN}"/>'
    out += f'<path d="M73 44 L 122 62 M262 94 L 208 80 M99 110 L 130 92 M243 40 L 200 56" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>'
    return f'<svg width="290" height="122" viewBox="0 0 330 140">{out}</svg>'


def runners():
    cols = ['#fff', '#fff', RED, '#fff', GREEN, '#fff']
    out = ''
    for i, c in enumerate(cols):
        x = 30 + i * 46; y = 70 + (i % 2) * 8
        out += (f'<g stroke="{c}" stroke-width="4.5" stroke-linecap="round" fill="none"><circle cx="{x+14}" cy="{y-24}" r="10" fill="{c}" stroke="none"/>'
                f'<path d="M{x+14} {y-12} L {x+4} {y+16}"/><path d="M{x+10} {y-6} L {x+30} {y-2}"/><path d="M{x+10} {y-6} L {x-6} {y+6}"/>'
                f'<path d="M{x+4} {y+16} L {x+24} {y+30}"/><path d="M{x+4} {y+16} L {x-10} {y+36}"/></g>'
                f'<path d="M{x-24} {y-10} L {x-8} {y-10} M{x-30} {y+4} L {x-12} {y+4}" stroke="{c}" stroke-width="3" stroke-linecap="round" opacity=".5"/>')
    out += f'<path d="M290 70 L 322 70 M308 56 L 322 70 L 308 84" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    return f'<svg width="300" height="116" viewBox="0 0 340 130">{out}</svg>'


def chips():
    names = ['vsl', 'webinar', 'profile funnel', 'ascension', 'challenge']
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;width:330px;justify-content:flex-end">' + ''.join(
        f'<span style="padding:4px 14px 8px;border-radius:999px;background:{RG if i == 0 else "rgba(255,255,255,.16)"};color:#fff;font-size:22px;font-weight:700;letter-spacing:-.3px">{n}</span>' for i, n in enumerate(names)) + '</div>'


def person_card(label, c):
    return (f'<div style="width:92px;height:108px;border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,.28),rgba(255,255,255,.08));border:1.5px solid rgba(255,255,255,.5);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(0,0,0,.4)">'
            f'<svg width="42" height="42" viewBox="0 0 38 38"><circle cx="19" cy="14" r="7" fill="{c}"/><path d="M5 34q14-22 28 0z" fill="{c}"/></svg><div style="font-size:19px;font-weight:700;margin-top:4px">{label}</div></div>')


def team_fan():
    return fan([person_card('closer', '#fff'), person_card('setter', GREEN), person_card('manager', '#ff6a64')], 92, w=300, h=122, gapf=1.0)


def pay_fan():
    return fan([brand('stripe', '#635BFF', size=84), pngtile(U('whop.png'), 84), pngtile(U('fanbasis.png'), 84)], 84, w=196, h=110)


def revenue_card():
    pts = [(0, 80), (10, 74), (20, 70), (30, 58), (40, 60), (50, 44), (60, 38), (70, 40), (80, 22), (90, 18), (100, 8)]
    Wc, Hc = 860, 120
    xy = lambda a, b: (a / 100 * Wc, b / 100 * Hc)
    path = 'M' + ' L'.join(f'{xy(a,b)[0]:.0f} {xy(a,b)[1]:.0f}' for a, b in pts)
    bars = ''.join(f'<rect x="{i*43+6}" y="{Hc-20-(8+ (i*7)%34)}" width="26" height="{8+(i*7)%34}" rx="5" fill="rgba(255,255,255,.14)"/>' for i in range(20))
    svg = (f'<svg width="{Wc}" height="{Hc+10}" viewBox="0 0 {Wc} {Hc+10}"><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GREEN}" stop-opacity=".5"/><stop offset="1" stop-color="{GREEN}" stop-opacity="0"/></linearGradient></defs>{bars}'
           f'<path d="{path} L{Wc} {Hc} L0 {Hc} Z" fill="url(#rg)"/><path d="{path}" fill="none" stroke="{GREEN}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    return svg


def s03():
    img = prep_photo(27, 'r7_03.png', focus=(.5, .5))
    rows = [('content', 'where it starts', funnel_stages()), ('personal brand', 'people start buying into you', brandfig()), ('traffic', '', runners()),
            ('landing page', '', chips()), ('sales team', 'talented closers + setters', team_fan()), ('cash in the bank', '', pay_fan())]
    body = bgdiv(img) + top(300, .6) + bottom(1200, .6)
    body += '<div class="abs" style="left:-100px;top:60px;width:1000px;height:420px;background:radial-gradient(closest-side,rgba(229,50,45,.55),transparent 72%)"></div>'
    body += at(232, f'<div style="font-size:92px;line-height:1;font-weight:700;letter-spacing:-3.6px;{SH}">the {rbox("whole chain.", 92, "0 22px 14px", 16)}</div>')
    for i, (l, sub, vis) in enumerate(rows):
        y = 350 + i * 158
        num = (f'<div style="width:56px;height:56px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:30px;font-weight:700;border:4px solid {INK}">{i+1}</div>')
        subh = f'<div style="font-size:23px;color:{MUTE};margin-top:5px;letter-spacing:-.3px;line-height:1.1">{sub}</div>' if sub else ''
        body += at(y, f'<div style="height:146px;border-radius:32px;background:rgba(14,15,17,.72);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;gap:18px;padding:0 22px;'
                      f'box-shadow:0 14px 40px rgba(0,0,0,.4)">{num}<div style="width:{232 if i == 0 else 280}px;flex:none"><div style="font-size:{50 if len(l)<14 else 42}px;font-weight:700;letter-spacing:-1.8px;line-height:1">{l}</div>{subh}</div>'
                      f'<div style="flex:1;display:flex;justify-content:flex-end">{vis}</div></div>', left=72, width=936)
    card = (f'<div style="width:936px;height:300px;border-radius:36px;background:linear-gradient(160deg,rgba(24,26,32,.88),rgba(10,11,14,.88));border:1.5px solid rgba(255,255,255,.22);box-shadow:0 40px 90px rgba(0,0,0,.7);position:relative;overflow:hidden">'
            f'<div style="position:absolute;left:34px;bottom:14px;opacity:.8">{revenue_card()}</div>'
            f'<div style="position:absolute;left:34px;top:22px;right:34px">{bz("most people have never run it.", 36, extra="font-weight:400")}{bz("some don\'t even know what a kpi is.", 36, extra="font-weight:400")}{bz("and that\'s fine. nobody teaches you this part.", 40, 4)}</div></div>')
    body += at(1300, card)
    return body


def s04():
    img = dim_photo(27, 'r7_04.png', blur=9, dark=.55)
    items = ["you want to post, but you don't know what to say", "you know what to say, but nobody's watching",
             "people are watching, but you don't know where to send them", "calls are booked, but you can't tell who's closing and who isn't"]
    rows = ''.join(f'<div style="display:flex;gap:26px;align-items:flex-start;padding:26px 0;border-top:1px solid rgba(255,255,255,.2)">{xmark_(RED)}'
                   f'<div style="font-size:48px;line-height:1.18;letter-spacing:-1.2px;font-weight:700;width:820px;{SH}">{t}</div></div>' for t in items)
    body = bgdiv(img) + carry(s03_carry(), 8, .2)
    body += '<div class="abs" style="inset:0;background:radial-gradient(900px 700px at 100% 100%,rgba(229,50,45,.4),transparent 62%)"></div>'
    body += at(440, f'<div style="font-size:112px;line-height:1;font-weight:700;letter-spacing:-4.4px;{SH}">it {rbox("breaks", 112, "0 24px 16px", 18)}<br>somewhere:</div>', width=940)
    body += at(800, rows, width=936)
    return body


def s03_carry():
    return at(236, bz("the whole chain.", 88, lh=1.0)) + at(350, '<div style="height:900px"></div>')


# ------------------------------------------------------------------ 05 hybrid
def post_card(pid, idx, w=170, h=250):
    pth = prep_photo(pid, f'r7_p{idx}.png', focus=(.5, .5))
    return (f'<div style="width:{w}px;height:{h}px;border-radius:26px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,.45);box-shadow:0 18px 40px rgba(0,0,0,.5)">'
            f'<div style="position:absolute;inset:0;background:url(\'file:///{pth}\') center/cover"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.8))"></div>'
            f'<div style="position:absolute;left:14px;right:14px;bottom:16px"><div style="height:10px;width:80%;background:rgba(255,255,255,.85);border-radius:5px"></div><div style="height:8px;width:55%;background:rgba(255,255,255,.4);border-radius:4px;margin-top:8px"></div></div>'
            f'<div style="position:absolute;top:12px;right:12px;width:44px;height:44px;border-radius:50%;background:{RG};display:grid;place-items:center;font-size:30px;font-weight:700">?</div></div>')


def inbox_rows():
    def row(kind):
        chip = {'ok': ('replied', 'rgba(255,255,255,.2)', '#fff'), 'gone': ('seen, no reply', 'rgba(229,50,45,.3)', '#ff8e89'), 'book': ('booked', GREEN, GRAPH), 'ns': ('no close', 'rgba(229,50,45,.3)', '#ff8e89')}[kind]
        return (f'<div style="display:flex;align-items:center;gap:20px;padding:15px 0;border-top:1px solid rgba(255,255,255,.14)"><div style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#8a8d99,#3b3d46);flex:none"></div>'
                f'<div style="flex:1"><div style="height:14px;width:48%;background:rgba(255,255,255,.7);border-radius:7px"></div><div style="height:11px;width:78%;background:rgba(255,255,255,.28);border-radius:6px;margin-top:10px"></div></div>'
                f'<div style="padding:6px 18px 10px;border-radius:999px;background:{chip[1]};color:{chip[2]};font-size:25px;font-weight:700;white-space:nowrap">{chip[0]}</div></div>')
    return ''.join(row(k) for k in ('ok', 'ok', 'gone', 'gone', 'book', 'ns'))


def s05(v='a'):
    img = prep_photo(38, 'r7_05.png', focus=(.5, .5))
    body = bgdiv(img) + '<div class="abs" style="inset:0;background:rgba(11,12,13,.4)"></div>'
    body += at(236, bz("you post something.", 84, lh=1.0) + bz("a couple people dm you. you lose half of them in the chat. the ones who book don't close.", 44, 14, lh=1.16, extra='font-weight:400'), width=940)
    if v == 'a':
        inner = inbox_rows()
        body += R5.card(inner, 600, 560, 0, 70, 940).replace('padding:44px 46px', 'padding:22px 40px')
    else:
        rows = [('dm you', 14, 0), ('stay in the chat', 7, 7), ('book', 3, 0), ('close', 1, 0)]
        y = 600
        for l, kept, lost in rows:
            dots = ''.join(f'<div style="width:42px;height:42px;border-radius:50%;background:{GREEN if l == "close" else "#fff"}"></div>' for _ in range(kept))
            dots += ''.join('<div style="width:42px;height:42px;border-radius:50%;border:3px dashed #ff6a64;opacity:.8"></div>' for _ in range(lost))
            body += at(y, f'<div style="display:flex;gap:22px;align-items:center"><div style="font-size:38px;font-weight:700;letter-spacing:-1px;width:250px;flex:none;{SH}">{l}</div><div style="display:flex;gap:10px;flex-wrap:wrap;width:650px">{dots}</div></div>')
            y += 120
    posts = ''.join(post_card(pid, i) for i, pid in enumerate((20, 31, 37, 41, 46)))
    body += (f'<svg class="abs" style="left:0;top:1160px" width="1080" height="80" viewBox="0 0 1080 80"><path d="M130 70 Q 540 -30 950 70" fill="none" stroke="#ff4a43" stroke-width="5" stroke-dasharray="3 12" stroke-linecap="round"/></svg>')
    body += at(1230, f'<div style="display:flex;gap:16px;justify-content:center">{posts}</div>', left=36, width=1008)
    body += at(1520, bz("and no idea " + rul("which post") + " brought any of them in.", 44, lh=1.1), width=960)
    return body


def s06(v='a'):
    img = dim_photo(38, 'r7_06.png', blur=10, dark=.5)
    body = bgdiv(img)
    px_ = R4.px
    body += (f'<div class="abs" style="left:{px_(78)}px;top:{px_(258)}px;width:{px_(700)}px;font-family:{SANS};font-weight:700;color:#fff;letter-spacing:{-px_(1.4)}px;{SH};font-size:{px_(38)}px">'
             f'<div style="line-height:1.15">so you {R4.red_ul("try harder.")}</div>'
             f'<div style="margin-top:{px_(46)}px">{R4.xrow("more posts")}{R4.xrow("more tools")}{R4.xrow("another chatgpt tab at 2am")}</div>'
             f'<div style="margin-top:{px_(46)}px;line-height:1.15">you start copying the big names.</div>'
             f'<div style="margin-top:{px_(40)}px"><span style="background:rgba(11,12,13,.92);padding:{px_(4)}px {px_(10)}px {px_(8)}px;border-radius:{px_(5)}px;line-height:1.6;-webkit-box-decoration-break:clone;box-decoration-break:clone">'
             f'and end up promoting <span style="color:{RED}">their</span> format instead of building your own.</span></div>'
             f'<div style="margin-top:{px_(44)}px;line-height:1.14">MEANWHILE THE THING THAT PAYS YOU GETS</div><div style="line-height:1.14">{R4.red_ul("LESS OF YOUR TIME.")}</div></div>')
    return body


# ------------------------------------------------------------------ 08
def s08():
    img = dim_photo(26, 'r7_08.png', blur=9, dark=.5)
    def row(rank, wname, num, hot=False, extra=''):
        bg = ('background:linear-gradient(90deg,rgba(229,50,45,.4),rgba(229,50,45,.1));border:2px solid ' + RED) if hot else 'background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.2)'
        av = (f'<div style="width:62px;height:62px;border-radius:50%;flex:none;background:{"linear-gradient(135deg,#ff8e89,#e5322d)" if hot else "linear-gradient(135deg,#8a8d99,#3b3d46)"};display:grid;place-items:center">'
              f'<svg width="36" height="36" viewBox="0 0 38 38"><circle cx="19" cy="14" r="7" fill="#fff" opacity=".9"/><path d="M5 34q14-22 28 0z" fill="#fff" opacity=".9"/></svg></div>')
        tag = '<div style="margin-top:8px;font-size:23px;font-weight:700;color:#ff8e89">new face &middot; new idea</div>' if hot else f'<div style="height:11px;width:{wname*.7:.0f}%;background:rgba(255,255,255,.25);border-radius:6px;margin-top:11px"></div>'
        return (f'<div style="display:flex;align-items:center;gap:20px;border-radius:26px;padding:14px 24px;margin-top:12px;{bg}"><div style="font-size:36px;font-weight:700;width:54px;opacity:.8">{rank}</div>{av}'
                f'<div style="flex:1"><div style="height:16px;width:{wname}%;background:{"#fff" if hot else "rgba(255,255,255,.65)"};border-radius:8px"></div>{tag}</div>'
                f'<div style="text-align:right;font-size:{44 if not hot else 40}px;font-weight:700;letter-spacing:-1.5px">{num}</div></div>')
    inner = ('<div style="font-size:26px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.75">top of your niche</div>'
             + row('#1', 54, '1.4M') + row('#2', 46, '980k') + row('#3', 50, '760k') + row('#4', 42, '540k')
             + '<div style="display:flex;align-items:center;gap:14px;margin:16px 0 2px 70px;opacity:.75"><div style="flex:1;border-top:3px dashed rgba(255,255,255,.4)"></div><div style="font-size:24px;font-weight:700">every month</div><div style="flex:1;border-top:3px dashed rgba(255,255,255,.4)"></div></div>'
             + row('new', 36, f'2k <span style="color:{GREEN}">&rarr; 18k+</span>', True))
    body = bgdiv(img) + top(700, .6)
    body += '<div class="abs" style="inset:0;background:radial-gradient(900px 600px at 0% 0%,rgba(229,50,45,.35),transparent 62%)"></div>'
    body += at(232, f'<div style="font-size:84px;line-height:1.02;font-weight:700;letter-spacing:-3.2px;{SH}">here\'s what<br>{rbox("most people miss.", 84, "0 22px 14px", 16)}</div>' + bz("the top of every niche is 3 or 4 names.", 46, 22, extra='font-weight:400'), width=960)
    body += R5.card(inner, 640, 600, 0, 70, 940).replace('padding:44px 46px', 'padding:26px 34px')
    body += at(1290, bz("but every month, a new face breaks in.", 52, lh=1.08) + bz("not a guru. not bigger. just someone new, with a new idea.", 40, 12, lh=1.15, extra='font-weight:400')
              + bz("people follow someone they don't feel " + rul("below."), 52, 22, lh=1.1)
              + f'<div style="margin-top:22px;font-size:56px;font-weight:700;letter-spacing:-2px;line-height:1.15;{SH}">you don\'t have to be a guru.<br>you just have to sound like {rbox("you.", 56, "0 20px 12px")}</div>', width=960)
    return body


# ------------------------------------------------------------------ 10
def s10():
    img = prep_photo(49, 'r7_10.png', focus=(.72, .5))
    frames = []
    for i, (pid, txt) in enumerate(((31, 'i almost quit.'), (37, 'stop posting daily.'), (41, 'nobody tells you this.'))):
        pth = prep_photo(pid, f'r7_f{i}.png', focus=(.5, .5))
        frames.append(f'<div style="width:236px;height:420px;border-radius:30px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,.4);box-shadow:0 20px 50px rgba(0,0,0,.6)">'
                      f'<div style="position:absolute;inset:0;background:url(\'file:///{pth}\') center/cover"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(201,32,27,.45),rgba(10,10,14,.1) 40%,rgba(10,10,14,.88))"></div>'
                      f'<div style="position:absolute;left:20px;right:16px;bottom:24px;font-size:40px;line-height:1.02;font-weight:700;letter-spacing:-1.6px">{txt}</div></div>')
    inner = (f'<div style="display:flex;align-items:center;gap:18px">{coin(64)}<div style="font-size:34px;font-weight:700;letter-spacing:-.8px">hey, how can i help you today?</div></div>'
             f'<div style="margin:28px 0 0 auto;width:700px;background:{SILVER};color:{GRAPH};border-radius:34px 34px 8px 34px;padding:22px 30px 28px;font-size:36px;font-weight:700;letter-spacing:-1px;line-height:1.14">'
             f'i want a full credibility-based story sequence for my offer launch, built to get high bookings.</div>'
             f'<div style="display:flex;gap:16px;align-items:center;margin-top:34px">{coin(52)}<div style="font-size:32px;font-weight:700;letter-spacing:-.8px">here you go. pick an opener:</div></div>'
             f'<div style="display:flex;gap:18px;margin-top:20px;justify-content:space-between">{"".join(frames)}</div>')
    widget = (f'<div class="abs" style="left:60px;top:740px;width:960px;height:820px;border-radius:46px;background:#050506;border:1.5px solid rgba(255,255,255,.28);box-shadow:0 50px 100px rgba(0,0,0,.7),0 0 0 1px rgba(229,50,45,.25);color:#fff">'
              f'<div style="padding:38px 44px">{inner}</div></div>')
    body = bgdiv(img) + top(900, .78) + bottom(1100, .6)
    body += at(250, bz("now you sit down and you already know what to make.", 66, lh=1.06)
               + bz("it's written in " + rul("your voice") + ", so you don't sound like everyone else.", 48, 22, lh=1.15, extra='font-weight:400'), width=940)
    body += widget
    body += at(1610, bz("the people who see it land somewhere that sells. and we work through it with you.", 32, lh=1.2, extra='font-weight:400'), width=940)
    return body


# ------------------------------------------------------------------ 11
def s11():
    img = dim_photo(49, 'r7_11.png', focus=(.72, .5), blur=8, dark=.6)
    rows = ''
    for lab_, line, cash, wd in (('setter', '312 dms &middot; 58 calls booked', '', 100), ('setter', '287 dms &middot; 49 calls booked', '', 84), ('closer', '78 calls &middot; 79% showed &middot; 23% closed', 'CC $96,000', 100)):
        c = GREEN if lab_ == 'closer' else '#fff'
        rows += (f'<div style="display:flex;align-items:center;gap:20px;margin-top:26px"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.5);display:grid;place-items:center;flex:none">'
                 f'<svg width="34" height="34" viewBox="0 0 38 38"><circle cx="19" cy="14" r="7" fill="#fff"/><path d="M5 34q14-22 28 0z" fill="#fff"/></svg></div>'
                 f'<div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:32px;font-weight:700;letter-spacing:-.6px"><span>{lab_}</span><span style="color:{GREEN}">{cash}</span></div>'
                 f'<div style="font-size:25px;opacity:.75;margin-top:4px">{line}</div>'
                 f'<div style="height:10px;border-radius:5px;background:rgba(255,255,255,.14);margin-top:10px"><div style="height:10px;border-radius:5px;width:{wd}%;background:{c}"></div></div></div></div>')
    inner = (f'<div style="display:flex;align-items:center;gap:16px">{coin(54)}<div style="font-size:36px;font-weight:700;letter-spacing:-.8px">sales</div></div>{rows}'
             f'<div style="margin-top:34px;padding-top:24px;border-top:1.5px solid rgba(255,255,255,.2);display:flex;align-items:baseline;justify-content:space-between"><div style="font-size:44px;font-weight:700;letter-spacing:-1px">CC</div>'
             f'<div style="font-size:112px;font-weight:700;letter-spacing:-5px;color:{GREEN};line-height:1">$96,000</div></div>')
    body = bgdiv(img)
    body += at(250, bz("then the sales side.", 84, lh=1.0)
               + f'<div style="display:flex;gap:18px;align-items:center;margin-top:24px">{check_(GREEN)}{bz("you see who\'s closing.", 50)}</div>'
               + f'<div style="display:flex;gap:18px;align-items:center;margin-top:10px">{xmark_(RED)}{bz("who\'s " + rul("not."), 50)}</div>', width=940)
    body += R5.card(inner, 790, 680, 8)
    body += at(1520, bz("who's hitting their calls. who's hitting your numbers.", 38, lh=1.2) + bz("no more guessing what happened on a call. no scripts to write yourself.", 36, 8, lh=1.2, extra='font-weight:400'), width=940)
    return body


# ------------------------------------------------------------------ 12
def s12():
    base = R6.s12()
    return base.replace('', '', 0)


def s12_new():
    img = dim_photo(49, 'r7_12.png', focus=(.72, .5), blur=8, dark=.75)
    pts = [(0, 100), (12, 86), (25, 71), (40, 60), (55, 52), (70, 41), (85, 34), (100, 31)]
    Wc, Hc = 850, 250
    xy = lambda a, b: (a / 100 * Wc, 20 + (100 - b) / 100 * (Hc - 40))
    path = 'M' + ' L'.join(f'{xy(a, b)[0]:.0f} {xy(a, b)[1]:.0f}' for a, b in pts)
    chart = (f'<svg width="{Wc}" height="{Hc+40}" viewBox="0 0 {Wc} {Hc+40}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GREEN}" stop-opacity=".55"/><stop offset="1" stop-color="{GREEN}" stop-opacity="0"/></linearGradient></defs>'
             f'<path d="{path} L{Wc} {Hc-20} L0 {Hc-20} Z" fill="url(#g)"/><path d="{path}" fill="none" stroke="{GREEN}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
             + ''.join(f'<line x1="{x}" y1="10" x2="{x}" y2="{Hc-20}" stroke="rgba(255,255,255,.18)" stroke-width="2"/><text x="{x if 0<x<845 else (6 if x==0 else 840)}" y="{Hc+22}" text-anchor="{"middle" if 0<x<845 else ("start" if x==0 else "end")}" font-family="Helvetica,Arial" font-size="26" fill="rgba(255,255,255,.7)">{l}</text>' for x, l in ((0, 'start'), (212, '25%'), (425, '50%'), (637, '75%'), (845, 'end')))
             + '</svg>')
    stats = ''.join(f'<div style="flex:1"><div style="font-size:62px;font-weight:700;letter-spacing:-2.5px;line-height:1;color:{c}">{v}</div><div style="font-size:23px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-top:6px">{l}</div></div>'
                    for v, l, c in (('41.2k', 'watched', '#fff'), ('3.8k', 'clicked', '#fff'), ('212', 'booked', '#fff'), ('$64k', 'paid', GREEN)))
    inner = (f'<div style="display:flex;align-items:center;gap:16px">{coin(52)}<div><div style="font-size:23px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.65">youtube video tracking</div>'
             f'<div style="font-size:30px;font-weight:700;letter-spacing:-.8px;margin-top:2px">how i would start from zero</div></div></div>'
             f'<div style="margin-top:10px">{chart}</div><div style="display:flex;gap:10px;margin-top:14px">{stats}</div>')
    bl = lambda t: f'<div style="display:flex;gap:18px;align-items:center;margin-top:8px"><div style="width:16px;height:16px;border-radius:50%;background:{RED};flex:none"></div>{bz(t, 44)}</div>'
    body = bgdiv(img)
    body += at(236, f'<div style="font-size:84px;line-height:1.04;font-weight:700;letter-spacing:-3.2px;{SH}">every post is<br>{rbox("tracked.", 84, "0 24px 14px", 16)}</div>' + bl("who watched") + bl("how far they got") + bl("who clicked") + bl("who booked") + bl("who paid"), width=940)
    body += R5.card(inner, 800, 600, -8)
    body += at(1430, bz("everything is tracked to the brim.", 50, lh=1.08)
              + bz("where they are.", 44, 10) + bz("how they land.", 44, 2) + bz("when they first start watching.", 44, 2)
              + bz("all the way until they buy from you. and we keep retargeting them until they buy again.", 32, 10, lh=1.15, extra='font-weight:400'), width=940)
    return body


# ------------------------------------------------------------------ 13 / 14
def rings():
    r = ''.join(f'<circle cx="540" cy="620" r="{rad}" fill="none" stroke="rgba(255,255,255,{o})" stroke-width="2"/>' for rad, o in ((200, .22), (300, .16), (400, .1), (500, .06)))
    return (f'<svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920">{r}</svg>'
            f'<div class="abs" style="left:140px;top:220px;width:800px;height:800px;background:radial-gradient(closest-side,rgba(229,50,45,.5),transparent 72%)"></div>'
            f'<img class="abs" src="file:///{MARKU}" style="left:340px;top:420px;width:400px;opacity:.16">')


def s13_body():
    return at(262, bz("none of this was built overnight.", 90, lh=1.02) + bz(rul("every framework was tested first."), 52, 38)
              + bz("then it became one place that does the heavy lifting, so you keep doing what you're good at.", 44, 28, extra='font-weight:400'), width=940)


def s13():
    return bgdiv(prep_photo(18, 'r7_13.png', focus=(.5, .5))) + top(900, .62) + rings() + s13_body()


def s14():
    img = dim_photo(18, 'r7_14.png', blur=9, dark=.5)
    body = bgdiv(img) + rings() + carry(s13_body(), 6, .3)
    body += at(930, bz("right now it's only for the people i work with.", 70, lh=1.04) + bz("it's getting sharper every week.", 48, 34, extra='font-weight:400')
               + bz("and i'm not stopping until this is a " + rul("seven-figure company."), 54, 26), width=940)
    return body


SL = {'02a': s02a, '02b': s02b, '03': s03, '04': s04, '05': lambda: s05('a'), '05b': lambda: s05('b'), '06': s06, '08': s08, '10': s10, '11': s11, '12': s12_new, '13': s13, '14': s14}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(SL)):
        render('r7_' + n, page(SL[n]()))

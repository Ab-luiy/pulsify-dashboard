"""Round 8 (founder notes after round 7). Overrides on slides_r7: slide 2 bullets + one-line copy, red chart on 3, no splitters on 4,
reworded 5 with alias inbox, sans 7, flat 8, 'yo' greeting on 10, stacked red-wash 11, flat red tracking 12, logo-free 13/14,
subtle logo as the first layer under everything else. Run: python slides_r8.py [02 03 ...]"""
import sys
from engine import *
import slides_r7 as R7
import slides_r5 as R5
from slides_r7 import *
from slides_r6 import brand, pngtile, coin, MARKU
from slides_r5 import bz, rul, redw, carry, dim_photo, SH, SANS
from slides_r4 import U, bgdiv, top, bottom, check_, xmark_
import slides_r4 as R4

RED2 = '#ff4a43'


def logo_layer(body):
    """Subtle logo as the first layer above the photo, below everything else."""
    i = body.index('</div>') + len('</div>')
    return body


def ulb(t, size=52, weight=700, color='#fff'):
    return (f'<span style="position:relative;display:inline-block;font-size:{size}px;font-weight:{weight};letter-spacing:{-size*.03:.1f}px;color:{color}">{t}'
            f'<span style="position:absolute;left:0;right:0;bottom:-8px;height:7px;background:{RG};border-radius:4px"></span></span>')


# ------------------------------------------------------------------ 02
def s02():
    img = prep_photo(20, 'r18_02.png', focus=(.5, .5))
    bullets = ''.join(f'<div style="display:flex;align-items:center;gap:16px;margin-top:20px"><div style="width:14px;height:14px;border-radius:50%;background:{RED};flex:none"></div>{ulb(t, 46)}</div>'
                      for t in ('trading', 'tiktok shop', 'e-commerce', 'amazon fba'))
    # info groups, bigger instagram glyph
    size = 128
    yt = brand('youtube', '#FF0000', size=size)
    ig = brand('instagram', 'linear-gradient(45deg,#f9a03f,#e1306c,#833ab4)', size=size).replace('width="74" height="74"', 'width="104" height="104"')
    cal = brand('caldotcom', '#111827', size=size)
    pay = [brand('stripe', '#635BFF', size=size), pngtile(U('whop.png'), size), pngtile(U('fanbasis.png'), size)]
    groups = [(fan([yt, ig], size), 'content + audience'), (fan([cal, brand('calendly', '#006BFF', size=size)], size), 'sales calls'), (fan(pay, size, w=int(size * 2.05)), 'payments')]
    info = '<div style="display:flex;gap:34px;align-items:flex-start">' + ''.join(f'<div>{g}<div style="text-align:center;margin-top:10px">{ulb(c, 28, 700)}</div></div>' for g, c in groups) + '</div>'
    body = bgdiv(img) + top(1100, .7) + bottom(1000, .64)
    body += at(236, f'<div style="font-size:78px;line-height:1.04;font-weight:700;letter-spacing:-3px;{SH}">you\'re already {R5.rul("good")} at<br>what you do.</div>', width=940)
    body += at(440, bullets)
    body += at(800, bz("running your own offer, teaching people exactly what you do, will make you more money than the thing you do now.", 44, lh=1.18, extra='font-weight:400'), width=940)
    body += at(1030, f'<div style="font-size:50px;font-weight:700;letter-spacing:-2px;white-space:nowrap;{SH}">but {ulb("info is a whole business", 50)} on its own.</div>'
               + bz("your own offer. your own unique mechanism. your own positioning.", 34, 12, extra='font-weight:400'), width=980)
    body += at(1210, info)
    body += at(1510, f'<div style="font-size:46px;font-weight:700;letter-spacing:-1.6px;white-space:nowrap;{SH}">so now you\'re running {ulb("2 businesses", 46)} at once.</div>', width=990)
    return logo_layer(body)


# ------------------------------------------------------------------ 03 (red chart)
def revenue_red():
    pts = [(0, 80), (10, 74), (20, 70), (30, 58), (40, 60), (50, 44), (60, 38), (70, 40), (80, 22), (90, 18), (100, 8)]
    Wc, Hc = 860, 120
    xy = lambda a, b: (a / 100 * Wc, b / 100 * Hc)
    path = 'M' + ' L'.join(f'{xy(a,b)[0]:.0f} {xy(a,b)[1]:.0f}' for a, b in pts)
    bars = ''.join(f'<rect x="{i*43+6}" y="{Hc-20-(8+ (i*7)%34)}" width="26" height="{8+(i*7)%34}" rx="5" fill="rgba(255,255,255,.14)"/>' for i in range(20))
    return (f'<svg width="{Wc}" height="{Hc+10}" viewBox="0 0 {Wc} {Hc+10}"><defs><linearGradient id="rr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{RED2}" stop-opacity=".55"/><stop offset="1" stop-color="{RED2}" stop-opacity="0"/></linearGradient></defs>{bars}'
            f'<path d="{path} L{Wc} {Hc} L0 {Hc} Z" fill="url(#rr)"/><path d="{path}" fill="none" stroke="{RED2}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def s03():
    R7.revenue_card = revenue_red
    return logo_layer(R7.s03())


# ------------------------------------------------------------------ 04 (no splitters)
def s04():
    img = dim_photo(27, 'r18_04.png', blur=9, dark=.55)
    items = ["you want to post, but you don't know what to say", "you know what to say, but nobody's watching",
             "people are watching, but you don't know where to send them", "calls are booked, but you can't tell who's closing and who isn't"]
    rows = ''.join(f'<div style="display:flex;gap:26px;align-items:flex-start;padding:24px 0">{xmark_(RED)}'
                   f'<div style="font-size:48px;line-height:1.18;letter-spacing:-1.2px;font-weight:700;width:820px;{SH}">{t}</div></div>' for t in items)
    body = bgdiv(img) + carry(R7.s03_carry(), 8, .2)
    body += '<div class="abs" style="inset:0;background:radial-gradient(900px 700px at 100% 100%,rgba(229,50,45,.4),transparent 62%)"></div>'
    body += at(440, f'<div style="font-size:112px;line-height:1;font-weight:700;letter-spacing:-4.4px;{SH}">it {rbox("breaks", 112, "0 24px 16px", 18)}<br>somewhere:</div>', width=940)
    body += at(790, rows, width=936)
    return logo_layer(body)


# ------------------------------------------------------------------ 05 (alias inbox + bigger posts)
SMAP = {'youtube lead': '"bro this is exactly what i need"', 'carousel lead': 'seen 2 days ago', 'story lead': 'booked for thursday 3pm', 'reel lead': 'ghosted after the call'}


def s05():
    img = prep_photo(38, 'r18_05.png', focus=(.5, .5))
    people = [('youtube lead', 'replied', 'rgba(255,255,255,.2)', '#fff', '#4b5160'), ('carousel lead', 'seen, no reply', 'rgba(229,50,45,.3)', '#ff8e89', '#6a3a3a'),
              ('story lead', 'booked', '#fff', GRAPH, '#3d4d44'), ('reel lead', 'no close', 'rgba(229,50,45,.3)', '#ff8e89', '#4b4b5c')]
    grads = {'youtube lead': ('#ff4a43', '#8f1511', '#fff'), 'carousel lead': ('#5fd6a4', '#1f7a56', '#0b0c0d'),
             'story lead': ('#ffffff', '#8a8d99', '#0b0c0d'), 'reel lead': ('#c9201b', '#1a0707', '#fff')}
    rows = ''
    for al, st, bg, fg, avc in people:
        pic = {'youtube lead': ('av_6.png', '53% 38%', 'cover'), 'carousel lead': ('av_5.png', '56% 30%', '190%'),
               'story lead': ('av_7.png', '50% 8%', '135%'), 'reel lead': ('av_8.png', '50% 42%', 'cover')}[al]
        rows += (f'<div style="display:flex;align-items:center;gap:18px;padding:14px 0"><div style="width:88px;height:88px;border-radius:50%;background:#222 url(file:///C:/Users/Abdullah/Desktop/Pulsify-Brain/output/highlight-saas/claude-v2/img/{pic[0]}) {pic[1]}/{pic[2]} no-repeat;'
                 f'border:2px solid rgba(255,255,255,.7);flex:none;box-shadow:0 6px 16px rgba(0,0,0,.4)"></div>'
                 f'<div style="flex:1"><div style="font-size:38px;font-weight:700;letter-spacing:-.8px;text-transform:uppercase">{al}</div><div style="font-size:30px;opacity:.78;margin-top:6px;letter-spacing:-.4px">{SMAP[al]}</div></div>'
                 f'<div style="padding:6px 20px 10px;border-radius:999px;background:{bg};color:{fg};font-size:28px;font-weight:700;white-space:nowrap">{st}</div></div>')
    labels = ['YOUTUBE LONG FORM', 'CAROUSELS', 'STORY SEQUENCES', 'REELS']
    posts = ''
    for i, (pid, lb) in enumerate(zip((20, 31, 37, 41), labels)):
        pth = prep_photo(pid, f'r18_p{i}.png', focus=(.5, .5))
        posts += (f'<div style="width:232px"><div style="width:232px;height:250px;border-radius:26px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,.45);box-shadow:0 18px 40px rgba(0,0,0,.5)">'
                  f'<div style="position:absolute;inset:-30px;background:url(file:///{pth}) center/cover;filter:blur(18px) brightness(.8)"></div>'
                  f'<div style="position:absolute;inset:0;background:radial-gradient(closest-side,rgba(229,50,45,.35),transparent 85%)"></div>'
                  f'<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:170px;font-weight:700;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.5)">?</div></div>'
                  f'<div style="text-align:center;font-size:29px;font-weight:700;letter-spacing:-.2px;line-height:1.1;margin-top:12px;{SH}">{lb}</div></div>')
    body = bgdiv(img) + '<div class="abs" style="inset:0;background:rgba(11,12,13,.42)"></div>'
    body += at(236, bz("your traffic is leaking.", 84, lh=1.0) + bz("a couple people dm you. you lose half of them in the chat. the ones who book don't close.", 44, 14, lh=1.16, extra='font-weight:400'), width=940)
    body += R5.card(rows, 560, 540, 0, 70, 940).replace('padding:44px 46px', 'padding:14px 36px')
    body += (f'<svg class="abs" style="left:0;top:1090px" width="1080" height="80" viewBox="0 0 1080 80"><path d="M130 70 Q 540 -30 950 70" fill="none" stroke="#ff4a43" stroke-width="5" stroke-dasharray="3 12" stroke-linecap="round"/></svg>')
    body += at(1160, f'<div style="display:flex;gap:16px;justify-content:center">{posts}</div>', left=30, width=1020)
    body += at(1535, bz("and no idea " + rul("which post") + " brought any of them in.", 40, lh=1.1), width=960)
    return logo_layer(body)


# ------------------------------------------------------------------ 07 (sans, visible)
def s07():
    img = prep_photo(26, 'r18_07.png', focus=(.5, .5))
    body = bgdiv(img) + top(1300, .75)
    body += at(250, bz("that's where most people", 74, lh=1.04) + bz(rul("plateau."), 118, 4, lh=1.0, extra='letter-spacing:-5px'), width=960)
    body += at(640, bz("then they pick the " + redw("main business") + ", because that's what keeps food on the table.", 50, lh=1.14), width=930)
    body += at(930, bz("and the info side " + rul("dies quietly."), 62, lh=1.1), width=930)
    body += at(1130, bz("none of that is your fault.", 60, lh=1.1), width=930)
    return logo_layer(body)


# ------------------------------------------------------------------ 08 (flat)
def s08():
    img = dim_photo(26, 'r18_08.png', blur=9, dark=.5)
    def row(rank, wname, num, hot=False):
        if hot:
            return (f'<div style="display:flex;align-items:center;gap:20px;border-radius:26px;padding:14px 24px;margin-top:16px;background:linear-gradient(90deg,rgba(229,50,45,.45),rgba(229,50,45,.1));border:2px solid {RED}">'
                    f'<div style="font-size:34px;font-weight:700;width:60px">new</div><div style="flex:1;font-size:26px;font-weight:700;color:#ffb3af">new face &middot; new idea</div>'
                    f'<div style="font-size:42px;font-weight:700;letter-spacing:-1.5px">2k <span style="color:{RED2}">&rarr; 18k+</span></div></div>')
        return (f'<div style="display:flex;align-items:center;gap:20px;padding:12px 8px;border-bottom:1.5px solid rgba(255,255,255,.12)"><div style="font-size:34px;font-weight:700;width:60px;opacity:.7">{rank}</div>'
                f'<div style="flex:1"><div style="height:14px;width:{wname}%;background:rgba(255,255,255,.55);border-radius:7px"></div></div>'
                f'<div style="font-size:42px;font-weight:700;letter-spacing:-1.5px;opacity:.9">{num}</div></div>')
    inner = ('<div style="font-size:26px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.7;margin-bottom:6px">top of your niche</div>'
             + row('#1', 54, '1.4M') + row('#2', 46, '980k') + row('#3', 50, '760k') + row('#4', 42, '540k')
             + '<div style="display:flex;align-items:center;gap:14px;margin:16px 0 0 70px;opacity:.75"><div style="flex:1;border-top:3px dashed rgba(255,255,255,.4)"></div><div style="font-size:24px;font-weight:700">every month</div><div style="flex:1;border-top:3px dashed rgba(255,255,255,.4)"></div></div>'
             + row('', 0, '', True))
    body = bgdiv(img) + top(700, .6)
    body += '<div class="abs" style="inset:0;background:radial-gradient(900px 600px at 0% 0%,rgba(229,50,45,.35),transparent 62%)"></div>'
    body += at(232, f'<div style="font-size:84px;line-height:1.02;font-weight:700;letter-spacing:-3.2px;{SH}">here\'s what<br>{rbox("most people miss.", 84, "0 22px 14px", 16)}</div>' + bz("the top of every niche is 3 or 4 names.", 46, 22, extra='font-weight:400'), width=960)
    body += at(640, inner, width=936)
    body += at(1190, bz("but every month, a new face breaks in.", 54, lh=1.08)
               + bz("people follow someone they don't feel " + rul("below."), 52, 26, lh=1.1)
               + f'<div style="margin-top:26px;font-size:58px;font-weight:700;letter-spacing:-2px;line-height:1.15;{SH}">you don\'t have to be a guru.<br>you just have to sound like {rbox("you.", 58, "0 20px 12px")}</div>', width=960)
    return logo_layer(body)


# ------------------------------------------------------------------ 10 (yo)
def s10():
    body = R7.s10().replace('hey, how can i help you today?', 'yo, what are we cooking today?')
    return logo_layer(body)


# ------------------------------------------------------------------ 11 (stacked, red wash, flat)
def s11():
    img = dim_photo(49, 'r18_11.png', focus=(.72, .5), blur=8, dark=.55)
    rows = ''
    for lab_, line, cash, wd in (('setter', '312 dms &middot; 58 calls booked', '', 100), ('setter', '287 dms &middot; 49 calls booked', '', 84), ('closer', '78 calls &middot; 79% showed &middot; 23% closed', '', 100)):
        rows += (f'<div style="display:flex;align-items:center;gap:20px;margin-top:24px"><div style="width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.5);display:grid;place-items:center;flex:none">'
                 f'<svg width="32" height="32" viewBox="0 0 38 38"><circle cx="19" cy="14" r="7" fill="#fff"/><path d="M5 34q14-22 28 0z" fill="#fff"/></svg></div>'
                 f'<div style="flex:1"><div style="font-size:32px;font-weight:700;letter-spacing:-.6px">{lab_}</div><div style="font-size:25px;opacity:.8;margin-top:3px">{line}</div>'
                 f'<div style="height:9px;border-radius:5px;background:rgba(255,255,255,.14);margin-top:9px"><div style="height:9px;border-radius:5px;width:{wd}%;background:{RG}"></div></div></div></div>')
    body = bgdiv(img)
    body += '<div class="abs" style="inset:0;background:radial-gradient(1000px 800px at 100% 55%,rgba(229,50,45,.5),transparent 62%),radial-gradient(800px 600px at 0% 100%,rgba(229,50,45,.3),transparent 60%)"></div>'
    body += at(236, bz("then the sales side.", 84, lh=1.0)
               + f'<div style="display:flex;gap:18px;align-items:center;margin-top:24px">{check_(GREEN)}{bz("you see who\'s closing.", 50)}</div>'
               + f'<div style="display:flex;gap:18px;align-items:center;margin-top:10px">{xmark_(RED)}{bz("who\'s " + rul("not."), 50)}</div>', width=940)
    body += at(640, f'<div style="display:flex;align-items:center;gap:16px">{coin(54)}<div style="font-size:36px;font-weight:700;letter-spacing:-.8px">sales</div></div>{rows}', width=936)
    body += at(1120, f'<div style="font-size:44px;font-weight:700;letter-spacing:-1px;opacity:.9">CC</div><div style="font-size:150px;font-weight:700;letter-spacing:-7px;color:{RED2};line-height:.95;text-shadow:0 0 70px rgba(229,50,45,.7)">$96,000</div>', width=960)
    bi11 = lambda x: f'<div style="display:flex;gap:16px;align-items:center;margin-top:12px"><div style="width:14px;height:14px;border-radius:50%;background:{RED};flex:none"></div><div style="font-size:50px;font-weight:400;font-style:italic;letter-spacing:-1.2px;{SH}">{x}</div></div>'
    body += at(1440, bi11("who's hitting their calls?") + bi11("who's hitting your numbers?") + bz("no more guessing what happened on a call. no scripts to write yourself.", 34, 22, lh=1.2, extra='font-weight:400'), width=940)
    return logo_layer(body)


# ------------------------------------------------------------------ 12 (flat, red)
def s12():
    img = dim_photo(49, 'r18_12.png', focus=(.72, .5), blur=8, dark=.6)
    pts = [(0, 100), (12, 86), (25, 71), (40, 60), (55, 52), (70, 41), (85, 34), (100, 31)]
    Wc, Hc = 936, 250
    xy = lambda a, b: (a / 100 * Wc, 20 + (100 - b) / 100 * (Hc - 40))
    path = 'M' + ' L'.join(f'{xy(a, b)[0]:.0f} {xy(a, b)[1]:.0f}' for a, b in pts)
    chart = (f'<svg width="{Wc}" height="{Hc+40}" viewBox="0 0 {Wc} {Hc+40}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{RED2}" stop-opacity=".6"/><stop offset="1" stop-color="{RED2}" stop-opacity="0"/></linearGradient></defs>'
             f'<path d="{path} L{Wc} {Hc-20} L0 {Hc-20} Z" fill="url(#g)"/><path d="{path}" fill="none" stroke="{RED2}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
             + ''.join(f'<line x1="{x}" y1="10" x2="{x}" y2="{Hc-20}" stroke="rgba(255,255,255,.14)" stroke-width="2"/><text x="{x if 0<x<Wc-5 else (6 if x==0 else Wc-6)}" y="{Hc+22}" text-anchor="{"middle" if 0<x<Wc-5 else ("start" if x==0 else "end")}" font-family="Helvetica,Arial" font-size="26" fill="rgba(255,255,255,.7)">{l}</text>' for x, l in ((0, 'start'), (234, '25%'), (468, '50%'), (702, '75%'), (Wc, 'end')))
             + '</svg>')
    stats = ''.join(f'<div style="flex:1"><div style="display:inline-block;font-size:66px;font-weight:700;letter-spacing:-2.5px;line-height:1;color:{c};{'background:#fff;padding:2px 14px 8px;border-radius:14px;' if c == GRAPH else ''}">{v}</div><div style="font-size:23px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.75;margin-top:6px">{l}</div></div>'
                    for v, l, c in (('41.2k', 'watched', '#fff'), ('3.8k', 'clicked', '#fff'), ('212', 'booked', '#fff'), ('$64k', 'paid', GRAPH)))
    bl = lambda t: f'<div style="margin-top:10px">{rbox(t, 40, "2px 20px 12px", 12)}</div>'
    bi = lambda t: f'<div style="display:flex;gap:16px;align-items:center;margin-top:14px"><div style="width:14px;height:14px;border-radius:50%;background:{RED};flex:none"></div><div style="font-size:48px;font-weight:400;font-style:italic;letter-spacing:-1.4px;{SH}">{t}</div></div>'
    body = bgdiv(img)
    body += '<div class="abs" style="inset:0;background:radial-gradient(1000px 800px at 100% 40%,rgba(229,50,45,.45),transparent 62%)"></div>'
    body += at(236, f'<div style="font-size:84px;line-height:1.04;font-weight:700;letter-spacing:-3.2px;{SH}">every post is<br>{rbox("tracked.", 84, "0 24px 14px", 16)}</div>' + bl("watched") + bl("clicked") + bl("booked") + bl("paid"), width=940)
    body += at(790, f'<div style="display:flex;align-items:center;gap:16px">{coin(50)}<div><div style="font-size:23px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.7">youtube video tracking</div>'
                    f'<div style="font-size:30px;font-weight:700;letter-spacing:-.8px;margin-top:2px">how i would start from zero</div></div></div><div style="margin-top:6px">{chart}</div><div style="display:flex;gap:10px;margin-top:10px">{stats}</div>', width=936)
    body += at(1440, f'<div style="display:inline-block;position:relative;font-size:42px;font-weight:400;letter-spacing:-1px;{SH}">everything is tracked to the brim:<span style="position:absolute;left:0;right:0;bottom:-10px;height:9px;background:{RED};border-radius:4px"></span></div>' + bi("where they are") + bi("how they land") + bi("when they first start watching")
              + bz("all the way until they buy from you, and we keep retargeting them until they buy again.", 30, 16, lh=1.15, extra='font-weight:400'), width=960)
    return logo_layer(body)


# ------------------------------------------------------------------ 13 / 14 (no logo, red wash)
def wash2():
    return '<div class="abs" style="inset:0;background:radial-gradient(900px 700px at 0% 100%,rgba(229,50,45,.5),transparent 62%),radial-gradient(800px 700px at 100% 0%,rgba(229,50,45,.28),transparent 60%)"></div>'


def s13_body9():
    return at(262, bz("none of this was built overnight.", 90, lh=1.02)
              + f'<div style="margin-top:38px;font-size:56px;font-weight:700;letter-spacing:-1.8px;line-height:1.1;{SH}">{ulb("every framework was tested first.", 56)}</div>'
              + bz("it's a one-place stop that does the heavy lifting.", 44, 40, extra='font-weight:400')
              + f'<div style="margin-top:14px;font-size:50px;font-weight:700;letter-spacing:-1.6px;{SH}">{ulb("you keep doing what you\'re good at.", 50)}</div>', width=940)


def s13():
    return bgdiv(prep_photo(18, 'r18_13.png', focus=(.5, .5))) + top(900, .62) + wash2() + s13_body9()


SL = {'02': s02, '03': s03, '04': s04, '05': s05, '07': s07, '08': s08, '10': s10, '11': s11, '12': s12, '13': s13}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(SL)):
        render('r23_' + n, page(SL[n]()))

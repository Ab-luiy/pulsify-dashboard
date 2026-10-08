"""Round 6 (founder notes after round 5): real brand glyphs (simple-icons), TOF/MOF/BOF only on the content row,
three mock-ups for slide 5, leaderboard for slide 8, prompt-and-reply widget for slide 10, one-colour sales card,
tracking card with the full tracking message, subtle gradient + logo on 13/14. Run: python slides_r6.py [01 02 ...]"""
import sys, re
from engine import *
import slides_r5 as R5
from slides_r5 import bz, rul, redw, carry, dim_photo, card, GLASS, SH, SANS
from slides_r4 import U, bgdiv, top, bottom, check_, xmark_, px, red_ul, xrow
import slides_r4 as R4

MARK = os.path.join(ROOT, 'brand', 'logo', 'variations', '01-flat-white.png')
MARKU = MARK.replace('\\', '/')
import base64
_N = ("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/>"
         "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")
NOISE = 'data:image/svg+xml;base64,' + base64.b64encode(_N.replace('data:image/svg+xml;utf8,','').replace('%23','#').encode()).decode()


def brand(name, bg, fg='#fff', size=128, extra=''):
    svg = open(os.path.join(HERE, 'img', f'ic_{name}.svg'), encoding='utf-8').read()
    svg = re.sub(r'<title>.*?</title>', '', svg).replace('<svg ', f'<svg fill="{fg}" width="{int(size*.58)}" height="{int(size*.58)}" ', 1)
    return (f'<div style="width:{size}px;height:{size}px;border-radius:{size*.26:.0f}px;background:{bg};display:grid;place-items:center;position:relative;'
            f'box-shadow:0 12px 30px rgba(0,0,0,.45);flex:none">{svg}{extra}</div>')


def cap(t, w=150):
    return f'<div style="width:{w}px;text-align:center;font-size:26px;font-weight:700;letter-spacing:-.5px;margin-top:12px;white-space:nowrap;{SH}">{t}</div>'


def tiles(items, w=150):
    return '<div style="display:flex;gap:20px">' + ''.join(f'<div>{t}{cap(c, w)}</div>' for t, c in items) + '</div>'


def pngtile(path, size=128):
    return f'<img src="file:///{path}" style="width:{size}px;height:{size}px;border-radius:{size*.26:.0f}px;box-shadow:0 12px 30px rgba(0,0,0,.45);flex:none">'


# ------------------------------------------------------------------ 01
def s01():
    import final1 as F
    F.FOCUS_X = .459
    base = F.photo_with_seamless_top()
    m = F.cutout_matte()
    flat = Image.open(F.b.MARKPNG).convert('RGBA').resize((820, 820), Image.LANCZOS)
    a = Image.new('L', (W, H), 0)
    a.paste(flat.split()[3], (390 - 410, 820 - 410))
    white = Image.new('L', (W, H), 255)
    bloom = Image.merge('RGBA', (white, white, white, a.filter(ImageFilter.GaussianBlur(24)).point(lambda v: int(v * .8))))
    sharp = Image.merge('RGBA', (white, white, white, a.point(lambda v: int(v * .62))))
    scn = Image.alpha_composite(Image.alpha_composite(base.convert('RGBA'), bloom), sharp).convert('RGB')
    out = Image.composite(base, scn, m)
    pth = os.path.join(HERE, 'img', 'r6_s1.png')
    safe_save(dither(out), pth)
    c = 'text-align:center;left:0;width:1080px'
    body = bgdiv(pth.replace('\\', '/'))
    body += (f'<div class="abs" style="top:236px;{c}"><div style="font-size:42px;font-weight:400;letter-spacing:-1px;{SH}">i\'ve been working on this all year,</div>'
             f'<div style="font-size:96px;font-weight:700;letter-spacing:-4px;line-height:1.05;margin-top:6px;{SH}">up until {ul("today.")}</div></div>')
    body += (f'<div class="abs" style="top:1330px;{c}"><div style="font-size:38px;line-height:1.2;letter-spacing:-.8px;{SH}">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:58px;font-weight:700;letter-spacing:-2.2px;line-height:1.1;margin-top:26px;{SH}">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return body


# ------------------------------------------------------------------ 02
def s02():
    img = prep_photo(20, 'r6_02.png', focus=(.5, .5))
    craft = tiles([(brand('tradingview', '#2962FF'), 'trading'),
                   (brand('tiktok', '#000', extra=f'<div style="position:absolute;right:-8px;bottom:-8px;width:50px;height:50px;border-radius:16px;background:#fe2c55;display:grid;place-items:center"><svg width="30" height="30" viewBox="0 0 96 96"><path d="M20 30h56l-5 46H25z" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><path d="M34 30v-6a14 14 0 0128 0v6" fill="none" stroke="#fff" stroke-width="9"/></svg></div>'), 'tiktok shop'),
                   (brand('shopify', '#95BF47'), 'e-commerce'),
                   (brand('amazon', '#FF9900', '#111'), 'amazon fba')], 214 // 1 - 64)
    info = tiles([(brand('youtube', '#FF0000'), 'content'), (brand('instagram', 'linear-gradient(45deg,#f9a03f,#e1306c,#833ab4)'), 'audience'),
                  (brand('calendly', '#006BFF'), 'sales calls'), (brand('stripe', '#635BFF'), 'payments')], 150)
    body = bgdiv(img) + top(1100, .66) + bottom(1100, .6)
    body += at(236, bz("you're already good at what you do.", 78, lh=1.05), width=940)
    body += at(420, craft)
    body += at(700, bz("a mentorship, or teaching it with your own offer, can make you more than the thing itself.", 44, lh=1.18, extra='font-weight:400'), width=940)
    body += at(900, bz("but " + rul("info is a whole business") + " on its own.", 54), width=960)
    body += at(1010, info)
    body += at(1330, bz("so now you're learning", 54) + bz(f'two businesses<br>{redw("at once.")}', 110, 10, lh=1.0, extra='letter-spacing:-4.4px'), width=960)
    return body


# ------------------------------------------------------------------ 03
def funnel_stages():
    def fun(c, fill):
        return (f'<svg width="96" height="86" viewBox="0 0 96 86"><path d="M4 4h88L60 44v34L36 70V44z" fill="rgba(255,255,255,.12)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
                f'<clipPath id="c{int(fill*100)}"><rect x="0" y="{86*(1-fill)}" width="96" height="86"/></clipPath><path d="M4 4h88L60 44v34L36 70V44z" fill="{c}" clip-path="url(#c{int(fill*100)})"/></svg>')
    out = ''
    for lab, c, fill in (('top', '#7aa7ff', 1.0), ('middle', '#f2c230', .62), ('bottom', EMERALD, .3)):
        out += f'<div style="text-align:center">{fun(c, fill)}<div style="font-size:22px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-top:2px">{lab}<br><span style="opacity:.6">of funnel</span></div></div>'
    return f'<div style="display:flex;gap:26px;align-items:flex-start">{out}</div>'


def runners():
    cols = [EMERALD, '#f2c230', '#f08a24', '#e0407f', '#7aa7ff', SILVER]
    out = ''
    for i, c in enumerate(cols):
        x = 30 + i * 46; y = 70 + (i % 2) * 8
        out += (f'<g stroke="{c}" stroke-width="4.5" stroke-linecap="round" fill="none"><circle cx="{x+14}" cy="{y-24}" r="10" fill="{c}" stroke="none"/>'
                f'<path d="M{x+14} {y-12} L {x+4} {y+16}"/><path d="M{x+10} {y-6} L {x+30} {y-2}"/><path d="M{x+10} {y-6} L {x-6} {y+6}"/>'
                f'<path d="M{x+4} {y+16} L {x+24} {y+30}"/><path d="M{x+4} {y+16} L {x-10} {y+36}"/></g>'
                f'<path d="M{x-24} {y-10} L {x-8} {y-10} M{x-30} {y+4} L {x-12} {y+4}" stroke="{c}" stroke-width="3" stroke-linecap="round" opacity=".5"/>')
    out += f'<path d="M290 70 L 322 70 M308 56 L 322 70 L 308 84" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    return f'<svg width="340" height="130" viewBox="0 0 340 130">{out}</svg>'


def team3():
    def person(x, c, lab):
        return (f'<circle cx="{x}" cy="40" r="17" fill="{c}"/><path d="M{x-25} 96 Q {x} 50 {x+25} 96 Z" fill="{c}"/>'
                f'<text x="{x}" y="120" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="21" fill="{INK}">{lab}</text>')
    return f'<svg width="330" height="130" viewBox="0 0 330 130">{person(60, "#f2c230", "closer")}{person(165, "#7aa7ff", "setter")}{person(270, "#e0407f", "manager")}</svg>'


def payics():
    return ('<div style="display:flex;gap:14px;justify-content:flex-end">' + brand('stripe', '#635BFF', size=88) + pngtile(U('whop.png'), 88) + pngtile(U('fanbasis.png'), 88) + '</div>')


def s03_body():
    rows = [('content', 'where it starts', funnel_stages()), ('personal brand', 'people start buying into you', R4.brandfig()), ('traffic', '', runners()),
            ('landing page', '', R4.pagechips()), ('sales team', 'talented closers + setters', team3()), ('cash in the bank', '', payics())]
    out = at(236, bz("the whole chain.", 88, lh=1.0))
    for i, (lab, sub, vis) in enumerate(rows):
        y = 340 + i * 190
        last = i == 5
        num = (f'<div style="width:62px;height:62px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:34px;font-weight:700;'
               f'background:{EMERALD if last else "transparent"};color:{GRAPH if last else INK};border:4px solid {EMERALD if last else INK}">{i+1}</div>')
        subh = f'<div style="font-size:25px;color:{MUTE};margin-top:6px;letter-spacing:-.3px;line-height:1.15">{sub}</div>' if sub else ''
        out += at(y, f'<div style="height:176px;border-radius:34px;background:rgba(14,15,17,.7);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;gap:20px;padding:0 24px;'
                     f'box-shadow:0 14px 40px rgba(0,0,0,.4)">{num}<div style="width:{250 if i == 0 else 300}px;flex:none"><div style="font-size:{52 if len(lab)<14 else 44}px;font-weight:700;letter-spacing:-1.8px;line-height:1">{lab}</div>{subh}</div>'
                     f'<div style="flex:1;display:flex;justify-content:flex-end">{vis}</div></div>', left=72, width=936)
    out += at(1500, bz("most people have never run it.", 36, lh=1.2, extra='font-weight:400') + bz("some don't even know what a kpi is.", 36, lh=1.2, extra='font-weight:400')
              + bz("and that's fine. nobody teaches you this part.", 38, 8), width=960)
    return out


def s03():
    img = prep_photo(27, 'r6_03.png', focus=(.5, .5))
    return bgdiv(img) + top(300, .6) + bottom(1200, .6) + s03_body()


def s04():
    img = dim_photo(27, 'r6_04.png', blur=9, dark=.55)
    items = ["you want to post, but you don't know what to say", "you know what to say, but nobody's watching",
             "people are watching, but you don't know where to send them", "calls are booked, but you can't tell who's closing and who isn't"]
    rows = ''.join(f'<div style="display:flex;gap:26px;align-items:flex-start;padding:26px 0;border-top:1px solid rgba(255,255,255,.2)">{xmark_(RED)}'
                   f'<div style="font-size:48px;line-height:1.18;letter-spacing:-1.2px;font-weight:700;width:820px;{SH}">{t}</div></div>' for t in items)
    body = bgdiv(img) + carry(s03_body(), 8, .22)
    body += at(440, f'<div style="font-size:112px;line-height:1;font-weight:700;letter-spacing:-4.4px;{SH}">it {rul("breaks")}<br>somewhere:</div>', width=940)
    body += at(800, rows, width=936)
    return body


# ------------------------------------------------------------------ 05: three mock-ups (a, b, c)
def s05a_body():
    def row(kind, op=1):
        av = f'<div style="width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg,#8a8d99,#3b3d46);flex:none"></div>'
        chip = {'ok': ('replied', 'rgba(255,255,255,.2)', '#fff'), 'gone': ('seen, no reply', 'rgba(229,50,45,.28)', '#ff8e89'), 'book': ('booked', 'rgba(255,255,255,.9)', GRAPH), 'ns': ('no close', 'rgba(229,50,45,.28)', '#ff8e89')}[kind]
        return (f'<div style="display:flex;align-items:center;gap:20px;padding:16px 0;border-top:1px solid rgba(255,255,255,.14);opacity:{op}">{av}<div style="flex:1"><div style="height:14px;width:48%;background:rgba(255,255,255,.7);border-radius:7px"></div>'
                f'<div style="height:11px;width:78%;background:rgba(255,255,255,.28);border-radius:6px;margin-top:11px"></div></div>'
                f'<div style="padding:6px 18px 10px;border-radius:999px;background:{chip[1]};color:{chip[2]};font-size:25px;font-weight:700;white-space:nowrap">{chip[0]}</div></div>')
    inner = ''.join(row(k) for k in ('ok', 'ok', 'gone', 'gone', 'book', 'book', 'ns'))
    out = at(250, bz("you post something.", 84, lh=1.0) + bz("a couple people dm you.", 54, 12, extra='font-weight:400')
             + bz("you lose half of them in the chat.", 54, 6, extra='font-weight:400') + bz("the ones who book don't close.", 54, 6, extra='font-weight:400'), width=960)
    out += card(inner, 830, 700, 0, 70, 940).replace('padding:44px 46px', 'padding:26px 40px')
    out += at(1590, bz('and no idea ' + rul('which post') + ' brought any of them in.', 46, lh=1.1), width=960)
    return out


def s05b_body():
    out = at(250, bz("you post something.", 84, lh=1.0), width=960)
    rows = [('dm you', 18, '#f2c230'), ('stay in the chat', 9, '#f08a24'), ('book', 4, '#e0407f'), ('close', 1, SILVER)]
    y = 400
    for lab, n, c in rows:
        dots = ''.join(f'<div style="width:46px;height:46px;border-radius:50%;background:{c}"></div>' for _ in range(n))
        h = 102 if n > 9 else 46
        out += at(y, f'<div style="display:flex;gap:26px;align-items:center"><div style="font-size:44px;font-weight:700;letter-spacing:-1.2px;width:260px;flex:none;line-height:1.05;{SH}">{lab}</div>'
                     f'<div style="display:flex;flex-wrap:wrap;gap:10px;width:640px">{dots}</div></div>', width=960)
        y += h + 60
    thumbs = ''.join(f'<div style="width:150px;height:220px;border-radius:22px;background:linear-gradient(170deg,rgba(255,255,255,.22),rgba(255,255,255,.06));border:1.5px solid rgba(255,255,255,.4)"></div>' for _ in range(5))
    out += at(1030, bz("and you have no idea", 54, lh=1.05) + bz("which post " + rul("brought them in."), 74, 6, lh=1.0), width=960)
    out += at(1330, f'<div style="display:flex;gap:18px;align-items:center">{thumbs}</div>')
    out += (f'<svg class="abs" style="left:0;top:1280px" width="1080" height="60" viewBox="0 0 1080 60"><path d="M120 40 Q 540 -10 960 40" fill="none" stroke="{RED}" stroke-width="5" stroke-dasharray="3 12" stroke-linecap="round"/></svg>')
    return out


def s05c_body():
    seq = [('posted', '1', '#fff'), ('dm', '10', '#f2c230'), ('stay', '5', '#f08a24'), ('book', '2', '#e0407f'), ('close', '0', RED)]
    cols = ''.join(f'<div style="text-align:center;flex:1"><div style="font-size:120px;font-weight:700;letter-spacing:-6px;line-height:1;color:{c};{SH}">{n}</div>'
                   f'<div style="font-size:28px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.85;margin-top:8px">{l}</div></div>' for l, n, c in seq)
    out = at(250, bz("you post something.", 84, lh=1.0) + bz("a couple of people dm you. you lose half of them in the chat. the ones who book don't close.", 46, 22, lh=1.18, extra='font-weight:400'), width=940)
    out += at(780, f'<div style="display:flex;gap:6px">{cols}</div>', width=960)
    out += (f'<svg class="abs" style="left:0;top:770px" width="1080" height="20" viewBox="0 0 1080 20"><path d="M80 10 L 1000 10" stroke="rgba(255,255,255,.4)" stroke-width="3" stroke-dasharray="4 12"/></svg>')
    out += at(1130, bz("and no idea " + rul("which post") + " brought any of them in.", 66, lh=1.08), width=940)
    out += at(1420, f'<div style="font-size:30px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.6">where did they come from?</div>')
    return out


S5 = {'a': s05a_body, 'b': s05b_body, 'c': s05c_body}


def s05(v='a'):
    return bgdiv(prep_photo(38, 'r6_05.png', focus=(.5, .5))) + bottom(0, 0) + '<div class="abs" style="inset:0;background:rgba(11,12,13,.35)"></div>' + S5[v]()


def s06(v='a'):
    img = dim_photo(38, 'r6_06.png', blur=10, dark=.5)
    body = bgdiv(img) + carry(S5[v](), 8, .12)
    body += (f'<div class="abs" style="left:{px(78)}px;top:{px(258)}px;width:{px(700)}px;font-family:{SANS};font-weight:700;color:#fff;letter-spacing:{-px(1.4)}px;{SH};font-size:{px(38)}px">'
             f'<div style="line-height:1.15">so you {red_ul("try harder.")}</div>'
             f'<div style="margin-top:{px(46)}px">{xrow("more posts")}{xrow("more tools")}{xrow("another chatgpt tab at 2am")}</div>'
             f'<div style="margin-top:{px(46)}px;line-height:1.15">you start copying the big names.</div>'
             f'<div style="margin-top:{px(40)}px"><span style="background:rgba(11,12,13,.92);padding:{px(4)}px {px(10)}px {px(8)}px;border-radius:{px(5)}px;line-height:1.6;-webkit-box-decoration-break:clone;box-decoration-break:clone">'
             f'and end up promoting <span style="color:{RED}">their</span> format instead of building your own.</span></div>'
             f'<div style="margin-top:{px(44)}px;line-height:1.14">MEANWHILE THE THING THAT PAYS YOU GETS</div><div style="line-height:1.14">{red_ul("LESS OF YOUR TIME.")}</div></div>')
    return body


# ------------------------------------------------------------------ 08: niche leaderboard
def s08():
    img = dim_photo(26, 'r6_08.png', blur=9, dark=.5)
    def row(rank, name_w, num, hot=False):
        bg = 'background:linear-gradient(90deg,rgba(229,50,45,.35),rgba(229,50,45,.1));border:2px solid ' + RED if hot else 'background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.2)'
        av = (f'<div style="width:66px;height:66px;border-radius:50%;flex:none;background:{"linear-gradient(135deg,#ff8e89,#e5322d)" if hot else "linear-gradient(135deg,#8a8d99,#3b3d46)"};display:grid;place-items:center">'
              f'<svg width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="14" r="7" fill="#fff" opacity=".85"/><path d="M5 34q14-22 28 0z" fill="#fff" opacity=".85"/></svg></div>')
        tag = (f'<div style="margin-top:8px;font-size:23px;font-weight:700;color:#ff8e89;letter-spacing:.02em">new face &middot; new idea</div>') if hot else f'<div style="height:11px;width:{name_w*.7:.0f}%;background:rgba(255,255,255,.25);border-radius:6px;margin-top:11px"></div>'
        return (f'<div style="display:flex;align-items:center;gap:20px;border-radius:26px;padding:16px 24px;margin-top:14px;{bg}"><div style="font-size:38px;font-weight:700;width:56px;opacity:.8">#{rank}</div>{av}'
                f'<div style="flex:1"><div style="height:16px;width:{name_w}%;background:{"#fff" if hot else "rgba(255,255,255,.65)"};border-radius:8px"></div>{tag}</div>'
                f'<div style="text-align:right"><div style="font-size:44px;font-weight:700;letter-spacing:-1.5px">{num}</div></div></div>')
    inner = ('<div style="font-size:28px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.75">top of your niche</div>'
             + row(1, 54, '1.4M') + row(2, 46, '980k') + row(3, 50, '760k') + row(4, 42, '540k')
             + '<div style="display:flex;align-items:center;gap:14px;margin:18px 0 4px 78px;opacity:.7"><div style="flex:1;border-top:3px dashed rgba(255,255,255,.4)"></div><div style="font-size:24px;font-weight:700">every month</div><div style="flex:1;border-top:3px dashed rgba(255,255,255,.4)"></div></div>'
             + row('?', 36, '18k', True))
    body = bgdiv(img) + top(700, .6)
    body += at(236, bz("here's what most people miss.", 66, lh=1.05) + bz("the top of every niche is 3 or 4 names.", 48, 14, extra='font-weight:400'), width=940)
    body += card(inner, 520, 640, 0, 70, 940).replace('padding:44px 46px', 'padding:30px 36px')
    body += at(1220, bz("but a new face breaks in every month.", 54, lh=1.08) + bz("not a guru. not bigger. just someone new, with a new idea.", 42, 12, lh=1.15, extra='font-weight:400')
              + bz("people follow someone they don't feel " + rul("below."), 54, 24, lh=1.1)
              + bz("you don't have to be a guru. you just have to sound like " + redw("you."), 54, 24, lh=1.1), width=940)
    return body


# ------------------------------------------------------------------ 10: prompt + Pulsify reply
def grain(base):
    return f'background:{base};position:relative;overflow:hidden'


def coin(size=64):
    return f'<img src="file:///{MARKU}" style="width:{size}px;height:{size}px;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))">'


def widget(inner, top_, h, tilt=0):
    return (f'<div class="abs" style="left:60px;top:{top_}px;width:960px;height:{h}px;perspective:2000px"><div style="width:100%;height:100%;border-radius:46px;border:1.5px solid rgba(255,255,255,.35);'
            f'background:linear-gradient(150deg,rgba(122,59,92,.88),rgba(52,40,92,.88) 55%,rgba(24,26,40,.92));box-shadow:0 50px 100px rgba(0,0,0,.6);transform:rotateY({tilt}deg);position:relative;overflow:hidden;color:#fff">'
            f'<div style="position:absolute;inset:0;background-image:url({NOISE});opacity:.38;mix-blend-mode:overlay"></div>'
            f'<div style="position:relative;padding:40px 44px;height:100%">{inner}</div></div></div>')


def s10():
    img = prep_photo(49, 'r6_10.png', focus=(.72, .5))
    frames = []
    for i, (pid, txt, lab, tint) in enumerate(((31, 'i almost quit.', 'personal', '#7a3b5c'), (37, 'stop posting daily.', 'contrarian', '#8c2a2a'), (41, 'nobody tells you this.', 'curiosity', '#2a4a7a'))):
        pth = prep_photo(pid, f'r6_f{i}.png', focus=(.5, .5))
        frames.append(f'<div style="width:244px;height:430px;border-radius:30px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,.4);box-shadow:0 20px 50px rgba(0,0,0,.5)">'
                      f'<div style="position:absolute;inset:0;background:url(\'file:///{pth}\') center/cover"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,{tint}cc,rgba(10,10,14,.15) 40%,rgba(10,10,14,.85))"></div>'
                      f'<div style="position:absolute;left:20px;right:16px;bottom:62px;font-size:40px;line-height:1.02;font-weight:700;letter-spacing:-1.6px">{txt}</div>'
                      f'<div style="position:absolute;left:20px;bottom:22px;font-size:20px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.8">{lab}</div></div>')
    inner = (f'{coin(66)}'
             f'<div style="margin:22px 0 0 auto;width:700px;background:{SILVER};color:{GRAPH};border-radius:34px 34px 8px 34px;padding:22px 30px 28px;font-size:36px;font-weight:700;letter-spacing:-1px;line-height:1.14">'
             f'i want a full credibility-based story sequence for my offer launch, built to get high bookings.</div>'
             f'<div style="display:flex;gap:18px;margin-top:38px;align-items:flex-start"><div style="margin-top:2px">{coin(58)}</div><div style="display:flex;gap:18px">{"".join(frames)}</div></div>')
    body = bgdiv(img) + top(900, .78) + bottom(1100, .6)
    body += at(250, bz("now you sit down and you already know what to make.", 66, lh=1.06)
               + bz("it's written in " + rul("your voice") + ", so you don't sound like everyone else.", 48, 22, lh=1.15, extra='font-weight:400'), width=940)
    body += widget(inner, 760, 800)
    body += at(1610, bz("the people who see it land somewhere that sells. and we work through it with you.", 32, lh=1.2, extra='font-weight:400'), width=940)
    return body


# ------------------------------------------------------------------ 11: sales card
def s11():
    img = dim_photo(49, 'r6_11.png', focus=(.72, .5), blur=8, dark=.6)
    rows = ''
    for lab, calls, show, close, cash, wd in (('closer 1', 41, '82%', '23%', '$48,000', 100), ('closer 2', 33, '79%', '20%', '$30,000', 62), ('closer 3', 27, '78%', '15%', '$18,000', 38)):
        rows += (f'<div style="display:flex;align-items:center;gap:20px;margin-top:26px"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.5);display:grid;place-items:center;flex:none">'
                 f'<svg width="34" height="34" viewBox="0 0 38 38"><circle cx="19" cy="14" r="7" fill="#fff"/><path d="M5 34q14-22 28 0z" fill="#fff"/></svg></div>'
                 f'<div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:30px;font-weight:700;letter-spacing:-.6px"><span>{lab}</span><span style="color:{EMERALD}">{cash}</span></div>'
                 f'<div style="font-size:24px;opacity:.7;margin-top:4px">{calls} calls &middot; {show} showed &middot; {close} closed</div>'
                 f'<div style="height:10px;border-radius:5px;background:rgba(255,255,255,.14);margin-top:10px"><div style="height:10px;border-radius:5px;width:{wd}%;background:{EMERALD}"></div></div></div></div>')
    inner = (f'<div style="display:flex;align-items:center;gap:16px">{coin(54)}<div style="font-size:34px;font-weight:700;letter-spacing:-.8px">sales team</div></div>{rows}'
             f'<div style="margin-top:34px;padding-top:24px;border-top:1.5px solid rgba(255,255,255,.2);display:flex;align-items:baseline;justify-content:space-between"><div style="font-size:32px;opacity:.8;font-weight:700;letter-spacing:-.6px">cash collected</div>'
             f'<div style="font-size:104px;font-weight:700;letter-spacing:-5px;color:{EMERALD};line-height:1">$96,000</div></div>')
    body = bgdiv(img)
    body += at(250, bz("then the sales side.", 84, lh=1.0)
               + f'<div style="display:flex;gap:18px;align-items:center;margin-top:24px">{check_(EMERALD)}{bz("you see who\'s closing.", 50)}</div>'
               + f'<div style="display:flex;gap:18px;align-items:center;margin-top:10px">{xmark_(RED)}{bz("who\'s " + rul("not."), 50)}</div>', width=940)
    body += R5.card(inner, 790, 660, 8)
    body += at(1500, bz("who's hitting their calls. who's hitting your numbers.", 38, lh=1.2) + bz("no more guessing what happened on a call. no scripts to write yourself.", 36, 8, lh=1.2, extra='font-weight:400'), width=940)
    return body


# ------------------------------------------------------------------ 12: tracking
def s12():
    img = dim_photo(49, 'r6_12.png', focus=(.72, .5), blur=8, dark=.75)
    pts = [(0, 100), (12, 86), (25, 71), (40, 60), (55, 52), (70, 41), (85, 34), (100, 31)]
    Wc, Hc = 850, 280
    xy = lambda a, b: (a / 100 * Wc, 20 + (100 - b) / 100 * (Hc - 40))
    path = 'M' + ' L'.join(f'{xy(a, b)[0]:.0f} {xy(a, b)[1]:.0f}' for a, b in pts)
    chart = (f'<svg width="{Wc}" height="{Hc+40}" viewBox="0 0 {Wc} {Hc+40}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{EMERALD}" stop-opacity=".55"/><stop offset="1" stop-color="{EMERALD}" stop-opacity="0"/></linearGradient></defs>'
             f'<path d="{path} L{Wc} {Hc-20} L0 {Hc-20} Z" fill="url(#g)"/><path d="{path}" fill="none" stroke="{EMERALD}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
             + ''.join(f'<line x1="{x}" y1="10" x2="{x}" y2="{Hc-20}" stroke="rgba(255,255,255,.18)" stroke-width="2"/><text x="{x if 0<x<845 else (6 if x==0 else 840)}" y="{Hc+22}" text-anchor="{"middle" if 0<x<845 else ("start" if x==0 else "end")}" font-family="Helvetica,Arial" font-size="26" fill="rgba(255,255,255,.7)">{l}</text>' for x, l in ((0, 'start'), (212, '25%'), (425, '50%'), (637, '75%'), (845, 'end')))
             + '</svg>')
    stats = ''.join(f'<div style="flex:1"><div style="font-size:64px;font-weight:700;letter-spacing:-2.5px;line-height:1;color:{c}">{v}</div><div style="font-size:24px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-top:6px">{l}</div></div>'
                    for v, l, c in (('41.2k', 'watched', '#fff'), ('3.8k', 'clicked', '#fff'), ('212', 'booked', '#fff'), ('$64k', 'paid', EMERALD)))
    inner = (f'<div style="display:flex;align-items:center;gap:16px">{coin(54)}<div><div style="font-size:24px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.65">youtube video tracking</div>'
             f'<div style="font-size:32px;font-weight:700;letter-spacing:-.8px;margin-top:2px">how i would start from zero</div></div></div>'
             f'<div style="margin-top:12px">{chart}</div><div style="display:flex;gap:10px;margin-top:18px">{stats}</div>')
    bl = lambda t: f'<div style="display:flex;gap:18px;align-items:center;margin-top:8px"><div style="width:16px;height:16px;border-radius:50%;background:{RED};flex:none"></div>{bz(t, 44)}</div>'
    body = bgdiv(img)
    body += at(250, bz(rul("every post is tracked."), 84, lh=1.0) + bl("who watched") + bl("how far they got") + bl("who clicked") + bl("who booked") + bl("who paid"), width=940)
    body += R5.card(inner, 760, 640, -8)
    body += at(1450, bz("everything is tracked to the brim.", 50, lh=1.08) + bz("where they are. how they land. when they first start watching.", 36, 8, lh=1.15, extra='font-weight:400')
              + bz("all the way until they buy from you, and we keep retargeting them until they buy again.", 36, 8, lh=1.15, extra='font-weight:400'), width=940)
    return body


# ------------------------------------------------------------------ 13 / 14: Kobey-style gradient + subtle logo
def wash():
    return ('<div class="abs" style="inset:0;background:radial-gradient(900px 700px at 0% 100%,rgba(229,50,45,.42),transparent 62%),radial-gradient(800px 700px at 100% 0%,rgba(77,63,140,.4),transparent 60%)"></div>'
            f'<img class="abs" src="file:///{MARKU}" style="left:894px;top:176px;width:96px;opacity:.85">')


def s13():
    return bgdiv(prep_photo(18, 'r6_13.png', focus=(.5, .5))) + top(900, .62) + wash() + R5.s13_body()


def s14():
    img = dim_photo(18, 'r6_14.png', blur=9, dark=.5)
    body = bgdiv(img) + wash() + carry(R5.s13_body(), 6, .35)
    body += at(930, bz("right now it's only for the people i work with.", 70, lh=1.04) + bz("it's getting sharper every week.", 48, 34, extra='font-weight:400')
               + bz("and i'm not stopping until this is a " + rul("seven-figure company."), 54, 26), width=940)
    return body


SL = {'01': s01, '02': s02, '03': s03, '04': s04, '05': lambda: s05('a'), '05b': lambda: s05('b'), '05c': lambda: s05('c'), '06': s06, '08': s08, '10': s10, '11': s11, '12': s12, '13': s13, '14': s14}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(SL)):
        render('r6_' + n, page(SL[n]()))

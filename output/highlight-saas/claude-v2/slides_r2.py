"""Round 2 rebuild (founder feedback 2026-10-08). Overrides slides in slides.py. Run: python slides_r2.py [02 03 ...]"""
import sys, math
import slides as S
from engine import *
from slides import check, xmark

SAMPLE_TAG = '<span style="opacity:.6">&middot; sample data</span>'


# ------------------------------------------------------------------ 02  two businesses
def candle_card():
    data = [(60, 48, 66, 40), (48, 58, 62, 44), (58, 72, 76, 54), (72, 64, 78, 58), (64, 80, 86, 60), (80, 70, 84, 64), (70, 88, 94, 68), (88, 96, 100, 82), (96, 90, 100, 84)]
    out = ''
    for i, (o, c, h, l) in enumerate(data):
        x = 40 + i * 38
        yv = lambda v: 244 - v * 2.0
        col = EMERALD if c >= o else RED
        out += (f'<line x1="{x}" y1="{yv(h):.1f}" x2="{x}" y2="{yv(l):.1f}" stroke="{col}" stroke-width="4" stroke-linecap="round"/>'
                f'<rect x="{x-11}" y="{yv(max(o,c)):.1f}" width="22" height="{max(8, abs(yv(o)-yv(c))):.1f}" rx="5" fill="{col}"/>')
    return f'<svg width="400" height="270" viewBox="0 0 400 270">{out}</svg>'


def funnel_card():
    bars = [(300, SILVER), (210, SILVER), (120, EMERALD)]
    out = ''
    for i, (w, col) in enumerate(bars):
        out += f'<rect x="{(400-w)/2}" y="{50+i*76}" width="{w}" height="52" rx="26" fill="{col}"/>'
    return f'<svg width="400" height="270" viewBox="0 0 400 270">{out}</svg>'


def s02():
    img = prep_photo_full(20, 'p02.png', blur=3)
    card = lambda inner: (f'<div style="width:420px;height:290px;border-radius:40px;background:rgba(14,15,17,.7);border:1px solid rgba(255,255,255,.16);'
                          f'display:grid;place-items:center">{inner}</div>')
    plus = (f'<div style="width:78px;height:78px;border-radius:50%;background:{SILVER};color:{GRAPH};display:grid;place-items:center;font-size:60px;'
            f'font-weight:700;margin:0 -30px;z-index:2;line-height:1;padding-bottom:6px">+</div>')
    body = scene(img, .3, .1, .3)
    body += at(280, p("you're already good at what you do.", 84, 700, lh=1.03, ls=-3.1)
               + p("trading. tiktok shop. whatever it is.", 48, 400, MUTE, mt=30)
               + p("and you know a mentorship can make you more than the thing itself.", 48, mt=24)
               + p("but info is a whole business on its own.", 48, 700, mt=24))
    body += at(830, f'<div style="display:flex;align-items:center;justify-content:center">{card(candle_card())}{plus}{card(funnel_card())}</div>')
    body += at(1170, p("so now you're learning", 60, ls=-1.8)
               + f'<div style="margin:14px 0 10px -4px">{block("two businesses", 134)}</div>' + p("at once.", 60, ls=-1.8))
    return body


# ------------------------------------------------------------------ 03  the chain (slide 4's list language)
def s03():
    img = prep_photo_full(27, 'p03.png')
    steps = ['content.', 'traffic.', 'page.', 'sales calls.', 'team.', 'cash in the bank.']
    rows = ''
    for i, st in enumerate(steps):
        last = i == len(steps) - 1
        col = EMERALD if last else INK
        circ = (f'<svg width="72" height="72" viewBox="0 0 56 56" style="flex:none"><circle cx="28" cy="28" r="25" fill="{EMERALD if last else "none"}" stroke="{col}" stroke-width="5"/>'
                f'<text x="28" y="38" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="28" fill="{GRAPH if last else INK}">{i+1}</text></svg>')
        word = block(st, 80, pad='0 28px 16px', radius=20) if last else f'<span style="font-size:84px;font-weight:700;letter-spacing:-3px;line-height:1">{st}</span>'
        rows += f'<div style="display:flex;gap:34px;align-items:center;padding:24px 0;border-top:1px solid rgba(255,255,255,.18)">{circ}{word}</div>'
    body = scene(img, .3, .12, .4)
    body += at(280, p("that's the<br>whole chain.", 96, 700, lh=1, ls=-4))
    body += at(520, rows)
    body += at(1400, p("most people have never run it.", 42, ls=-.6) + p("some don't even know what a kpi is.", 42, ls=-.6) + p("and that's fine. nobody teaches you this part.", 42, 700, ls=-.6))
    return body


# ------------------------------------------------------------------ 05  the leak, as a chart
def s05():
    img = prep_photo_full(38, 'p05.png')

    def row(text, kept, lost, label_kept, label_lost, first=False):
        seg = f'<div style="height:100%;width:{kept}%;background:{SILVER};border-radius:18px 0 0 18px;{"border-radius:18px;" if not lost else ""}"></div>'
        if lost:
            seg += (f'<div style="height:100%;width:{lost}%;background:repeating-linear-gradient(135deg,{RED} 0 10px,rgba(229,50,45,.55) 10px 20px);border-radius:0 18px 18px 0"></div>')
        lab = (f'<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:28px;font-weight:700">'
               f'<span style="color:{INK}">{label_kept}</span><span style="color:{RED}">{label_lost}</span></div>')
        return (f'<div style="margin-top:44px">{p(text, 50, 700, ls=-1.4, lh=1.1)}'
                f'<div style="display:flex;height:36px;margin-top:16px;border-radius:18px;background:rgba(255,255,255,.1);overflow:hidden">{seg}</div>{lab}</div>')

    rows = (row("a couple of people dm you.", 100, 0, "40 dms", "")
            + row("you lose half of them in the chat.", 50, 50, "20 stay", "-20 gone")
            + row("the ones who book don't close.", 20, 30, "8 book", "-12 never close"))
    body = scene(img, .6, .45, .7)
    body += at(280, p("you post something.", 92, 700, lh=1.02, ls=-3.4) + f'<div class="label" style="margin-top:14px;font-size:22px">sample data</div>')
    body += at(470, rows)
    body += '<div class="abs" style="left:0;top:1090px;width:1080px;height:420px;background:linear-gradient(180deg,rgba(11,12,13,0) 0%,rgba(11,12,13,.7) 30%,rgba(11,12,13,.7) 70%,rgba(11,12,13,0) 100%)"></div>'
    body += at(1150, f'<div style="display:flex;align-items:center;gap:30px">'
               + p("and you have no idea " + ul("which post") + " brought any of them in.", 54, 700, lh=1.2, ls=-1.3).replace('<div ', '<div style="width:720px" data-x ', 1).replace('style="width:720px" data-x style="', 'style="width:720px;', 1)
               + f'<div style="width:130px;height:130px;border-radius:50%;background:{SILVER};color:{GRAPH};display:grid;place-items:center;font-size:96px;font-weight:700;flex:none;padding-bottom:10px">?</div></div>')
    return body


# ------------------------------------------------------------------ 06  windows piling up
def s06():
    img = prep_photo_full(37, 'p06.png')
    wins = ''
    for i, (l, t, rot) in enumerate([(50, 300, -5), (190, 380, 3), (330, 300, -2), (470, 400, 6)]):
        lines = ''.join(f'<div style="height:14px;width:{w}%;border-radius:7px;background:rgba(239,238,233,.35);margin-top:16px"></div>' for w in (80, 60, 72))
        wins += (f'<div class="abs" style="left:{l}px;top:{t}px;width:520px;height:300px;border-radius:26px;background:rgba(14,15,17,{.62 + i*.08});'
                 f'border:2px solid rgba(239,238,233,.45);transform:rotate({rot}deg);padding:22px 28px;box-shadow:0 20px 50px rgba(0,0,0,.5)">'
                 f'<div style="display:flex;gap:10px"><i style="width:14px;height:14px;border-radius:50%;background:{RED};display:block"></i><i style="width:14px;height:14px;border-radius:50%;background:#e6b04d;display:block"></i><i style="width:14px;height:14px;border-radius:50%;background:{EMERALD};display:block"></i></div>{lines}</div>')
    body = scene(img, .45, .64, .84) + wins
    body += at(800, p("so you try harder.", 112, 700, lh=1, ls=-4.4))
    body += at(980, p("more posts. more tools.", 52, ls=-1.3)
               + p("another chatgpt tab at " + block("2am", 56, pad='0 18px 12px', radius=14), 52, ls=-1.3, mt=14)
               + p("you start copying what the big names do.", 52, ls=-1.3, mt=36)
               + p("and you end up promoting their format instead of building your own.", 52, ls=-1.3, mt=26)
               + p("meanwhile the thing that actually pays you gets " + ul("less of your time."), 52, 700, ls=-1.3, mt=46))
    return body


# ------------------------------------------------------------------ 07  plateau, two lines
def s07():
    img = prep_photo_full(26, 'p07.png')
    svg = (f'<svg width="936" height="400" viewBox="0 0 936 400"><defs><linearGradient id="dy" x1="0" x2="1"><stop offset="0" stop-color="{EMERALD}"/><stop offset="1" stop-color="{RED}"/></linearGradient></defs>'
           f'<line x1="0" y1="384" x2="936" y2="384" stroke="rgba(255,255,255,.25)" stroke-width="3"/>'
           f'<path d="M520 110 C 600 100, 650 220, 716 290 L 916 360 L 916 232 C 800 238, 650 234, 520 238 Z" fill="rgba(229,50,45,.22)"/>'
           f'<path d="M14 262 C 300 252, 620 240, 916 226" fill="none" stroke="{SILVER}" stroke-width="9" stroke-linecap="round"/>'
           f'<path d="M14 352 C 140 346, 260 130, 520 108" fill="none" stroke="{EMERALD}" stroke-width="9" stroke-linecap="round"/>'
           f'<path d="M520 108 C 600 98, 650 220, 716 290 L 916 360" fill="none" stroke="url(#dy)" stroke-width="9" stroke-linecap="round" stroke-dasharray="1 0"/>'
           f'<circle cx="520" cy="108" r="14" fill="{EMERALD}"/><circle cx="916" cy="360" r="14" fill="{RED}"/>'
           f'<text x="676" y="196" font-family="Helvetica,Arial" font-weight="700" font-size="30" fill="{SILVER}">main business</text>'
           f'<text x="548" y="92" font-family="Helvetica,Arial" font-weight="700" font-size="30" fill="{EMERALD}">info side</text></svg>')
    body = scene(img, .68, .5, .7)
    body += at(280, p("that's where most people " + ul("plateau."), 84, 700, lh=1.06, ls=-3)
               + p("then they pick the main business, because that's what keeps food on the table.", 46, ls=-1, mt=40)
               + p("and the info side dies quietly.", 46, ls=-1, mt=22)
               + p("none of that is your fault.", 46, 700, ls=-1, mt=22))
    body += at(980, svg)
    return body


# ------------------------------------------------------------------ 08  new faces
def s08():
    img = prep_photo_full(47, 'p08.png')
    big = ''.join(f'<div style="width:100px;height:100px;border-radius:50%;background:{SILVER};flex:none;box-shadow:0 10px 30px rgba(0,0,0,.45)"></div>' for _ in range(4))
    dots = ''
    for i in range(16):
        r = 11 + (i * 7) % 12
        x = 20 + (i * 53) % 400
        yv = 118 - ((i * 37) % 100) - r
        dots += f'<circle cx="{x}" cy="{max(r+2, yv)}" r="{r}" fill="{EMERALD}" opacity="{.55 + (i % 4) * .15:.2f}"/>'
    row = (f'<div style="display:flex;align-items:center;gap:26px;margin-top:26px"><div style="display:flex;gap:24px">{big}</div>'
           f'<svg width="430" height="124" viewBox="0 0 430 124">{dots}</svg></div>')
    body = scene(img, .55, .55, .2)
    body += at(262, p("here's what most people miss.", 64, 700, lh=1.04, ls=-2.4)
               + p("the top of every niche is 3 or 4 names.", 42, ls=-1, mt=28) + row
               + p("but new people break in every single month.", 42, ls=-1, mt=22)
               + p("not because they're bigger. because they bring something new.", 42, ls=-1, mt=16)
               + p("people always want a new face with a new idea.", 42, ls=-1, mt=16)
               + f'<div style="margin-top:36px;font-size:62px;line-height:1.08;font-weight:700;letter-spacing:-2.4px">"you don\'t need to be first. you need to {block("sound like you.", 62, pad="0 16px 10px", radius=14)}"</div>')
    return body


# ------------------------------------------------------------------ 11  sales
def s11():
    img = prep_photo_full(41, 'p11.png')
    rows = (f'<div style="display:flex;align-items:center;gap:22px;margin-top:22px">{check(EMERALD)}<div style="font-size:48px;font-weight:700;letter-spacing:-1.4px">you see who\'s closing.</div></div>'
            f'<div style="display:flex;align-items:center;gap:22px;margin-top:14px">{xmark(RED)}<div style="font-size:48px;font-weight:700;letter-spacing:-1.4px">who\'s not.</div></div>')
    body = scene(img, .66, .22, .3)
    body += at(262, p("then the sales side.", 88, 700, lh=1, ls=-3.3) + rows
               + p("who's hitting their calls. who's hitting your numbers.", 40, ls=-.9, mt=26)
               + p("no more guessing what happened on a call.", 40, ls=-.9, mt=14) + p("no scripts to write yourself.", 40, 700, ls=-.9, mt=14))
    return body


# ------------------------------------------------------------------ 12  tracked ($63,000 = 9 x $7,000)
def s12():
    img = prep_photo_full(46, 'p12.png')
    flow = [('watched', '18,400', 1.0), ('clicked', '1,120', .74), ('applied', '61', .5), ('booked a call', '22', .34), ('paid', '9', .2)]
    rows = ''
    for lab, val, wd in flow:
        col = EMERALD if lab == 'paid' else INK
        rows += (f'<div style="display:flex;align-items:baseline;justify-content:space-between;width:400px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.16)">'
                 f'<span style="font-size:28px;color:{MUTE}">{lab}</span><span style="font-size:38px;font-weight:700;letter-spacing:-1.2px;color:{col}">{val}</span></div>'
                 f'<div style="height:4px;width:{int(400*wd)}px;background:{col};opacity:.9;border-radius:2px;margin:0 0 7px 0"></div>')
    body = scene(img, .55, .22, .72)
    body += at(256, p("and every post is tracked.<br>who watched, who clicked,<br>who booked, who paid.", 44, ls=-.8, lh=1.24), width=700)
    body += at(470, f'<div style="font-size:100px;line-height:1.02;font-weight:700;letter-spacing:-4.5px">"you never<br>post {block("blind", 100, pad="0 22px 12px", radius=16)}<br>' + ul('again."') + '</div>', width=600)
    body += at(846, f'<div class="label" style="margin-bottom:8px;font-size:23px;white-space:nowrap">tracked {SAMPLE_TAG}</div>{rows}', width=560)
    body += at(1240, f'<div style="font-size:250px;line-height:.85;font-weight:700;letter-spacing:-14px;color:{EMERALD};text-shadow:0 0 60px rgba(95,214,164,.45)">$63,000</div>'
               f'<div class="label" style="margin-top:24px">cash collected &nbsp;&middot;&nbsp; 9 paid x $7,000</div>', left=60, width=980)
    return body


# ------------------------------------------------------------------ 13 / 14
def s13():
    img = prep_photo_full(18, 'p13.png')
    body = scene(img, .5, .1, .4)
    body += at(262, p("none of this was built overnight.", 84, 700, lh=1.02, ls=-3)
               + p(ul("every framework was tested first."), 48, 700, ls=-1.2, mt=34)
               + p("then turned into one place that does the heavy lifting, so you can keep doing what you're good at.", 44, ls=-1, mt=28))
    return body


def s14():
    img = prep_photo_full(34, 'p14.png')
    body = scene(img, .8, .42, .35)
    body += at(262, p("right now it's only for the people i work with.", 62, 700, lh=1.05, ls=-2.2)
               + p("it's getting sharper every week.", 44, ls=-1, mt=28)
               + p("and i'm not stopping until this is a seven-figure company.", 44, ls=-1, mt=12))
    return body


def s10():
    img = prep_photo_full(49, 'p10.png')
    n = 52; bars = ''
    for i in range(n):
        hgt = 18 + int(70 * abs(math.sin(i * .55) * math.cos(i * .21))) + (i * 29) % 22
        bars += f'<rect x="{4 + i*18}" y="{55-hgt/2:.1f}" width="9" height="{hgt}" rx="4.5" fill="{SILVER}" opacity="{.95 if i < 34 else .5}"/>'
    wave = f'<svg width="936" height="110" viewBox="0 0 936 110" style="margin-top:36px">{bars}</svg>'
    body = scene(img, .4, .15, .4)
    body += at(290, p("now you sit down and you already know what to make.", 66, 700, lh=1.06, ls=-2.2) + wave
               + p("it's written in " + block("your voice", 56, pad="0 20px 12px", radius=16) + ", so you don't sound like everyone else.", 46, ls=-1, mt=44, lh=1.4)
               + p("the people who see it land somewhere that sells.", 46, ls=-1, mt=34)
               + p("and we work through it with you.", 46, 700, ls=-1, mt=22))
    return body


S.SLIDES.update({'10': s10, '02': s02, '03': s03, '05': s05, '06': s06, '07': s07, '08': s08, '11': s11, '12': s12, '13': s13, '14': s14})

if __name__ == '__main__':
    which = sys.argv[1:] or ['02', '03', '05', '06', '07', '08', '10', '11', '12', '13', '14']
    for n in which:
        render(n, page(S.SLIDES[n]()))
    names = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14']
    cols, tw, th = 5, 360, 640
    rowsn = (len(names) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (tw + 12) + 12, rowsn * (th + 12) + 12), (22, 22, 22))
    for i, nme in enumerate(names):
        fp = os.path.join(HERE, nme + '.png')
        if os.path.exists(fp) and nme != '09':
            sheet.paste(Image.open(fp).convert('RGB').resize((tw, th), Image.LANCZOS), (12 + (i % cols) * (tw + 12), 12 + (i // cols) * (th + 12)))
    sheet.save(os.path.join(HERE, 'sheet-all.jpg'), quality=88)
    print('sheet ok')

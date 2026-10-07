"""Highlight slides 2-8, 10-14 (1 is final1.py, 9 is the founder's video). Locked copy from
wiki/content-engine/pulsify-saas-highlight-14-slide.md. Photo ids = founder's mapping (2026-10-06).
Run: python slides.py [02 03 ...]   (no args = all)
"""
import sys, math
from engine import *

FLOW_SAMPLE = [('watched', '18,400', 1.0), ('clicked', '1,120', .74), ('applied', '96', .52), ('booked a call', '41', .34), ('paid', '9', .2)]


def check(color, size=54):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 54 54" style="flex:none"><circle cx="27" cy="27" r="24" fill="none" stroke="{color}" stroke-width="5"/>'
            f'<path d="M15 28 L24 37 L40 18" fill="none" stroke="{color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def xmark(color, size=54):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 54 54" style="flex:none"><circle cx="27" cy="27" r="24" fill="none" stroke="{color}" stroke-width="5"/>'
            f'<path d="M17 17 L37 37 M37 17 L17 37" fill="none" stroke="{color}" stroke-width="6" stroke-linecap="round"/></svg>')


# ------------------------------------------------------------------ 02
def s02():
    img = prep_photo(50, 'p02.png', blur=14)
    rings = (f'<svg width="400" height="230" viewBox="0 0 400 230"><circle cx="140" cy="115" r="100" fill="none" stroke="{SILVER}" stroke-width="9"/>'
             f'<circle cx="260" cy="115" r="100" fill="none" stroke="{SILVER}" stroke-width="9"/></svg>')
    body = scene(img, .5, .3, .5)
    body += at(280, p("you're already good at what you do.", 92, 700, lh=1.03, ls=-3.4)
               + p("trading. tiktok shop. whatever it is.", 50, 400, MUTE, mt=34)
               + p("and you know a mentorship can make you more than the thing itself.", 50, mt=26)
               + p("but info is a whole business on its own.", 50, 700, mt=26))
    body += at(1090, p("so now you're learning", 62, ls=-1.8)
               + f'<div style="margin:16px 0 14px -4px">{block("two businesses", 138)}</div>'
               + f'<div style="display:flex;align-items:center;justify-content:space-between">{p("at once.", 62, ls=-1.8)}{rings}</div>')
    return body


# ------------------------------------------------------------------ 03
def s03():
    img = prep_photo(15, 'p03.png')
    steps = ['content.', 'traffic.', 'a page.', 'sales calls.', 'a team.', 'cash in the bank.']
    x0, dx, y0, dy, ph = 72, 54, 600, 130, 98
    parts = []
    for i, st in enumerate(steps):
        x = x0 + i * dx; y = y0 + i * dy
        last = i == len(steps) - 1
        num = (f'<span style="width:56px;height:56px;border-radius:50%;background:{EMERALD if last else GRAPH};color:{GRAPH if last else INK};'
               f'display:grid;place-items:center;font-size:30px;margin-right:22px;flex:none">{i+1}</span>')
        parts.append(f'<div class="abs" style="left:{x}px;top:{y}px;height:{ph}px;padding:0 44px 0 21px;display:flex;align-items:center;background:{SILVER};color:{GRAPH};'
                     f'border-radius:{ph//2}px;font-size:{60 if last else 54}px;font-weight:700;letter-spacing:-1.4px;white-space:nowrap;box-shadow:0 16px 44px rgba(0,0,0,.5)">{num}{st}</div>')
        if not last:
            gap = dy - ph; ax = x + 49 + 54
            parts.append(f'<svg class="abs" style="left:{ax-14}px;top:{y+ph}px" width="28" height="{gap}" viewBox="0 0 28 {gap}">'
                         f'<path d="M14 2 L14 {gap-12}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M3 {gap-16} L14 {gap-1} L25 {gap-16} Z" fill="{INK}"/></svg>')
    body = scene(img, .5, .14, .62)
    body += at(300, f'<div style="font-size:104px;line-height:1;font-weight:700;letter-spacing:-4.5px">that\'s the<br>whole chain.</div>')
    body += ''.join(parts)
    body += at(1410, p("most people have never run it.", 42, ls=-.6) + p("some don't even know what a kpi is.", 42, ls=-.6) + p("and that's fine. nobody teaches you this part.", 42, 700, ls=-.6), width=940)
    return body


# ------------------------------------------------------------------ 04
def s04():
    img = prep_photo(31, 'p04.png')
    items = ["you want to post, but you don't know what to say", "you know what to say, but nobody's watching",
             "people are watching, but you don't know where to send them", "calls are booked, but you can't tell who's closing and who isn't"]
    rows = ''.join(f'<div style="display:flex;gap:30px;align-items:flex-start;padding:28px 0;border-top:1px solid rgba(255,255,255,.18)">{xmark(RED)}'
                   f'<div style="font-size:48px;line-height:1.2;letter-spacing:-1px;width:800px">{t}</div></div>' for t in items)
    body = scene(img, .1, .35, .72)
    body += at(660, p("it breaks somewhere:", 104, 700, lh=1, ls=-4.2))
    body += at(840, rows)
    return body


# ------------------------------------------------------------------ 05
def s05():
    img = prep_photo(22, 'p05.png')
    specs = [("a couple of people dm you.", 936, 46), ("you lose half of them in the chat.", 792, 42), ("the ones who book don't close.", 660, 40)]
    y = [470, 640, 810]; ph = 108
    pills = ''; walls = ''
    for i, (t, w, fs) in enumerate(specs):
        left = 72 + (936 - w) // 2
        pills += (f'<div class="abs" style="left:{left}px;top:{y[i]}px;width:{w}px;height:{ph}px;background:{SILVER};color:{GRAPH};border-radius:54px;display:flex;align-items:center;'
                  f'justify-content:center;font-size:{fs}px;font-weight:700;letter-spacing:-.9px;white-space:nowrap;box-shadow:0 14px 40px rgba(0,0,0,.45)">{t}</div>')
        if i < 2:
            w2 = specs[i + 1][1]; l2 = 72 + (936 - w2) // 2
            walls += (f'<line x1="{left+22}" y1="{y[i]+ph-6}" x2="{l2+22}" y2="{y[i+1]+6}" stroke="{RED}" stroke-width="6" stroke-linecap="round"/>'
                      f'<line x1="{left+w-22}" y1="{y[i]+ph-6}" x2="{l2+w2-22}" y2="{y[i+1]+6}" stroke="{RED}" stroke-width="6" stroke-linecap="round"/>')
    body = scene(img, .58, .25, .58)
    body += at(290, p("you post something.", 92, 700, lh=1.02, ls=-3.4))
    body += f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{walls}</svg>' + pills
    body += '<div class="abs" style="left:0;top:900px;width:1080px;height:420px;background:linear-gradient(180deg,rgba(11,12,13,0) 0%,rgba(11,12,13,.78) 30%,rgba(11,12,13,.78) 70%,rgba(11,12,13,0) 100%)"></div>'
    body += at(1010, p("and you have no idea " + ul("which post") + " brought any of them in.", 54, 700, lh=1.2, ls=-1.3))
    return body


# ------------------------------------------------------------------ 06
def s06():
    img = prep_photo(33, 'p06.png')
    tabs = ''.join(f'<div style="width:96px;height:40px;border-radius:10px;border:3px solid rgba(239,238,233,{.9 if i==0 else .42});flex:none"></div>' for i in range(9))
    body = scene(img, .35, .45, .72)
    body += at(262, f'<div style="display:flex;gap:8px">{tabs}</div>', width=940)
    body += at(780, p("so you try harder.", 112, 700, lh=1, ls=-4.4))
    body += at(960, p("more posts. more tools.", 52, ls=-1.3)
               + p("another chatgpt tab at " + block("2am", 56, pad='0 18px 12px', radius=14), 52, ls=-1.3, mt=14)
               + p("you start copying what the big names do.", 52, ls=-1.3, mt=36)
               + p("and you end up promoting their format instead of building your own.", 52, ls=-1.3, mt=26)
               + p("meanwhile the thing that actually pays you gets " + ul("less of your time."), 52, 700, ls=-1.3, mt=46))
    return body


# ------------------------------------------------------------------ 07
def s07():
    img = prep_photo(34, 'p07.png')
    graph = (f'<svg width="936" height="320" viewBox="0 0 936 320"><line x1="0" y1="304" x2="936" y2="304" stroke="rgba(255,255,255,.28)" stroke-width="3"/>'
             f'<path d="M14 290 C 190 284, 270 58, 520 50" fill="none" stroke="{SILVER}" stroke-width="10" stroke-linecap="round"/>'
             f'<path d="M520 50 L 916 50" fill="none" stroke="{RED}" stroke-width="10" stroke-linecap="round"/>'
             f'<circle cx="520" cy="50" r="15" fill="{SILVER}"/><circle cx="916" cy="50" r="15" fill="{RED}"/></svg>')
    body = scene(img, .62, .3, .62)
    body += at(290, p("that's where most people " + ul("plateau."), 84, 700, lh=1.06, ls=-3)
               + p("then they pick the main business, because that's what keeps food on the table.", 46, ls=-1, mt=40)
               + p("and the info side dies quietly.", 46, ls=-1, mt=22)
               + p("none of that is your fault.", 46, 700, ls=-1, mt=22))
    body += at(1050, graph)
    return body


# ------------------------------------------------------------------ 08
def s08():
    img = prep_photo(34, 'p08.png', focus=(0.02, 0.62), zoom=1.45)
    big = ''.join(f'<div style="width:108px;height:108px;border-radius:50%;background:{SILVER};flex:none;box-shadow:0 10px 30px rgba(0,0,0,.45)"></div>' for _ in range(4))
    # new faces: small emerald dots rising in from the right, deterministic scatter
    dots = ''
    for i in range(16):
        r = 11 + (i * 7) % 12
        x = 20 + (i * 53) % 400
        yv = 118 - ((i * 37) % 100) - r
        dots += f'<circle cx="{x}" cy="{max(r+2, yv)}" r="{r}" fill="{EMERALD}" opacity="{.55 + (i % 4) * .15:.2f}"/>'
    row = (f'<div style="display:flex;align-items:center;gap:26px;margin-top:30px"><div style="display:flex;gap:26px">{big}</div>'
           f'<svg width="430" height="130" viewBox="0 0 430 130">{dots}</svg></div>')
    body = scene(img, .8, .72, .74)
    body += at(280, p("here's what most people miss.", 70, 700, lh=1.04, ls=-2.6)
               + p("the top of every niche is 3 or 4 names.", 44, ls=-1, mt=34) + row
               + p("but new people break in every single month.", 44, ls=-1, mt=26)
               + p("not because they're bigger. because they bring something new.", 44, ls=-1, mt=20)
               + p("people always want a new face with a new idea.", 44, ls=-1, mt=20)
               + f'<div style="margin-top:44px;font-size:68px;line-height:1.08;font-weight:700;letter-spacing:-2.6px">"you don\'t need to be first. you need to {block("sound like you.", 68, pad="0 18px 12px", radius=16)}"</div>')
    return body


# ------------------------------------------------------------------ 10
def s10():
    img = prep_photo(49, 'p10.png')
    n = 52; bars = ''
    for i in range(n):
        hgt = 18 + int(70 * abs(math.sin(i * .55) * math.cos(i * .21))) + (i * 29) % 22
        x = 4 + i * 18
        bars += f'<rect x="{x}" y="{55-hgt/2:.1f}" width="9" height="{hgt}" rx="4.5" fill="{SILVER}" opacity="{.95 if i < 34 else .5}"/>'
    wave = f'<svg width="936" height="110" viewBox="0 0 936 110" style="margin-top:36px">{bars}</svg>'
    body = scene(img, .6, .3, .6)
    body += at(290, p("now you sit down and you already know what to make.", 66, 700, lh=1.06, ls=-2.2) + wave
               + p("it's written in " + block("your voice", 56, pad="0 20px 12px", radius=16) + ", so you don't sound like everyone else.", 46, ls=-1, mt=44, lh=1.4)
               + p("the people who see it land somewhere that sells.", 46, ls=-1, mt=34)
               + p("and we work through it with you.", 46, 700, ls=-1, mt=22))
    return body


# ------------------------------------------------------------------ 11
def s11():
    img = prep_photo_extended(9, 'p11.png', 380)
    rows = (f'<div style="display:flex;align-items:center;gap:22px">{check(EMERALD)}<div style="font-size:50px;font-weight:700;letter-spacing:-1.4px">you see who\'s closing.</div></div>'
            f'<div style="display:flex;align-items:center;gap:22px;margin-top:20px">{xmark(RED)}<div style="font-size:50px;font-weight:700;letter-spacing:-1.4px">who\'s not.</div></div>')
    body = scene(img, .35, .08, .6)
    body += at(262, p("then the sales side.", 96, 700, lh=1, ls=-3.6))
    body += at(1130, rows + p("who's hitting their calls. who's hitting your numbers.", 44, ls=-1, mt=34)
               + p("no more guessing what happened on a call.", 44, ls=-1, mt=20) + p("no scripts to write yourself.", 44, 700, ls=-1, mt=20))
    return body


# ------------------------------------------------------------------ 13
def s13():
    img = prep_photo(14, 'p13.png', box=(1650, 1250, 2648, 3024))
    body = scene(img, .6, .12, .45)
    body += at(290, p("none of this was built overnight.", 88, 700, lh=1.02, ls=-3.2)
               + p(ul("every framework was tested first."), 50, 700, ls=-1.2, mt=40)
               + p("then turned into one place that does the heavy lifting, so you can keep doing what you're good at.", 46, ls=-1, mt=34))
    return body


# ------------------------------------------------------------------ 14
def s14():
    img = prep_photo(14, 'p14.png', box=(1594, 150, 2438, 1650))
    body = scene(img, .1, .2, .65)
    body += at(1150, p("right now it's only for the people i work with.", 62, 700, lh=1.05, ls=-2.2)
               + p("it's getting sharper every week.", 44, ls=-1, mt=28)
               + p("and i'm not stopping until this is a seven-figure company.", 44, ls=-1, mt=12))
    return body


# ------------------------------------------------------------------ 12 (tracker)
def s12():
    img = prep_photo(46, 'p12.png', focus=(0.5, 0.45))
    rows = ''
    for lab, val, wd in FLOW_SAMPLE:
        col = EMERALD if lab == 'paid' else INK
        rows += (f'<div style="display:flex;align-items:baseline;justify-content:space-between;width:400px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.16)">'
                 f'<span style="font-size:28px;color:{MUTE}">{lab}</span><span style="font-size:38px;font-weight:700;letter-spacing:-1.2px;color:{col}">{val}</span></div>'
                 f'<div style="height:4px;width:{int(400*wd)}px;background:{col};opacity:.9;border-radius:2px;margin:0 0 7px 0"></div>')
    body = scene(img, .55, .22, .66)
    body += at(256, p("and every post is tracked.<br>who watched, who clicked,<br>who booked, who paid.", 44, ls=-.8, lh=1.24), width=700)
    body += at(470, f'<div style="font-size:100px;line-height:1.02;font-weight:700;letter-spacing:-4.5px">"you never<br>post {block("blind", 100, pad="0 22px 12px", radius=16)}<br>' + ul('again."') + '</div>', width=600)
    body += at(846, f'<div class="label" style="margin-bottom:8px;font-size:23px;white-space:nowrap">tracked <span style="opacity:.6">&middot; sample data</span></div>{rows}', width=560)
    body += at(1262, f'<div style="font-size:236px;line-height:.85;font-weight:700;letter-spacing:-13px;color:{EMERALD}">$54,000</div><div class="label" style="margin-top:22px">cash collected</div>', left=66, width=960)
    return body


SLIDES = {'02': s02, '03': s03, '04': s04, '05': s05, '06': s06, '07': s07, '08': s08, '10': s10, '11': s11, '12': s12, '13': s13, '14': s14}

if __name__ == '__main__':
    which = sys.argv[1:] or list(SLIDES)
    for n in which:
        render(n, page(SLIDES[n]()))
    # contact sheet of everything that exists
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

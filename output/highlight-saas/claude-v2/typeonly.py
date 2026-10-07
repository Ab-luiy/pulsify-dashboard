"""Option (b): slides 6, 7, 8 type-only. Locked copy only, no invented words, no artifacts.
Brez/Niksetting type: bold headline, regular body with bold keys, one red mark per phrase, serif aside, photo left natural below the text.
Run: python typeonly.py"""
import sys
from engine import *

SERIF = "Georgia,'Times New Roman',serif"
SANS = "Helvetica,Arial,sans-serif"


def L(html, size=52, weight=400, mt=0, family=SANS, ls=-1.0, lh=1.18, color=INK):
    return (f'<div style="font-family:{family};font-size:{size}px;font-weight:{weight};letter-spacing:{ls}px;line-height:{lh};'
            f'color:{color};margin-top:{mt}px;text-shadow:0 2px 18px rgba(0,0,0,.55)">{html}</div>')


def redword(t):
    return f'<span style="color:{RED};font-weight:700">{t}</span>'


def box(t, bg='#0b0c0d', fg=INK):
    return f'<span style="background:{bg};color:{fg};padding:2px 14px 8px;border-radius:6px;font-weight:700">{t}</span>'


def top_shade(h=1250):
    return (f'<div class="abs" style="left:0;top:0;width:1080px;height:{h}px;'
            f'background:linear-gradient(180deg,rgba(11,12,13,.78) 0%,rgba(11,12,13,.62) 60%,rgba(11,12,13,0) 100%)"></div>')


def s06t():
    img = prep_photo_full(37, 'p06.png')
    body = scene(img, 0, 0, 0) + top_shade(1500)
    body += at(250, L("so you try harder.", 96, 700, ls=-4, lh=1.0)
               + L("more posts. more tools.", 56, 700, mt=60, ls=-1.6)
               + L("another chatgpt tab at " + redword("2am."), 56, 700, mt=8, ls=-1.6)
               + L("you start copying what the big names do.", 52, mt=56)
               + L("and you end up promoting <b>their format</b> instead of building your own.", 52, mt=24)
               + L("meanwhile the thing that actually pays you", 52, mt=64)
               + f'<div style="margin-top:14px">{L("gets " + ul("less of your time."), 72, 700, ls=-2.6)}</div>')
    return body


def s07t():
    img = prep_photo_full(26, 'p07.png')
    body = scene(img, 0, 0, 0) + top_shade(1700)
    body += '<div class="abs" style="left:-120px;top:880px;width:900px;height:240px;background:radial-gradient(closest-side,rgba(11,12,13,.95),rgba(11,12,13,0))"></div>'
    body += at(250, L("that's where most people", 72, 700, ls=-2.8, lh=1.02)
               + f'<div style="margin-top:6px">{L(ul("plateau."), 132, 700, ls=-6, lh=1.0)}</div>'
               + L("then they pick the main business,", 52, mt=70)
               + L("because that's what keeps <b>food on the table.</b>", 52, mt=4)
               + L("and the info side " + redword("dies quietly."), 52, mt=40)
               + L("none of that is your fault.", 56, 400, mt=40, family=SERIF, ls=0, lh=1.2, color='#efece6'))
    return body


def s08t():
    img = prep_photo_full(47, 'p08.png')
    body = scene(img, 0, 0, 0) + top_shade(1560)
    body += at(250, L("here's what most people miss.", 64, 700, ls=-2.6, lh=1.04)
               + L("the top of every niche is&nbsp;&nbsp;" + f'<span style="position:relative;display:inline-block">3 or 4 names.<svg style="position:absolute;left:-10px;top:-6px;width:calc(100% + 20px);height:calc(100% + 16px)" viewBox="0 0 100 40" preserveAspectRatio="none"><rect x="1.5" y="2" width="97" height="36" fill="none" stroke="{RED}" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg></span>', 52, mt=50)
               + L("but new people break in <b>every single month.</b>", 52, mt=56)
               + L("not because they're bigger.", 52, mt=34)
               + L("because they bring <b>something new.</b>", 52, mt=4)
               + L("people always want a new face with a new idea.", 52, mt=34)
               + L("\"you don't need to be first.", 70, 700, mt=80, ls=-2.4, lh=1.1)
               + L("you need to " + box("sound like you.", SILVER, GRAPH) + "\"", 70, 700, mt=10, ls=-2.4, lh=1.25))
    return body


D = {'06t': s06t, '07t': s07t, '08t': s08t}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(D)):
        render(n, page(D[n]()))
    w, h = 540, 960
    sh = Image.new('RGB', (3 * (w + 12) + 12, h + 24), (22, 22, 22))
    for i, n in enumerate(['06t', '07t', '08t']):
        sh.paste(Image.open(os.path.join(HERE, n + '.png')).convert('RGB').resize((w, h), Image.LANCZOS), (12 + i * (w + 12), 12))
    sh.save(os.path.join(HERE, 'sheet-t.jpg'), quality=92)
    print('ok')

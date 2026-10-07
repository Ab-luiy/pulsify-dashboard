"""Alternative mockups for slides 6, 7, 8 (founder asked for more options). Output: 06b 06c 07b 07c 08b 08c + mockups.jpg
Run: python variants.py [06b 06c ...]"""
import sys, math
import slides as S
import slides_r2 as R
from engine import *


# ---------------------------------------------------------------- slide 6 text (same copy in every option)
def text6(top):
    return (at(top, p("so you try harder.", 112, 700, lh=1, ls=-4.4))
            + at(top + 180, p("more posts. more tools.", 52, ls=-1.3)
                 + p("another chatgpt tab at " + block("2am", 56, pad='0 18px 12px', radius=14), 52, ls=-1.3, mt=14)
                 + p("you start copying what the big names do.", 52, ls=-1.3, mt=36)
                 + p("and you end up promoting their format instead of building your own.", 52, ls=-1.3, mt=26)
                 + p("meanwhile the thing that actually pays you gets " + ul("less of your time."), 52, 700, ls=-1.3, mt=46)))


def s06b():
    """B: a real browser tab strip, crushed by too many tabs, with a counter."""
    img = prep_photo_full(37, 'p06.png')
    names = ['chatgpt', 'notion', 'reels', 'docs', 'youtube', 'dms', 'sheet', 'calendly', 'carousel', 'gmail', 'canva', 'drive']
    tabs = ''
    x = 24
    for i, nm in enumerate(names):
        w = 96
        act = i == 0
        tabs += (f'<div style="width:{w}px;flex:none;height:78px;border-radius:18px 18px 0 0;background:{SILVER if act else "rgba(30,31,34,.92)"};color:{GRAPH if act else INK};'
                 f'border:1px solid rgba(255,255,255,.16);border-bottom:none;margin-right:-12px;display:flex;align-items:center;gap:8px;padding:0 12px;overflow:hidden;'
                 f'font-size:20px;font-weight:700;white-space:nowrap;text-overflow:ellipsis"><i style="width:16px;height:16px;border-radius:50%;background:{[EMERALD, RED, "#e6b04d", "#7eaeea"][i % 4]};display:block;flex:none"></i>{nm[:5]}</div>')
    strip = (f'<div class="abs" style="left:30px;top:250px;width:1020px;height:78px;display:flex;align-items:flex-end;overflow:hidden">{tabs}</div>'
             f'<div class="abs" style="left:30px;top:328px;width:1020px;height:230px;border-radius:0 0 26px 26px;background:rgba(14,15,17,.86);border:1px solid rgba(255,255,255,.14)"></div>')
    badge = (f'<div class="abs" style="left:560px;top:372px;width:230px;height:230px;border-radius:50%;background:{RED};color:#fff;display:grid;place-items:center;font-size:150px;font-weight:700;letter-spacing:-8px;box-shadow:0 20px 60px rgba(229,50,45,.5)">12</div>'
             f'<div class="abs" style="left:100px;top:420px;font-size:46px;font-weight:700;letter-spacing:-1px;line-height:1.2">tabs open.<br><span style="color:{MUTE};font-weight:400">zero of them<br>talk to each other.</span></div>')
    body = scene(img, .45, .64, .84) + strip + badge + text6(780)
    return body


def s06c():
    """C: the 2am lock screen: giant time plus stacked notification cards."""
    img = prep_photo_full(37, 'p06.png')
    note = lambda app, msg, y, op: (f'<div class="abs" style="left:60px;top:{y}px;width:960px;height:118px;border-radius:30px;background:rgba(239,238,233,{op});color:{GRAPH};'
                                    f'display:flex;align-items:center;gap:26px;padding:0 34px;box-shadow:0 16px 40px rgba(0,0,0,.45)">'
                                    f'<div style="width:62px;height:62px;border-radius:16px;background:{GRAPH};color:{INK};display:grid;place-items:center;font-size:32px;font-weight:700;flex:none">{app[0]}</div>'
                                    f'<div style="font-size:36px;font-weight:700;letter-spacing:-.8px;line-height:1.1">{app}<br><span style="font-weight:400;color:#55565b">{msg}</span></div></div>')
    clock = f'<div class="abs" style="left:60px;top:236px;font-size:250px;font-weight:700;letter-spacing:-14px;line-height:.9;color:{INK}">2:07<span style="font-size:70px;letter-spacing:-2px;margin-left:16px;color:{MUTE}">am</span></div>'
    notes = note('chatgpt', 'draft number 6 is ready', 520, .95) + note('notion', '14 tasks overdue', 650, .85) + note('reels', 'you have not posted today', 780, .75)
    body = scene(img, .5, .66, .86) + clock + notes + text6(930)
    return body


# ---------------------------------------------------------------- slide 7 text
def text7(top):
    return at(top, p("that's where most people " + ul("plateau."), 84, 700, lh=1.06, ls=-3)
              + p("then they pick the main business, because that's what keeps food on the table.", 46, ls=-1, mt=34)
              + p("and the info side dies quietly.", 46, ls=-1, mt=20)
              + p("none of that is your fault.", 46, 700, ls=-1, mt=20))


def band(top, h):
    return f'<div class="abs" style="left:0;top:{top}px;width:1080px;height:{h}px;background:linear-gradient(180deg,rgba(11,12,13,0) 0%,rgba(11,12,13,.88) 14%,rgba(11,12,13,.88) 86%,rgba(11,12,13,0) 100%)"></div>'


def s07b():
    """B: grouped bars by month. Main business steady, info side rises then collapses."""
    img = prep_photo_full(26, 'p07.png')
    main = [70, 70, 71, 70, 71, 70]
    info = [14, 34, 62, 88, 38, 8]
    bars = ''
    for i in range(6):
        x = 60 + i * 150
        hm = main[i] * 3.6; hi = info[i] * 3.6
        col = EMERALD if i < 4 else RED
        bars += (f'<div class="abs" style="left:{x}px;top:{1380 - hm:.0f}px;width:62px;height:{hm:.0f}px;border-radius:14px 14px 0 0;background:{SILVER}"></div>'
                 f'<div class="abs" style="left:{x + 68}px;top:{1380 - hi:.0f}px;width:62px;height:{hi:.0f}px;border-radius:14px 14px 0 0;background:{col}"></div>'
                 f'<div class="abs" style="left:{x}px;top:1396px;width:130px;text-align:center;font-size:26px;color:{MUTE}">month {i+1}</div>')
    legend = (f'<div class="abs" style="left:60px;top:960px;display:flex;gap:36px;font-size:34px;font-weight:700">'
              f'<span><i style="display:inline-block;width:26px;height:26px;border-radius:7px;background:{SILVER};margin-right:12px;vertical-align:-3px"></i>main business</span>'
              f'<span><i style="display:inline-block;width:26px;height:26px;border-radius:7px;background:{EMERALD};margin-right:12px;vertical-align:-3px"></i>info side</span></div>')
    flag = f'<div class="abs" style="left:640px;top:1060px">{block("they quit here", 40, pad="6px 24px 16px", radius=999)}</div>'
    body = scene(img, .84, .8, .84) + band(800, 820) + f'<div class="abs" style="inset:0;transform:translateY(120px)">{legend}{bars}{flag}</div>' + text7(330)
    return body


def s07c():
    """C: a draining battery: the energy left for the info side."""
    img = prep_photo_full(26, 'p07.png')
    seg = ''
    levels = [(1, EMERALD), (1, EMERALD), (1, EMERALD), (1, '#e6b04d'), (1, RED), (0, RED)]
    for i, (on, col) in enumerate(levels):
        seg += (f'<div style="width:112px;height:230px;border-radius:20px;background:{col if on else "rgba(255,255,255,.1)"};'
                f'{"box-shadow:0 0 34px " + col + "66" if on else ""}"></div>')
    batt = (f'<div class="abs" style="left:60px;top:1010px;display:flex;align-items:center">'
            f'<div style="display:flex;gap:16px;padding:22px;border-radius:44px;border:7px solid {SILVER};background:rgba(14,15,17,.7)">{seg}</div>'
            f'<div style="width:20px;height:110px;border-radius:0 12px 12px 0;background:{SILVER};margin-left:4px"></div></div>')
    labels = (f'<div class="abs" style="left:60px;top:1310px;width:820px;display:flex;justify-content:space-between;font-size:28px;color:{MUTE}"><span>month 1</span><span>month 6</span></div>'
              f'<div class="abs" style="left:60px;top:1366px;font-size:44px;font-weight:700;letter-spacing:-1px">energy left for the info side: {block("5%", 44, pad="0 16px 8px", radius=12)}</div>')
    body = scene(img, .84, .8, .84) + band(800, 820) + f'<div class="abs" style="inset:0;transform:translateY(120px)">{batt}{labels}</div>' + text7(330)
    return body


# ---------------------------------------------------------------- slide 8 text
def text8(top, gap_after_graphic):
    return (p("but new people break in every single month.", 42, ls=-1, mt=gap_after_graphic)
            + p("not because they're bigger. because they bring something new.", 42, ls=-1, mt=14)
            + p("people always want a new face with a new idea.", 42, ls=-1, mt=14)
            + f'<div style="margin-top:30px;font-size:62px;line-height:1.08;font-weight:700;letter-spacing:-2.4px">"you don\'t need to be first. you need to {block("sound like you.", 62, pad="0 16px 10px", radius=14)}"</div>')


def s08b():
    """B: leaderboard. Four ranked rows; a new row enters at #2 and pushes the old ones down."""
    img = prep_photo_full(47, 'p08.png')
    rows = ''
    data = [('1', 100, SILVER, ''), ('2', 84, EMERALD, 'new'), ('3', 68, SILVER, ''), ('4', 52, SILVER, '')]
    for r, w, col, tag in data:
        new = tag == 'new'
        tagdiv = f'<div style="font-size:34px;font-weight:700;color:{EMERALD}">new this month</div>' if new else ''
        rows += (f'<div style="display:flex;align-items:center;gap:20px;margin-top:12px">'
                 f'<div style="width:64px;height:64px;border-radius:50%;background:{col};color:{GRAPH};display:grid;place-items:center;font-size:36px;font-weight:700;flex:none">{r}</div>'
                 f'<div style="height:64px;width:{int(w * 6.8)}px;border-radius:32px;background:{col};opacity:{1 if new else .88}"></div>'
                 f'{tagdiv}</div>')
    body = scene(img, .86, .7, .15)
    body += at(262, p("here's what most people miss.", 64, 700, lh=1.04, ls=-2.4)
               + f'<div class="label" style="margin-top:30px">the top of every niche: 3 or 4 names</div>{rows}'
               + text8(262, 34))
    return body


def s08c():
    """C: orbit. Four silver names in the middle; new faces arrive from the outside."""
    img = prep_photo_full(47, 'p08.png')
    cx, cy = 480, 190
    inner = ''.join(f'<circle cx="{cx + dx}" cy="{cy + dy}" r="52" fill="{SILVER}"/><text x="{cx + dx}" y="{cy + dy + 17}" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="48" fill="{GRAPH}">{i+1}</text>'
                    for i, (dx, dy) in enumerate([(-66, -50), (66, -50), (-66, 56), (66, 56)]))
    arrivals = ''
    for ang, rr in [(205, 7), (245, 9), (295, 8), (335, 10), (25, 8), (155, 9)]:
        a = math.radians(ang)
        x1, y1 = cx + math.cos(a) * 250, cy + math.sin(a) * 160
        x2, y2 = cx + math.cos(a) * 150, cy + math.sin(a) * 96
        arrivals += (f'<circle cx="{x1:.0f}" cy="{y1:.0f}" r="{rr + 18}" fill="{EMERALD}"/>'
                     f'<line x1="{x1 - math.cos(a) * 0:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{EMERALD}" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 12"/>')
    svg = (f'<svg width="1000" height="505" viewBox="150 -20 660 332"><ellipse cx="{cx}" cy="{cy}" rx="300" ry="176" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="3"/>'
           f'<ellipse cx="{cx}" cy="{cy}" rx="150" ry="96" fill="none" stroke="rgba(255,255,255,.34)" stroke-width="3"/>{arrivals}{inner}</svg>')
    body = scene(img, .86, .7, .15)
    body += at(262, p("here's what most people miss.", 64, 700, lh=1.04, ls=-2.4)
               + p("the top of every niche is 3 or 4 names.", 42, ls=-1, mt=24) + f'<div style="margin-left:-20px">{svg}</div>' + text8(262, 4))
    return body


V = {'06b': s06b, '06c': s06c, '07b': s07b, '07c': s07c, '08b': s08b, '08c': s08c}

if __name__ == '__main__':
    which = sys.argv[1:] or list(V)
    for n in which:
        render(n, page(V[n]()))
    cols = [['06', '06b', '06c'], ['07', '07b', '07c'], ['08', '08b', '08c']]
    w, h = 400, 711
    sheet = Image.new('RGB', (3 * (w + 12) + 12, 3 * (h + 12) + 12), (22, 22, 22))
    for r, row in enumerate(cols):
        for c, n in enumerate(row):
            fp = os.path.join(HERE, n + '.png')
            if os.path.exists(fp):
                sheet.paste(Image.open(fp).convert('RGB').resize((w, h), Image.LANCZOS), (12 + c * (w + 12), 12 + r * (h + 12)))
    sheet.save(os.path.join(HERE, 'mockups.jpg'), quality=90)
    print('mockups ok')

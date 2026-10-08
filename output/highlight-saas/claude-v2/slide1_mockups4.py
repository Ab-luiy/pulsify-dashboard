"""Slide 1, round 4: zoomed-out wide shot (more of the room and the mic), the top filled with the wall's own black.
Renders s1_m..p.png"""
import sys
import numpy as np
import final1 as F
from engine import *
from slides_r5 import SH
from slides_r4 import bgdiv
from slide1_mockups2 import MARKU, MARKP

C = 'text-align:center;left:0;width:1080px'


def fx_for(shift, headx):
    s = (H - shift) / 3024
    x0 = 1935 * s - headx
    return x0 / (4032 * s - 1080), 700 * 0 + shift + 927 * s


def photo(tag, shift, headx, cx, cy, size, strength=.6, dim=1.0, red=False):
    fx, hy = fx_for(shift, headx)
    F.FOCUS_X = max(0, min(1, fx))
    base = F.photo_with_seamless_top(shift=shift, fade=360)
    m = F.cutout_matte(shift=shift)
    flat = Image.open(MARKP).convert('RGBA').resize((size, size), Image.LANCZOS)
    a = Image.new('L', (W, H), 0)
    a.paste(flat.split()[3], (cx - size // 2, int(cy if cy else hy) - size // 2))
    white = Image.new('L', (W, H), 255)
    bloom = Image.merge('RGBA', (white, white, white, a.filter(ImageFilter.GaussianBlur(24)).point(lambda v: int(v * .8 * dim))))
    sharp = Image.merge('RGBA', (white, white, white, a.point(lambda v: int(v * strength * dim))))
    scn = base.convert('RGBA')
    if red:
        glow = Image.new('RGB', (W, H), (229, 50, 45))
        ga = a.filter(ImageFilter.GaussianBlur(90)).point(lambda v: int(v * .6))
        scn = Image.composite(glow, scn.convert('RGB'), ga).convert('RGBA')
    scn = Image.alpha_composite(Image.alpha_composite(scn, bloom), sharp).convert('RGB')
    out = Image.composite(base, scn, m)
    p = os.path.join(HERE, 'img', f's1_{tag}.png')
    safe_save(dither(out), p)
    return p.replace('\\', '/')


def type_center(top_y=222, mark=True, big=96, bottom_y=1370):
    t = (f'<div class="abs" style="top:{top_y}px;{C}">' + (f'<img src="file:///{MARKU}" style="width:96px;filter:drop-shadow(0 0 22px rgba(255,255,255,.55))">' if mark else '')
         + f'<div style="font-size:40px;letter-spacing:-.8px;margin-top:20px;{SH}">i\'ve been working on this all year,</div>'
         f'<div style="font-size:{big}px;font-weight:700;letter-spacing:-4px;line-height:1.02;margin-top:6px;{SH}">up until {ul("today.")}</div></div>')
    t += (f'<div class="abs" style="top:{bottom_y}px;{C};{SH}"><div style="font-size:38px;line-height:1.2">i noticed something every creator<br>i\'ve worked with has in common.</div>'
          f'<div style="font-size:62px;font-weight:700;letter-spacing:-2.4px;line-height:1.1;margin-top:24px">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return t


def m():
    """M: J, zoomed out. Ring bleeding off the left, more of the room and the mic, top filled with wall black."""
    return bgdiv(photo('m', 520, 560, 20, 0, 1000)) + type_center(222, True, 100, 1390)


def n():
    """N: K, zoomed out. Subject on the right, ring bleeding left, the hook as the hero."""
    body = bgdiv(photo('n', 520, 720, 40, 0, 1040, .58))
    body += (f'<div class="abs" style="left:64px;top:222px;{SH}"><img src="file:///{MARKU}" style="width:84px;filter:drop-shadow(0 0 20px rgba(255,255,255,.5))">'
             f'<div style="font-size:36px;letter-spacing:-.7px;margin-top:18px;width:440px;line-height:1.2">i noticed something every creator i\'ve worked with has in common.</div></div>')
    body += (f'<div class="abs" style="left:64px;top:1230px;width:800px;{SH}"><div style="font-size:92px;font-weight:700;letter-spacing:-3.8px;line-height:1.01">everyone is stuck on the {ul("same problem.")}</div>'
             f'<div style="font-size:38px;margin-top:30px;letter-spacing:-.8px">i\'ve been working on this all year,<br><b>up until today.</b></div></div>')
    return body


def o():
    """O: widest shot. Big top field for the headline, ring centred and large behind him, red wash at the bottom."""
    body = bgdiv(photo('o', 760, 540, 540, 0, 1100, .34, .85))
    body += '<div class="abs" style="left:0;top:1100px;width:1080px;height:820px;background:linear-gradient(0deg,rgba(201,32,27,.7) 0%,rgba(201,32,27,.3) 45%,rgba(201,32,27,0) 100%)"></div>'
    body += type_center(222, True, 112, 1450)
    return body


def p_():
    """P: M with the red wash from H, ring bleeding left."""
    body = bgdiv(photo('p', 520, 560, 20, 0, 1000, .6, 1.0))
    body += '<div class="abs" style="left:0;top:1000px;width:1080px;height:920px;background:linear-gradient(0deg,rgba(201,32,27,.75) 0%,rgba(201,32,27,.3) 50%,rgba(201,32,27,0) 100%)"></div>'
    body += type_center(222, True, 100, 1390)
    return body


V = {'m': m, 'n': n, 'o': o, 'p': p_}
if __name__ == '__main__':
    for k in (sys.argv[1:] or list(V)):
        render('s1_' + k, page(V[k]()))

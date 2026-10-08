"""Slide 1, second batch of mock-ups (different staging, not just different type). Renders s1_e..h.png"""
import sys
import numpy as np
import final1 as F
from engine import *
from slides_r7 import rbox, RG
from slides_r5 import bz, rul, SH
from slides_r4 import bgdiv

MARKP = F.b.MARKPNG
MARKU = MARKP.replace('\\', '/')


def photo(tag, fx, cx, cy, size, strength=.62, dim=1.0):
    F.FOCUS_X = fx
    base = F.photo_with_seamless_top()
    m = F.cutout_matte()
    flat = Image.open(MARKP).convert('RGBA').resize((size, size), Image.LANCZOS)
    a = Image.new('L', (W, H), 0)
    a.paste(flat.split()[3], (cx - size // 2, cy - size // 2))
    white = Image.new('L', (W, H), 255)
    bloom = Image.merge('RGBA', (white, white, white, a.filter(ImageFilter.GaussianBlur(24)).point(lambda v: int(v * .8 * dim))))
    sharp = Image.merge('RGBA', (white, white, white, a.point(lambda v: int(v * strength * dim))))
    scn = Image.alpha_composite(Image.alpha_composite(base.convert('RGBA'), bloom), sharp).convert('RGB')
    out = Image.composite(base, scn, m)
    p = os.path.join(HERE, 'img', f's1_{tag}.png')
    safe_save(dither(out), p)
    return p.replace('\\', '/')


def e():
    """E: Brez left stack on the dark wall, subject right, logo behind him bleeding off the right edge."""
    body = bgdiv(photo('e', .286, 760, 800, 940))
    body += (f'<div class="abs" style="left:60px;top:236px;width:470px;{SH}">'
             f'<div style="font-size:38px;font-weight:400;letter-spacing:-.8px">i\'ve been working on this</div>'
             f'<div style="font-size:92px;font-weight:700;letter-spacing:-4px;line-height:1;margin-top:8px">all year,</div>'
             f'<div style="font-size:64px;font-weight:700;letter-spacing:-2.6px;line-height:1.05;margin-top:6px">up until {ul("today.")}</div></div>')
    body += (f'<div class="abs" style="left:60px;top:1130px;width:520px;{SH}"><div style="font-size:36px;line-height:1.2;letter-spacing:-.7px">i noticed something every creator i\'ve worked with has in common.</div>'
             f'<div style="font-size:60px;font-weight:700;letter-spacing:-2.4px;line-height:1.08;margin-top:22px">everyone is stuck on the {ul("same problem.")}</div></div>')
    return body


def f():
    """F: editorial. Small logo mark as the opener at top centre, headline under it, no ring behind him."""
    body = bgdiv(photo('f', .459, 540, 760, 10, strength=0))
    body += (f'<div class="abs" style="top:222px;left:0;width:1080px;text-align:center"><img src="file:///{MARKU}" style="width:104px;filter:drop-shadow(0 0 24px rgba(255,255,255,.55))">'
             f'<div style="font-size:40px;letter-spacing:-.8px;margin-top:22px;{SH}">i\'ve been working on this all year,</div>'
             f'<div style="font-size:88px;font-weight:700;letter-spacing:-3.6px;line-height:1.02;margin-top:6px;{SH}">up until {ul("today.")}</div></div>')
    body += (f'<div class="abs" style="top:1320px;left:0;width:1080px;text-align:center;{SH}"><div style="font-size:38px;line-height:1.2">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:60px;font-weight:700;letter-spacing:-2.4px;line-height:1.1;margin-top:24px">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return body


def g():
    """G: giant ring bleeding off the left edge, subject right, type stacked low on the left over the hoodie."""
    body = bgdiv(photo('g', .286, 60, 900, 1250, strength=.55))
    body += (f'<div class="abs" style="left:60px;top:236px;width:440px;{SH}"><div style="font-size:36px;font-weight:400;letter-spacing:-.7px">i noticed something every creator i\'ve worked with has in common.</div></div>')
    body += (f'<div class="abs" style="left:60px;top:1200px;width:700px;{SH}"><div style="font-size:84px;font-weight:700;letter-spacing:-3.6px;line-height:1.02">everyone is stuck on the {ul("same problem.")}</div>'
             f'<div style="font-size:38px;margin-top:30px;letter-spacing:-.8px">i\'ve been working on this all year,<br><b>up until today.</b></div></div>')
    return body


def h():
    """H: cinematic. Dimmer ring centred behind him, red gradient rising from the bottom carries the hook."""
    body = bgdiv(photo('h', .459, 540, 780, 1000, strength=.28, dim=.8))
    body += '<div class="abs" style="left:0;top:900px;width:1080px;height:1020px;background:linear-gradient(0deg,rgba(201,32,27,.82) 0%,rgba(201,32,27,.45) 40%,rgba(201,32,27,0) 100%)"></div>'
    body += (f'<div class="abs" style="top:236px;left:0;width:1080px;text-align:center;{SH}"><div style="font-size:42px;letter-spacing:-.9px">i\'ve been working on this all year, up until today.</div></div>')
    body += (f'<div class="abs" style="top:1290px;left:0;width:1080px;text-align:center;{SH}"><div style="font-size:36px;line-height:1.2;opacity:.92">i noticed something every creator i\'ve worked with has in common.</div>'
             f'<div style="font-size:78px;font-weight:700;letter-spacing:-3.2px;line-height:1.02;margin-top:18px">everyone is stuck<br>on the same problem.</div></div>')
    return body


V = {'e': e, 'f': f, 'g': g, 'h': h}
if __name__ == '__main__':
    for k in (sys.argv[1:] or list(V)):
        render('s1_' + k, page(V[k]()))

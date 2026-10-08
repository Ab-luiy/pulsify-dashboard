"""Slide 1 mock-ups (same photo, matte and copy; different logo staging and type layouts). Renders s1_a..d.png"""
import sys
import numpy as np
import final1 as F
from engine import *
from slides_r7 import rbox, RG
from slides_r5 import bz, rul, SH
from slides_r4 import bgdiv

MARKP = F.b.MARKPNG
W_, H_ = W, H


def photo(tag, cx, cy, size, red=False, strength=.62):
    F.FOCUS_X = .459
    base = F.photo_with_seamless_top()
    m = F.cutout_matte()
    flat = Image.open(MARKP).convert('RGBA').resize((size, size), Image.LANCZOS)
    a = Image.new('L', (W_, H_), 0)
    a.paste(flat.split()[3], (cx - size // 2, cy - size // 2))
    white = Image.new('L', (W_, H_), 255)
    bloom = Image.merge('RGBA', (white, white, white, a.filter(ImageFilter.GaussianBlur(24)).point(lambda v: int(v * .8))))
    sharp = Image.merge('RGBA', (white, white, white, a.point(lambda v: int(v * strength))))
    scn = base.convert('RGBA')
    if red:   # red glow behind the mark
        glow = Image.new('RGB', (W_, H_), (229, 50, 45))
        ga = a.filter(ImageFilter.GaussianBlur(90)).point(lambda v: int(v * .75))
        scn = Image.composite(glow, scn.convert('RGB'), ga).convert('RGBA')
    scn = Image.alpha_composite(Image.alpha_composite(scn, bloom), sharp).convert('RGB')
    out = Image.composite(base, scn, m)
    p = os.path.join(HERE, 'img', f's1_{tag}.png')
    safe_save(dither(out), p)
    return p.replace('\\', '/')


C = 'text-align:center;left:0;width:1080px'


def a():
    """A: current (centered, logo behind-left)."""
    body = bgdiv(photo('a', 390, 820, 820))
    body += (f'<div class="abs" style="top:236px;{C}"><div style="font-size:42px;{SH}">i\'ve been working on this all year,</div>'
             f'<div style="font-size:96px;font-weight:700;letter-spacing:-4px;line-height:1.05;margin-top:6px;{SH}">up until {ul("today.")}</div></div>')
    body += (f'<div class="abs" style="top:1330px;{C}"><div style="font-size:38px;line-height:1.2;{SH}">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:58px;font-weight:700;letter-spacing:-2.2px;line-height:1.1;margin-top:26px;{SH}">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return body


def b():
    """B: Kobey-style red gradient boxes, logo centered ring behind the head."""
    body = bgdiv(photo('b', 540, 930, 820, red=True))
    body += (f'<div class="abs" style="top:236px;{C}"><div style="font-size:42px;{SH}">i\'ve been working on this</div>'
             f'<div style="margin-top:12px">{rbox("all year,", 100, "0 28px 16px", 18)}</div>'
             f'<div style="font-size:64px;font-weight:700;letter-spacing:-2.4px;margin-top:14px;{SH}">up until today.</div></div>')
    body += (f'<div class="abs" style="top:1340px;{C}"><div style="font-size:38px;line-height:1.2;{SH}">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="margin-top:22px;font-size:58px;font-weight:700;letter-spacing:-2.2px;line-height:1.12;{SH}">everyone is stuck on<br>the {rbox("same problem.", 58, "0 20px 12px", 14)}</div></div>')
    return body


def c():
    """C: lead with the problem. Big hook on top, the year line small underneath the subject."""
    body = bgdiv(photo('c', 340, 900, 860))
    body += (f'<div class="abs" style="top:232px;{C}"><div style="font-size:40px;{SH}">everyone is stuck on</div>'
             f'<div style="font-size:112px;font-weight:700;letter-spacing:-4.6px;line-height:1;margin-top:6px;{SH}">the {ul("same problem.")}</div></div>')
    body += (f'<div class="abs" style="top:1330px;{C}"><div style="font-size:38px;line-height:1.2;{SH}">i noticed it in every creator i\'ve worked with.</div>'
             f'<div style="font-size:56px;font-weight:700;letter-spacing:-2.2px;line-height:1.1;margin-top:20px;{SH}">i\'ve been working on this<br>all year, up until {ul("today.")}</div></div>')
    return body


def d():
    """D: all type at the bottom (left-aligned, Brez stack), the founder and the logo own the top."""
    body = bgdiv(photo('d', 540, 640, 760))
    body += (f'<div class="abs" style="left:72px;top:1160px;width:936px;font-size:40px;font-weight:700;letter-spacing:-1.2px;line-height:1.15;{SH}">'
             f'<div>i\'ve been working on this all year,</div><div style="font-size:78px;letter-spacing:-3.2px;line-height:1.02;margin-top:4px">up until {ul("today.")}</div>'
             f'<div style="margin-top:34px;font-weight:400;font-size:38px">i noticed something every creator i\'ve worked with has in common.</div>'
             f'<div style="margin-top:14px;font-size:54px;letter-spacing:-2px">everyone is stuck on the {ul("same problem.")}</div></div>')
    return body


V = {'a': a, 'b': b, 'c': c, 'd': d}
if __name__ == '__main__':
    for k in (sys.argv[1:] or list(V)):
        render('s1_' + k, page(V[k]()))

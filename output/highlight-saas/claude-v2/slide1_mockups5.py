"""Slide 1, round 5: a 180 from the dark/red-gradient versions. Renders s1_q..t.png
Q light editorial (silver field, dark ring behind him), R giant type behind him, S split panel, T flat green field."""
import sys
import numpy as np
import final1 as F
from engine import *
from slides_r5 import SH
from slide1_mockups2 import MARKU, MARKP
from slide1_mockups4 import fx_for

SHIFT = 520
HEADX = 540


def layers(tag, shift=SHIFT, headx=HEADX, fade=None):
    """Returns (photo_path, subject_rgba_path, head_y). The subject is the founder's own cut-out applied to the original pixels."""
    fx, hy = fx_for(shift, headx)
    F.FOCUS_X = max(0, min(1, fx))
    base = F.photo_with_seamless_top(shift=shift, fade=360)
    m = F.cutout_matte(shift=shift)
    if fade:
        ramp = np.clip((fade[1] - np.arange(H)) / float(fade[1] - fade[0]), 0, 1).astype(np.float32)[:, None]
        m = Image.fromarray((np.asarray(m).astype(np.float32) * ramp).astype(np.uint8))
    rgba = base.convert('RGBA')
    rgba.putalpha(m)
    p1 = os.path.join(HERE, 'img', f's1_{tag}_bg.png'); p2 = os.path.join(HERE, 'img', f's1_{tag}_subj.png')
    safe_save(dither(base), p1); safe_save(rgba, p2)
    return p1.replace('\\', '/'), p2.replace('\\', '/'), int(hy)


def tinted_mark(color, op=1.0):
    im = Image.open(MARKP).convert('RGBA')
    a = im.split()[3].point(lambda v: int(v * op))
    solid = Image.new('RGBA', im.size, color)
    solid.putalpha(a)
    p = os.path.join(HERE, 'img', 's1_mark_' + color.lstrip('#') + '.png')
    safe_save(solid, p)
    return p.replace('\\', '/')


C = 'text-align:center;left:0;width:1080px'
GR = '#0b0c0d'


def shadowed(subj):
    return (f'<img class="abs" src="file:///{subj}" style="left:0;top:0;width:1080px;height:1920px;filter:drop-shadow(0 30px 50px rgba(0,0,0,.45))">')


def q():
    """Q: light editorial. Silver field, graphite ring behind him, graphite type above, white type on the hoodie below."""
    bg, subj, hy = layers('q', fade=(1150, 1450))
    ring = tinted_mark('#0b0c0d', .92)
    body = f'<div class="abs" style="inset:0;background:radial-gradient(900px 900px at 50% 40%,#f6f5f1,#dcdad3)"></div>'
    body += f'<img class="abs" src="file:///{ring}" style="left:{540-480}px;top:{hy-480-40}px;width:960px;opacity:.9">'
    body += shadowed(subj)
    body += (f'<div class="abs" style="top:222px;{C};color:{GR}"><div style="font-size:40px;letter-spacing:-.8px">i\'ve been working on this all year,</div>'
             f'<div style="font-size:100px;font-weight:700;letter-spacing:-4.2px;line-height:1.02;margin-top:6px">up until {ul("today.")}</div></div>')
    body += (f'<div class="abs" style="top:1390px;{C};color:{GR}"><div style="font-size:38px;line-height:1.2">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:62px;font-weight:700;letter-spacing:-2.4px;line-height:1.1;margin-top:24px">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return body


def r():
    """R: giant type behind him (the founder cut-out sits in front of the words)."""
    bg, subj, hy = layers('r')
    body = f'<img class="abs" src="file:///{bg}" style="left:0;top:0;width:1080px;height:1920px">'
    body += '<div class="abs" style="inset:0;background:rgba(0,0,0,.25)"></div>'
    body += (f'<div class="abs" style="left:0;top:{hy-330}px;width:1080px;display:flex;justify-content:space-between;padding:0 36px;font-size:230px;font-weight:700;letter-spacing:-11px;line-height:1;color:#fff"><span>all</span><span>year</span></div>')
    body += f'<img class="abs" src="file:///{subj}" style="left:0;top:0;width:1080px;height:1920px">'
    body += (f'<div class="abs" style="top:222px;{C};{SH}"><div style="font-size:40px;letter-spacing:-.8px">i\'ve been working on this</div></div>')
    body += (f'<div class="abs" style="top:1380px;{C};{SH}"><div style="font-size:62px;font-weight:700;letter-spacing:-2.4px;line-height:1.05">up until {ul("today.")}</div>'
             f'<div style="font-size:36px;line-height:1.2;margin-top:26px">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:50px;font-weight:700;letter-spacing:-2px;line-height:1.1;margin-top:18px">everyone is stuck on the {ul("same problem.")}</div></div>')
    return body


def s_():
    """S: split. Photo on top with rounded bottom corners, silver editorial panel underneath carries the type and the mark."""
    bg, subj, hy = layers('s', 420, 540)
    mark = tinted_mark('#0b0c0d')
    body = f'<div class="abs" style="inset:0;background:#efeee9"></div>'
    body += (f'<div class="abs" style="left:0;top:0;width:1080px;height:1130px;overflow:hidden;border-radius:0 0 56px 56px"><img src="file:///{bg}" style="position:absolute;left:0;top:-170px;width:1080px;height:1920px"></div>')
    body += (f'<div class="abs" style="left:56px;top:206px;{SH}"><div style="font-size:40px;letter-spacing:-.8px">i\'ve been working on this all year,</div>'
             f'<div style="font-size:92px;font-weight:700;letter-spacing:-3.8px;line-height:1.02">up until {ul("today.")}</div></div>')
    body += f'<img class="abs" src="file:///{mark}" style="left:900px;top:1170px;width:120px">'
    body += (f'<div class="abs" style="left:56px;top:1190px;width:800px;color:{GR}"><div style="font-size:38px;line-height:1.2;letter-spacing:-.8px">i noticed something every creator i\'ve worked with has in common.</div>'
             f'<div style="font-size:82px;font-weight:700;letter-spacing:-3.4px;line-height:1.02;margin-top:24px">everyone is stuck on the {ul("same problem.")}</div></div>')
    return body


def t():
    """T: flat green field. Founder cut out, big graphite ring behind him, graphite type."""
    bg, subj, hy = layers('t', fade=(1150, 1450))
    ring = tinted_mark('#0b0c0d', .16)
    body = '<div class="abs" style="inset:0;background:linear-gradient(170deg,#6fe0b0 0%,#3fae82 100%)"></div>'
    body += f'<img class="abs" src="file:///{ring}" style="left:{540-520}px;top:{hy-520-20}px;width:1040px">'
    body += shadowed(subj)
    body += (f'<div class="abs" style="top:222px;{C};color:{GR}"><div style="font-size:40px;letter-spacing:-.8px">i\'ve been working on this all year,</div>'
             f'<div style="font-size:100px;font-weight:700;letter-spacing:-4.2px;line-height:1.02;margin-top:6px">up until {ul("today.", GR)}</div></div>')
    body += (f'<div class="abs" style="top:1390px;{C};color:{GR}"><div style="font-size:38px;line-height:1.2">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:62px;font-weight:700;letter-spacing:-2.4px;line-height:1.1;margin-top:24px">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return body


V = {'q': q, 'r': r, 's': s_, 't': t}
if __name__ == '__main__':
    for k in (sys.argv[1:] or list(V)):
        render('s1_' + k, page(V[k]()))

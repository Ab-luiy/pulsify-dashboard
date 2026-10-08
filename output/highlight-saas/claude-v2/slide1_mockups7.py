"""Slide 1, round 7: U refined. Text on one line, you centred, zoomed out further, lifted so you're not barely showing.
Renders s1_u1..u3.png"""
import sys
from engine import *
from slides_r5 import SH
from slide1_mockups2 import MARKU
from slide1_mockups5 import layers

C = 'text-align:center;left:0;width:1080px'
LIFT = 'filter:brightness(1.55) contrast(1.06)'


def scene(tag, shift, headx):
    bg, subj, hy = layers(tag, shift, headx)
    html = f'<img class="abs" src="file:///{bg}" style="left:0;top:0;width:1080px;height:1920px;{LIFT}">'
    return html, subj, hy


def front(subj):
    return f'<img class="abs" src="file:///{subj}" style="left:0;top:0;width:1080px;height:1920px;{LIFT}">'


def logo():
    return f'<div class="abs" style="top:196px;{C}"><img src="file:///{MARKU}" style="width:92px;filter:drop-shadow(0 0 24px rgba(255,255,255,.6))"></div>'


def tail(y):
    return (f'<div class="abs" style="top:{y}px;{C};{SH}"><div style="font-size:64px;font-weight:700;letter-spacing:-2.4px;line-height:1.05">up until {ul("today.")}</div>'
            f'<div style="font-size:36px;line-height:1.2;margin-top:22px">i noticed something every creator<br>i\'ve worked with has in common.</div>'
            f'<div style="font-size:52px;font-weight:700;letter-spacing:-2px;line-height:1.1;margin-top:16px">everyone is stuck on the {ul("same problem.")}</div></div>')


def u1():
    """U1: 'i've been working on this' on ONE line, giant 'all year,' behind him, centred, zoomed out."""
    html, subj, hy = scene('u1', 820, 500)
    html += f'<div class="abs" style="left:0;top:{hy-575}px;width:1080px;text-align:center;font-size:84px;font-weight:700;letter-spacing:-3.6px;line-height:1;color:#fff;white-space:nowrap">i\'ve been working on this</div>'
    html += f'<div class="abs" style="left:0;top:{hy-455}px;width:1080px;text-align:center;font-size:250px;font-weight:700;letter-spacing:-12px;line-height:1;color:#fff;white-space:nowrap">all year,</div>'
    return html + front(subj) + logo() + tail(1450)


def u2():
    """U2: the whole sentence on one line behind him."""
    html, subj, hy = scene('u2', 820, 500)
    html += f'<div class="abs" style="left:0;top:{hy-300}px;width:1080px;text-align:center;font-size:66px;font-weight:700;letter-spacing:-2.8px;line-height:1;color:#fff;white-space:nowrap">i\'ve been working on this all year,</div>'
    return html + front(subj) + logo() + tail(1450)


def u3():
    """U3: bigger, less zoomed out so he's more present; one-line lead plus giant 'all year,'."""
    html, subj, hy = scene('u3', 640, 500)
    html += f'<div class="abs" style="left:0;top:{hy-560}px;width:1080px;text-align:center;font-size:84px;font-weight:700;letter-spacing:-3.6px;line-height:1;color:#fff;white-space:nowrap">i\'ve been working on this</div>'
    html += f'<div class="abs" style="left:0;top:{hy-440}px;width:1080px;text-align:center;font-size:260px;font-weight:700;letter-spacing:-12px;line-height:1;color:#fff;white-space:nowrap">all year,</div>'
    return html + front(subj) + logo() + tail(1440)


V = {'u1': u1, 'u2': u2, 'u3': u3}
if __name__ == '__main__':
    for k in (sys.argv[1:] or list(V)):
        render('s1_' + k, page(V[k]()))

"""Slide 1, round 6: R refined. "i've been working on this all year" sits BEHIND him, small logo above, zoomed out further.
Renders s1_u..w.png"""
import sys
from engine import *
from slides_r5 import SH
from slide1_mockups2 import MARKU
from slide1_mockups5 import layers, GR

C = 'text-align:center;left:0;width:1080px'
SHIFT = 700


def base(tag):
    bg, subj, hy = layers(tag, SHIFT, 540)
    html = f'<img class="abs" src="file:///{bg}" style="left:0;top:0;width:1080px;height:1920px"><div class="abs" style="inset:0;background:rgba(0,0,0,.2)"></div>'
    return html, subj, hy


def logo():
    return f'<div class="abs" style="top:196px;{C}"><img src="file:///{MARKU}" style="width:92px;filter:drop-shadow(0 0 24px rgba(255,255,255,.6))"></div>'


def tail():
    return (f'<div class="abs" style="top:1420px;{C};{SH}"><div style="font-size:62px;font-weight:700;letter-spacing:-2.4px;line-height:1.05">up until {ul("today.")}</div>'
            f'<div style="font-size:36px;line-height:1.2;margin-top:24px">i noticed something every creator<br>i\'ve worked with has in common.</div>'
            f'<div style="font-size:52px;font-weight:700;letter-spacing:-2px;line-height:1.1;margin-top:16px">everyone is stuck on the {ul("same problem.")}</div></div>')


def u():
    """U: sharp white type behind him. "i've been working on this" above the head, "all" and "year," either side of it."""
    html, subj, hy = base('u')
    html += (f'<div class="abs" style="left:0;top:{hy-620}px;width:1080px;text-align:center;font-size:104px;font-weight:700;letter-spacing:-5px;line-height:1;color:#fff">i\'ve been working<br>on this</div>')
    html += (f'<div class="abs" style="left:0;top:{hy-345}px;width:1080px;display:flex;justify-content:center;font-size:214px;font-weight:700;letter-spacing:-10px;line-height:1;color:#fff"><span>all year,</span></div>')
    html += f'<img class="abs" src="file:///{subj}" style="left:0;top:0;width:1080px;height:1920px">' + logo() + tail()
    return html


def v():
    """V: same layout, the type reads like projected light (soft, translucent)."""
    html, subj, hy = base('v')
    html += (f'<div class="abs" style="left:0;top:{hy-620}px;width:1080px;text-align:center;font-size:104px;font-weight:700;letter-spacing:-5px;line-height:1;color:rgba(255,255,255,.62);filter:blur(1.2px)">i\'ve been working<br>on this</div>')
    html += (f'<div class="abs" style="left:0;top:{hy-345}px;width:1080px;display:flex;justify-content:center;font-size:214px;font-weight:700;letter-spacing:-10px;line-height:1;color:rgba(255,255,255,.62);filter:blur(1.2px)"><span>all year,</span></div>')
    html += f'<img class="abs" src="file:///{subj}" style="left:0;top:0;width:1080px;height:1920px">' + logo() + tail()
    return html


def w():
    """W: outlined type behind him, hollow letters so the room shows through."""
    html, subj, hy = base('w')
    st = '-webkit-text-stroke:3px rgba(255,255,255,.92);color:transparent'
    html += (f'<div class="abs" style="left:0;top:{hy-620}px;width:1080px;text-align:center;font-size:104px;font-weight:700;letter-spacing:-5px;line-height:1;{st}">i\'ve been working<br>on this</div>')
    html += (f'<div class="abs" style="left:0;top:{hy-345}px;width:1080px;display:flex;justify-content:center;font-size:214px;font-weight:700;letter-spacing:-10px;line-height:1;{st}"><span>all year,</span></div>')
    html += f'<img class="abs" src="file:///{subj}" style="left:0;top:0;width:1080px;height:1920px">' + logo() + tail()
    return html


V = {'u': u, 'v': v, 'w': w}
if __name__ == '__main__':
    for k in (sys.argv[1:] or list(V)):
        render('s1_' + k, page(V[k]()))

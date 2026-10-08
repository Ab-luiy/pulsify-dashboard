"""Slide 1, round 3: blends of F (small mark opener, centred editorial) and G (giant ring bleeding off the left). Renders s1_j..l.png"""
import sys
from engine import *
from slides_r5 import SH
from slides_r4 import bgdiv
from slide1_mockups2 import photo, MARKU

C = 'text-align:center;left:0;width:1080px'


def j():
    """J: F's centred editorial type, G's giant ring bleeding off the left edge behind him."""
    body = bgdiv(photo('j', .459, 20, 980, 980, strength=.6))
    body += (f'<div class="abs" style="top:222px;{C}"><img src="file:///{MARKU}" style="width:96px;filter:drop-shadow(0 0 22px rgba(255,255,255,.55))">'
             f'<div style="font-size:40px;letter-spacing:-.8px;margin-top:20px;{SH}">i\'ve been working on this all year,</div>'
             f'<div style="font-size:88px;font-weight:700;letter-spacing:-3.6px;line-height:1.02;margin-top:6px;{SH}">up until {ul("today.")}</div></div>')
    body += (f'<div class="abs" style="top:1330px;{C};{SH}"><div style="font-size:38px;line-height:1.2">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:60px;font-weight:700;letter-spacing:-2.4px;line-height:1.1;margin-top:24px">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return body


def k():
    """K: G's staging (subject right, ring bleeding left) cleaned up, F's mark as the opener, hook as the hero."""
    body = bgdiv(photo('k', .286, 40, 980, 1000, strength=.58))
    body += (f'<div class="abs" style="left:64px;top:222px;{SH}"><img src="file:///{MARKU}" style="width:84px;filter:drop-shadow(0 0 20px rgba(255,255,255,.5))">'
             f'<div style="font-size:36px;letter-spacing:-.7px;margin-top:18px;width:430px;line-height:1.2">i noticed something every creator i\'ve worked with has in common.</div></div>')
    body += (f'<div class="abs" style="left:64px;top:1180px;width:760px;{SH}"><div style="font-size:90px;font-weight:700;letter-spacing:-3.8px;line-height:1.01">everyone is stuck on the {ul("same problem.")}</div>'
             f'<div style="font-size:38px;margin-top:30px;letter-spacing:-.8px">i\'ve been working on this all year,<br><b>up until today.</b></div></div>')
    return body


def l():
    """L: F, with a quiet ring centred behind him instead of the plain wall."""
    body = bgdiv(photo('l', .459, 540, 800, 940, strength=.26, dim=.75))
    body += (f'<div class="abs" style="top:222px;{C}"><img src="file:///{MARKU}" style="width:96px;filter:drop-shadow(0 0 22px rgba(255,255,255,.55))">'
             f'<div style="font-size:40px;letter-spacing:-.8px;margin-top:20px;{SH}">i\'ve been working on this all year,</div>'
             f'<div style="font-size:88px;font-weight:700;letter-spacing:-3.6px;line-height:1.02;margin-top:6px;{SH}">up until {ul("today.")}</div></div>')
    body += (f'<div class="abs" style="top:1320px;{C};{SH}"><div style="font-size:38px;line-height:1.2">i noticed something every creator<br>i\'ve worked with has in common.</div>'
             f'<div style="font-size:60px;font-weight:700;letter-spacing:-2.4px;line-height:1.1;margin-top:24px">everyone is stuck on<br>the {ul("same problem.")}</div></div>')
    return body


V = {'j': j, 'k': k, 'l': l}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(V)):
        render('s1_' + n, page(V[n]()))

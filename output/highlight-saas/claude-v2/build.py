"""Claude v2: three highlight slides (1, 3, 12) built as HTML and rendered with headless Chrome.
Original photos only, one uniform exposure lift per photo (no fades, no cutouts). Copy is the locked copy.
Run: python build.py
"""
import os, subprocess
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
UP = os.path.join(ROOT, 'brand', 'photos', 'uploaded')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
BLUE = '#6871f4'
RED = '#e5322d'
W, H = 1080, 1920


def prep(name, out, gamma, focus=(0.5, 0.5), zoom=1.0):
    """Cover-crop to 1080x1920 and apply one uniform gamma lift."""
    im = ImageOps.exif_transpose(Image.open(os.path.join(UP, name))).convert('RGB')
    s = max(W / im.width, H / im.height) * zoom
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    x = int((im.width - W) * focus[0]); y = int((im.height - H) * focus[1])
    im = im.crop((x, y, x + W, y + H))
    lut = [int(255 * ((i / 255) ** gamma)) for i in range(256)]
    im = im.point(lut * 3)
    p = os.path.join(HERE, 'img', out)
    im.save(p, quality=93)
    return p.replace('\\', '/')


def underline(w, color=RED, sw=10, y=10):
    # near-horizontal hand stroke, slight wobble
    return (f'<svg width="{w}" height="26" viewBox="0 0 {w} 26" style="display:block">'
            f'<path d="M3 {y+2} C {w*.25} {y-2}, {w*.55} {y+4}, {w-4} {y-1}" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round"/></svg>')


CSS = f'''
@font-face{{font-family:H;src:local("Helvetica");font-weight:400}}
@font-face{{font-family:H;src:local("Helvetica Bold"),local("Helvetica-Bold");font-weight:700}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#000;font-family:H,Helvetica,Arial,sans-serif;color:#fff}}
.bg{{position:absolute;inset:0;background-size:cover}}
.abs{{position:absolute}}
b{{font-weight:700}}
'''


def page(body, extra=''):
    return f'<!doctype html><meta charset="utf-8"><style>{CSS}{extra}</style><body>{body}</body>'


# ---------------------------------------------------------------- slide 1
def slide1():
    img = prep('50-IMG_7545.JPEG', 's1.jpg', 0.55, (0.5, 0.6))
    body = f'''
    <div class="bg" style="background-image:url('file:///{img}')"></div>
    <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.55) 36%,rgba(0,0,0,0) 62%)"></div>
    <div class="abs" style="left:72px;top:300px;width:940px">
      <div style="font-size:56px;line-height:1.1;font-weight:400;margin-bottom:26px;white-space:nowrap">i've been working on this for</div>
      <div style="display:inline-block;background:{BLUE};padding:6px 34px 22px;border-radius:14px;transform:rotate(-1.5deg)">
        <div style="font-size:176px;line-height:.98;font-weight:700;letter-spacing:-5px">a whole</div>
        <div style="font-size:176px;line-height:.98;font-weight:700;letter-spacing:-5px">year now.</div>
      </div>
      <div style="margin-top:56px;font-size:46px;line-height:1.22;font-weight:400">because everyone in this space<br>is stuck on the same problem.</div>
      <div style="margin:-2px 0 0 262px;width:360px">{underline(360)}</div>
    </div>'''
    return page(body)


# ---------------------------------------------------------------- slide 3
def slide3():
    img = prep('15-IMG_7708.jpg', 's3.jpg', 0.5, (0.5, 0.5))
    steps = ['content.', 'traffic.', 'a page.', 'sales calls.', 'a team.', 'cash in the bank.']
    x0, dx, y0, dy, ph = 70, 66, 1300, 150, 104
    parts = []
    for i, s in enumerate(steps):
        x = x0 + i * dx; y = y0 - i * dy
        last = i == len(steps) - 1
        bg = BLUE if last else '#fff'; fg = '#fff' if last else '#0b0b0d'
        fs = 62 if last else 56
        parts.append(f'<div class="abs" style="left:{x}px;top:{y}px;height:{ph}px;padding:0 44px;display:flex;align-items:center;'
                     f'background:{bg};color:{fg};border-radius:{ph//2}px;font-size:{fs}px;font-weight:700;letter-spacing:-1px;'
                     f'box-shadow:0 14px 40px rgba(0,0,0,.45)">{s}</div>')
        if not last:
            ax = x + 78; ay_top = y - (dy - ph)  # gap between this pill top and next pill bottom
            parts.append(f'<svg class="abs" style="left:{ax-18}px;top:{y-(dy-ph)}px" width="36" height="{dy-ph}" viewBox="0 0 36 {dy-ph}">'
                         f'<path d="M18 {dy-ph-2} L18 14" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'
                         f'<path d="M4 24 L18 4 L32 24 Z" fill="#fff"/></svg>')
    body = f'''
    <div class="bg" style="background-image:url('file:///{img}')"></div>
    <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.25) 20%,rgba(0,0,0,.1) 55%,rgba(0,0,0,.78) 100%)"></div>
    <div class="abs" style="left:72px;top:262px;font-size:92px;line-height:1.02;font-weight:700;letter-spacing:-3px">that's the<br>whole chain.</div>
    {''.join(parts)}
    <div class="abs" style="left:72px;top:1450px;width:960px;font-size:40px;line-height:1.28">
      most people have never run it.<br>some don't even know what a kpi is.<br><span style="font-weight:700">and that's fine. nobody teaches you this part.</span>
    </div>'''
    return page(body)


# ---------------------------------------------------------------- slide 12
def slide12():
    img = prep('46-IMG_7278.JPEG', 's12.jpg', 0.5, (0.5, 0.45))
    flow = os.path.join(ROOT, 'output', 'highlight-saas', 'project', 'html', 'assets', 'product', 'funnel-flow.png').replace('\\', '/')
    mark = os.path.join(ROOT, 'brand', 'logo', 'mark.svg').replace('\\', '/')
    body = f'''
    <div class="bg" style="background-image:url('file:///{img}')"></div>
    <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(0,0,0,.8) 0%,rgba(0,0,0,.5) 30%,rgba(0,0,0,.15) 55%,rgba(0,0,0,.65) 100%)"></div>
    <img class="abs" src="file:///{mark}" style="right:-230px;top:700px;width:760px;opacity:.9;filter:brightness(0) invert(1);mix-blend-mode:soft-light">
    <div class="abs" style="left:72px;top:262px;width:930px">
      <div style="font-size:50px;line-height:1.22">and every post is tracked.<br>who watched, who clicked,<br>who booked, who paid.</div>
      <div style="margin-top:46px;font-size:132px;line-height:.98;font-weight:700;letter-spacing:-5px">"you never<br>post <span style="background:{BLUE};padding:0 22px 10px;border-radius:12px">blind</span><br>again."</div>
      <div style="margin-top:10px;width:420px">{underline(420)}</div>
    </div>
    <div class="abs" style="left:60px;top:1010px;width:960px;background:#fff;color:#0b0b0d;border-radius:44px;padding:36px 40px 34px;box-shadow:0 30px 80px rgba(0,0,0,.55)">
      <div style="display:flex;justify-content:space-between;font-size:30px;color:#6b6b73;margin-bottom:22px"><span><b style="color:#0b0b0d">Pulsify</b> / funnel</span><span>Example workspace · demo data</span></div>
      <img src="file:///{flow}" style="width:100%;border-radius:18px;display:block">
      <div style="display:flex;gap:28px;margin-top:26px">
        <div style="flex:1"><div style="font-size:28px;color:#6b6b73">Booked calls</div><div style="font-size:120px;font-weight:700;letter-spacing:-4px;line-height:1.05">22</div></div>
        <div style="flex:1.6;background:{BLUE};border-radius:28px;color:#fff;padding:18px 30px"><div style="font-size:28px;opacity:.85">Cash collected</div><div style="font-size:120px;font-weight:700;letter-spacing:-4px;line-height:1.05">$7,500</div></div>
      </div>
    </div>'''
    return page(body)


def render(name, html):
    hp = os.path.join(HERE, name + '.html')
    open(hp, 'w', encoding='utf-8').write(html)
    out = os.path.join(HERE, name + '.png')
    subprocess.run([CHROME, '--headless', '--hide-scrollbars', '--force-device-scale-factor=1',
                    f'--screenshot={out}', f'--window-size={W},{H}', 'file:///' + hp.replace('\\', '/')],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('rendered', out)


if __name__ == '__main__':
    render('01', slide1()); render('03', slide3()); render('12', slide12())
    sheet = Image.new('RGB', (W * 3 // 2 + 40, H // 2), (20, 20, 20))
    for i, n in enumerate(['01', '03', '12']):
        im = Image.open(os.path.join(HERE, n + '.png')).convert('RGB').resize((W // 2, H // 2))
        sheet.paste(im, (i * (W // 2 + 20), 0))
    sheet.save(os.path.join(HERE, 'sheet.jpg'), quality=90)

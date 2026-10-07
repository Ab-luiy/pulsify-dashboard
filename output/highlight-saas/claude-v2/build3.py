"""Claude v3: highlight slides 1, 3, 12 in the parked-homepage language.
Graphite + warm off-white + silver chips + dusk coral/violet glows + one emerald dot; red hand underline kept.
Original photos only, one uniform exposure lift each. Locked copy. Run: python build3.py
"""
import os, subprocess, tempfile, time
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
UP = os.path.join(ROOT, 'brand', 'photos', 'uploaded')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
SILVER, INK, GRAPH, EMERALD, RED = '#efeee9', '#f1f1ee', '#0b0c0d', '#5fd6a4', '#e5322d'
W, H = 1080, 1920
MARK = os.path.join(ROOT, 'brand', 'logo', 'mark.svg').replace('\\', '/')
FLOW = os.path.join(ROOT, 'output', 'highlight-saas', 'project', 'html', 'assets', 'product', 'funnel-flow.png').replace('\\', '/')


def prep(name, out, gamma, focus=(0.5, 0.5)):
    im = ImageOps.exif_transpose(Image.open(os.path.join(UP, name))).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    x = int((im.width - W) * focus[0]); y = int((im.height - H) * focus[1])
    im = im.crop((x, y, x + W, y + H))
    lut = [int(255 * ((i / 255) ** gamma)) for i in range(256)]
    im = im.point(lut * 3)
    p = os.path.join(HERE, 'img', out)
    im.save(p, quality=93)
    return p.replace('\\', '/')


def underline(w, sw=10):
    return (f'<svg width="{w}" height="26" viewBox="0 0 {w} 26" style="display:block">'
            f'<path d="M3 12 C {w*.25} 8, {w*.55} 14, {w-4} 9" fill="none" stroke="{RED}" stroke-width="{sw}" stroke-linecap="round"/></svg>')


CSS = f'''
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#000;font-family:Helvetica,Arial,sans-serif;color:{INK}}}
.bg{{position:absolute;inset:0;background-size:cover}}
.abs{{position:absolute}}
.glow{{position:absolute;inset:0;background:
 radial-gradient(900px 700px at -8% 18%,rgba(138,75,63,.5),transparent 62%),
 radial-gradient(900px 800px at 108% 62%,rgba(77,63,104,.45),transparent 60%)}}
.grain{{position:absolute;inset:0;opacity:.12;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}}
.navpill{{display:inline-flex;align-items:center;gap:14px;padding:12px 28px 12px 16px;border-radius:999px;background:rgba(14,15,17,.72);
 border:1px solid rgba(255,255,255,.16);font-size:34px;font-weight:700;letter-spacing:-.6px}}
.navpill img{{width:44px;height:44px;filter:invert(1)}}
'''


def page(body):
    return f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><body>{body}</body>'


def navpill():
    return f'<div class="navpill"><img src="file:///{MARK}">Pulsify</div>'


def scene(img, top, mid, bot):
    return (f'<div class="bg" style="background-image:url(\'file:///{img}\')"></div>'
            f'<div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(11,12,13,{top}) 0%,rgba(11,12,13,{mid}) 42%,rgba(11,12,13,{bot}) 100%)"></div>'
            '<div class="glow"></div><div class="grain"></div>')


def slide1():
    img = prep('50-IMG_7545.JPEG', 's1.jpg', 0.55, (0.5, 0.6))
    dots = ''.join(f'<div style="width:50px;height:50px;border-radius:50%;background:{SILVER};color:{GRAPH};display:grid;place-items:center;font-size:23px;font-weight:700">{m}</div>' for m in 'JFMAMJJASOND')
    body = scene(img, .88, .6, .05) + f'''
    <div class="abs" style="left:72px;top:250px">{navpill()}</div>
    <div class="abs" style="left:72px;top:352px;width:936px">
      <div style="font-size:52px;line-height:1.1;white-space:nowrap">i've been working on this for</div>
      <div style="display:inline-block;margin:20px 0 4px -4px;background:{SILVER};color:{GRAPH};padding:16px 40px 40px;border-radius:24px;font-size:128px;line-height:1;font-weight:700;letter-spacing:-5px;white-space:nowrap">a whole year</div>
      <div style="font-size:128px;line-height:.95;font-weight:700;letter-spacing:-5px;margin-left:-4px">now.</div>
      <div style="display:flex;justify-content:space-between;width:936px;margin-top:30px">{dots}</div>
      <div style="margin-top:40px;font-size:42px;line-height:1.24">because everyone in this space<br>is stuck on the same problem.</div>
      <div style="margin:-4px 0 0 238px;width:330px">{underline(330)}</div>
    </div>
    <div class="abs" style="left:190px;top:1005px;width:860px;height:80px;backdrop-filter:blur(18px);clip-path:polygon(0% 51%,100% 6%,100% 49%,0% 91%)"></div>'''
    return page(body)


def slide3():
    img = prep('15-IMG_7708.jpg', 's3.jpg', 0.5, (0.5, 0.5))
    steps = ['content.', 'traffic.', 'a page.', 'sales calls.', 'a team.', 'cash in the bank.']
    x0, dx, y0, dy, ph = 72, 58, 1262, 128, 96
    parts = []
    for i, st in enumerate(steps):
        x = x0 + i * dx; y = y0 - i * dy
        last = i == len(steps) - 1
        dot = f'<span style="width:22px;height:22px;border-radius:50%;background:{EMERALD};margin-right:18px;display:inline-block"></span>' if last else ''
        parts.append(f'<div class="abs" style="left:{x}px;top:{y}px;height:{ph}px;padding:0 42px;display:flex;align-items:center;background:{SILVER};color:{GRAPH};'
                     f'border-radius:{ph//2}px;font-size:{58 if last else 54}px;font-weight:700;letter-spacing:-1.2px;white-space:nowrap;box-shadow:0 16px 44px rgba(0,0,0,.5)">{dot}{st}</div>')
        if not last:
            gap = dy - ph; ax = x + 64
            parts.append(f'<svg class="abs" style="left:{ax-16}px;top:{y-gap}px" width="32" height="{gap}" viewBox="0 0 32 {gap}">'
                         f'<path d="M16 {gap} L16 12" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M5 20 L16 3 L27 20 Z" fill="{INK}"/></svg>')
    body = scene(img, .82, .4, .86) + f'''
    <div class="abs" style="left:72px;top:262px">{navpill()}</div>
    <div class="abs" style="left:72px;top:372px;font-size:96px;line-height:1.02;font-weight:700;letter-spacing:-3.5px">that's the<br>whole chain.</div>
    {''.join(parts)}
    <div class="abs" style="left:72px;top:1412px;width:940px;font-size:40px;line-height:1.3">
      most people have never run it.<br>some don't even know what a kpi is.<br><b>and that's fine. nobody teaches you this part.</b></div>'''
    return page(body)


def slide12():
    img = prep('46-IMG_7278.JPEG', 's12.jpg', 0.5, (0.5, 0.45))
    tile = lambda label, val, col: (f'<div style="flex:1 1 0;background:#1d1e22;border:1px solid rgba(255,255,255,.08);border-radius:28px;padding:26px 32px 28px;height:206px">'
                                    f'<div style="font-size:28px;color:#a3a5aa">{label}</div>'
                                    f'<div style="font-size:112px;font-weight:700;letter-spacing:-4px;line-height:1.08;color:{col}">{val}</div></div>')
    body = scene(img, .88, .56, .5) + f'''
    <div class="abs" style="left:72px;top:262px;width:700px;font-size:46px;line-height:1.24">and every post is tracked.<br>who watched, who clicked,<br>who booked, who paid.</div>
    <div class="abs" style="left:72px;top:500px;width:580px;font-size:104px;line-height:1.02;font-weight:700;letter-spacing:-4px">"you never<br>post <span style="display:inline-block;background:{SILVER};color:{GRAPH};padding:0 22px 12px;border-radius:16px">blind</span><br>again."</div>
    <div class="abs" style="left:72px;top:836px;width:300px">{underline(300)}</div>
    <div class="abs" style="left:56px;top:1000px;width:968px;background:rgba(20,21,24,.94);border:1px solid rgba(255,255,255,.1);border-radius:44px;padding:30px 34px 34px;box-shadow:0 34px 90px rgba(0,0,0,.6)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px">
        <div style="display:inline-flex;align-items:center;gap:12px;font-size:32px;font-weight:700"><img src="file:///{MARK}" style="width:40px;height:40px;filter:invert(1)">Your funnel</div>
        <div style="font-size:26px;color:#a3a5aa">Example workspace · demo data</div></div>
      <img src="file:///{FLOW}" style="width:100%;border-radius:18px;display:block">
      <div style="display:flex;gap:24px;margin-top:24px">{tile('Booked calls', '22', INK)}{tile('Cash collected', '$7,500', EMERALD)}</div>
    </div>'''
    return page(body)


def render(name, html):
    hp = os.path.join(HERE, name + '.html')
    open(hp, 'w', encoding='utf-8').write(html)
    out = os.path.join(HERE, name + '.png')
    for _ in range(4):
        prof = tempfile.mkdtemp(prefix='chr')
        try:
            r = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                                f'--user-data-dir={prof}', f'--screenshot={out}', f'--window-size={W},{H}',
                                'file:///' + hp.replace('\\', '/')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=80)
            if r.returncode == 0 and os.path.exists(out) and time.time() - os.path.getmtime(out) < 120:
                break
        except subprocess.TimeoutExpired:
            pass
        time.sleep(3)
    print('rendered', out)


if __name__ == '__main__':
    render('01', slide1()); render('03', slide3()); render('12', slide12())
    sheet = Image.new('RGB', (W * 3 // 2 + 40, H // 2), (20, 20, 20))
    for i, n in enumerate(['01', '03', '12']):
        sheet.paste(Image.open(os.path.join(HERE, n + '.png')).convert('RGB').resize((W // 2, H // 2)), (i * (W // 2 + 20), 0))
    sheet.save(os.path.join(HERE, 'sheet.jpg'), quality=90)

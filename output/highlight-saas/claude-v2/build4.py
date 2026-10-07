"""Claude v4: highlight slides 1, 3, 12. Natural exposure, big numbers, top-to-bottom chain.
Run: python build4.py [01|03|12]
"""
import os, sys, subprocess, tempfile, time
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
UP = os.path.join(ROOT, 'brand', 'photos', 'uploaded')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
SILVER, INK, GRAPH, EMERALD, RED, MUTE = '#efeee9', '#f4f3ef', '#0b0c0d', '#5fd6a4', '#e5322d', '#a9aaae'
W, H = 1080, 1920
MARK = os.path.join(ROOT, 'brand', 'logo', 'mark.svg').replace('\\', '/')
FLOW = os.path.join(ROOT, 'output', 'highlight-saas', 'project', 'html', 'assets', 'product', 'funnel-flow.png').replace('\\', '/')


def prep(name, out, focus=(0.5, 0.5), shift=0):
    """Cover-crop only. No exposure change: the photos stay as shot."""
    im = ImageOps.exif_transpose(Image.open(os.path.join(UP, name))).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    x = int((im.width - W) * focus[0]); y = int((im.height - H) * focus[1])
    p = os.path.join(HERE, 'img', out)
    crop = im.crop((x, y, x + W, y + H))
    if shift:
        top = crop.crop((0, 0, W, 6)).resize((1, 1), Image.LANCZOS).getpixel((0, 0))
        canvas = Image.new('RGB', (W, H), top)
        canvas.paste(crop, (0, shift))
        crop = canvas
    crop.save(p, quality=94)
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
 radial-gradient(900px 700px at -8% 16%,rgba(138,75,63,.34),transparent 62%),
 radial-gradient(900px 800px at 108% 66%,rgba(77,63,104,.3),transparent 60%)}}
.grain{{position:absolute;inset:0;opacity:.12;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}}
.navpill{{display:inline-flex;align-items:center;gap:14px;padding:12px 28px 12px 16px;border-radius:999px;background:rgba(14,15,17,.7);
 border:1px solid rgba(255,255,255,.16);font-size:34px;font-weight:700;letter-spacing:-.6px}}
.navpill img{{width:44px;height:44px;filter:invert(1)}}
.chip{{display:grid;place-items:center;width:104px;height:88px;border-radius:24px;background:linear-gradient(160deg,#f6f5f1,#b9b8b3);
 box-shadow:0 8px 24px rgba(0,0,0,.5),inset 0 -4px 0 rgba(0,0,0,.18)}}
.chip img{{width:54px;height:54px}}
.label{{font-size:28px;letter-spacing:.14em;text-transform:uppercase;color:{MUTE};font-weight:700}}
'''


def page(body):
    return f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><body>{body}</body>'


def navpill():
    return f'<div class="navpill"><img src="file:///{MARK}">Pulsify</div>'


def scene(img, top, mid, bot):
    return (f'<div class="bg" style="background-image:url(\'file:///{img}\')"></div>'
            f'<div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(11,12,13,{top}) 0%,rgba(11,12,13,{mid}) 45%,rgba(11,12,13,{bot}) 100%)"></div>'
            '<div class="glow"></div><div class="grain"></div>')


def slide1():
    img = prep('14-IMG_8690.JPEG', 's1.jpg', (0.41, 0.5), shift=250)
    body = scene(img, .35, .0, .3) + f'''
    <div class="abs" style="left:72px;top:250px">{navpill()}</div>
    <div class="abs" style="left:72px;top:372px;width:936px">
      <div style="font-size:54px;line-height:1.1;white-space:nowrap;letter-spacing:-1px">i've been working on this for</div>
      <div style="display:inline-block;margin:22px 0 2px -4px;background:{SILVER};color:{GRAPH};padding:14px 42px 44px;border-radius:26px;font-size:140px;line-height:1;font-weight:700;letter-spacing:-7px;white-space:nowrap">a whole year</div>
      <div style="font-size:140px;line-height:.92;font-weight:700;letter-spacing:-7px;margin-left:-6px">now.</div>
    </div>
    <div class="abs" style="left:72px;top:1210px;font-size:50px;line-height:1.22;letter-spacing:-1px">because everyone in this space<br>is stuck on <b>the same problem.</b></div>
    <div class="abs" style="left:300px;top:1334px;width:470px">{underline(470)}</div>'''
    return page(body)


def slide3():
    img = prep('15-IMG_7708.jpg', 's3.jpg', (0.5, 0.5))
    steps = ['content.', 'traffic.', 'a page.', 'sales calls.', 'a team.', 'cash in the bank.']
    x0, dx, y0, dy, ph = 72, 54, 640, 130, 98
    parts = []
    for i, st in enumerate(steps):
        x = x0 + i * dx; y = y0 + i * dy
        last = i == len(steps) - 1
        num = (f'<span style="width:56px;height:56px;border-radius:50%;background:{EMERALD if last else GRAPH};color:{GRAPH if last else INK};'
               f'display:grid;place-items:center;font-size:30px;margin-right:22px;flex:none">{i+1}</span>')
        parts.append(f'<div class="abs" style="left:{x}px;top:{y}px;height:{ph}px;padding:0 44px 0 21px;display:flex;align-items:center;background:{SILVER};color:{GRAPH};'
                     f'border-radius:{ph//2}px;font-size:{60 if last else 54}px;font-weight:700;letter-spacing:-1.4px;white-space:nowrap;box-shadow:0 16px 44px rgba(0,0,0,.5)">{num}{st}</div>')
        if not last:
            gap = dy - ph; ax = x + 49 + 54
            parts.append(f'<svg class="abs" style="left:{ax-14}px;top:{y+ph}px" width="28" height="{gap}" viewBox="0 0 28 {gap}">'
                         f'<path d="M14 2 L14 {gap-12}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M3 {gap-16} L14 {gap-1} L25 {gap-16} Z" fill="{INK}"/></svg>')
    body = scene(img, .55, .12, .6) + f'''
    <div class="abs" style="left:72px;top:250px">{navpill()}</div>
    <div class="abs" style="left:72px;top:358px;font-size:104px;line-height:1;font-weight:700;letter-spacing:-4.5px">that's the<br>whole chain.</div>
    {''.join(parts)}
    <div class="abs" style="left:72px;top:1440px;width:940px;font-size:42px;line-height:1.28;letter-spacing:-.6px">
      most people have never run it.<br>some don't even know what a kpi is.<br><b>and that's fine. nobody teaches you this part.</b></div>'''
    return page(body)


def slide12():
    img = prep('46-IMG_7278.JPEG', 's12.jpg', (0.5, 0.45))
    body = scene(img, .6, .28, .62) + f'''
    <div class="abs" style="left:72px;top:256px;width:700px;font-size:44px;line-height:1.24;letter-spacing:-.8px">and every post is tracked.<br>who watched, who clicked,<br>who booked, who paid.</div>
    <div class="abs chip" style="right:72px;top:256px"><img src="file:///{MARK}"></div>
    <div class="abs" style="left:72px;top:470px;width:600px;font-size:100px;line-height:1.02;font-weight:700;letter-spacing:-4.5px">"you never<br>post <span style="display:inline-block;background:{SILVER};color:{GRAPH};padding:0 22px 12px;border-radius:16px">blind</span><br>again."</div>
    <div class="abs" style="left:72px;top:800px;width:290px">{underline(290)}</div>
    <div class="abs" style="left:66px;top:880px;width:960px">
      <div style="font-size:250px;line-height:.85;font-weight:700;letter-spacing:-14px;color:{INK}">22</div>
      <div class="label" style="margin-top:18px">booked calls</div>
      <div style="margin-top:30px;font-size:210px;line-height:.85;font-weight:700;letter-spacing:-12px;color:{EMERALD}">$7,500</div>
      <div class="label" style="margin-top:20px">cash collected</div>
    </div>
    <div class="abs" style="left:56px;top:1402px;width:968px;background:rgba(20,21,24,.9);border:1px solid rgba(255,255,255,.12);border-radius:30px;padding:22px 24px">
      <img src="file:///{FLOW}" style="width:100%;border-radius:14px;display:block"></div>'''
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
    which = sys.argv[1:] or ['01', '03', '12']
    fns = {'01': slide1, '03': slide3, '12': slide12}
    for n in which:
        render(n, fns[n]())
    sheet = Image.new('RGB', (W * 3 // 2 + 40, H // 2), (20, 20, 20))
    for i, n in enumerate(['01', '03', '12']):
        sheet.paste(Image.open(os.path.join(HERE, n + '.png')).convert('RGB').resize((W // 2, H // 2)), (i * (W // 2 + 20), 0))
    sheet.save(os.path.join(HERE, 'sheet.jpg'), quality=90)

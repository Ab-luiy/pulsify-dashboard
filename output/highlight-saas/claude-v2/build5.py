"""Claude v5: highlight slides 1, 3, 12.
- photos at natural exposure; seamless edge fill (no tiled grain, per-pixel dither instead)
- logo is a branded visual behind the subject / behind the content, not a corner badge
- own pipeline tracker (not the InfoOS strip); figures are SAMPLE data and tagged
Run: python build5.py [01|03|12]
"""
import os, sys, subprocess, tempfile, time
from PIL import Image, ImageOps, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
UP = os.path.join(ROOT, 'brand', 'photos', 'uploaded')
MARKPNG = os.path.join(ROOT, 'brand', 'logo', 'variations', '01-flat-white.png')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
SILVER, INK, GRAPH, EMERALD, RED, MUTE = '#efeee9', '#f4f3ef', '#0b0c0d', '#5fd6a4', '#e5322d', '#a9aaae'
W, H = 1080, 1920

# sample figures for the tracker (illustrative, tagged as sample on the slide)
SAMPLE = [('watched', '18,400', 1.0), ('clicked', '1,120', .74), ('applied', '96', .52), ('booked a call', '41', .34), ('paid', '9', .2)]
CASH = '$54,000'


def dither(im, sigma=2.6):
    n = Image.effect_noise(im.size, sigma).convert('RGB')
    return ImageChops.add(im, n, scale=1, offset=-128)


def cover(name, focus):
    im = ImageOps.exif_transpose(Image.open(os.path.join(UP, name))).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    x = int((im.width - W) * focus[0]); y = int((im.height - H) * focus[1])
    return im.crop((x, y, x + W, y + H))


def extend_top(crop, shift):
    """Move the photo down by `shift` and continue the top edge seamlessly: stretch+blur the first rows, then feather."""
    strip = crop.crop((0, 0, W, 40)).resize((W, shift), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))
    canvas = Image.new('RGB', (W, H))
    canvas.paste(strip, (0, 0)); canvas.paste(crop, (0, shift))
    # feather the join over 160px
    ramp = Image.linear_gradient('L').resize((W, 160)).rotate(0)
    mask = Image.new('L', (W, H), 0)
    mask.paste(255, (0, shift + 80, W, H))
    mask.paste(ramp, (0, shift - 80))
    shifted = Image.new('RGB', (W, H)); shifted.paste(crop, (0, shift))
    return Image.composite(shifted, canvas, mask)


def prep_slide1():
    crop = cover('14-IMG_8690.JPEG', (0.41, 0.5))
    base = extend_top(crop, 250)
    # logo behind the subject: faint mark, then the subject (head + body) is put back on top with a soft matte
    mark = Image.open(MARKPNG).convert('RGBA').resize((980, 980), Image.LANCZOS)
    a = mark.split()[3].point(lambda v: int(v * 0.30))
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lay.paste(Image.merge('RGBA', (*mark.split()[:3], a)), (110, 320))
    withlogo = Image.alpha_composite(base.convert('RGBA'), lay).convert('RGB')
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.ellipse((425, 610, 855, 1110), fill=255)
    d.polygon([(520, 1010), (770, 1010), (1010, 1230), (1080, 1920), (0, 1920), (50, 1230)], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(34))
    out = Image.composite(base, withlogo, m)
    p = os.path.join(HERE, 'img', 's1.png')
    dither(out).save(p)
    return p.replace('\\', '/')


def prep_plain(name, out, focus):
    p = os.path.join(HERE, 'img', out)
    dither(cover(name, focus)).save(p)
    return p.replace('\\', '/')


MARK_URL = 'file:///' + MARKPNG.replace('\\', '/')


def underline(w, sw=10):
    return (f'<svg width="{w}" height="26" viewBox="0 0 {w} 26" style="display:block">'
            f'<path d="M3 12 C {w*.25} 8, {w*.55} 14, {w-4} 9" fill="none" stroke="{RED}" stroke-width="{sw}" stroke-linecap="round"/></svg>')


CSS = f'''
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#000;font-family:Helvetica,Arial,sans-serif;color:{INK}}}
.bg{{position:absolute;inset:0;background-size:cover}}
.abs{{position:absolute}}
.label{{font-size:28px;letter-spacing:.14em;text-transform:uppercase;color:{MUTE};font-weight:700}}
'''


def page(body):
    return f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><body>{body}</body>'


def scene(img, top, mid, bot):
    return (f'<div class="bg" style="background-image:url(\'file:///{img}\')"></div>'
            f'<div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(11,12,13,{top}) 0%,rgba(11,12,13,{mid}) 45%,rgba(11,12,13,{bot}) 100%)"></div>')


def slide1():
    img = prep_slide1()
    body = scene(img, .12, .0, .3) + f'''
    <div class="abs" style="left:72px;top:300px;width:936px">
      <div style="font-size:54px;line-height:1.1;white-space:nowrap;letter-spacing:-1px">i've been working on this for</div>
      <div style="display:inline-block;margin:22px 0 2px -4px;background:{SILVER};color:{GRAPH};padding:14px 42px 44px;border-radius:26px;font-size:140px;line-height:1;font-weight:700;letter-spacing:-7px;white-space:nowrap">a whole year</div>
      <div style="font-size:140px;line-height:.92;font-weight:700;letter-spacing:-7px;margin-left:-6px">now.</div>
    </div>
    <div class="abs" style="left:72px;top:1210px;font-size:50px;line-height:1.22;letter-spacing:-1px">because everyone in this space<br>is stuck on <b>the same problem.</b></div>
    <div class="abs" style="left:300px;top:1334px;width:470px">{underline(470)}</div>'''
    return page(body)


def slide3():
    img = prep_plain('15-IMG_7708.jpg', 's3.png', (0.5, 0.5))
    steps = ['content.', 'traffic.', 'a page.', 'sales calls.', 'a team.', 'cash in the bank.']
    x0, dx, y0, dy, ph = 72, 54, 600, 130, 98
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
    body = scene(img, .5, .14, .62) + f'''
    <img class="abs" src="{MARK_URL}" style="left:330px;top:300px;width:1050px;opacity:.14">
    <div class="abs" style="left:72px;top:300px;font-size:104px;line-height:1;font-weight:700;letter-spacing:-4.5px">that's the<br>whole chain.</div>
    {''.join(parts)}
    <div class="abs" style="left:72px;top:1410px;width:940px;font-size:42px;line-height:1.28;letter-spacing:-.6px">
      most people have never run it.<br>some don't even know what a kpi is.<br><b>and that's fine. nobody teaches you this part.</b></div>'''
    return page(body)


def slide12():
    img = prep_plain('46-IMG_7278.JPEG', 's12.png', (0.5, 0.45))
    rows = ''
    for i, (lab, val, wd) in enumerate(SAMPLE):
        last = i == len(SAMPLE) - 1
        col = EMERALD if last else INK
        rows += (f'<div style="display:flex;align-items:baseline;justify-content:space-between;width:520px;padding:4px 0 4px;border-bottom:1px solid rgba(255,255,255,.16)">'
                 f'<span style="font-size:28px;color:{MUTE}">{lab}</span><span style="font-size:38px;font-weight:700;letter-spacing:-1.2px;color:{col}">{val}</span></div>'
                 f'<div style="height:4px;width:{int(520*wd)}px;background:{col};opacity:.9;border-radius:2px;margin:0 0 7px 0"></div>')
    body = scene(img, .55, .22, .66) + f'''
    <img class="abs" src="{MARK_URL}" style="left:-320px;top:1020px;width:980px;opacity:.12">
    <div class="abs" style="left:72px;top:256px;width:700px;font-size:44px;line-height:1.24;letter-spacing:-.8px">and every post is tracked.<br>who watched, who clicked,<br>who booked, who paid.</div>
    <div class="abs" style="left:72px;top:470px;width:600px;font-size:100px;line-height:1.02;font-weight:700;letter-spacing:-4.5px">"you never<br>post <span style="display:inline-block;background:{SILVER};color:{GRAPH};padding:0 22px 12px;border-radius:16px">blind</span><br>again."</div>
    <div class="abs" style="left:72px;top:800px;width:290px">{underline(290)}</div>
    <div class="abs" style="left:72px;top:846px;width:560px">
      <div class="label" style="margin-bottom:8px;font-size:23px;white-space:nowrap">tracked <span style="opacity:.6">· sample data</span></div>{rows}</div>
    <div class="abs" style="left:66px;top:1262px;width:960px">
      <div style="font-size:236px;line-height:.85;font-weight:700;letter-spacing:-13px;color:{EMERALD}">{CASH}</div>
      <div class="label" style="margin-top:22px">cash collected</div></div>'''
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

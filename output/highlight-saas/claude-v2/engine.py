"""Story engine v1: the reusable core. A slide is: photo spec + scrim + HTML body built from components.
Portable to the app: everything is plain Python/HTML/CSS, no design-tool dependency.
"""
import os, sys, subprocess, tempfile, time
from PIL import Image, ImageOps, ImageChops, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
UP = os.path.join(ROOT, 'brand', 'photos', 'uploaded')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
W, H = 1080, 1920
SILVER, INK, GRAPH, EMERALD, RED, MUTE = '#efeee9', '#f4f3ef', '#0b0c0d', '#5fd6a4', '#e5322d', '#a9aaae'
os.makedirs(os.path.join(HERE, 'img'), exist_ok=True)


# ------------------------------------------------------------------ photos
def find_photo(pid):
    for f in os.listdir(UP):
        if f.startswith(f'{pid}-'):
            return os.path.join(UP, f)
    raise FileNotFoundError(pid)


def dither(im, sigma=2.6):
    n = Image.effect_noise(im.size, sigma).convert('RGB')
    return ImageChops.add(im, n, scale=1, offset=-128)


def prep_photo(pid, out, focus=(0.5, 0.5), box=None, blur=0, zoom=1.0):
    """Natural exposure. Either cover-crop around `focus` (optionally zoomed in), or crop a 9:16 `box` (x0,y0,x1,y1 in original pixels)."""
    im = ImageOps.exif_transpose(Image.open(find_photo(pid))).convert('RGB')
    if box:
        im = im.crop(box).resize((W, H), Image.LANCZOS)
    else:
        s = max(W / im.width, H / im.height) * zoom
        im = im.resize((max(W, round(im.width * s)), max(H, round(im.height * s))), Image.LANCZOS)
        x = int((im.width - W) * focus[0]); y = int((im.height - H) * focus[1])
        im = im.crop((x, y, x + W, y + H))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    p = os.path.join(HERE, 'img', out)
    dither(im).save(p)
    return p.replace('\\', '/')


# ------------------------------------------------------------------ components
CSS = f'''
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#000;font-family:Helvetica,Arial,sans-serif;color:{INK}}}
.bg{{position:absolute;inset:0;background-size:cover}}
.abs{{position:absolute}}
.glow{{position:absolute;inset:0;background:
 radial-gradient(900px 700px at -8% 16%,rgba(138,75,63,.30),transparent 62%),
 radial-gradient(900px 800px at 108% 66%,rgba(77,63,104,.26),transparent 60%)}}
b{{font-weight:700}}
.label{{font-size:28px;letter-spacing:.14em;text-transform:uppercase;color:{MUTE};font-weight:700}}
'''


def page(body):
    return f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><body>{body}</body>'


def scene(img, top=.55, mid=.15, bot=.55):
    return (f'<div class="bg" style="background-image:url(\'file:///{img}\')"></div>'
            f'<div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(11,12,13,{top}) 0%,rgba(11,12,13,{mid}) 45%,rgba(11,12,13,{bot}) 100%)"></div>'
            '<div class="glow"></div>')


def ul(text, color=RED, sw=9):
    """Hand-drawn near-horizontal underline that always fits the phrase it wraps."""
    return (f'<span style="position:relative;display:inline-block;white-space:nowrap">{text}'
            f'<svg style="position:absolute;left:0;bottom:-12px;width:100%;height:20px" viewBox="0 0 100 20" preserveAspectRatio="none">'
            f'<path d="M1 11 C 25 7, 55 14, 99 9" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></span>')


def block(text, size, pad='10px 34px 30px', radius=24):
    """Silver emphasis block with graphite text."""
    return (f'<span style="display:inline-block;background:{SILVER};color:{GRAPH};padding:{pad};border-radius:{radius}px;'
            f'font-size:{size}px;line-height:1;font-weight:700;letter-spacing:{-size*0.045:.1f}px;white-space:nowrap">{text}</span>')


def at(top, inner, left=72, width=936, extra=''):
    return f'<div class="abs" style="left:{left}px;top:{top}px;width:{width}px;{extra}">{inner}</div>'


def p(text, size=44, weight=400, color=INK, lh=1.22, ls=-.8, mt=0):
    return f'<div style="font-size:{size}px;line-height:{lh};font-weight:{weight};letter-spacing:{ls}px;color:{color};margin-top:{mt}px">{text}</div>'


# ------------------------------------------------------------------ render
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
    print('rendered', out, flush=True)
    return out

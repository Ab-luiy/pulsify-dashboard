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


def safe_save(im, path, tries=6):
    """Windows under memory pressure sometimes refuses a file write; retry instead of crashing the build."""
    for k in range(tries):
        try:
            im.save(path)
            return
        except OSError:
            time.sleep(2 + k)
    im.save(path)


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
    safe_save(dither(im), p)
    return p.replace('\\', '/')


def prep_photo_extended(pid, out, shift, focus_x=0.5):
    """Zoom the photo out so its full height fits under `shift` extra pixels, then continue the top edge seamlessly
    (average of the photo's own top rows, cross-faded over 320px). Gives text room above a subject without a seam."""
    import numpy as np, cv2
    im = ImageOps.exif_transpose(Image.open(find_photo(pid))).convert('RGB')
    sc = max((H - shift) / im.height, W / im.width)
    im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    x = int((im.width - W) * focus_x)
    hh = min(im.height, H - shift)
    arr = np.asarray(im.crop((x, 0, x + W, hh))).astype(np.float32)
    row = arr[:24].mean(axis=0)
    row = cv2.GaussianBlur(row.reshape(1, W, 3), (0, 0), 70).reshape(W, 3)
    canvas = np.empty((H, W, 3), np.float32)
    canvas[:] = row[None]
    canvas[shift:shift + hh] = arr
    y = np.arange(H, dtype=np.float32)
    t = np.clip((y - shift) / 320.0, 0, 1)
    t = (t * t * (3 - 2 * t))[:, None, None]
    flat = np.empty_like(canvas); flat[:] = row[None]
    canvas = flat * (1 - t) + canvas * t
    out_im = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
    pth = os.path.join(HERE, 'img', out)
    safe_save(dither(out_im), pth)
    return pth.replace('\\', '/')


def prep_photo_full(pid, out, align='bottom', blur=0):
    """Show the WHOLE photo, uncropped, fitted to the frame. Leftover space is a blurred, darkened, enlarged copy of the same photo.
    Only the 28px where the photo meets that backdrop is feathered, so there is no visible edge."""
    import numpy as np
    im = ImageOps.exif_transpose(Image.open(find_photo(pid))).convert('RGB')
    sc = min(W / im.width, H / im.height)
    pw, ph = round(im.width * sc), round(im.height * sc)
    fg = im.resize((pw, ph), Image.LANCZOS)
    if blur:
        fg = fg.filter(ImageFilter.GaussianBlur(blur))
    if pw >= W - 1 and ph >= H - 1:
        canvas = fg.resize((W, H), Image.LANCZOS)
    else:
        cs = max(W / im.width, H / im.height)
        bg = im.resize((round(im.width * cs), round(im.height * cs)), Image.LANCZOS)
        bx = (bg.width - W) // 2; by = (bg.height - H) // 2
        bg = bg.crop((bx, by, bx + W, by + H)).filter(ImageFilter.GaussianBlur(46))
        bg = ImageChops.multiply(bg, Image.new('RGB', (W, H), (150, 150, 150)))
        x = (W - pw) // 2
        y = {'bottom': H - ph, 'top': 0, 'center': (H - ph) // 2}[align]
        m = np.ones((ph, pw), np.float32)
        ramp = np.linspace(0, 1, 60, dtype=np.float32)
        # top edge needs no feather: the mirrored continuation above matches the photo's first row exactly
        if y + ph < H:
            m[-60:, :] *= ramp[::-1][:, None]
        if x > 0:
            m[:, :28] *= ramp[None, :]; m[:, -28:] *= ramp[::-1][None, :]
        mask = Image.fromarray((m * 255).astype(np.uint8))
        canvas = bg.copy()
        if y > 0:                                        # continue the photo upward by mirroring its own top, blurred: colours meet exactly
            rh = min(y, ph)
            base_r = fg.crop((0, 0, pw, rh)).transpose(Image.FLIP_TOP_BOTTOM)
            levels = [0, 6, 14, 30]                          # progressive blur: sharp at the join, softer the further up it goes
            stack = [np.asarray(base_r if r == 0 else base_r.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) for r in levels]
            dist = (rh - 1 - np.arange(rh)).astype(np.float32) / max(1, rh - 1) * (len(levels) - 1)
            acc = np.zeros_like(stack[0])
            for i, arr in enumerate(stack):
                wgt = np.clip(1 - np.abs(dist - i), 0, 1)[:, None, None]
                acc += arr * wgt
            refl = Image.fromarray(np.clip(acc, 0, 255).astype(np.uint8))
            canvas.paste(refl, (x, y - rh))
        canvas.paste(fg, (x, y), mask)
    pth = os.path.join(HERE, 'img', out)
    safe_save(dither(canvas), pth)
    return pth.replace('\\', '/')


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

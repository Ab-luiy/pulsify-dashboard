"""Story engine core: brand tokens, photo prep, copy markup, page shell, and the headless-Chrome render.

A sequence is data (spec JSON) + a brand (tokens JSON). Slide types live in templates.py. build.py runs a spec.
Nothing here is specific to Pulsify: change the brand file and every slide type restyles.
"""
import html, json, os, re, shutil, subprocess, tempfile, time
from string import Template
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
CHROME = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')

# Fonts the render service may use. A brand picks a key; unknown keys fall back to sans.
FONTS = {
    'helvetica': 'Helvetica, Arial, sans-serif',
    'arial': 'Arial, Helvetica, sans-serif',
    'segoe': '"Segoe UI", Arial, sans-serif',
    'georgia': 'Georgia, "Times New Roman", serif',
    'impact': 'Impact, "Arial Narrow Bold", sans-serif',
}


# ------------------------------------------------------------------ brand
def load_brand(path):
    b = json.load(open(path, encoding='utf-8'))
    b['_dir'] = os.path.dirname(os.path.abspath(path))
    c = b['colors']
    b.setdefault('emphasis', {})
    e = b['emphasis']
    e.setdefault('underline', {'on': True, 'color': 'accent'})
    e.setdefault('box', {'on': True})
    e.setdefault('gradient', {'on': False, 'stops': [c['accent'], c['accent']]})
    b.setdefault('type', {'weight': 700, 'tracking': -0.045, 'case': 'as-written'})
    b.setdefault('logo', {'path': None, 'placement': 'none'})
    b.setdefault('glow', True)
    return b


def col(b, key):
    return b['colors'].get(key, key)


def font(b, which='sans'):
    return FONTS.get(b.get('font', {}).get(which, 'helvetica' if which == 'sans' else 'georgia'), FONTS['helvetica'])


# ------------------------------------------------------------------ copy markup
# *word* emphasis (underline, or accent colour when underlines are off)
# [word] marker box with an accent word
# {word} gradient label (solid accent when gradients are off)
def strip_marks(s):
    return re.sub(r'[*\[\]{}]', '', s)


def fmt(text, b):
    t = html.escape(text, quote=False)
    e = b['emphasis']
    acc, mute = col(b, 'accent'), col(b, 'mute')
    ul_col = col(b, e['underline'].get('color', 'accent'))

    def underline(m):
        w = m.group(1)
        if not e['underline']['on']:
            return f'<span style="color:{acc}">{w}</span>'
        return (f'<span style="position:relative;display:inline-block;white-space:nowrap">{w}'
                f'<svg style="position:absolute;left:0;bottom:-.12em;width:100%;height:.2em" viewBox="0 0 100 20" preserveAspectRatio="none">'
                f'<path d="M1 11 C 25 7, 55 14, 99 9" fill="none" stroke="{ul_col}" stroke-width="11" stroke-linecap="round"/></svg></span>')

    def box(m):
        w = m.group(1)
        if not e['box']['on']:
            return f'<span style="color:{acc}">{w}</span>'
        return (f'<span style="display:inline-block;background:{col(b, "bg")};border:3px solid rgba(255,255,255,.14);'
                f'border-radius:.22em;padding:0 .26em .16em;color:{acc};white-space:nowrap">{w}</span>')

    def grad(m):
        w = m.group(1)
        g = e['gradient']
        if not g['on']:
            return f'<span style="color:{acc}">{w}</span>'
        s = g['stops']
        bg = f'linear-gradient(100deg,{s[0]} 0%,{s[len(s)//2]} 55%,{s[-1]} 100%)'
        return (f'<span style="display:inline-block;background:{bg};color:#fff;border-radius:.22em;'
                f'padding:0 .26em .16em;white-space:nowrap">{w}</span>')

    t = re.sub(r'\*(.+?)\*', underline, t)
    t = re.sub(r'\[(.+?)\]', box, t)
    t = re.sub(r'\{(.+?)\}', grad, t)
    return t


# ------------------------------------------------------------------ photos
def prep_photo(src, out_dir, name, focus=(0.5, 0.5), mode='fresh', zoom=1.0):
    """Natural cover crop to 1080x1920 around `focus`. mode 'carry' = the reuse treatment: blurred and dimmed.
    No mirrored fill, no stretch. Returns an absolute file path for CSS."""
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    s = max(W / im.width, H / im.height) * zoom
    im = im.resize((max(W, round(im.width * s)), max(H, round(im.height * s))), Image.LANCZOS)
    x = int((im.width - W) * focus[0]); y = int((im.height - H) * focus[1])
    im = im.crop((x, y, x + W, y + H))
    if mode == 'carry':
        im = ImageEnhance.Brightness(im.filter(ImageFilter.GaussianBlur(16))).enhance(0.5)
    p = os.path.join(out_dir, name)
    im.save(p)
    return p.replace('\\', '/')


def glyph_path(b, key):
    for base in (os.path.join(b['_dir'], '..', 'glyphs'), os.path.join(HERE, 'glyphs')):
        for ext in ('svg', 'png'):
            p = os.path.abspath(os.path.join(base, f'{key}.{ext}'))
            if os.path.exists(p):
                return p.replace('\\', '/')
    raise FileNotFoundError(f'glyph {key}: add it to tools/story_engine/glyphs (real brand marks only)')


# ------------------------------------------------------------------ page shell
PAGE = Template('''<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:$bg;font-family:$sans;color:$ink}
.abs{position:absolute}
.glow{position:absolute;inset:0;background:radial-gradient(760px 560px at 50% 18%,$glow,transparent 65%)}
.bgimg{position:absolute;inset:0;background-size:cover;background-position:center}
.scrim{position:absolute;inset:0}
.h{font-weight:$weight;letter-spacing:${tracking}em;line-height:1.0;white-space:nowrap}
.card{background:$card;border:2px solid rgba(255,255,255,.12);border-radius:40px;box-shadow:0 30px 80px rgba(0,0,0,.55)}
.tile{width:116px;height:116px;border-radius:30px;background:$silver;display:grid;place-items:center;box-shadow:0 16px 36px rgba(0,0,0,.5)}
.tile img{width:60px;height:60px}
.pill{display:inline-block;border-radius:18px;padding:10px 26px 16px;font-weight:700;letter-spacing:-.02em}
.fit{width:100%}
</style><body>$body
<script>
document.fonts.ready.then(function(){
  document.querySelectorAll('.fitbox').forEach(function(box){
    var el=box.querySelector('.fit'); var s=parseFloat(box.dataset.max), min=parseFloat(box.dataset.min);
    el.style.fontSize=s+'px';
    while(el.offsetHeight>box.clientHeight && s>min){ s-=2; el.style.fontSize=s+'px'; }
  });
});
</script></body>''')


def page(b, body, photo=None, scrim=0.45):
    c = b['colors']
    glow = 'rgba(255,255,255,0)'
    if b.get('glow'):
        h = c['accent'].lstrip('#')
        r, g, bl = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        glow = f'rgba({r},{g},{bl},.20)'
    layers = ''
    if photo:
        layers += f'<div class="bgimg" style="background-image:url(\'file:///{photo}\')"></div>'
        layers += (f'<div class="scrim" style="background:linear-gradient(180deg,rgba(5,5,6,{scrim+.2}) 0%,rgba(5,5,6,{scrim-.2}) 45%,rgba(5,5,6,{scrim+.25}) 100%)"></div>')
    elif b.get('glow'):
        layers += '<div class="glow"></div>'
    return PAGE.substitute(bg=c['bg'], sans=font(b), ink=c['ink'], glow=glow, weight=b['type']['weight'],
                           tracking=b['type']['tracking'], card=c['card'], silver=c['silver'], body=layers + body)


# ------------------------------------------------------------------ render
def render(html_text, out_png, work_dir):
    hp = os.path.join(work_dir, os.path.basename(out_png) + '.html')
    open(hp, 'w', encoding='utf-8').write(html_text)
    for _ in range(4):
        prof = tempfile.mkdtemp(prefix='chr')
        try:
            r = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                                f'--user-data-dir={prof}', '--virtual-time-budget=4000', f'--screenshot={out_png}',
                                f'--window-size={W},{H}', 'file:///' + hp.replace('\\', '/')],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
            if r.returncode == 0 and os.path.exists(out_png) and time.time() - os.path.getmtime(out_png) < 120:
                shutil.rmtree(prof, ignore_errors=True)
                return out_png
        except subprocess.TimeoutExpired:
            pass
        shutil.rmtree(prof, ignore_errors=True)
        time.sleep(2)
    raise RuntimeError('render failed: ' + out_png)

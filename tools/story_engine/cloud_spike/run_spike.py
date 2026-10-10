"""#53 spike: render real story-engine slides on Cloudflare Browser Run with candidate fonts, and compare to the local render.

python run_spike.py   (from tools/story_engine/cloud_spike)
Writes ../../../output/story-engine-samples/cloud-spike/*
"""
import json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import engine
from templates import TYPES
from cf_render import render as cf_render
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SE = os.path.abspath(os.path.join(HERE, '..'))
OUT = os.path.abspath(os.path.join(SE, '..', '..', 'output', 'story-engine-samples', 'cloud-spike'))
os.makedirs(OUT, exist_ok=True)
work = os.path.join(OUT, '_work'); os.makedirs(work, exist_ok=True)

spec = json.load(open(os.path.join(SE, 'examples', 'pulsify-designed.json'), encoding='utf-8'))
b = engine.load_brand(os.path.join(SE, 'brands', 'pulsify.json'))

SAAS = r'C:\Users\Abdullah\Desktop\pulsify-saas'
FONTS = {
    'inter': ('Inter', os.path.join(SAAS, 'src', 'fonts', 'inter-latin.woff2')),
    'geist': ('Geist', os.path.join(SAAS, 'node_modules', 'next', 'dist', 'next-devtools', 'server', 'font', 'geist-latin.woff2')),
}


def slide_html(i):
    s = spec['slides'][i]
    photo = None
    if s.get('photo'):
        ph = s['photo']
        photo = engine.prep_photo(os.path.join(SE, 'examples', ph['src']), work, f'p{i + 1:02d}.png',
                                  tuple(ph.get('focus', (0.5, 0.5))), ph.get('mode', 'fresh'))
    return engine.page(b, TYPES[s['type']](s, b, i), photo, s.get('scrim', 0.45))


def force_font(html, fam):
    return html.replace('</style>', f'html,body,*{{font-family:"{fam}",sans-serif !important}}</style>', 1)


rows = {}
timings = []
for i in (2, 5):  # slide 3 (cards + glyphs) and slide 6 (photo + inbox card)
    html = slide_html(i)
    n = f'{i + 1:02d}'
    out = os.path.join(OUT, f'{n}-local-helvetica.png')
    engine.render(html, out, work)
    ims = [('Local, Helvetica (reference)', out)]
    out = os.path.join(OUT, f'{n}-cloud-default.png')
    secs, sent, got = cf_render(html, out)
    timings.append((n, 'cloud default font', secs, sent)); ims.append(('Cloudflare default fallback', out))
    for key, (fam, path) in FONTS.items():
        out = os.path.join(OUT, f'{n}-cloud-{key}.png')
        secs, sent, got = cf_render(force_font(html, fam), out, {fam: path})
        timings.append((n, key, secs, sent)); ims.append((fam, out))
    rows[n] = ims

# side-by-side sheets
for n, ims in rows.items():
    w, h = 405, 720
    sh = Image.new('RGB', (w * len(ims), h + 50), (24, 24, 24))
    d = ImageDraw.Draw(sh)
    for k, (label, p) in enumerate(ims):
        sh.paste(Image.open(p).convert('RGB').resize((w, h)), (k * w, 50))
        d.text((k * w + 12, 16), label, fill=(240, 240, 240))
    sh.save(os.path.join(OUT, f'fonts-slide-{n}.jpg'), quality=92)

# whole sequence on Cloudflare with Inter: timing
t0 = time.time(); sizes = []
for i in range(len(spec['slides'])):
    out = os.path.join(OUT, f'seq-{i + 1:02d}.png')
    secs, sent, got = cf_render(force_font(slide_html(i), 'Inter'), out, {'Inter': FONTS['inter'][1]})
    sizes.append(sent)
total = time.time() - t0
print(json.dumps({'per_render': [(a, b_, round(c, 1), round(d / 1e6, 2)) for a, b_, c, d in timings],
                  'sequence_7_slides_sec': round(total, 1), 'request_mb_max': round(max(sizes) / 1e6, 2)}, indent=1))

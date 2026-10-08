from pathlib import Path
import base64, hashlib, json, re, shutil, urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ASSETS = HERE / 'assets'
ASSETS.mkdir(parents=True, exist_ok=True)

def copy(source, name):
    source = Path(source)
    shutil.copy2(source, ASSETS / name)
    return {'source': str(source), 'file': 'assets/' + name,
            'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}

assets = [
    copy(ROOT / 'brand/photos/uploaded/20-IMG_8165.jpg', 'cafe.jpg'),
    copy(ROOT / 'raw-sources/inspiration/carousels/carousel kobenguyen/#1/4.jpg', 'reference.jpg'),
    copy(ROOT / 'brand/logo/variations/05-lockup-white.svg', 'pulsify.svg'),
    copy('C:/Windows/Fonts/arial.ttf', 'arial.ttf'),
    copy('C:/Windows/Fonts/arialbd.ttf', 'arial-bold.ttf'),
]
for name in ['instagram', 'youtube']:
    url = f'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/{name}.svg'
    dest = ASSETS / (name + '.svg')
    if not dest.exists():
        dest.write_bytes(urllib.request.urlopen(url, timeout=25).read())
    assets.append({'source': url, 'file': 'assets/' + name + '.svg',
                   'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})

channels = [
    {'id': 'instagram', 'name': 'Instagram', 'center': 218, 'color': '#ac86ef',
     'light': '#c8a7f9', 'dark': '#593980', 'stages': ['Discover', 'Profile', 'DM'],
     'description': ['Make your profile', 'worth exploring.']},
    {'id': 'youtube', 'name': 'YouTube', 'center': 540, 'color': '#e94c43',
     'light': '#f58175', 'dark': '#8e2929', 'stages': ['Find', 'Learn', 'Apply'],
     'description': ['Teach the problem', 'you help solve.']},
    {'id': 'email', 'name': 'Email', 'center': 862, 'color': '#5bafc8',
     'light': '#99d6df', 'dark': '#296073', 'stages': ['Read', 'Trust', 'Reply'],
     'description': ['Keep the conversation', 'going.']},
]

def glyph(name, x, y):
    if name == 'email':
        return f'<g id="email-symbol" transform="translate({x-37} {y-29})" fill="none" stroke="#f8f5f0" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><rect width="74" height="58" rx="9"/><path d="M4 7 37 31 70 7"/></g>'
    text = (ASSETS / (name + '.svg')).read_text()
    path = re.search(r'<path d="([^"]+)"', text).group(1)
    return f'<g id="{name}-glyph" transform="translate({x-38} {y-38}) scale(3.166667)" fill="#f8f5f0"><path d="{path}"/></g>'

def funnel(c):
    # Open ellipse + detached tapered bands. Width communicates stage order, not data.
    k, x = c['id'], c['center']
    return f'''
    <linearGradient id="{k}-body" x1="0" x2="1"><stop stop-color="{c['dark']}"/><stop offset=".46" stop-color="{c['color']}"/><stop offset="1" stop-color="{c['dark']}"/></linearGradient>
    <linearGradient id="{k}-rim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{c['light']}"/><stop offset="1" stop-color="{c['color']}"/></linearGradient>
    <g id="{k}-funnel" transform="translate({x-126} 792)">
      <g id="{k}-discovery">
        <path d="M0 27 Q126 79 252 27 L211 131 Q126 153 41 131 Z" fill="url(#{k}-body)"/>
        <ellipse cx="126" cy="27" rx="126" ry="27" fill="url(#{k}-rim)"/>
        <ellipse cx="126" cy="26" rx="110" ry="17" fill="{c['dark']}"/>
        <path d="M5 25 Q126 75 247 25" fill="none" stroke="{c['light']}" stroke-width="2" opacity=".75"/>
        <text x="126" y="101" class="stage-label" font-size="31">{c['stages'][0]}</text>
      </g>
      <g id="{k}-consideration">
        <path d="M46 148 Q126 168 206 148 L170 214 Q126 229 82 214 Z" fill="url(#{k}-body)"/>
        <path d="M46 148 Q126 163 206 148" fill="none" stroke="{c['light']}" stroke-width="2" opacity=".8"/>
        <text x="126" y="194" class="stage-label" font-size="30">{c['stages'][1]}</text>
      </g>
      <g id="{k}-action">
        <path d="M83 231 Q126 241 169 231 L163 289 Q126 305 89 289 Z" fill="url(#{k}-body)"/>
        <path d="M83 231 Q126 240 169 231" fill="none" stroke="{c['light']}" stroke-width="2" opacity=".8"/>
        <text x="126" y="270" class="stage-label" font-size="27">{c['stages'][2]}</text>
      </g>
    </g>'''

svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-labelledby="diagram-title diagram-desc">
<title id="diagram-title">Three channels with distinct paths to the offer</title><desc id="diagram-desc">Instagram discover, profile, DM. YouTube find, learn, apply. Email read, trust, reply. A conceptual pathway, without conversion figures.</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 8 5 1 9" fill="none" stroke="#e9e4da" stroke-width="1.6" stroke-linejoin="round"/></marker></defs>
<style>.stage-label{font-family:ReferenceArial,Arial,sans-serif;font-weight:700;fill:#fff9f3;text-anchor:middle;letter-spacing:-.4px}.channel{font-family:ReferenceArial,Arial,sans-serif;font-weight:700;font-size:43px;fill:#fff9f3;text-anchor:middle;letter-spacing:-1.2px}.desc{font-family:ReferenceArial,Arial,sans-serif;font-size:29px;fill:#e1ddd6;text-anchor:middle;letter-spacing:-.3px}</style>
<g id="branch-connectors" fill="none" stroke="#e9e4da" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".85">
<path d="M540 407 V444 Q540 469 515 469 H243 Q218 469 218 494 V519" marker-end="url(#arrow)"/>
<path d="M540 407 V519" marker-end="url(#arrow)"/>
<path d="M540 407 V444 Q540 469 565 469 H837 Q862 469 862 494 V519" marker-end="url(#arrow)"/>
</g>'''
for c in channels:
    x = c['center']
    svg += glyph(c['id'], x, 568)
    svg += f'<text class="channel" x="{x}" y="651">{c["name"]}</text>'
    svg += '<text class="desc" x="%s" y="710">%s</text><text class="desc" x="%s" y="746">%s</text>' % (x, c['description'][0], x, c['description'][1])
    svg += funnel(c)
svg += '</svg>'
embedded_fonts = ''.join('@font-face{font-family:ReferenceArial;src:url(data:font/ttf;base64,' + base64.b64encode((ASSETS / file).read_bytes()).decode() + ') format("truetype");font-weight:' + str(weight) + ';}' for file, weight in [('arial.ttf',400),('arial-bold.ttf',700)])
svg = svg.replace('<style>', '<style>' + embedded_fonts, 1)
# Gradients are scoped inside component groups; SVG resolves IDs globally.
(HERE / 'elements.svg').write_text(svg, encoding='utf-8')
fonts = '''@font-face{font-family:ReferenceArial;src:url(assets/arial.ttf) format('truetype');font-weight:400}@font-face{font-family:ReferenceArial;src:url(assets/arial-bold.ttf) format('truetype');font-weight:700}'''
html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Give every channel a clear job</title><style>{fonts}
*{{box-sizing:border-box}}html,body{{margin:0;width:1080px;height:1350px;overflow:hidden}}body{{background:#151313;color:#faf7f1;font-family:ReferenceArial,Arial,sans-serif}}
.photo{{position:absolute;width:1080px;height:1350px;object-fit:cover;object-position:50% 50%}}
.top-scrim{{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.72),rgba(0,0,0,.38) 24%,transparent 40%)}}
.graphic-scrim{{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 31%,rgba(0,0,0,.37) 43%,rgba(0,0,0,.53) 72%,rgba(0,0,0,.7) 100%)}}
.brand{{position:absolute;left:65px;top:53px;width:139px;height:40px}}.ordinal{{position:absolute;right:65px;top:59px;font-size:24px;font-weight:700;color:#d3cec6}}
h1{{position:absolute;left:65px;top:128px;margin:0;font-size:80px;line-height:1.02;font-weight:700;letter-spacing:-3.2px}}.highlight{{display:inline-block;background:#d83c36;border-radius:9px;padding:4px 15px 8px;margin-top:9px;margin-left:-15px}}
.intro{{position:absolute;left:65px;top:337px;margin:0;font-size:33px;line-height:1.25;letter-spacing:-.4px}}
.diagram{{position:absolute;inset:0;width:1080px;height:1350px}}.close{{position:absolute;left:65px;top:1155px;margin:0;font-size:42px;font-weight:700;line-height:1.13;letter-spacing:-1px}}.footer{{position:absolute;left:65px;bottom:49px;font-size:22px;color:#c8c3ba;letter-spacing:.4px}}
</style></head><body>
<img class="photo" src="assets/cafe.jpg" alt="A real cafe from the founder's photo library">
<div class="top-scrim"></div><div class="graphic-scrim"></div>
<img class="brand" src="assets/pulsify.svg" alt="Pulsify"><div class="ordinal critical">[01]</div>
<h1 class="critical">Give every channel<br><span class="highlight">a clear job.</span></h1>
<p class="intro critical">One offer. Different ways to reach it.</p>
<div class="diagram">{svg}</div>
<p class="close critical">Attention needs a path<br>to your offer.</p>
<div class="footer critical">CONCEPTUAL CONTENT PATH</div>
</body></html>'''
(HERE / 'slide.html').write_text(html, encoding='utf-8')
(HERE / 'scene.json').write_text(json.dumps({
    'mode': 'client-production adaptation, review draft', 'format': [1080,1350],
    'profile_version': '1.0.0', 'family': 'red-case-system', 'recipe':'three-platform-funnels',
    'anchor':'K1-4', 'photo_id':20, 'font':'Arial registered from Windows; source font unknown',
    'channels':channels, 'data_status':'conceptual, not measured conversion rates',
    'assets':assets, 'deviations':['Original airport image replaced with own cafe photo',
       'Fresh shorter Pulsify copy; no borrowed result claims',
       'Generic email channel replaces Kit brand', 'Funnel bands contain explicit stage labels',
       'Photo remains naturally cropped; local scrims support text, no blur/mirror/mask'],
    'photo_sync':'Blocked with Cloudflare7403; existing local photo used'},indent=2),encoding='utf-8')
(HERE / 'review.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reference element trial</title><style>body{margin:0;background:#141414;color:#eee;font-family:Arial,sans-serif;padding:28px}h1{font-size:24px}p{max-width:850px;line-height:1.5;color:#bbb}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:1300px}figure{margin:0}img{width:100%;height:auto}figcaption{padding:12px 0}a{color:#eee}@media(max-width:600px){.pair{grid-template-columns:1fr}}</style><h1>One slide using reference-elements</h1><p>K1-4 structure adapted with our real cafe photo, fresh copy, vector funnel bands and channel routes. This is a creative trial, not a performance claim. Arial approximates the reference typography.</p><div class="pair"><figure><figcaption>Source: K1-4, stored Kobey reference</figcaption><img src="assets/reference.jpg" alt="Original reference"></figure><figure><figcaption>Pulsify adaptation: 1080 x 1350</figcaption><img src="slide.png" alt="Adapted slide"></figure></div><p><a href="slide.html">Editable HTML</a> · <a href="elements.svg">Editable vector elements</a> · <a href="scene.json">Construction record</a></p></html>''',encoding='utf-8')
print('Built slide.html, elements.svg, scene.json and review.html')

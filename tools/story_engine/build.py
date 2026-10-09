"""python build.py <spec.json> <out_dir> [brand.json]

Renders every slide of a spec to NN.png plus sheet.jpg. A spec names its brand, tier and slides. The brand arg overrides the
spec's brand so the same copy can be restyled in one command.

Photo reuse is declared per slide: "photo": {"src": "...", "mode": "fresh" | "carry", "focus": [0.5, 0.5]}.
Use the same src on consecutive slides, with "carry" on the repeat, instead of a new photo per slide.
Refuses to render unless the spec's copy status is "approved" (copy-first gate); pass --draft to override for previews.
"""
import json, os, sys
from PIL import Image
import engine
from templates import TYPES


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    draft = '--draft' in sys.argv
    spec_path, out_dir = args[0], os.path.abspath(args[1])
    spec = json.load(open(spec_path, encoding='utf-8'))
    base = os.path.dirname(os.path.abspath(spec_path))
    brand_path = args[2] if len(args) > 2 else os.path.join(base, spec['brand'])
    b = engine.load_brand(brand_path)
    if spec.get('copy_status') != 'approved' and not draft:
        sys.exit('copy_status is not "approved": copy is locked before design. Use --draft for a preview.')
    os.makedirs(out_dir, exist_ok=True)
    work = os.path.join(out_dir, '_work'); os.makedirs(work, exist_ok=True)
    outs = []
    for i, s in enumerate(spec['slides']):
        photo = None
        if s.get('photo'):
            ph = s['photo']
            src = ph['src'] if os.path.isabs(ph['src']) else os.path.join(base, ph['src'])
            photo = engine.prep_photo(src, work, f'photo_{i + 1:02d}.png', tuple(ph.get('focus', (0.5, 0.5))), ph.get('mode', 'fresh'), ph.get('zoom', 1.0))
        body = TYPES[s['type']](s, b, i)
        out = os.path.join(out_dir, f'{i + 1:02d}.png')
        engine.render(engine.page(b, body, photo, s.get('scrim', 0.45)), out, work)
        outs.append(out)
        print('slide', i + 1, s['type'], flush=True)
    w, h = 270, 480
    cols = min(7, len(outs)); rows = (len(outs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * h), (30, 30, 30))
    for k, p in enumerate(outs):
        sheet.paste(Image.open(p).convert('RGB').resize((w, h)), ((k % cols) * w, (k // cols) * h))
    sheet.save(os.path.join(out_dir, 'sheet.jpg'), quality=90)
    print('done', out_dir)


if __name__ == '__main__':
    main()

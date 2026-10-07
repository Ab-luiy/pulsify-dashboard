"""Slide 1 with the glowing white logo (variant C) truly behind the subject, using the GrabCut matte.
Also re-renders slides 3 and 12 without the faint background logo (logo appears on slide 1 and the video slide only)."""
import os, re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import build5 as b

W, H = b.W, b.H


def bg1():
    base = b.extend_top(b.cover('14-IMG_8690.JPEG', (0.41, 0.5)), 250)
    m = Image.open(os.path.join(b.HERE, 'img', 'matte1.png')).convert('L')
    d = ImageDraw.Draw(m)
    m = m.filter(ImageFilter.GaussianBlur(1.4))

    flat = Image.open(b.MARKPNG).convert('RGBA').resize((980, 980), Image.LANCZOS)
    a = Image.new('L', (W, H), 0)
    a.paste(flat.split()[3], (200, 350))
    bloom_a = a.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * .75))
    white = Image.new('L', (W, H), 255)
    bloom = Image.merge('RGBA', (white, white, white, bloom_a))
    sharp = Image.merge('RGBA', (white, white, white, a.point(lambda v: int(v * .34))))
    warm = Image.new('RGB', (W, H), (150, 96, 78))
    wa = a.filter(ImageFilter.GaussianBlur(60)).point(lambda v: int(v * .5))
    scene = ImageChops.screen(base, ImageChops.multiply(warm, Image.merge('RGB', (wa, wa, wa))))
    scene = Image.alpha_composite(Image.alpha_composite(scene.convert('RGBA'), bloom), sharp).convert('RGB')
    out = Image.composite(base, scene, m)               # subject in front, logo behind
    p = os.path.join(b.HERE, 'img', 's1.png')
    b.dither(out).save(p)
    return p.replace('\\', '/')


if __name__ == '__main__':
    b.prep_slide1 = bg1
    b.render('01', b.slide1())
    import sys; sys.exit(0)
    # drop the faint background logo from 3 and 12
    src = open(os.path.join(b.HERE, 'build5.py'), encoding='utf-8').read()
    src = re.sub(r'\n\s*<img class="abs" src="\{MARK_URL\}"[^\n]*', '', src)
    open(os.path.join(b.HERE, 'build5.py'), 'w', encoding='utf-8').write(src)
    import importlib; importlib.reload(b)
    b.render('03', b.slide3()); b.render('12', b.slide12())
    sheet = Image.new('RGB', (W * 3 // 2 + 40, H // 2), (20, 20, 20))
    for i, n in enumerate(['01', '03', '12']):
        sheet.paste(Image.open(os.path.join(b.HERE, n + '.png')).convert('RGB').resize((W // 2, H // 2)), (i * (W // 2 + 20), 0))
    sheet.save(os.path.join(b.HERE, 'sheet.jpg'), quality=90)
    print('ok')

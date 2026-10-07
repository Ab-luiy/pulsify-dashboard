"""Three ways the logo can sit behind the subject on slide 1 (photo only, no text). Output: logo-variants.jpg"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageEnhance
import build5 as b

W, H = b.W, b.H
base = b.extend_top(b.cover('14-IMG_8690.JPEG', (0.41, 0.5)), 250)

# soft matte: head + body in front of the logo
m = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(m)
d.ellipse((425, 610, 855, 1110), fill=255)
d.polygon([(520, 1010), (770, 1010), (1010, 1230), (1080, 1920), (0, 1920), (50, 1230)], fill=255)
matte = m.filter(ImageFilter.GaussianBlur(34))

flat = Image.open(b.MARKPNG).convert('RGBA')          # white flat mark, transparent
coin = Image.open(os.path.join(b.ROOT, 'brand', 'logo', 'coin-master-3d.png')).convert('RGBA')


def place(img, size, pos):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lay.paste(img.resize((size, size), Image.LANCZOS), pos)
    return lay


def finish(under, over_base=None):
    return Image.composite(base, under.convert('RGB'), matte)


# A: the 3D coin, rim-lit by a warm backlight, slightly out of focus (depth of field)
glow = Image.new('RGB', (W, H), (0, 0, 0))
ImageDraw.Draw(glow).ellipse((120, 330, 1040, 1250), fill=(120, 78, 64))
glow = glow.filter(ImageFilter.GaussianBlur(120))
a_base = ImageChops.screen(base, glow)
c = place(coin, 960, (60, 330)).filter(ImageFilter.GaussianBlur(3.2))
A = Image.composite(base, Image.alpha_composite(a_base.convert('RGBA'), c).convert('RGB'), matte)

# B: engraved into the wall (relief lighting from the mark's shape, no extra colour)
alpha = place(flat, 980, (110, 320)).split()[3].filter(ImageFilter.GaussianBlur(2.2))
relief = alpha.filter(ImageFilter.EMBOSS).convert('RGB')                      # grey 128 = flat
lit = ImageChops.add(base, relief, scale=1, offset=-128)
lit = ImageChops.add(lit, relief, scale=1, offset=-128)                        # double strength
lit = ImageChops.subtract(lit, Image.merge('RGB', (alpha.point(lambda v: int(v * .12)),) * 3))  # recess darkens
B = Image.composite(base, lit, matte)

# C: light source: the mark glows like a lit sign behind him (bloom + core)
core = place(flat, 980, (110, 320))
a2 = core.split()[3]
bloom = Image.merge('RGBA', (*([a2.point(lambda v: 255)] * 3), a2.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * .75))))
sharp = Image.merge('RGBA', (*([a2.point(lambda v: 255)] * 3), a2.point(lambda v: int(v * .34))))
warm = Image.new('RGB', (W, H), (150, 96, 78))
cc = ImageChops.screen(base, ImageChops.multiply(warm, Image.merge('RGB', (a2.filter(ImageFilter.GaussianBlur(60)).point(lambda v: int(v * .5)),) * 3)))
C = Image.alpha_composite(Image.alpha_composite(cc.convert('RGBA'), bloom), sharp).convert('RGB')
C = Image.composite(base, C, matte)

sheet = Image.new('RGB', (3 * (W // 2) + 40, H // 2), (18, 18, 18))
for i, im in enumerate([A, B, C]):
    sheet.paste(b.dither(im).resize((W // 2, H // 2), Image.LANCZOS), (i * (W // 2 + 20), 0))
sheet.save(os.path.join(b.HERE, 'logo-variants.jpg'), quality=92)
for n, im in zip('ABC', [A, B, C]):
    b.dither(im).save(os.path.join(b.HERE, 'img', f'logo-var-{n}.png'))
print('ok')

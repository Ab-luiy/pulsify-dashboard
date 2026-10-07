import os, re
here = os.path.dirname(os.path.abspath(__file__))

# ---- engine: prep_photo_full (whole photo, never cropped; blurred copy of the same photo fills the rest)
ep = os.path.join(here, 'engine.py')
e = open(ep, encoding='utf-8').read()
if 'def prep_photo_full' not in e:
    e = e.replace("# ------------------------------------------------------------------ components", '''def prep_photo_full(pid, out, align='bottom', blur=0):
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
        ramp = np.linspace(0, 1, 28, dtype=np.float32)
        if y > 0:
            m[:28, :] *= ramp[:, None]
        if y + ph < H:
            m[-28:, :] *= ramp[::-1][:, None]
        if x > 0:
            m[:, :28] *= ramp[None, :]; m[:, -28:] *= ramp[::-1][None, :]
        mask = Image.fromarray((m * 255).astype(np.uint8))
        canvas = bg.copy(); canvas.paste(fg, (x, y), mask)
    pth = os.path.join(HERE, 'img', out)
    safe_save(dither(canvas), pth)
    return pth.replace('\\\\', '/')


# ------------------------------------------------------------------ components''', 1)
    open(ep, 'w', encoding='utf-8').write(e)

# ---- slides_r2: use whole photos; scenery instead of portraits on 11/13/14; slide 10 copied over
sp = os.path.join(here, 'slides_r2.py')
s = open(sp, encoding='utf-8').read()
n = 0


def rep(a, b):
    global s, n
    if a in s:
        s = s.replace(a, b, 1); n += 1
    else:
        print('MISSING:', a[:80])


rep("prep_photo(20, 'p02.png', blur=5)", "prep_photo_full(20, 'p02.png', blur=3)")
rep("prep_photo(27, 'p03.png')", "prep_photo_full(27, 'p03.png')")
rep("prep_photo(38, 'p05.png')", "prep_photo_full(38, 'p05.png')")
rep("prep_photo(37, 'p06.png')", "prep_photo_full(37, 'p06.png')")
rep("prep_photo(26, 'p07.png')", "prep_photo_full(26, 'p07.png')")
rep("prep_photo_extended(47, 'p08.png', 560)", "prep_photo_full(47, 'p08.png')")
rep("prep_photo_extended(4, 'p11.png', 520)", "prep_photo_full(41, 'p11.png')")
rep("prep_photo(46, 'p12.png', focus=(0.5, 0.45))", "prep_photo_full(46, 'p12.png')")
rep("prep_photo_extended(12, 'p13.png', 470)", "prep_photo_full(33, 'p13.png')")
rep("prep_photo_extended(6, 'p14.png', 360)", "prep_photo_full(34, 'p14.png')")
if 'def s10' not in s:
    s = s.replace("S.SLIDES.update({", '''def s10():
    img = prep_photo_full(49, 'p10.png')
    n = 52; bars = ''
    for i in range(n):
        hgt = 18 + int(70 * abs(math.sin(i * .55) * math.cos(i * .21))) + (i * 29) % 22
        bars += f'<rect x="{4 + i*18}" y="{55-hgt/2:.1f}" width="9" height="{hgt}" rx="4.5" fill="{SILVER}" opacity="{.95 if i < 34 else .5}"/>'
    wave = f'<svg width="936" height="110" viewBox="0 0 936 110" style="margin-top:36px">{bars}</svg>'
    body = scene(img, .6, .3, .6)
    body += at(290, p("now you sit down and you already know what to make.", 66, 700, lh=1.06, ls=-2.2) + wave
               + p("it's written in " + block("your voice", 56, pad="0 20px 12px", radius=16) + ", so you don't sound like everyone else.", 46, ls=-1, mt=44, lh=1.4)
               + p("the people who see it land somewhere that sells.", 46, ls=-1, mt=34)
               + p("and we work through it with you.", 46, 700, ls=-1, mt=22))
    return body


S.SLIDES.update({''', 1)
    n += 1
s = s.replace("S.SLIDES.update({'02': s02,", "S.SLIDES.update({'10': s10, '02': s02,", 1)
s = s.replace("['02', '03', '05', '06', '07', '08', '11', '12', '13', '14']", "['02', '03', '05', '06', '07', '08', '10', '11', '12', '13', '14']", 1)
open(sp, 'w', encoding='utf-8').write(s)
print('applied', n)

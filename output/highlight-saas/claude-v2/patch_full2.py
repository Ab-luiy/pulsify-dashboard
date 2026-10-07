import os
here = os.path.dirname(os.path.abspath(__file__))
ep = os.path.join(here, 'engine.py')
e = open(ep, encoding='utf-8').read()
old = "        canvas = bg.copy(); canvas.paste(fg, (x, y), mask)"
new = '''        canvas = bg.copy()
        if y > 0:                                        # continue the photo upward by mirroring its own top, blurred: colours meet exactly
            rh = min(y, ph)
            refl = fg.crop((0, 0, pw, rh)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(22))
            canvas.paste(refl, (x, y - rh))
        canvas.paste(fg, (x, y), mask)'''
if old in e:
    e = e.replace(old, new, 1)
e = e.replace("ramp = np.linspace(0, 1, 28, dtype=np.float32)", "ramp = np.linspace(0, 1, 60, dtype=np.float32)")
e = e.replace("m[:28, :] *= ramp[:, None]", "m[:60, :] *= ramp[:, None]").replace("m[-28:, :] *= ramp[::-1][:, None]", "m[-60:, :] *= ramp[::-1][:, None]")
open(ep, 'w', encoding='utf-8').write(e)

sp = os.path.join(here, 'slides_r2.py')
s = open(sp, encoding='utf-8').read()
n = 0
for a, b in [
    ("body = scene(img, .6, .35, .6)\n    body += at(280, p(\"you're already good at what you do.\"", "body = scene(img, .3, .1, .3)\n    body += at(280, p(\"you're already good at what you do.\""),
    ("body = scene(img, .55, .3, .65)\n    body += at(280, p(\"that's the<br>whole chain.\"", "body = scene(img, .3, .12, .4)\n    body += at(280, p(\"that's the<br>whole chain.\""),
    ("prep_photo_full(33, 'p13.png')", "prep_photo_full(18, 'p13.png')"),
]:
    if a in s:
        s = s.replace(a, b, 1); n += 1
    else:
        print('MISSING', a[:60])
# slide 10 scrim inside the copied s10
s = s.replace("    body = scene(img, .6, .3, .6)\n    body += at(290, p(\"now you sit down", "    body = scene(img, .4, .15, .4)\n    body += at(290, p(\"now you sit down", 1)
open(sp, 'w', encoding='utf-8').write(s)
print('ok', n, 'refl' in e)

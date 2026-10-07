import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'engine.py')
s = open(p, encoding='utf-8').read()
if 'def safe_save' not in s:
    s = s.replace("def dither(im, sigma=2.6):", '''def safe_save(im, path, tries=6):
    """Windows under memory pressure sometimes refuses a file write; retry instead of crashing the build."""
    for k in range(tries):
        try:
            im.save(path)
            return
        except OSError:
            time.sleep(2 + k)
    im.save(path)


def dither(im, sigma=2.6):''', 1)
    s = s.replace("    dither(im).save(p)\n    return p.replace('\\\\', '/')", "    safe_save(dither(im), p)\n    return p.replace('\\\\', '/')")
    s = s.replace("    dither(out_im).save(pth)", "    safe_save(dither(out_im), pth)")
open(p, 'w', encoding='utf-8').write(s)
print('safe_save(dither(im), p)' in s, 'safe_save(dither(out_im), pth)' in s)

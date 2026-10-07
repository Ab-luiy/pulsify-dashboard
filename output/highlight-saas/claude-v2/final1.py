"""Slide 1, perfected pass.
 - logo (white glowing mark) truly behind the subject
 - matte edge refined with a guided filter on the head (follows hair strands, no dark fringe)
 - top of the photo cross-faded into a continuous fill (no visible seam)
 - logo placed so it never sits under the text lines
Run: python final1.py   (needs img/matte1.png from matte.py)
"""
import os
import numpy as np, cv2
from PIL import Image, ImageFilter, ImageChops
import build5 as b

W, H = b.W, b.H


def smoothstep(x, a, b_):
    t = np.clip((x - a) / (b_ - a), 0, 1)
    return t * t * (3 - 2 * t)


def photo_with_seamless_top(shift=250, fade=320):
    crop = b.cover('14-IMG_8690.JPEG', (0.41, 0.5))
    arr = np.asarray(crop).astype(np.float32)
    row = arr[:24].mean(axis=0)                              # average colour of the photo's own top rows, per column
    row = cv2.GaussianBlur(row.reshape(1, W, 3), (0, 0), 70).reshape(W, 3)
    canvas = np.empty((H, W, 3), np.float32)
    canvas[:] = row[None]                                    # flat continuation of the top edge
    canvas[shift:] = arr[:H - shift]
    # cross-fade the first `fade` rows of the photo into the continuation
    y = np.arange(H, dtype=np.float32)
    t = smoothstep(y, shift, shift + fade)[:, None, None]
    flat = np.empty_like(canvas); flat[:] = row[None]
    canvas = flat * (1 - t) + canvas * t
    return Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))


def guided(I, p, r, eps):
    box = lambda x: cv2.boxFilter(x, -1, (2 * r + 1, 2 * r + 1))
    mI, mp = box(I), box(p)
    var = box(I * I) - mI * mI
    cov = box(I * p) - mI * mp
    a = cov / (var + eps)
    bb = mp - a * mI
    return box(a) * I + box(bb)


def refined_matte(base):
    m = np.asarray(Image.open(os.path.join(b.HERE, 'img', 'matte1.png')).convert('L')).astype(np.float32) / 255
    x0, y0, x1, y1 = 340, 480, 960, 1180                      # head, hair, headphones, shoulders-top
    rgb = np.asarray(base)[y0:y1, x0:x1]
    lift = cv2.LUT(rgb, (255 * (np.arange(256) / 255.0) ** 0.42).astype(np.uint8))
    I = cv2.cvtColor(lift, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    p = m[y0:y1, x0:x1].copy()
    hard = (p > .5).astype(np.uint8)
    # pass 1: full-resolution GrabCut on the head crop, initialised from the coarse matte
    core = cv2.erode(hard, np.ones((29, 29), np.uint8))
    outer = cv2.dilate(hard, np.ones((29, 29), np.uint8))
    gm = np.full(hard.shape, cv2.GC_BGD, np.uint8)
    gm[outer > 0] = cv2.GC_PR_BGD
    gm[hard > 0] = cv2.GC_PR_FGD
    gm[core > 0] = cv2.GC_FGD
    bgr = cv2.cvtColor(lift, cv2.COLOR_RGB2BGR)
    bd, fd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, gm, None, bd, fd, 5, cv2.GC_INIT_WITH_MASK)
    fg = np.where((gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # pass 2: remove speckle and stair-steps
    fg = cv2.medianBlur(fg, 9)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        fg = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    fgf = cv2.GaussianBlur(fg.astype(np.float32) / 255, (0, 0), 2.2)          # smooth contour
    # pass 3: let the image decide the soft edge (strands), only in a thin band
    q = np.clip(guided(I, fgf, 5, 1.5e-3), 0, 1)
    band = cv2.dilate(fg, np.ones((15, 15), np.uint8)) - cv2.erode(fg, np.ones((15, 15), np.uint8))
    q = smoothstep(q, .30, .80)
    out = np.where(band > 0, q, fgf)
    out = cv2.GaussianBlur(out.astype(np.float32), (0, 0), 1.1)
    # keep the coarse matte outside the head crop's inner area (shoulders)
    keep = np.zeros_like(out); keep[40:-40, 40:-40] = 1
    keep = cv2.GaussianBlur(keep, (0, 0), 14)
    m[y0:y1, x0:x1] = out * keep + p * (1 - keep)
    return Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8))


CUTOUT = os.path.join(b.HERE, 'img', 'cutout.png')           # founder's background-removed version of photo 14 (2000x1500, aligned to the original)


def cutout_matte(shift=250):
    """Alpha of the founder's background-removed photo, put through the same crop and shift as the photo itself."""
    a = Image.open(CUTOUT).convert('RGBA').split()[3].resize((4032, 3024), Image.LANCZOS)
    s = max(W / a.width, H / a.height)
    a = a.resize((int(a.width * s), int(a.height * s)), Image.LANCZOS)
    x = int((a.width - W) * 0.41); y = int((a.height - H) * 0.5)
    crop = a.crop((x, y, x + W, y + H))
    m = Image.new('L', (W, H), 0)
    m.paste(crop.crop((0, 0, W, H - shift)), (0, shift))
    arr = np.asarray(m).astype(np.float32) / 255
    arr = smoothstep(arr, .18, .92)                            # tighten the soft fringe of the remover
    return Image.fromarray((arr * 255).astype(np.uint8))


def bg1():
    base = photo_with_seamless_top()
    m = cutout_matte()
    flat = Image.open(b.MARKPNG).convert('RGBA').resize((980, 980), Image.LANCZOS)
    a = Image.new('L', (W, H), 0)
    a.paste(flat.split()[3], (250, 500))                      # centre (740, 990): ring stays clear of the text lines
    bloom_a = a.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * .75))
    white = Image.new('L', (W, H), 255)
    bloom = Image.merge('RGBA', (white, white, white, bloom_a))
    sharp = Image.merge('RGBA', (white, white, white, a.point(lambda v: int(v * .34))))
    warm = Image.new('RGB', (W, H), (150, 96, 78))
    wa = a.filter(ImageFilter.GaussianBlur(60)).point(lambda v: int(v * .5))
    scene = ImageChops.screen(base, ImageChops.multiply(warm, Image.merge('RGB', (wa, wa, wa))))
    scene = Image.alpha_composite(Image.alpha_composite(scene.convert('RGBA'), bloom), sharp).convert('RGB')
    out = Image.composite(base, scene, m)                     # subject in front, logo behind
    p = os.path.join(b.HERE, 'img', 's1.png')
    b.dither(out).save(p)
    return p.replace('\\', '/')


if __name__ == '__main__':
    b.prep_slide1 = bg1
    html = b.slide1().replace('letter-spacing:-7px;margin-left:-6px">now.', 'letter-spacing:-7px;margin-left:-6px;text-shadow:0 0 26px rgba(0,0,0,.75)">now.')
    b.render('01', html)
    print('ok')

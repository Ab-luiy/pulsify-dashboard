"""Cut the subject out of slide 1's photo (GrabCut, seeded by hand-placed shapes). Saves img/matte1.png + img/matte1-debug.jpg"""
import os
import numpy as np, cv2
from PIL import Image
import build5 as b

W, H = b.W, b.H
base = b.extend_top(b.cover('14-IMG_8690.JPEG', (0.41, 0.5)), 250)
rgb = np.array(base)
# lift the darks for the segmenter only (the output photo is untouched)
lift = cv2.LUT(rgb, (255 * (np.arange(256) / 255.0) ** 0.42).astype(np.uint8))
bgr = cv2.cvtColor(lift, cv2.COLOR_RGB2BGR)

mask = np.full((H, W), cv2.GC_BGD, np.uint8)


def fill(poly=None, ell=None, val=0):
    if poly is not None:
        cv2.fillPoly(mask, [np.array(poly, np.int32)], val)
    if ell is not None:
        cv2.ellipse(mask, ell[0], ell[1], 0, 0, 360, val, -1)


# probable foreground: generous head and shoulder shapes
fill(poly=[(470, 1000), (830, 1000), (960, 1180), (1040, 1500), (1080, 1920), (0, 1920), (40, 1500), (130, 1180), (300, 1060)], val=cv2.GC_PR_FGD)
fill(ell=((640, 850), (250, 300)), val=cv2.GC_PR_FGD)
# sure foreground: the inner core
fill(ell=((665, 650), (200, 150)), val=cv2.GC_PR_FGD)
fill(ell=((640, 860), (130, 170)), val=cv2.GC_FGD)
fill(ell=((665, 690), (120, 70)), val=cv2.GC_FGD)
fill(poly=[(560, 1090), (740, 1090), (860, 1240), (930, 1500), (980, 1920), (100, 1920), (150, 1500), (230, 1270), (380, 1140)], val=cv2.GC_FGD)

bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
sm_img = cv2.resize(bgr, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
sm_mask = cv2.resize(mask, (W // 2, H // 2), interpolation=cv2.INTER_NEAREST)
cv2.grabCut(sm_img, sm_mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
sm_fg = np.where((sm_mask == cv2.GC_FGD) | (sm_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
fg = cv2.resize(cv2.GaussianBlur(sm_fg, (0, 0), 1.0), (W, H), interpolation=cv2.INTER_LINEAR)
fg = np.where(fg > 127, 255, 0).astype(np.uint8)
# clean: keep the biggest blob, close pinholes, tiny feather
n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
fg = np.where(lab == big, 255, 0).astype(np.uint8)
fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
fg = cv2.GaussianBlur(fg, (0, 0), 1.6)
Image.fromarray(fg).save(os.path.join(b.HERE, 'img', 'matte1.png'))

# debug: lifted photo, matte outline in red
dbg = lift.copy()
edge = cv2.Canny(fg, 50, 150)
dbg[cv2.dilate(edge, np.ones((3, 3), np.uint8)) > 0] = (255, 40, 40)
Image.fromarray(dbg).resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(b.HERE, 'img', 'matte1-debug.jpg'), quality=90)
print('ok', int(fg.mean()))

"""Build 'after' thumbnails from FITFO's own frames.

Crop and composite only, no generation. The whole argument of the doc is that the
thumbnail is already inside his screen recording, so the build has to prove it.
"""
from PIL import Image, ImageDraw, ImageStat

OUT_W, OUT_H = 1280, 720


def patch(im, box, sample):
    """Paint out the source webcam overlay using the mean colour beside it,
    so we can re-place the face ourselves without a ghost in the corner."""
    mean = tuple(int(c) for c in ImageStat.Stat(im.crop(sample)).mean[:3])
    ImageDraw.Draw(im).rectangle(box, fill=mean)
    return im


def exact(im, box):
    """Crop, then resize to exactly 16:9 without centre-cropping anything away."""
    c = im.crop(box)
    return c.resize((OUT_W, OUT_H), Image.LANCZOS)


def inset(base, face, scale=0.28, pad=28, corner='br', border=6):
    fw = int(base.width * scale)
    fh = int(round(fw * face.height / face.width))
    face = face.resize((fw, fh), Image.LANCZOS)
    x = pad if corner in ('bl', 'tl') else base.width - fw - pad
    y = pad if corner in ('tl', 'tr') else base.height - fh - pad
    ImageDraw.Draw(base).rectangle(
        [x - border, y - border, x + fw + border, y + fh + border], fill=(255, 255, 255))
    base.paste(face, (x, y))
    return base


def build(out, src, cam_box, cam_sample, body_box, corner, scale=0.28):
    im = Image.open(src).convert('RGB')
    face = im.crop(cam_box)                 # lift the real webcam frame first
    im = patch(im, cam_box, cam_sample)     # then erase it from the plate
    body = exact(im, body_box)
    inset(body, face, scale=scale, corner=corner).save(out, quality=93)
    print('wrote', out)


if __name__ == '__main__':
    # Payout ledger. Drop tabs, URL bar, sidebar and taskbar. Keep account IDs,
    # dates and the PAID column, because those are what make it checkable.
    build('after-payout.jpg', '6uefLe209xA.jpg',
          cam_box=(975, 0, 1280, 178), cam_sample=(975, 182, 1280, 205),
          body_box=(238, 130, 1233, 690), corner='br')

    # NQ chart. Crop to the risk box so the green target, red stop and the
    # 3.99 ratio all survive at 120px. Face bottom-left, clear of the box.
    build('after-chart.jpg', '5BgJn9bih1I.jpg',
          cam_box=(983, 0, 1280, 175), cam_sample=(983, 180, 1280, 205),
          body_box=(160, 100, 978, 560), corner='bl', scale=0.26)

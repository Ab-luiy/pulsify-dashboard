import re, os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'final1.py')
s = open(p, encoding='utf-8').read()

new_photo = '''def photo_with_seamless_top(shift=SHIFT, fade=320):
    orig = Image.open(os.path.join(b.UP, '14-IMG_8690.JPEG'))
    from PIL import ImageOps
    orig = ImageOps.exif_transpose(orig).convert('RGB')
    sc = (H - shift) / orig.height                            # zoomed out: the whole photo height fits under the extension
    im = orig.resize((int(orig.width * sc), H - shift), Image.LANCZOS)
    x = int((im.width - W) * FOCUS_X)
    arr = np.asarray(im.crop((x, 0, x + W, H - shift))).astype(np.float32)
    row = arr[:24].mean(axis=0)
    row = cv2.GaussianBlur(row.reshape(1, W, 3), (0, 0), 70).reshape(W, 3)
    canvas = np.empty((H, W, 3), np.float32)
    canvas[:] = row[None]
    canvas[shift:] = arr
    y = np.arange(H, dtype=np.float32)
    t = smoothstep(y, shift, shift + fade)[:, None, None]
    flat = np.empty_like(canvas); flat[:] = row[None]
    canvas = flat * (1 - t) + canvas * t
    return Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))


'''
s = re.sub(r'def photo_with_seamless_top.*?(?=def guided)', new_photo, s, flags=re.S)

new_cut = '''def cutout_matte(shift=SHIFT):
    """Alpha of the founder's background-removed photo, through the same zoom, crop and shift as the photo."""
    sc = (H - shift) / 3024
    a = Image.open(CUTOUT).convert('RGBA').split()[3].resize((int(4032 * sc), H - shift), Image.LANCZOS)
    x = int((a.width - W) * FOCUS_X)
    m = Image.new('L', (W, H), 0)
    m.paste(a.crop((x, 0, x + W, H - shift)), (0, shift))
    arr = np.asarray(m).astype(np.float32) / 255
    arr = smoothstep(arr, .18, .92)
    return Image.fromarray((arr * 255).astype(np.uint8))


'''
s = re.sub(r'def cutout_matte.*?(?=def bg1)', new_cut, s, flags=re.S)
s = s.replace("W, H = b.W, b.H\n", "W, H = b.W, b.H\nSHIFT = 330          # photo is moved down by this much; the top is a seamless continuation of the wall\nFOCUS_X = 0.378      # horizontal crop position so the face sits at about x=640\n", 1)
open(p, 'w', encoding='utf-8').write(s)
print('patched', 'SHIFT = 330' in s)

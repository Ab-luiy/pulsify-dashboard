from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import hashlib

ROOT = Path(__file__).resolve().parent
PHOTO = Path(r'C:\Users\Abdullah\Downloads\IMG_8690 (1).JPEG')
LOGO = ROOT.parents[2] / 'assets' / 'pulsify-logo.png'
W, H = 1080, 1920
canvas = Image.new('RGB', (W, H), '#0b0c0d')
photo = ImageOps.exif_transpose(Image.open(PHOTO)).convert('RGB')
# Original pixels only: fixed crop and proportional resize. No face editing,
# generative fill, retouching, relighting, skin changes or body reconstruction.
target_h = 1420
crop_w = round(photo.height * W / target_h)
left = round(photo.width * .515 - crop_w / 2)
left = max(0, min(left, photo.width - crop_w))
cropped = photo.crop((left, 0, left + crop_w, photo.height))
cropped = cropped.resize((W, target_h), Image.Resampling.LANCZOS)
canvas.paste(cropped, (0, 500))
# Blend only the empty dark wall at the photograph's top into the header.
# All pixels containing the founder remain the unretouched resized photograph.
transition = Image.new('RGBA', (W, 190), '#0b0c0d')
fade = Image.new('L', (1, 190))
fade.putdata([round(255 * (1-y/189)**2) for y in range(190)])
transition.putalpha(fade.resize((W, 190)))
canvas.paste(transition, (0, 500), transition)
draw = ImageDraw.Draw(canvas)
font = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 112)
draw.text((82, 170), 'Been building', font=font, fill='#f4f2ef')
draw.text((82, 296), 'something.', font=font, fill='#f4f2ef')
draw.line([(85, 433), (615, 433)], fill='#b27463', width=6)

# Use the actual supplied brand asset, preserving its outlines. White paper is
# removed with a luminance mask, and the original black ink becomes soft white.
logo = Image.open(LOGO).convert('L')
alpha = ImageOps.invert(logo)
bounds = alpha.point(lambda p: 255 if p > 35 else 0).getbbox()
alpha = alpha.crop(bounds)
alpha.thumbnail((230, 235), Image.Resampling.LANCZOS)
mark = Image.new('RGBA', alpha.size, '#ebe7e2')
mark.putalpha(alpha)
canvas.paste(mark, ((W - mark.width)//2, 535), mark)
assert canvas.crop((0, 800, W, H)).tobytes() == cropped.crop((0, 300, W, target_h)).tobytes(), 'Portrait pixels changed'
canvas.save(ROOT / 'story-v2.png')
(ROOT / 'README.md').write_text(
    '# Founder story mockup v2\n\n'
    'Founder correction: no AI alteration of appearance; original photo only.\n'
    'Built deterministically with Pillow from the original JPEG and existing logo.\n'
    'Photo operations: orientation, crop, proportional resize, placement; empty upper-wall fade only. Portrait pixel region verified unchanged after resize. No portrait retouch or generative image tool.\n'
    'Headline: Been building something. Footer removed; app panel replaced with genuine logo.\n'
    'Photo SHA256: ' + hashlib.sha256(PHOTO.read_bytes()).hexdigest() + '\n'
    'Source photo: ' + str(PHOTO) + '\n'
    'Source logo: ' + str(LOGO) + '\n', encoding='utf-8')
print(ROOT / 'story-v2.png')

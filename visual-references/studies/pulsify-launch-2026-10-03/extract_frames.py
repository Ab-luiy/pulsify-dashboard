from pathlib import Path
import cv2, json, math, shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
DOWNLOADS = Path.home() / 'Downloads'
FILES = {
    'twoclipping-overview': 'KtQfatO52PXD_Lzx.mp4',
    'twoclipping-food': 'qedcBBemhoiOWo7G.mp4',
    'twoclipping-photo': 'jTFFb5NJr-LhXwoW.mp4',
    'twoclipping-ui': 'FP9wLBw_-LKp2E4O.mp4',
}
metadata = []
for name, filename in FILES.items():
    source = DOWNLOADS / filename
    target = ROOT / (name + '.mp4')
    if not target.exists():
        shutil.copyfile(source, target)
    cap = cv2.VideoCapture(str(target))
    fps, count = cap.get(cv2.CAP_PROP_FPS), cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = count / fps
    samples = [i / 2 for i in range(math.ceil(duration * 2))]
    pages = []
    for offset in range(0, len(samples), 36):
        batch = samples[offset:offset + 36]
        sheet = Image.new('RGB', (1440, math.ceil(len(batch)/6)*260), '#e8e8e8')
        draw = ImageDraw.Draw(sheet)
        for i, t in enumerate(batch):
            cap.set(cv2.CAP_PROP_POS_MSEC, t*1000)
            ok, frame = cap.read()
            if not ok: continue
            im = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            im.thumbnail((236, 232))
            x, y = i%6*240, i//6*260
            sheet.paste(im, (x+(240-im.width)//2, y+24))
            draw.text((x+8, y+6), f'{t:.2f}s', fill='black')
        page = f'{name}-sheet-{offset//36+1:02d}.jpg'
        sheet.save(ROOT/page, quality=90)
        pages.append(page)
    metadata.append(dict(name=name,file=target.name,fps=fps,frames=count,
                         duration_seconds=duration,width=cap.get(3),height=cap.get(4),
                         sample_interval_seconds=0.5,contact_sheets=pages))
    cap.release()
(ROOT/'media-metadata.json').write_text(json.dumps(metadata, indent=2),encoding='utf-8')
print(json.dumps(metadata))

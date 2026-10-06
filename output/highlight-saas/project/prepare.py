from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import json,re
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'output/highlight-saas'; ASSETS=OUT/'project/html/assets'
source=(ROOT/'wiki/content-engine/pulsify-saas-highlight-14-slide.md').read_text(encoding='utf-8')
parts=re.split(r'^## (\d+)\. (.+)$',source,flags=re.M); copy={}
for k in range(1,len(parts),3):
    n=int(parts[k]); block=parts[k+2].split('PHOTO:')[0].split('SHOOT:')[0].strip()
    lines=block.splitlines()
    if n in [4,5]:lines[0]=lines[0].removeprefix('so ')
    copy[str(n)]={'title':parts[k+1],'lines':lines}
(ASSETS/'copy.json').write_text(json.dumps(copy,indent=2),encoding='utf-8')
index=json.loads((ROOT/'brand/photos/uploaded/index.json').read_text())['photos']
ids={1:50,2:50,3:15,4:31,5:22,6:33,7:34,8:34,10:49,11:9,12:46,13:14,14:14}
mapping=[]
for n,id in ids.items():
    item=next(p for p in index if p['id']==id); original=ROOT/'brand/photos/uploaded'/item['file']
    im=ImageOps.exif_transpose(Image.open(original)).convert('RGB')
    # Uniform exposure only. No masks, middle fade, cutout or image synthesis.
    exposure={1:.95,2:.83,3:.57,4:1,5:.58,6:.95,7:.7,8:.7,10:1,11:.87,12:.56,13:.88,14:.88}[n]
    im=ImageEnhance.Brightness(im).enhance(exposure)
    canvas=ImageOps.fit(im,(1080,1920),centering=({11:(.56,.5),13:(.52,.5),14:(.52,.5)}.get(n,(.5,.5))))
    if n==2:canvas=canvas.filter(ImageFilter.GaussianBlur(12))
    canvas.save(ASSETS/f'photo-{n:02d}.jpg',quality=95)
    if n in [11,13,14]:
        full=Image.new('RGB',(1080,1920),'#191918')
        tile=ImageOps.contain(im,(1080,810)); full.paste(tile,((1080-tile.width)//2,650))
        full.save(ASSETS/f'photo-{n:02d}-full.jpg',quality=95)
    mapping.append({'slide':n,'photo_id':id,'filename':item['original_filename'],'original':str(original.relative_to(ROOT)).replace('\\','/'),'exposure_multiplier':exposure,'preparation':'full-bleed crop; uniform exposure'+('; Gaussian blur radius12px' if n==2 else ''),'framing_options':['full','crop'] if n in [11,13,14] else ['crop']})
(ASSETS/'photo-map.json').write_text(json.dumps(mapping,indent=2),encoding='utf-8')
print('Prepared 13 founder-mapped stills; paired photos retained. Slide9 founder-owned.')

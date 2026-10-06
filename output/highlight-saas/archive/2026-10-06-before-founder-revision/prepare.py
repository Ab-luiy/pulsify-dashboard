from pathlib import Path
from PIL import Image, ImageOps
import json,re,shutil
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'output/highlight-saas'; ASSETS=OUT/'project/html/assets'
source=(ROOT/'wiki/content-engine/pulsify-saas-highlight-14-slide.md').read_text(encoding='utf-8')
parts=re.split(r'^## (\d+)\. (.+)$',source,flags=re.M)
copy={}
for k in range(1,len(parts),3):
    n=int(parts[k]); block=parts[k+2].split('PHOTO:')[0].split('SHOOT:')[0].strip()
    copy[str(n)]={'title':parts[k+1],'lines':block.splitlines()}
(ASSETS/'copy.json').write_text(json.dumps(copy,indent=2),encoding='utf-8')
index=json.loads((ROOT/'brand/photos/uploaded/index.json').read_text())['photos']
ids={1:14,2:45,3:40,4:31,5:6,6:12,7:8,8:47,9:7,10:49,11:9,12:50,13:13,14:10}
mapping=[]
for n,id in ids.items():
    chosen=list((OUT/'photos').glob(f'slide-{n:02d}-photo-{id}.jpg'))
    original=chosen[0] if chosen else ROOT/'brand/photos/uploaded'/next(p['file'] for p in index if p['id']==id)
    im=ImageOps.exif_transpose(Image.open(original)).convert('RGB')
    # A top fade gives the copy quiet space; no face retouching, cutouts or synthesis.
    if n==14:
        # Remove both wristwatch and food at the bottom; retain founder/phone.
        im=im.crop((0,0,int(im.width*.94),int(im.height*.55)))
    height={1:1240,6:1050,11:1120,13:1150,14:1100}.get(n,1920)
    if n in [1,6,11,13,14]:
        tile=ImageOps.fit(im,(1080,height),centering=(.54,.38))
        canvas=Image.new('RGB',(1080,1920),'#101011')
        mask=Image.new('L',(1080,height),255)
        for y in range(220):mask.paste(int(255*y/220),(0,y,1080,y+1))
        canvas.paste(tile,(0,1920-height),mask)
    elif n==8:
        tile=ImageOps.fit(im,(1080,1920),centering=(.5,.5));canvas=Image.new('RGB',(1080,1920),'#171715');mask=Image.new('L',(1080,1920),255)
        for y in range(250):mask.paste(int(255*y/250),(0,y,1080,y+1))
        canvas.paste(tile,(0,350),mask)
    else:canvas=ImageOps.fit(im,(1080,1920),centering=(.5,.5))
    # Lift only screen/desk pixels in dark still-life photos, never portraits.
    if n in [3,4,10,12]:
        import numpy as np
        a=np.array(canvas).astype('float32')/255; y=np.linspace(0,1,1920)[:,None,None]
        mask=np.clip((y-.42)/.34,0,1); gain={3:.72,4:.7,10:.78,12:.74}[n]
        a=a*(1-mask)+np.power(a,gain)*mask;canvas=Image.fromarray((a.clip(0,1)*255).astype('uint8'))
    canvas.save(ASSETS/f'photo-{n:02d}.jpg',quality=95)
    mapping.append({'slide':n,'photo_id':id,'original':str(original.relative_to(ROOT)).replace('\\','/'),'preparation':'orientation/crop, top gradient in template; still-life-only shadow lift' if n in [3,4,10,12] else 'orientation/crop only; template darkening','role':'silent video storyboard background' if n==9 else 'slide background'})
for name in ['coin-master-3d.png','logo.svg','lockup.svg']:
    shutil.copyfile(ROOT/'brand/logo'/name,ASSETS/name)
(ASSETS/'photo-map.json').write_text(json.dumps(mapping,indent=2),encoding='utf-8')
print('Prepared 14 distinct original photos and parsed locked copy.')

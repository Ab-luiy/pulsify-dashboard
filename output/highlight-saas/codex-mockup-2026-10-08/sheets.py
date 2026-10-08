from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json
P=Path(__file__).resolve().parent
F=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
for name,ids,cols,tw in [('contact-sheet',range(1,15),4,360),('opening',range(1,6),5,360),('turn',range(6,10),4,360),('product-close',range(10,15),5,360)]:
    ids=list(ids);th=round(tw*1920/1080);g=20;label=40
    rows=(len(ids)+cols-1)//cols
    im=Image.new('RGB',(cols*(tw+g)+g,rows*(th+label+g)+g),'#171819');d=ImageDraw.Draw(im)
    for k,n in enumerate(ids):
        x=g+(k%cols)*(tw+g);y=g+(k//cols)*(th+label+g)
        d.text((x,y+3),f'{n:02}',fill='#deded8',font=F)
        with Image.open(P/f'{n:02}.png') as s: im.paste(s.convert('RGB').resize((tw,th),Image.Resampling.LANCZOS),(x,y+label))
    im.save(P/f'{name}.jpg',quality=94)
manifest=[]
for n in range(1,15):
    f=P/f'{n:02}.png'
    with Image.open(f) as im:
        assert im.size==(1080,1920);im.verify()
    manifest.append({'slide':n,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'dimensions':[1080,1920]})
(P/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('14 exports decoded; sheets and hashes written.')

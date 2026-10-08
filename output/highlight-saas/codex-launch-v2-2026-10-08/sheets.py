from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
P=Path(__file__).resolve().parent;F=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',23)
for name,ids,cols,tw in [('contact-sheet',range(1,10),3,360),('opening',range(1,4),3,450),('argument',range(4,7),3,450),('product-close',range(7,10),3,450)]:
 ids=list(ids);th=round(tw*1920/1080);g=20;label=40;rows=(len(ids)+cols-1)//cols
 im=Image.new('RGB',(cols*(tw+g)+g,rows*(th+label+g)+g),'#151619');d=ImageDraw.Draw(im)
 for k,n in enumerate(ids):
  x=g+(k%cols)*(tw+g);y=g+(k//cols)*(th+label+g);d.text((x,y+3),f'{n:02}',fill='#deded8',font=F)
  with Image.open(P/f'{n:02}.png') as s:im.paste(s.convert('RGB').resize((tw,th),Image.Resampling.LANCZOS),(x,y+label))
 im.save(P/f'{name}.jpg',quality=95)
manifest=[]
for n in range(1,10):
 f=P/f'{n:02}.png'
 with Image.open(f) as s:assert s.size==(1080,1920);s.verify()
 manifest.append({'slide':n,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'dimensions':[1080,1920]})
(P/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('9 full-res exports and sequence sheets verified.')

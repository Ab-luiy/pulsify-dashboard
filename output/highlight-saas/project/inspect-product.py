from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent/'html/assets/product'; canvas=Image.new('RGB',(1440,2530),'#222');d=ImageDraw.Draw(canvas);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
for i,name in enumerate(['voice','projects','write','funnel','video','revenue','home','team']):
    im=Image.open(P/f'{name}.png').convert('RGB');im=im.crop((0,0,1440,min(1200,im.height)));im.thumbnail((700,575));x=i%2*720;y=i//2*625;d.text((x+10,y+8),name,font=font,fill='white');canvas.paste(im,(x+10,y+42))
canvas.save(P/'capture-sheet.jpg',quality=95)

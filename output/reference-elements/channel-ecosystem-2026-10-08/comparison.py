from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

here=Path(__file__).resolve().parent
board=Image.new('RGB',(1160,790),'#191919')
draw=ImageDraw.Draw(board)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
for x,p,label in [(20,here/'assets/reference.jpg','K1-4 reference'),(600,here/'slide.png','Pulsify adaptation')]:
    im=Image.open(p).convert('RGB')
    im.thumbnail((540,715),Image.Resampling.LANCZOS)
    board.paste(im,(x+(540-im.width)//2,58))
    draw.text((x,20),label,font=font,fill='#f5f3ef')
board.save(here/'comparison.jpg',quality=94)
print('comparison.jpg')

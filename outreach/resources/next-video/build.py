from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent
pdfmetrics.registerFont(TTFont('Sans', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('SansBold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Serif', 'C:/Windows/Fonts/georgia.ttf'))
W, H = 540, 800
INK, MUTED, PAPER, LIME = '#20261F', '#596053', '#F7F5ED', '#D7ED95'
c = canvas.Canvas(str(ROOT / 'next-video.pdf'), pagesize=(W,H))
c.setTitle('Stuck on your next video? | Pulsify')
c.setAuthor('Pulsify')

def rect(x,y,w,h,color,r=0):
    c.setFillColor(HexColor(color))
    if r: c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=0)
    else: c.rect(x,H-y-h,w,h,fill=1,stroke=0)

def label(text,x,y,size=14,font='Sans',color=INK):
    c.setFillColor(HexColor(color)); c.setFont(font,size)
    c.drawString(x,H-y-size,text)

def para(text,x,y,width,size=14,leading=19,color=INK,font='Sans'):
    p=Paragraph(text,ParagraphStyle('copy',fontName=font,fontSize=size,leading=leading,textColor=HexColor(color)))
    _, height=p.wrap(width,1000)
    assert y+height < H-20, (text,y,height)
    p.drawOn(c,x,H-y-height)
    return height

rect(0,0,W,H,PAPER)
rect(30,27,92,22,LIME,11)
label('PULSIFY NOTES',41,31,9,'SansBold')
label('Keep for your next recording day',292,32,10,color=MUTED)
label('Stuck on your',30,65,37,'Serif')
label('next video?',30,105,37,'Serif')
para('Five places to look in what you already know.<br/>Pick whichever brings a real example to mind.',31,159,478,15,21)

rows=[
('A question you keep answering',
 'Look in your comments, DMs or recent calls.',
 '&quot;I get asked [question]. Here\'s how I think about it.&quot;'),
('A decision you made',
 'Pick something you chose, changed or ruled out.',
 '&quot;I chose [X] over [Y]. Here\'s what decided it.&quot;'),
('A mistake you can explain',
 'Use a real example and what you learned from it.',
 '&quot;Here\'s what went wrong with [X], and why.&quot;'),
('Something you changed your mind about',
 'Think of advice you would give differently today.',
 '&quot;I used to think [X]. Then I noticed [Y].&quot;'),
('One step in your process',
 'Choose a small task you could show on screen.',
 '&quot;Here\'s what I check before I [take this step].&quot;'),
]
for i,(title,desc,opening) in enumerate(rows):
    top=218+i*83
    rect(30,top,29,29,LIME,14)
    label(str(i+1).zfill(2),37,top+6,12,'SansBold')
    label(title,71,top-1,16,'SansBold')
    label(desc,71,top+24,13,color=MUTED)
    para(opening,71,top+44,439,13.5,17)
    if i<4: rect(71,top+73,439,0.5,'#DADDCF')

rect(30,649,480,118,INK,12)
label('Turn one into a video',47,662,19,'Serif',PAPER)
para('Set up the situation. Explain your thinking.<br/>Show one real example. Leave one useful takeaway.',47,694,446,14,20,PAPER)
label('Use the opening as a starting point. Say it your way.',47,743,11,color='#D7ED95')
c.showPage(); c.save()
print(ROOT / 'next-video.pdf')

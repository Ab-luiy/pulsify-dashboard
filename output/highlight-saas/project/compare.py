from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
OUT=Path(__file__).resolve().parent.parent
canvas=Image.new('RGB',(1200,2240),'#202020');draw=ImageDraw.Draw(canvas);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',27)
html='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photo framing comparisons</title><style>body{background:#191919;color:#eee;font-family:Helvetica,Arial,sans-serif;padding:24px;margin:0}h1{font-size:26px}p{line-height:1.5}.row{display:grid;grid-template-columns:repeat(2,minmax(0,400px));gap:24px;margin:32px 0 60px}img{width:100%;display:block}a{color:#eee}</style></head><body><h1>Slides 11, 13 and 14 · framing comparison</h1><p>A shows the whole landscape photo, with solid framing above and below.<br>B fills the story with a vertical crop. The face stays clear; the supporting copy sits in the lower half.</p>'''
for i,n in enumerate([11,13,14]):
    html+=f'<h2>Slide {n}</h2><div class="row">'
    for j,(label,kind) in enumerate([('A · whole photo','full'),('B · vertical crop','crop')]):
        x=28+j*590;y=20+i*735;draw.text((x,y),f'{n} {label}',font=font,fill='white')
        im=Image.open(OUT/f'project/comparisons/{n:02d}-{kind}.png');canvas.paste(im.resize((378,672),Image.Resampling.LANCZOS),(x+85,y+46))
        file=f'project/comparisons/{n:02d}-{kind}.png';html+=f'<section><p>{label}</p><a href="{file}"><img src="{file}" alt="Slide {n}, {label}"></a></section>'
    html+='</div>'
canvas.save(OUT/'framing-comparison.jpg',quality=95)
(OUT/'comparisons.html').write_text(html+'</body></html>',encoding='utf-8')
print('Saved six framing previews and side-by-side comparison.')

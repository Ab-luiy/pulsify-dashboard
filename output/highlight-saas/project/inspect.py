from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/highlight-saas/project/reference-review'
def sheet(paths,name,cols=4,w=300,h=590):
    canvas=Image.new('RGB',(cols*w,((len(paths)+cols-1)//cols)*h),'#1b1b1e'); d=ImageDraw.Draw(canvas)
    for i,p in enumerate(paths):
        with Image.open(p) as im: im=ImageOps.exif_transpose(im).convert('RGB'); tile=ImageOps.contain(im,(w-10,h-35))
        x=(i%cols)*w;y=(i//cols)*h;canvas.paste(tile,(x+(w-tile.width)//2,y+28));d.text((x+8,y+8),p.name,fill='white')
    canvas.save(OUT/(name+'.jpg'),quality=94)
refs=ROOT/'raw-sources/inspiration/story-sequences'
for directory in ['siggyfoss','brez-scales story sequence','shelby-sapp','niksetting/another-story-sequence','niksetting/story-sequence-2','niksetting/story-sequence-3']:
    paths=sorted((refs/directory).iterdir(),key=lambda p:int(p.stem));sheet(paths,directory.replace('/','-'))
sheet(sorted((ROOT/'output/highlight-saas/photos').glob('*.jpg')),'selected-photos',4,360,650)
motion=list((ROOT/'visual-references/studies/pulsify-launch-2026-10-03').glob('*sheet*.jpg'))+list((ROOT/'visual-references/studies/bakers-liquid-gradients').glob('*timeline.jpg'))
sheet(motion,'motion-references',2,700,480)
print('Opened and laid out every required reference and selected photo for visual inspection.')

from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json,re,hashlib,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'output/highlight-saas'; project=OUT/'project'; assets=project/'html/assets'
def check(value,message):
    if not value:raise AssertionError(message)
source=(ROOT/'wiki/content-engine/pulsify-saas-highlight-14-slide.md').read_text(encoding='utf-8')
parts=re.split(r'^## (\d+)\. (.+)$',source,flags=re.M); locked={}
for k in range(1,len(parts),3):locked[int(parts[k])]=parts[k+2].split('PHOTO:')[0].split('SHOOT:')[0].strip().splitlines()
audits=json.loads((OUT/'layout-audit.json').read_text());mapping=json.loads((assets/'photo-map.json').read_text())
check(len(audits)==14,'14 rendered audits required');check(len({p['photo_id'] for p in mapping})==14,'Photos must be distinct')
norm=lambda s:re.sub(r'\s+',' ',s).strip()
for a in audits:
    n=a['slide']; actual=a['text'];expected=[l.removeprefix('- ') for l in locked[n]]
    if n==3:actual=[' '.join(a['chain'])]+actual
    if n==9:expected=[expected[0].removeprefix('On screen: ')]
    check(len(actual)==len(expected),f'Slide {n} paragraph count changed')
    check(all(norm(x)==norm(y) for x,y in zip(actual,expected)),f'Slide {n} locked copy differs')
    check(all(g['safe'] for g in a['geometry']),f'Slide {n} unsafe content')
    check(all(f['familyName']=='Helvetica' for f in a['fonts']),f'Slide {n} Helvetica not rendered')
    im=Image.open(OUT/f'{n:02d}.png'); im.load();check(im.size==(1080,1920),f'Slide {n} dimensions')
timeline=json.loads((assets/'motion-timeline.json').read_text());spoken=locked[9][1].removeprefix('Spoken (~25s): ')
check(' '.join(c['text'] for c in timeline['cues'])==spoken,'Motion subtitles differ from locked script')
check(all(a['safe'] for a in json.loads((OUT/'motion-audit.json').read_text())),'Subtitle safe zone failed')
encoder=Path('C:/Users/Abdullah/AppData/Local/Programs/Python/Python314/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
result=subprocess.run([str(encoder),'-hide_banner','-i',str(OUT/'09-preview.mp4'),'-f','null','-'],capture_output=True,text=True)
check(result.returncode==0,'Video decoding failed');check('1080x1920' in result.stderr and '24 fps' in result.stderr,'Video format incorrect');check('Audio:' not in result.stderr,'Preview must be silent');check(re.search(r'frame=\s*648',result.stderr),'Expected 648 decoded frames');check('00:00:27.00' in result.stderr,'Expected 27 seconds')
(OUT/'video-decode.log').write_text(result.stderr,encoding='utf-8')
thumb_w=324;thumb_h=576;gap=24;cols=4;rows=4
canvas=Image.new('RGB',(cols*(thumb_w+gap)+gap,rows*(thumb_h+60)+gap),'#1a1a1e');d=ImageDraw.Draw(canvas)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',21)
for n in range(1,15):
    x=gap+(n-1)%cols*(thumb_w+gap);y=gap+(n-1)//cols*(thumb_h+60)
    d.text((x,y),f'{n:02d}'+(' · silent preview' if n==9 else ''),font=font,fill='white')
    im=Image.open(OUT/f'{n:02d}.png').convert('RGB').resize((thumb_w,thumb_h),Image.Resampling.LANCZOS);canvas.paste(im,(x,y+35))
canvas.save(OUT/'contact-sheet.jpg',quality=95)
motion=sorted((project/'motion-frames').glob('*.jpg'));mc=Image.new('RGB',(4*300,3*560),'#1a1a1e');md=ImageDraw.Draw(mc)
for i,p in enumerate(motion):
    x=i%4*300;y=i//4*560;md.text((x+10,y+7),f'{int(p.stem)/24:.2f}s',font=font,fill='white');mc.paste(Image.open(p).resize((288,512)),(x+6,y+35))
mc.save(OUT/'motion-contact-sheet.jpg',quality=94)
qa={'date':'2026-10-06','slides':14,'dimensions':[1080,1920],'locked_copy':'verified character/punctuation parity after whitespace normalization; list markers styled as diamonds','fonts':'Chrome CDP reports installed Helvetica on all 14 slides','distinct_original_photos':14,'safe_zones':'key blocks inside x60–1020, y250–1580; all pass','motion':{'duration':27,'fps':24,'decoded_frames':648,'audio':'none','status':'silent preview; founder take still needed','subtitles':'locked spoken script; provisional timing'},'source_based_review':['2026-10-06 guidance controls look and photo selection','Siggyfoss: real photos, card layers, magnifier, one accent','Brez: plain type and quiet hand-drawn emphasis','Shelby: curved arrow to card/subject, no copied results','Niksetting seq3: feature numbers/progress dots and real UI composited onto screen','X studies: deterministic beats, actual UI, Example label, no borrowed footage or claims'],'photo_safety':'Originals retained. Portraits cropped, template-darkened; no face retouching or synthesized identity. Wristwatch excluded on slide14. Only still-life screens receive shadow lift.','remaining':['Slide9 founder video/audio take','Optional replacement slide3 whiteboard photo; current clean diagram fulfills authorized fallback'],'publication':'local review only'}
(OUT/'qa.json').write_text(json.dumps(qa,indent=2),encoding='utf-8')
html='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pulsify · highlight review</title><style>*{box-sizing:border-box}body{margin:0;background:#141416;color:#eee;font-family:Helvetica,Arial,sans-serif;padding:36px}h1{font-size:28px;margin:0 0 12px}p{max-width:780px;color:#bbb;line-height:1.5}a{color:#a4aaff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:28px;align-items:start}.tile{max-width:360px}img,video{width:100%;height:auto;display:block;border-radius:12px}.caption{font-size:14px;margin:12px 0;color:#aaa}video{margin-top:18px}</style></head><body><h1>Pulsify highlight · 14 slides</h1><p>1080 × 1920. Locked copy, real Helvetica and distinct original photos. Local review only. Slide 9 is a silent 27-second motion preview; your recorded take is still needed.</p><p><a href="pulsify-highlight-review.zip">Download the stills, preview and recording script</a> · <a href="project/recording-script.md">Recording script</a> · <a href="README.md">Build notes</a></p><div class="grid">'''
for n in range(1,15):
    html+=f'<section class="tile"><div class="caption">{n:02d} · {locked[n][0] if n==9 else next(a for a in audits if a["slide"]==n)["text"][0]}</div><a href="{n:02d}.png"><img src="{n:02d}.png" alt="Slide {n:02d}"></a>'
    if n==9:html+='<video controls preload="metadata" poster="09.png"><source src="09-preview.mp4" type="video/mp4"></video><p class="caption">Silent animatic, provisional subtitle timing.</p>'
    html+='</section>'
(OUT/'review.html').write_text(html+'</div></body></html>',encoding='utf-8')
with zipfile.ZipFile(OUT/'pulsify-highlight-review.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=3) as z:
    for n in range(1,15):z.write(OUT/f'{n:02d}.png',f'{n:02d}.png')
    for name in ['09-preview.mp4','contact-sheet.jpg','README.md','qa.json']:z.write(OUT/name,name)
    z.write(project/'recording-script.md','recording-script.md')
print('Verified all 14 stills, locked copy, Helvetica, distinct photos, safe zones and 648 decoded silent video frames. Packaged review.')

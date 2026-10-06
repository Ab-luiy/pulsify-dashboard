from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,re,zipfile,html
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/highlight-saas';project=OUT/'project';assets=project/'html/assets'
source=(ROOT/'wiki/content-engine/pulsify-saas-highlight-14-slide.md').read_text(encoding='utf-8');parts=re.split(r'^## (\d+)\. (.+)$',source,flags=re.M);locked={}
for k in range(1,len(parts),3):locked[int(parts[k])]=parts[k+2].split('PHOTO:')[0].split('SHOOT:')[0].strip().splitlines()
audits=json.loads((OUT/'layout-audit.json').read_text());mapping=json.loads((assets/'photo-map.json').read_text())
expected_ids={1:50,2:50,3:15,4:31,5:22,6:33,7:34,8:34,10:49,11:9,12:46,13:14,14:14}
assert {p['slide']:p['photo_id'] for p in mapping}==expected_ids,'Founder photo mapping differs'
assert {a['slide'] for a in audits}==set(expected_ids),'13 still audits required'
norm=lambda s:re.sub(r'\s+',' ',s).strip()
for a in audits:
    n=a['slide'];actual=a['text'];expected=[l.removeprefix('- ') for l in locked[n]]
    if n==3:actual=[' '.join(a['chain'])]+actual
    assert len(actual)==len(expected) and all(norm(x)==norm(y) for x,y in zip(actual,expected)),f'Slide {n}: copy differs'
    assert all(g['safe'] for g in a['geometry']),f'Slide {n}: unsafe bounds'
    assert all(t['ink_safe'] for t in a['typography']),f'Slide {n}: text ink outside safe bounds'
    if n!=11:assert all(t['authored_lines']==t['rendered_lines'] for t in a['typography']),f'Slide {n}: unintended automatic line wrap'
    assert a['fonts'] and all(f['familyName']=='Helvetica' for f in a['fonts']),f'Slide {n}: font differs'
    im=Image.open(OUT/f'{n:02d}.png');im.load();assert im.size==(1080,1920)
comparison=json.loads((OUT/'comparison-audit.json').read_text());assert len(comparison)==6 and all(g['safe'] for a in comparison for g in a['geometry'])
qa={'date':'2026-10-06','revision':'photo-aware composition and typography refinement','still_count':13,'dimensions':[1080,1920],'copy':'Exact locked words/punctuation verified; founder removal of opening so on 4/5 included','fonts':'Installed Helvetica verified through Chrome CDP','typography':'Authored semantic line breaks verified against actual rendered lines; no unintended wraps on refined stills. Slide11 unchanged pending photo.','photo_mapping':expected_ids,'preparation':'Uniform exposure; no fading masks or photo cutouts; Gaussian12px on2','annotations':'Red near-horizontal hand-drawn underlines; white open connectors and diagram icons','safe_zones':'All text/diagrams and actual text ink x60–1020, y250–1580','slide9':'Founder-owned; earlier media unchanged and excluded from this revision package','slide11':'Founder disputed current IMG_8529.JPEG; exact intended filename requested. Current photo shown provisionally, no replacement inferred.','framing':'11/13/14 pending founder choice; all six alternatives included. B shown provisionally in main review.','diagrams':'Conceptual, no fabricated quantitative results','publication':'Local review only'}
(OUT/'qa.json').write_text(json.dumps(qa,indent=2),encoding='utf-8')
thumb_w=324;thumb_h=576;gap=24;canvas=Image.new('RGB',(1416,2568),'#1a1a1e');draw=ImageDraw.Draw(canvas);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',21)
for n in range(1,15):
    x=gap+(n-1)%4*(thumb_w+gap);y=gap+(n-1)//4*(thumb_h+60)
    draw.text((x,y),f'{n:02d}'+(' · founder video' if n==9 else ' · photo pending' if n==11 else ' · framing pending' if n in [13,14] else ''),font=font,fill='white')
    if n==9:draw.text((x+26,y+230),'Your video goes here',font=font,fill='#aaa');continue
    canvas.paste(Image.open(OUT/f'{n:02d}.png').convert('RGB').resize((thumb_w,thumb_h),Image.Resampling.LANCZOS),(x,y+35))
canvas.save(OUT/'contact-sheet.jpg',quality=95)
page='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pulsify highlight revision</title><style>*{box-sizing:border-box}body{margin:0;background:#191919;color:#eee;font-family:Helvetica,Arial,sans-serif;padding:32px}h1{font-size:28px}p{color:#ccc;line-height:1.5;max-width:850px}a{color:#ddd}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:28px}.tile{max-width:360px}img{width:100%;display:block}.caption{margin:12px 0;font-size:14px}.placeholder{height:640px;background:#222;display:grid;place-items:center;color:#aaa}</style></head><body><h1>Pulsify highlight · composition revision</h1><p>Text placement follows each photo, with deliberate line breaks, clearer spacing and figures linked to the copy. Slide 8's approved type sizes are retained. Slide 9 is yours.</p><p>Slide 11's intended photo filename is pending; its current photo is shown for reference. Slides 11, 13 and 14 show B provisionally while you choose the framing.</p><p><a href="comparisons.html?rev=composition3">Compare A/B for 11, 13 and 14</a> · <a href="pulsify-highlight-review.zip">Download the revision and both framing options</a></p><div class="grid">'''
for n in range(1,15):
    page+=f'<section class="tile"><div class="caption">Slide {n:02d}'+(' · photo confirmation pending' if n==11 else ' · framing pending' if n in [13,14] else '')+'</div>'
    page+= '<div class="placeholder">Your slide 9 video</div>' if n==9 else f'<a href="{n:02d}.png"><img src="{n:02d}.png?revision=composition3" alt="Slide {n}"></a>'
    page+='</section>'
(OUT/'review.html').write_text(page+'</div></body></html>',encoding='utf-8')
with zipfile.ZipFile(OUT/'pulsify-highlight-review.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=3) as z:
    for n in expected_ids:z.write(OUT/f'{n:02d}.png',f'{n:02d}.png')
    for p in (project/'comparisons').glob('*.png'):z.write(p,'framing-options/'+p.name)
    for name in ['contact-sheet.jpg','framing-comparison.jpg','README.md','qa.json']:z.write(OUT/name,name)
print('Verified 13 stills and six framing previews: copy, exact photo IDs, Helvetica, safe bounds and dimensions.')

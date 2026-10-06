from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,re,zipfile,html,hashlib
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/highlight-saas';project=OUT/'project';assets=project/'html/assets'
source=(ROOT/'wiki/content-engine/pulsify-saas-highlight-14-slide.md').read_text(encoding='utf-8');parts=re.split(r'^## (\d+)\. (.+)$',source,flags=re.M);locked={}
for k in range(1,len(parts),3):locked[int(parts[k])]=parts[k+2].split('PHOTO:')[0].split('SHOOT:')[0].strip().splitlines()
audits=json.loads((OUT/'layout-audit.json').read_text(encoding='utf-8'));mapping=json.loads((assets/'photo-map.json').read_text(encoding='utf-8'))
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
comparison=json.loads((OUT/'comparison-audit.json').read_text(encoding='utf-8'));assert len(comparison)==6 and all(g['safe'] for a in comparison for g in a['geometry'])
product=assets/'product';crops=json.loads((product/'crops.json').read_text(encoding='utf-8'))
for c in crops:
    capture=product/c['capture'];assert hashlib.sha256(capture.read_bytes()).hexdigest()==c['capture_sha256'],'Capture hash differs'
    original=Image.open(capture).convert('RGB').crop(c['crop']);actual=Image.open(product/c['asset']).convert('RGB')
    assert original.size==actual.size and ImageChops.difference(original,actual).getbbox() is None,'Product crop differs from actual UI'
for a in audits:
    if a['slide'] in [10,12]:
        assert len(a['product'])==1 and 'Example · demo' in a['product'][0]['label'],'Demo label missing'
        assert any(s.endswith('/mark-white.svg') for s in a['product'][0]['assets']),'Integrated flat mark missing'
    else:assert not a['product'],'Unexpected product composition'
assert all('coin' not in s for a in audits for p in a['product'] for s in p['assets'])
qa={'date':'2026-10-06','revision':'product4: real dashboard crops, substantial figures, integrated flat branding','still_count':13,'dimensions':[1080,1920],'copy':'Exact locked words/punctuation verified; founder removal of opening so on 4/5 included','fonts':'Story copy uses installed Helvetica verified through Chrome CDP; captured product keeps native UI typography','typography':'Authored semantic line breaks verified against actual rendered lines; no unintended wraps on refined stills. Slide11 unchanged pending photo.','photo_mapping':expected_ids,'preparation':'Uniform exposure; no fading masks or photo cutouts; Gaussian12px on2','annotations':'Red near-horizontal hand-drawn underlines; substantial open arrows and filled explanatory figures','safe_zones':'All key text/figures and actual story text ink x60–1020, y250–1580','slide9':'Founder-owned; earlier media unchanged and excluded from this revision package','slide11':'Founder disputed current IMG_8529.JPEG; exact intended filename requested. Current photo shown provisionally, no replacement inferred.','framing':'11/13/14 pending founder choice; all six alternatives included. B shown provisionally in main review.','diagrams':'5/7/8 conceptual; no invented measurements. 10/12 contain real Example workspace UI, clearly labelled demo.','product_provenance':{'captures':'project/html/assets/product/sources.json','crop_manifest':'project/html/assets/product/crops.json','verification':f'{len(crops)} source hashes and pixel-identical crops verified; no UI values redrawn','used_capture_density':'2x'},'branding':'Canonical flat mark in product headers; floating 3D coin removed','publication':'Local review only'}
(OUT/'qa.json').write_text(json.dumps(qa,indent=2),encoding='utf-8')
thumb_w=324;thumb_h=576;gap=24;canvas=Image.new('RGB',(1416,2568),'#1a1a1e');draw=ImageDraw.Draw(canvas);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',21)
for n in range(1,15):
    x=gap+(n-1)%4*(thumb_w+gap);y=gap+(n-1)//4*(thumb_h+60)
    draw.text((x,y),f'{n:02d}'+(' · founder video' if n==9 else ' · photo pending' if n==11 else ' · framing pending' if n in [13,14] else ''),font=font,fill='white')
    if n==9:draw.text((x+26,y+230),'Your video goes here',font=font,fill='#aaa');continue
    canvas.paste(Image.open(OUT/f'{n:02d}.png').convert('RGB').resize((thumb_w,thumb_h),Image.Resampling.LANCZOS),(x,y+35))
canvas.save(OUT/'contact-sheet.jpg',quality=95)
focus=Image.new('RGB',(1068,1296),'#1a1a1e');fd=ImageDraw.Draw(focus)
for i,n in enumerate([3,5,7,8,10,12]):
    x=24+i%3*348;y=24+i//3*636;fd.text((x,y),f'Slide {n:02d}',font=font,fill='white')
    focus.paste(Image.open(OUT/f'{n:02d}.png').convert('RGB').resize((324,576),Image.Resampling.LANCZOS),(x,y+36))
focus.save(OUT/'visual-revision.jpg',quality=96)
page='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pulsify highlight revision</title><style>*{box-sizing:border-box}body{margin:0;background:#191919;color:#eee;font-family:Helvetica,Arial,sans-serif;padding:32px}h1{font-size:28px}p{color:#ccc;line-height:1.5;max-width:850px}a{color:#ddd}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:28px}.tile{max-width:360px}img{width:100%;display:block}.caption{margin:12px 0;font-size:14px}.placeholder{height:640px;background:#222;display:grid;place-items:center;color:#aaa}</style></head><body><h1>Pulsify highlight · product visuals revision</h1><p>New visuals on 3, 5, 7, 8, 10 and 12: stronger arrows, filled figures and real dashboard crops. The flat mark sits inside the product headers; the floating 3D coin is removed. Captured numbers are Example workspace demo data. Slide 8's approved type sizes are retained. Slide 9 is yours.</p><p>Slide 11's intended photo filename is pending; its current photo is shown for reference. Slides 11, 13 and 14 show B provisionally while you choose the framing.</p><p><a href="comparisons.html?rev=product4">Compare A/B for 11, 13 and 14</a> · <a href="pulsify-highlight-review.zip">Download the revision and both framing options</a></p><div class="grid">'''
for n in range(1,15):
    page+=f'<section class="tile"><div class="caption">Slide {n:02d}'+(' · photo confirmation pending' if n==11 else ' · framing pending' if n in [13,14] else '')+'</div>'
    page+= '<div class="placeholder">Your slide 9 video</div>' if n==9 else f'<a href="{n:02d}.png"><img src="{n:02d}.png?revision=product4" alt="Slide {n}"></a>'
    page+='</section>'
(OUT/'review.html').write_text(page+'</div></body></html>',encoding='utf-8')
with zipfile.ZipFile(OUT/'pulsify-highlight-review.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=3) as z:
    for n in expected_ids:z.write(OUT/f'{n:02d}.png',f'{n:02d}.png')
    for p in (project/'comparisons').glob('*.png'):z.write(p,'framing-options/'+p.name)
    for name in ['contact-sheet.jpg','visual-revision.jpg','framing-comparison.jpg','README.md','qa.json']:z.write(OUT/name,name)
    for name in ['sources.json','crops.json']:z.write(product/name,'product-provenance/'+name)
print('Verified 13 stills, six framing previews, genuine crop pixels, source hashes and demo labels: copy, exact photo IDs, Helvetica, safe bounds and dimensions.')

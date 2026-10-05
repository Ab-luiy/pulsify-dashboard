"""Verify the exported media, copy fidelity and IG safe zones."""
from pathlib import Path
import hashlib, json, re, subprocess
from PIL import Image
import imageio_ffmpeg

HERE=Path(__file__).resolve().parent
OUT=HERE.parent
VAULT=OUT.parents[1]
compile((HERE/'build.py').read_text(encoding='utf-8'),'build.py','exec')
copy=VAULT/'wiki/content-engine/pulsify-saas-highlight-sequence.md'
parts=re.split(r'## Slide (\d+)[^\n]*\n',copy.read_text(encoding='utf-8'))[1:]
source={int(parts[i]):parts[i+1].strip().splitlines() for i in range(0,len(parts),2)}
audit=json.loads((OUT/'layout-audit.json').read_text(encoding='utf-8'))
for n in range(1,13):
    with Image.open(OUT/f'{n:02}.png') as im:assert im.size==(1080,1920),(n,im.size)
for slide in audit['slides']:
    assert [b['source'] for b in slide['blocks']]==source[slide['slide']]
    for b in slide['blocks']:
        assert ' '.join(b['rendered_lines'])==b['source']
        x,y,right,bottom=b['bounds']
        assert 60<=x<right<=1020 and 250<=y<bottom<=1580,(slide['slide'],b)
        assert b['font_px']>=40,b
timing=json.loads((HERE/'timeline.json').read_text(encoding='utf-8'))
assert ' '.join(c[2] for c in timing['captions'])==source[8][1].split(': ',1)[1]
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
probe=subprocess.run([ffmpeg,'-hide_banner','-i',str(OUT/'08.mp4')],capture_output=True,text=True).stderr
assert '1080x1920' in probe,probe
assert '00:00:28.00' in probe,probe
assert '24 fps' in probe,probe
assert 'Audio:' not in probe
frames,secs=imageio_ffmpeg.count_frames_and_secs(str(OUT/'08.mp4'))
assert frames==672 and abs(secs-28)<.05,(frames,secs)
for second in [1,14,26]:
    subprocess.run([ffmpeg,'-v','error','-y','-ss',str(second),'-i',str(OUT/'08.mp4'),'-frames:v','1','-q:v','3',str(HERE/f'encoded-{second:02}.jpg')],check=True)
files=[OUT/f'{n:02}.png' for n in range(1,13)]+[OUT/'08.mp4']
report={
 'status':'review draft; final photos and founder recording pending',
 'stills':12,'dimensions':[1080,1920],'video_duration_seconds':secs,'video_frames':frames,'fps':24,
 'audio':'silent, intentional until the real recording arrives',
 'copy_fidelity':'exact words and punctuation; wraps inside pills',
 'safe_zones':'all audited copy pills within y=250..1580 and x=60..1020',
 'type_minimum_px':min(b['font_px'] for s in audit['slides'] for b in s['blocks']),
 'encoded_video_frames_inspected':[1,14,26],
 'visual_review':'all 12 at phone size; enlarged quote and logo; representative motion frames',
 'references_reviewed':['Niksetting New here: pills and single emphasis','founder/product direction: real work, graphite and homepage palette','Claude highlight brief: exact copy, coin, placeholders, abstract sales'],
 'remaining':['slide 6 wider room photo','slide 12 relaxed real photo','slide 8 founder footage and voice','slide 10 preferred laptop-and-notes photo','sales feature verification before filming literal scoreboard'],
 'files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files},
 'founder_photo_sha256':hashlib.sha256((HERE/'assets/founder-desk.jpeg').read_bytes()).hexdigest(),
 'copy_source_sha256':hashlib.sha256(copy.read_bytes()).hexdigest()
}
(OUT/'qa.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['stills','dimensions','video_duration_seconds','video_frames','type_minimum_px','status']},indent=2))

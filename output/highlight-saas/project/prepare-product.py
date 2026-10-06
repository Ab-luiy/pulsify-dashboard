from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[3]; P=Path(__file__).resolve().parent/'html/assets/product'
crops={
 'voice-context':('voice',(1090,266,1392,500)),
 'copy-formats':('write',(508,457,848,534)),
 'copy-context':('write',(505,273,1224,323)),
 'funnel-flow':('funnel',(32,1090,1408,1287)),
 'funnel-calls':('funnel',(720,943,1065,1077)),
 'funnel-cash':('funnel',(377,943,720,1077)),
 'funnel-calls-detail':('funnel',(740,960,950,1042)),
 'funnel-cash-detail':('funnel',(397,960,607,1042)),
 'funnel-source':('funnel',(32,490,914,636)),
 'funnel-visits':('funnel',(179,374,326,476)),
 'sales-scoreboard':('team',(32,280,1408,518)),
 'revenue-chart':('revenue',(32,403,1408,766)),
 'home-pipeline':('home',(32,398,1408,577))
}
manifest=[]
sources={s['name']:s for s in json.loads((P/'sources.json').read_text(encoding='utf-8'))}
for name,(source,box) in crops.items():
    scale=sources[source].get('device_scale_factor',1);pixel_box=tuple(int(v*scale) for v in box)
    original=P/f'{source}.png';im=Image.open(original).convert('RGB');assert pixel_box[2]<=im.width and pixel_box[3]<=im.height
    im.crop(pixel_box).save(P/f'{name}.png');manifest.append({'asset':name+'.png','capture':source+'.png','crop':pixel_box,'css_crop':box,'device_scale_factor':scale,'capture_sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'transformation':'crop only; no redrawn UI or changed values','workspace':'Example / demo data'})
(P/'crops.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
mark=(ROOT/'brand/logo/logo.svg').read_text(encoding='utf-8').replace('fill="currentColor"','fill="#ffffff"')
(P/'mark-white.svg').write_text(mark,encoding='utf-8')
print(f'Prepared {len(crops)} genuine product crops and recoloured canonical flat mark.')

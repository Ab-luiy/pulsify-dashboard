from pathlib import Path
import cv2,json,numpy as np
from PIL import Image
root=Path("visual-references/studies/bakers-liquid-gradients")
result=[]
for p in sorted(root.glob("source-*.mp4")):
 c=cv2.VideoCapture(str(p))
 c.set(0 if False else cv2.CAP_PROP_POS_MSEC,4000);ok,f=c.read()
 im=Image.fromarray(cv2.cvtColor(f,cv2.COLOR_BGR2RGB))
 im.save(root/(p.stem+"-04s.jpg"),quality=92)
 a=np.array(im); core=Image.fromarray(a[int(a.shape[0]*.1):int(a.shape[0]*.9)])
 q=core.resize((240,340)).quantize(colors=6)
 colors=q.getcolors();pal=q.getpalette()
 palette=[dict(hex="#%02x%02x%02x"%tuple(pal[i*3:i*3+3]),fraction=round(n/(240*340),3)) for n,i in sorted(colors,reverse=True)]
 c.set(cv2.CAP_PROP_POS_MSEC,0);_,f0=c.read();c.set(cv2.CAP_PROP_POS_FRAMES,669);_,f1=c.read()
 mae=float(np.mean(np.abs(cv2.resize(f0,(180,254)).astype(float)-cv2.resize(f1,(180,254)).astype(float))))
 result.append(dict(file=p.name,palette_method="6-color median-cut on central 80 percent at t=4s, resized 240x340; approximate compressed-pixel colors, not brand tokens",palette=palette,first_last_mean_absolute_rgb_difference_0_255=round(mae,2)))
 c.release()
(root/"palette-measurements.json").write_text(json.dumps(result,indent=2))
print(json.dumps(result))

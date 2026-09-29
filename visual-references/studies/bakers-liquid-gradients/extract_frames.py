from pathlib import Path
import cv2, json
from PIL import Image, ImageDraw
root=Path("visual-references/studies/bakers-liquid-gradients")
meta=[]
for p in sorted(root.glob("source-*.mp4")):
 c=cv2.VideoCapture(str(p)); fps=c.get(cv2.CAP_PROP_FPS); n=c.get(cv2.CAP_PROP_FRAME_COUNT)
 sheet=Image.new("RGB",(1440,760),"#eeeeee"); d=ImageDraw.Draw(sheet)
 samples=[0,2,4,6,8,10]
 for i,t in enumerate(samples):
  c.set(cv2.CAP_PROP_POS_MSEC,t*1000); ok,fr=c.read()
  if ok:
   im=Image.fromarray(cv2.cvtColor(fr,cv2.COLOR_BGR2RGB)); im.thumbnail((235,700))
   sheet.paste(im,(i*240,30)); d.text((i*240+10,8),f"{t:.1f}s",fill="black")
 sheet.save(root/(p.stem+"-timeline.jpg"))
 meta.append(dict(file=p.name,fps=fps,frames=n,duration_seconds=n/fps,width=c.get(3),height=c.get(4),sample_times=samples))
 c.release()
(root/"media-metadata.json").write_text(json.dumps(meta,indent=2))
print(json.dumps(meta))

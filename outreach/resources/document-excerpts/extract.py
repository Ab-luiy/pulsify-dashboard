from pathlib import Path
import subprocess
import pdfplumber
from PIL import Image

ROOT=Path(__file__).resolve().parent
pdf=ROOT/'pulsify-working-notes.pdf'
items=[
('content-01-ideas',1,133,340),
('content-02-recording',1,343,600),
('profile-01-highlights',2,133,403),
('profile-02-bio',2,404,625),
('funnel-01-vsl-opening',3,133,386),
('funnel-02-page-and-proof',3,389,628),
]
scale=3
with pdfplumber.open(pdf) as d:
    assert len(d.pages)==3
    for name,page,top,bottom in items:
        selected=d.pages[page-1].crop((43,top,552,bottom))
        assert len(selected.extract_text().split())>35
        subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-r','216',
            '-x',str(43*scale),'-y',str(top*scale),'-W',str(509*scale),'-H',str((bottom-top)*scale),
            '-singlefile','-png',str(pdf),str(ROOT/name)],check=True)
        im=Image.open(ROOT/(name+'.png'))
        print(name,im.size,len(selected.extract_text().split()),'words')

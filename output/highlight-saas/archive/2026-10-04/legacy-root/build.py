"""Editable, deterministic story layouts and a 28-second silent motion animatic.
No generated people, face editing, invented metrics, or external asset downloads.
"""
from pathlib import Path
import argparse, hashlib, json, math, re, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
import imageio_ffmpeg

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
VAULT = OUT.parents[1]
ASSETS = HERE / 'assets'
W,H = 1080,1920
INK = '#f4f2ef'
MUTED = '#aaa7a4'
SURFACE = '#17181b'
CORAL = '#8a4b3f'
COPY = VAULT / 'wiki/content-engine/pulsify-saas-highlight-sequence.md'
FONT = ASSETS / 'inter-600.ttf'
REG = ASSETS / 'inter-400.ttf'
parser = argparse.ArgumentParser()
parser.add_argument('--video', action='store_true')
parser.add_argument('--nowrap', action='store_true')
args = parser.parse_args()
text = COPY.read_text(encoding='utf-8')
chunks = re.split(r'## Slide (\d+)[^\n]*\n',text)[1:]
slides = {int(chunks[i]): chunks[i+1].strip().splitlines() for i in range(0,len(chunks),2)}
spoken = slides[8][1].split(': ',1)[1]
on_screen = slides[8][0].split(': ',1)[1]
photo = ImageOps.exif_transpose(Image.open(ASSETS/'founder-desk.jpeg')).convert('RGB')
coin = Image.open(ASSETS/'coin-master-3d.png').convert('RGBA')
flat = Image.open(ASSETS/'01-flat-white.png').convert('RGBA')
lockup = Image.open(ASSETS/'05-lockup-white.png').convert('RGBA')
audit = []
def font(n, regular=False): return ImageFont.truetype(str(REG if regular else FONT),n)
def width(s,n,regular=False): return font(n,regular).getlength(s)
def lines(s,n,maxwidth=884):
    if args.nowrap: return [s]
    words = s.split(' '); result=[]; row=''
    for word in words:
        candidate=(row+' '+word).strip()
        if width(candidate,n)>maxwidth and row:
            result.append(row);row=word
        else:row=candidate
    if row:result.append(row)
    return result
def atmosphere():
    # Approved homepage colours, light outside the content area, quiet fixed grain.
    y,x=np.mgrid[0:H,0:W].astype(np.float32)
    base=np.zeros((H,W,3),np.float32)+[11,12,13]
    for cx,cy,rx,ry,col,power in [(60,180,700,700,[138,75,63],.32),(1080,1180,800,950,[77,63,104],.18),(400,1900,1000,500,[57,64,72],.24)]:
        g=np.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2))*power
        base += g[:,:,None]*np.array(col)
    base+=np.random.default_rng(12).normal(0,.7,(H,W,1))
    return Image.fromarray(np.uint8(np.clip(base,0,255)))
BASE=atmosphere()
def paste_fit(canvas, im, box):
    x,y,w,h=box
    if im.mode=='RGBA' and im.getchannel('A').getbbox():im=im.crop(im.getchannel('A').getbbox())
    im=ImageOps.contain(im,(int(w),int(h)),Image.Resampling.LANCZOS)
    canvas.paste(im,(int(x+(w-im.width)/2),int(y+(h-im.height)/2)),im)
def original_photo(mode):
    # Only crop, resize, place. Never grade or reconstruct the person.
    if mode=='hands': crop=photo.crop((1350,1700,3800,3024))
    elif mode=='review':crop=photo.crop((700,850,4032,3024))
    else:crop=photo
    fitted=ImageOps.fit(crop,(W,1190),Image.Resampling.LANCZOS,centering=(.55,.5))
    canvas=BASE.copy(); canvas.paste(fitted,(0,730))
    if mode=='desk':
        # Blend only the empty wall, ending before the founder's head begins.
        fade=Image.new('RGBA',(W,130),(11,12,13,0))
        mask=Image.new('L',(1,130));mask.putdata([round(255*(1-y/129)**2) for y in range(130)])
        fade.putalpha(mask.resize((W,130)));canvas.paste(fade,(0,730),fade)
    return canvas
def placeholder(canvas,label):
    d=ImageDraw.Draw(canvas)
    d.rounded_rectangle((74,1070,1006,1550),radius=25,fill=SURFACE,outline='#343438',width=2)
    d.line((110,1110,970,1510),fill='#343438',width=2)
    d.line((970,1110,110,1510),fill='#343438',width=2)
    for j,s in enumerate(['photo pending',label]):
        d.text((112,1265+j*52),s,font=font(30,True),fill=MUTED)
def pill(canvas,s,y,n=44,align='left',hero=False,quiet=False):
    rows=lines(s,n); lineh=round(n*1.32); pad=22
    widest=max(width(row,n) for row in rows)
    pw=math.ceil(widest)+pad*2; ph=len(rows)*lineh+24
    x=76 if align=='left' else W-76-pw
    d=ImageDraw.Draw(canvas)
    d.rounded_rectangle((x,y,x+pw,y+ph),radius=15,fill='#101113')
    for i,row in enumerate(rows):d.text((x+pad,y+10+i*lineh),row,font=font(n),fill=MUTED if quiet else INK)
    if hero:
        d.line((x+pad,y+ph-5,min(x+pw-pad,x+pad+270),y+ph-5),fill=CORAL,width=5)
    return y+ph+13,(x,y,x+pw,y+ph),rows
def size_for(content,start,end,preferred):
    n=preferred
    while n>30:
        total=sum(len(lines(s,n))*round(n*1.32)+37 for s in content)
        if total<end-start and (not args.nowrap or all(width(s,n)<884 for s in content)):break
        n-=1
    if args.nowrap:
        while any(width(s,n)>884 for s in content):n-=1
    return n
def still(k):
    modes={1:'desk',2:'hands',5:'desk',9:'hands',10:'review'}
    canvas=original_photo(modes[k]) if k in modes else BASE.copy()
    if k==6:placeholder(canvas,'wide room / window')
    if k==12:placeholder(canvas,'relaxed personal moment')
    if k==8:
        paste_fit(canvas,coin,(260,570,560,560))
        pill(canvas,on_screen,350,53,hero=True)
        paste_fit(canvas,lockup,(350,1290,380,100))
        return canvas
    content=slides[k]
    start={1:310,2:290,3:390,4:290,5:290,6:285,7:320,9:300,10:310,11:440,12:360}[k]
    end=1000 if k in modes else (1020 if k in [6,12] else 1460)
    n=size_for(content,start,end,{1:57,2:42,3:43,4:40,5:42,6:45,7:44,9:45,10:48,11:44,12:47}[k])
    y=start; blocks=[]
    for i,s in enumerate(content):
        hero=(k==7 and s.startswith('"')) or (k==11 and s.startswith('"')) or (k==2 and i==4)
        chosen=n
        if hero and k in [7,11]:chosen=n+20
        y,bounds,wrapped=pill(canvas,s,y,chosen,'right' if k==6 else 'left',hero,k==4 and i==len(content)-1)
        blocks.append({'source':s,'rendered_lines':wrapped,'bounds':bounds,'font_px':chosen})
    if k==3:
        # Quiet chain motif; locked text above does the explaining.
        d=ImageDraw.Draw(canvas); d.line((110,1360,970,1360),fill='#676269',width=3)
        for x in np.linspace(110,970,6):d.ellipse((x-12,1348,x+12,1372),fill=INK)
    if k==11:
        d=ImageDraw.Draw(canvas)
        for i in range(3):d.rounded_rectangle((770+i*34,1335+i*25,850+i*34,1375+i*25),radius=20,outline='#4a4247',width=2)
    if k==12:paste_fit(canvas,flat,(885,1490,78,78))
    audit.append({'slide':k,'font_px':n,'blocks':blocks,'photo':modes.get(k),'photo_pending':k in [6,12]})
    return canvas
for k in range(1,13):still(k).save(OUT/f'{k:02}.png')
# 4 x 3 at 270 x 480, full phone-safe content, numbered outside the art.
sheet=Image.new('RGB',(1200,1665),'#0b0c0d');d=ImageDraw.Draw(sheet)
for k in range(1,13):
    x=24+((k-1)%4)*294;y=28+((k-1)//4)*545
    im=Image.open(OUT/f'{k:02}.png').resize((270,480),Image.Resampling.LANCZOS)
    sheet.paste(im,(x,y));d.text((x,y+492),f'{k:02}',font=font(24,True),fill=MUTED)
sheet.save(OUT/'contact-sheet.jpg',quality=94)
(OUT/'layout-audit.json').write_text(json.dumps({'wrapping':not args.nowrap,'safe_zone':[250,1580],'slides':audit},indent=2),encoding='utf-8')

# Spoken line is preserved verbatim. Timing is provisional until real voice arrives.
captions=[
 (0,3.8,"you shouldn't have to give up what you're good at"),
 (3.8,6.2,'to build an info business.'),
 (6.2,9.6,"so i took everything i've learned about content, funnels and sales,"),
 (9.6,12.2,'and built one place that runs it'),
 (12.2,15.7,'from the first view to the cash in your account.'),
 (15.7,18.8,'what to post. how to say it. where to send people.'),
 (18.8,22.0,"who's ready to buy. who's closing."),
 (22.0,25.0,'this is pulsify.')]
assert ' '.join(c[2] for c in captions)==spoken
def srt_time(t):
    ms=round(t*1000); return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
(HERE/'voiceover.srt').write_text('\n\n'.join(f'{i+1}\n{srt_time(a)} --> {srt_time(b)}\n{s}' for i,(a,b,s) in enumerate(captions))+'\n',encoding='utf-8')
(HERE/'timeline.json').write_text(json.dumps({'duration':28,'fps':24,'voiceover':spoken,'captions':captions,'founder_footage':'pending','audio':'pending','sales_ui':'abstract; no numbers or performance claims'},indent=2),encoding='utf-8')
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def panel(canvas,title,index,t):
    d=ImageDraw.Draw(canvas); top=625+round((1-smooth(t))*100)
    d.rounded_rectangle((90,top,990,top+580),radius=38,fill=SURFACE,outline='#474347',width=2)
    d.text((135,top+42),title,font=font(44),fill=INK)
    d.line((135,top+112,945,top+112),fill='#37373b',width=2)
    if index==0: # content plan, no invented client copy
        for j,lab in enumerate(['content','traffic','page']):
            y=top+160+j*110; d.rounded_rectangle((135,y,945,y+83),radius=18,outline='#4c4648',width=2)
            d.text((165,y+20),lab,font=font(30,True),fill=INK)
            d.line((420,y+42,870,y+42),fill='#615b61',width=5)
    elif index==1: # private-data-free lead list
        for j in range(3):
            y=top+170+j*105;d.ellipse((140,y,183,y+43),outline='#6b6267',width=2)
            d.rounded_rectangle((220,y+7,540,y+22),radius=7,fill='#494348')
            d.line((135,y+77,945,y+77),fill='#343438',width=2)
    elif index==2: # tracked link / whole chain
        for j,lab in enumerate(['content','traffic','page','sales calls','team','cash']):
            x=140+(j%3)*275;y=top+170+(j//3)*180
            d.rounded_rectangle((x,y,x+240,y+100),radius=22,outline='#666068',width=2)
            d.text((x+20,y+31),lab,font=font(29,True),fill=INK)
    elif index==3: # deliberately abstract call-team diagram, never a fake scoreboard
        d.line((540,top+210,280,top+410),fill='#716a70',width=3)
        d.line((540,top+210,800,top+410),fill='#716a70',width=3)
        for x,y in [(540,top+210),(280,top+410),(800,top+410)]:
            d.ellipse((x-54,y-54,x+54,y+54),fill=SURFACE,outline='#999197',width=3)
            d.ellipse((x-13,y-13,x+13,y+13),fill=INK)
    else: # attribution, no money or result numbers
        for j,lab in enumerate(['content','cash']):
            x=140+j*470;d.rounded_rectangle((x,top+220,x+300,top+365),radius=28,outline='#71656b',width=2)
            d.text((x+34,top+265),lab,font=font(42),fill=INK)
        d.line((440,top+290,610,top+290),fill=INK,width=3)
def frame(t):
    c=BASE.copy()
    if t<4:
        side=550+int(55*smooth(t/4));paste_fit(c,coin,((W-side)/2,580,side,side))
        pill(c,on_screen,350,53,hero=True)
    elif t<22:
        index=min(4,int((t-4)/3.6)); names=['content','traffic','page','sales calls','cash']
        local=(t-4)%3.6
        panel(c,names[index],index,local/.8)
        d=ImageDraw.Draw(c)
        # A tracked signal travels beneath each panel; no quantitative data.
        signal=135+round(810*smooth(min(local/2.8,1)))
        d.line((135,1240,945,1240),fill='#343438',width=2)
        d.ellipse((signal-5,1235,signal+5,1245),fill=INK)
        for j in range(5):
            x=380+j*80;d.rounded_rectangle((x,1285,x+48,1289),radius=2,fill=INK if j<=index else '#474347')
    else:
        side=470+int(35*smooth((t-22)/6));paste_fit(c,coin,((W-side)/2,530,side,side))
        paste_fit(c,lockup,(315,1120,450,120))
    for a,b,s in captions:
        if a<=t<b:
            rows=lines(s,43,858); d=ImageDraw.Draw(c);y=1510-len(rows)*61
            for row in rows:
                tw=width(row,43);d.rounded_rectangle(((W-tw)/2-20,y-4,(W+tw)/2+20,y+57),radius=12,fill='#101113')
                d.text(((W-tw)/2,y),row,font=font(43),fill=INK);y+=63
            break
    return c
for t in [1,6,10,14,18,21,26]:frame(t).save(HERE/f'motion-{t:02}.jpg',quality=90)
if args.video:
    writer=imageio_ffmpeg.write_frames(str(OUT/'08.mp4'),(W,H),fps=24,codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',macro_block_size=8,quality=8,output_params=['-preset','veryfast','-movflags','+faststart'])
    writer.send(None)
    for i in range(28*24):
        writer.send(np.asarray(frame(i/24)))
        if i%120==0:print(f'motion {i//24}/28 seconds',flush=True)
    writer.close()
print('stills, contact sheet, editable project and audit built',flush=True)

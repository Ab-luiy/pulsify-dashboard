"""Isolated review mockup. Reuses Claude photo preparation without changing his sources."""
from pathlib import Path
import sys, shutil, json, re, hashlib
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CLAUDE = HERE.parent / 'claude-v2'
sys.path.insert(0, str(CLAUDE))
import engine as E
E.HERE = str(HERE)
(HERE/'img').mkdir(exist_ok=True)
(HERE/'assets').mkdir(exist_ok=True)
PRODUCT = HERE.parent/'project/html/assets/product'
for name in ['voice-context.png','copy-formats.png','funnel-flow.png','funnel-calls-detail.png','funnel-cash-detail.png']:
    shutil.copy2(PRODUCT/name, HERE/'assets'/name)
shutil.copy2(ROOT/'brand/logo/logo.svg', HERE/'assets/mark.svg')
shutil.copy2(CLAUDE/'01.png', HERE/'01.png')

CSS = '''
*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#0b0c0d;color:#f1f1ee;font-family:Helvetica,Arial,sans-serif}
.photo{position:absolute;inset:0;width:1080px;height:1920px}.pos{position:absolute;left:76px;width:928px}.head{font-size:88px;line-height:1.04;font-weight:700;letter-spacing:-3.8px;margin:0}.copy{font-size:49px;line-height:1.24;letter-spacing:-1.1px;margin:0}.small{font-size:30px;line-height:1.3;letter-spacing:.5px}.label{font-size:26px;letter-spacing:3px;text-transform:uppercase;color:#d0d0ca}.text{filter:drop-shadow(0 2px 12px #000)}.muted{color:#c2c2bd}.under{position:relative;display:inline-block;white-space:nowrap}.under:after{content:'';position:absolute;left:0;right:0;bottom:-9px;border-bottom:8px solid #e5322d;border-radius:50%;transform:rotate(-.6deg)}.silver{background:#efeee9;color:#0b0c0d;box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 14px 8px;border-radius:7px}.panel{background:rgba(15,16,18,.94);border:1px solid rgba(255,255,255,.2);border-radius:24px;padding:30px}.green{color:#5fd6a4}.red{color:#ec504b}.step{display:flex;align-items:center;gap:28px;padding:20px 0;border-top:1px solid rgba(255,255,255,.3);font-size:69px;font-weight:700;letter-spacing:-2px}.num{width:58px;height:58px;border:2px solid #efeee9;border-radius:50%;display:grid;place-items:center;font-size:30px;font-weight:400;flex:none}.dots{display:flex;gap:14px}.dots i{width:14px;height:14px;border:1px solid #aaa;border-radius:50%}.dots i.on{background:#efeee9}.badge{display:flex;gap:22px;align-items:center;margin-bottom:24px}.badge span{font-size:26px;letter-spacing:3px}.frame{position:absolute;background:#17181a;border:1px solid #666;border-radius:18px;overflow:hidden}.row{display:flex;gap:24px;align-items:flex-start;margin-top:32px}.cross{color:#e5322d;font-size:52px;line-height:1}.rule{border-top:1px solid #9c9c98}.shade{position:absolute;left:28px;right:28px;background:radial-gradient(ellipse,rgba(0,0,0,.65),transparent 72%);pointer-events:none}
'''

slides=[]
def at(y,content,x=76,w=928,cls='text'):
    return f'<div class="pos {cls}" style="left:{x}px;top:{y}px;width:{w}px">{content}</div>'
def h(t,size=88):return f'<h1 class="head" style="font-size:{size}px">{t}</h1>'
def p(t,size=49,mt=0):return f'<p class="copy" style="font-size:{size}px;margin-top:{mt}px">{t}</p>'
def u(t):return f'<span class="under">{t}</span>'
def badge(n):return '<div class="badge"><span>0'+str(n)+' / the system</span><div class="dots">'+''.join('<i class="'+('on' if i==n else '')+'"></i>' for i in range(1,4))+'</div></div>'
def add(n,title,pid,body,copy,note):
    photo=HERE/'img'/f'{n:02}.png'
    if not photo.exists():
        original=ImageOps.exif_transpose(Image.open(E.find_photo(pid))).convert('RGB')
        scale=min(1080/original.width,1920/original.height)
        foreground=original.resize((round(original.width*scale),round(original.height*scale)),Image.Resampling.LANCZOS)
        if n==2:foreground=foreground.filter(ImageFilter.GaussianBlur(3))
        x=(1080-foreground.width)//2;y=1920-foreground.height
        canvas=Image.new('RGB',(1080,1920))
        if y:
            arr=np.asarray(foreground)
            distance=np.arange(y-1,-1,-1)
            period=distance%(2*foreground.height)
            indices=np.where(period<foreground.height,period,2*foreground.height-1-period)
            reflected=Image.fromarray(arr[indices])
            stack=[np.asarray(reflected if radius==0 else reflected.filter(ImageFilter.GaussianBlur(radius)),dtype=np.float32) for radius in [0,10,25,50]]
            t=(distance/max(1,y-1))*3
            extended=sum(a*np.clip(1-np.abs(t-i),0,1)[:,None,None] for i,a in enumerate(stack))
            canvas.paste(Image.fromarray(extended.clip(0,255).astype('uint8')),(x,0))
        canvas.paste(foreground,(x,y));canvas.save(photo)
    # Local scrims follow the text groups; photo exposure stays natural elsewhere.
    if n in [4,6,8,11,13,14]:
        body=body.replace('class="pos text"','class="pos text readability"')
    html='<!doctype html><html><head><meta charset="utf-8"><style>'+CSS+'.readability:before{content:"";position:absolute;inset:-24px -30px;background:rgba(0,0,0,.55);filter:blur(24px);z-index:-1}</style></head><body><img class="photo" src="'+Path(photo).as_uri()+'">'+body+'</body></html>'
    (HERE/f'{n:02}.html').write_text(html,encoding='utf-8')
    slides.append(dict(number=n,title=title,photo_id=pid,copy=copy,note=note))

slides.append(dict(number=1,title='The opening',photo_id=14,copy="i've been working on this for a whole year now. because everyone in this space is stuck on the same problem.",note="Claude's opening retained byte-for-byte. The one-year timeline remains a copy review question."))
add(2,'Two businesses',20,at(280,h("you're already good<br>at what you do.")+p('trading. tiktok shop. whatever it is.',44,34)+p('now you want to teach it.',49,28))+at(755,'<div class="rule"></div>'+p('your craft',42,28)+h('+ your mentorship',66)+p('content. an offer. a way to sell it.',42,28))+at(1220,p("so now you're learning",53)+h('<span class="silver">two businesses.</span>',95)+p('at once.',53,28)),"you're already good at what you do. trading. tiktok shop. whatever it is. now you want to teach it. but a mentorship is a business of its own: content, an offer, a way to sell it. so now you're learning two businesses at once.",'Proposed rewrite: removes the unsupported comparison of mentorship earnings with craft earnings. Whole café photo; type supplies the comparison.')
steps=['content.','traffic.','a page.','sales calls.','a team.','cash in the bank.']
add(3,'The whole chain',27,at(270,h("that's the<br>whole chain."))+at(510,''.join(f'<div class="step"><span class="num">{i+1}</span><span>{s}</span></div>' for i,s in enumerate(steps)))+at(1340,p("knowing your craft doesn't teach you<br>how to run all of this.",46)+p("that's the part you have to build.",46,22)),"content. traffic. a page. sales calls. a team. cash in the bank. that's the whole chain. knowing your craft doesn't teach you how to run all of this. that's the part you have to build.",'Proposed rewrite: retains the chain, removes the KPI put-down; follows Claude’s numbered-list composition.')
rows=["you want to post.<br>you don't know what to say.","you post.<br>nobody's watching.","people watch.<br>you don't know where to send them.","calls get booked.<br>you can't see what's happening after."]
add(4,'Where it breaks',31,at(320,h('it breaks<br>'+u('somewhere.')))+at(580,''.join('<div class="row"><span class="cross">×</span>'+p(t,47)+'</div>' for t in rows))+at(1330,p('one missing step is enough<br>to stop the next one.',45)),"it breaks somewhere: you want to post, but don't know what to say. you post, but nobody's watching. people watch, but you don't know where to send them. calls get booked, but you can't see what's happening after. one missing step is enough to stop the next one.",'Proposed concise diagnosis; no additional numerical claims. Keeps the founder work-photo background.')
add(5,'The conversation gets lost',38,at(270,h('you post something.'))+at(490,'<div style="border-left:2px solid #efeee9;padding-left:40px">'+p('a couple of people dm you.',53)+p('some conversations go nowhere.',53,64)+p('others never make it<br>onto a call.',53,64)+'</div>')+at(1080,p('and when someone does buy,',48)+h('which post<br>'+u('brought them in?'),78)+p("you can't tell.",48,40)),"you post something. a couple of people dm you. some conversations go nowhere. others never make it onto a call. and when someone does buy, you can't tell which post brought them in.",'Proposed rewrite: removes “lose half” and the invented 40/20/8 chart. A conversation path explains the leak without posing as measured data.')
browser='<div class="panel" style="padding:0;overflow:hidden"><div style="display:flex;align-items:center;gap:10px;padding:22px 26px;background:#252629"><i style="width:12px;height:12px;border-radius:50%;background:#9f9f98"></i><i style="width:12px;height:12px;border-radius:50%;background:#9f9f98"></i><i style="width:12px;height:12px;border-radius:50%;background:#9f9f98"></i><span class="small" style="margin-left:auto">2:07 AM</span></div><div style="display:flex;font-size:27px;gap:4px;padding:12px 12px 0">'+''.join('<span style="padding:18px;background:#292a2c;border-radius:10px 10px 0 0;flex:1">'+t+'</span>' for t in ['chatgpt','notion','drafts','+'])+'</div><div style="padding:40px 28px;font-size:45px;line-height:1.3;color:#ddd">what should i post tomorrow?<span style="color:#888"> ▍</span></div></div>'
add(6,'Try harder',37,at(270,h('so you '+u('try harder.'))+p('more posts. more tools.',50,44))+at(545,browser,cls='')+at(965,p('you start copying what<br>the big names do.',49)+p('their format takes over.<br>your own voice gets harder to hear.',49,32))+at(1320,p('meanwhile, the thing that pays you<br>gets '+u('less of your time.'),50)),"so you try harder. more posts. more tools. another chatgpt tab at 2am. you start copying what the big names do. their format takes over. your own voice gets harder to hear. meanwhile, the thing that pays you gets less of your time.",'Illustrative browser, not a real chat or testimonial. Carries Claude’s late-night artifact direction without the pile of tool labels.')
add(7,'The cost',26,at(365,p("eventually, you go back<br>to the business that",60)+h(u('pays the bills.'),94))+at(835,p('the mentorship gets pushed<br>to next week.',55)+p('then next month.',55,36))+at(1280,'<div class="rule"></div>'+p("you need a way to build it<br>alongside what you already do.",51,38)),"eventually, you go back to the business that pays the bills. the mentorship gets pushed to next week. then next month. you need a way to build it alongside what you already do.",'Proposed rewrite: replaces the generic plateau graph and blanket absolution with the practical two-business cost. Deliberately quiet type-led pause.')
add(8,'Your own voice',47,at(270,h('you can still<br>bring something new.',78)+p('your experience.<br>your way of explaining it.<br>the problems you see every day.',44,30))+at(930,h('"you don\'t need<br>to be first.',76)+h('you need to<br><span class="silver">sound like you.</span>"',76))+at(1430,p('that gives the content a direction.',43)),"you can still bring something new. your experience. your way of explaining it. the problems you see every day. you don't need to be first. you need to sound like you. that gives the content a direction.",'Proposed rewrite: drops universal niche rankings/monthly entrant claims. Keeps the approved quote as the dominant visual, with the walking photo whole.')
add(9,'The reveal — video storyboard',14,at(265,'<div class="label">video / storyboard frame</div>'+h('so i built<br>'+u('the bridge.'),100))+at(700,'<img src="assets/mark.svg" style="width:330px;filter:invert(1);display:block;margin:0 auto"><div style="font-size:80px;text-align:center;font-weight:700;margin-top:25px;letter-spacing:-3px">pulsify.</div>',cls='')+at(1250,p('content. offer. funnel. sales.',45)+p('one place to work through it.<br>with us.',52,32)),"so i built the bridge. you shouldn't have to give up what you're good at to build a mentorship. pulsify brings your content, offer, funnel and sales into one place, and we work through it with you.",'Static storyboard, not finished video. Founder footage remains required. Mark used here and in Claude’s opening only.')
add(10,'Content in your voice',49,at(270,badge(1)+h('you sit down.<br>you know what to make.',76))+at(600,'<div class="panel"><div class="label" style="margin-bottom:22px">your voice comes first</div><img src="assets/voice-context.png" style="display:block;width:100%;height:435px;object-fit:contain;object-position:left top"><div class="small muted" style="margin-top:12px">Pulsify / Example workspace</div></div>',cls='')+at(1230,p("content built around your voice,<br>your offer and the people you want to reach.",49)+p('and we work through it with you.',49,36)),"now you sit down and you know what to make. content built around your voice, your offer and the people you want to reach. and we work through it with you.",'Actual saved Voice crop, labelled Example workspace; no new results. Proposed copy makes the service role explicit.')
sales='<div class="panel"><div class="label">sales visibility</div>'+''.join('<div style="display:flex;align-items:center;justify-content:space-between;padding:30px 0;border-bottom:1px solid #444"><span style="font-size:48px">'+a+'</span><span class="small muted">'+b+'</span></div>' for a,b in [('calls taken','show rate'),('deals closed','close rate'),('cash collected','confirmed payments')])+'<div class="small muted" style="margin-top:24px">Illustrative layout / no client results</div></div>'
add(11,'The sales side',41,at(270,badge(2)+h('then the<br>'+u('sales side.'),90))+at(635,sales,cls='')+at(1250,p("you can see what happens<br>after a call gets booked.",50)+p('calls. closes. cash collected.<br>the numbers your team works against.',47,32)),"then the sales side. you can see what happens after a call gets booked. calls, closes, cash collected. the numbers your team works against.",'Story-scale illustrative arrangement of shipped sales metric fields, explicitly labelled; no invented performance values or fake conversations.')
flow=Image.open(PRODUCT/'funnel-flow.png')
# Preserve native pixels, enlarging two sections instead of shrinking seven stages into texture.
flow.crop((0,0,round(flow.width*3/7),flow.height)).save(HERE/'assets/flow-a.png')
flow.crop((round(flow.width*5/7),0,flow.width,flow.height)).save(HERE/'assets/flow-b.png')
add(12,'See what converts',46,at(270,badge(3)+h('see what<br>'+u('turns into a sale.'),84))+at(595,'<div class="panel"><div class="label" style="margin-bottom:28px">the funnel / Example workspace</div><img src="assets/flow-a.png" style="width:100%;height:210px;object-fit:contain;display:block"><div style="padding:14px 0;font-size:42px;color:#aaa">↓</div><img src="assets/flow-b.png" style="width:100%;height:210px;object-fit:contain;object-position:left;display:block"><div class="small muted" style="margin-top:18px">Demo figures. Not client results.</div></div>',cls='')+at(1330,p('tracked links connect content<br>to leads and matched payments.',45)+p('so the next post starts<br>with something to learn from.',45,26)),"tracked links connect content to leads and matched payments. you can see what turns into a sale. so the next post starts with something to learn from.",'Actual saved funnel UI, cropped into readable stage groups. Proposed copy separates tracked attribution from identifying every anonymous viewer. Removes sample $63,000 headline.')
add(13,'Built through the work',18,at(300,h('none of this was<br>built overnight.',84))+at(730,p('the research.',57)+p('the frameworks.',57,38)+p('the build.',57,38)+p('the testing.',57,38))+at(1300,p('brought into one place,<br>so you can keep doing<br>'+u("what you're good at."),51)),"none of this was built overnight. the research. the frameworks. the build. the testing. brought into one place, so you can keep doing what you're good at.",'Proposed rewrite: preserves documented work while removing “every framework was tested first”, which would imply universal business validation.')
add(14,'The close',34,at(320,h("right now, it's for<br>the people<br>i work with.",85))+at(975,p("we build the business with you.<br>pulsify is part of that.",51))+at(1280,p("it's getting sharper every week.",47)+p("and i'm not stopping until this<br>is a seven-figure company.",47,32)),"right now, it's for the people i work with. we build the business with you. pulsify is part of that. it's getting sharper every week. and i'm not stopping until this is a seven-figure company.",'Keeps founder ambition, clarifies service-plus-system access; no CTA or scarcity.')

canonical=(ROOT/'wiki/content-engine/pulsify-saas-highlight-14-slide.md').read_text(encoding='utf-8-sig')
sections=re.split(r'\n## ',canonical)
original={}
for s in sections:
    m=re.match(r'(\d+)\.',s)
    if m: original[int(m[1])]=s.split('\n',1)[1].split('PHOTO:')[0].split('SHOOT:')[0].strip()
for s in slides:s['original_copy']=original.get(s['number'],'')
(HERE/'slides.json').write_text(json.dumps(slides,ensure_ascii=False,indent=2),encoding='utf-8')
review='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pulsify story — full mockup</title><style>*{box-sizing:border-box}body{margin:0;background:#101112;color:#eee;font-family:Arial,sans-serif}header{padding:36px 5vw;max-width:1200px}h1{font-size:36px;letter-spacing:-1px}p{line-height:1.55;color:#bbb}main{padding:0 4vw 60px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:36px}article{min-width:0}article img{width:100%;display:block;border-radius:10px}h2{font-size:18px}summary{cursor:pointer;color:#ddd;padding:12px 0}details p{white-space:pre-wrap;font-size:14px}.tag{font-size:12px;color:#bbb;text-transform:uppercase;letter-spacing:1px}.tools a{color:#eee;margin-right:20px}.notes{font-size:13px}</style></head><body><header><div class="tag">Pulsify / design review / 08 October 2026</div><h1>The complete story sequence.</h1><p>14-frame mockup. Claude's opening retained; proposed copy and layouts follow. Slide 9 is a video storyboard. Product screenshots use the saved Example workspace. Copy changes are proposals, not an overwrite of the locked sequence.</p><p class="tools"><a href="contact-sheet.jpg">All slides together</a><a href="copy-review.md">Copy review</a></p></header><main>'''
import html
for s in slides:
    review+=f'<article><h2>{s["number"]:02} / {html.escape(s["title"])}</h2><a href="{s["number"]:02}.png"><img loading="lazy" src="{s["number"]:02}.png"></a><details><summary>Copy and design notes</summary><p><b>Existing copy</b>\n{html.escape(s["original_copy"])}</p><p><b>Mockup copy</b>\n{html.escape(s["copy"])}</p><p class="notes">{html.escape(s["note"])}</p></details></article>'
(HERE/'review.html').write_text(review+'</main></body></html>',encoding='utf-8')
md='# Full story mockup — copy review\n\nReview proposals only. Canonical copy and Claude assets are preserved. Slide 9 is a static video storyboard. Existing photos were used after library sync returned authorization error 7403. No real client results are implied.\n'
for s in slides:md+=f'\n## {s["number"]:02}. {s["title"]}\n\n### Existing\n\n{s["original_copy"]}\n\n### Mockup\n\n{s["copy"]}\n\n{s["note"]}\n'
(HERE/'copy-review.md').write_text(md,encoding='utf-8')
print('Generated 13 editable slide templates plus preserved opening and full review.',flush=True)

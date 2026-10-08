"""Apply the founder's slide-five rewrite, retaining the preceding review."""
from pathlib import Path
import shutil

P = Path(__file__).resolve().parent
snapshot = P / 'revisions' / 'before-tracking-rewrite'
snapshot.mkdir(parents=True, exist_ok=True)
for pattern in ['*.html', '*.png', '*.jpg', '*.json', 'build.py', 'copy-review.md', 'README.md']:
    for f in P.glob(pattern):
        target = snapshot / f.name
        if not target.exists():
            shutil.copy2(f, target)
# Retain the assets needed to open the preceding scenes independently.
if not (snapshot / 'assets').exists():
    shutil.copytree(P / 'assets', snapshot / 'assets')

f = P / 'build.py'
s = f.read_text(encoding='utf-8')
start = s.index("add(5,'Keep your voice'")
end = s.index('# Three product launch scenes', start)
s = s[:start] + '''# The missing journey: two publishing formats, then four unanswered questions.
formats='<div style="display:flex;align-items:center;gap:58px"><div style="width:550px"><div class="surface" style="height:250px;border-radius:18px;background:linear-gradient(135deg,#62616f,#1b1c25);display:grid;place-items:center"><div class="play">▶</div></div><div style="font-size:32px;margin-top:19px">a long video.</div></div><div style="width:177px"><div class="surface" style="height:310px;border-radius:24px;background:linear-gradient(145deg,#98929f,#272833);display:grid;place-items:center"><div class="play" style="width:64px;height:64px">▶</div></div><div style="font-size:32px;margin-top:19px;white-space:nowrap">a short one.</div></div></div>'
questions=''.join('<div style="display:flex;align-items:center;gap:22px;padding:19px 0;border-bottom:1px solid #ffffff30"><span style="font-size:33px;color:#ee5852;width:24px">?</span><span style="font-size:39px;letter-spacing:-.6px">'+q+'</span></div>' for q in ['which post brought them in?', 'did they reach your VSL or webinar?', 'how much did they watch there?', 'did they apply, book a call, buy?'])
add(5,'What happened after?',photo(47,'50% 50%',.55),band(255,330)+pos(265,p('you post a video. you see the views.',43)+h('but '+u('what happened after?'),70))+pos(590,formats,x=110,w=850,cls='critical')+band(980,470)+pos(1005,questions,x=90,w=900,cls='critical text')+pos(1465,p("that's the part i wanted to see.",48)),"you post a long video. or a short one. you see the views. but what happened after? which post brought them in? did they reach your VSL or webinar? how much did they watch there? did they apply, book a call, buy? that's the part i wanted to see.",'Founder tracking-problem rewrite. Long/short publishing formats and missing funnel journey are visualised. Watch question explicitly refers to the VSL/webinar on the funnel page, not individual viewing inside social platforms. Photo is a natural cover crop, no mirrored extension.')

''' + s[end:]
# Preserve the original content composition; give it the new bridge to tracking.
s = s.replace("p(\"this is the part i care about most.<br>getting what's in your head into something<br>the right person wants to watch.\",44)", "p(\"i want the content to sound like you.<br>then give people a tracked link<br>to the page where the next step happens.\",44)")
s = s.replace('your experience, turned into content. this is the part i care about most: getting what\'s in your head into something the right person wants to watch.', 'your experience, turned into content. i want the content to sound like you. then give people a tracked link to the page where the next step happens.')
# Move the sales payoff after attribution, preserving its proven composition.
s = s.replace("add(7,'A sales side you can see'", "add(8,'After they book'")
s = s.replace('<div class="scene-num">02 / sales</div>', '<div class="scene-num">03 / sales</div>')
s = s.replace("p(\"i wanted you to see what happens<br>after someone books. who takes the call.<br>what happened. what comes next.\",44)", "p(\"then they book. your team has the brief.<br>the call has a record.<br>and the follow-up has a plan.\",44)")
s = s.replace('the call ends. the work keeps moving. i wanted you to see what happens after someone books: who takes the call, what happened, what comes next.', 'the call ends. the work keeps moving. then they book. your team has the brief. the call has a record. and the follow-up has a plan.')
start = s.index("route='<svg")
end = s.index("add(9,'Why this matters to me'", start)
s = s[:start] + '''# One large journey object answers the questions in05 without tiny dashboard captures.
source='<div style="display:flex;align-items:center;gap:22px;margin-top:26px"><div class="play" style="width:68px;height:68px;font-size:25px">▶</div><div><div class="tile-label">where they came from</div><div style="font-size:39px;font-weight:700;margin-top:9px">YouTube / video link</div></div></div>'
watch='<div style="margin-top:28px;border:1px solid #ffffff38;border-radius:18px;padding:24px;background:linear-gradient(140deg,#444353,#1b1c26)"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:36px;font-weight:700">your VSL</span><span class="tile-label">watch activity</span></div><div style="height:72px;display:flex;gap:5px;align-items:center;margin-top:16px">'+''.join('<i style="flex:1;height:'+str(16+(j*19)%52)+'px;background:#bbb9ce;border-radius:3px;opacity:'+str(.35+j/70)+'"></i>' for j in range(42))+'</div><div style="height:5px;border-radius:3px;background:#6d6c7e;margin-top:9px"></div><div class="mini" style="margin-top:19px">plays. watch depth. page activity.</div></div>'
steps='<div style="display:flex;align-items:center;justify-content:space-between;margin-top:28px">'+''.join('<div style="font-size:29px"><span style="display:inline-block;width:10px;height:10px;background:#8be5be;border-radius:50%;margin-right:10px"></span>'+t+'</div>' for t in ['application','booked call','payment'])+'</div>'
journey=ui(source+watch+steps,'Pulsify / the person’s journey')
add(7,'Now you can see the journey','stage',pos(265,'<div class="scene-num">02 / tracking</div>'+h('now you can see<br>'+u('what happened.'),93))+pos(565,'<div style="position:relative;height:730px;perspective:1900px"><div class="brand" style="position:absolute;left:670px;top:-35px;width:200px;height:200px;transform:rotateY(-25deg)"></div><div class="surface" style="position:absolute;left:35px;top:0;padding:18px 26px;font-size:33px;transform:rotateZ(-3deg)">tracked link <span style="color:#b5b1d6;margin-left:20px">source captured</span></div><div class="metal" style="position:absolute;left:20px;top:115px;width:850px;transform:rotateY(-7deg) rotateZ(2deg)">'+journey+'</div></div>',x=90,w=900,cls='critical')+pos(1365,p("the source. the watch activity.<br>the stage they're at. the matched payment.<br>i wanted all of it in one place.",44))+pos(1575,'<div class="foot">Illustrative journey · watch activity on your funnel page</div>'),"now you can see what happened. a tracked link captures the source. on your funnel page, see VSL watch activity. once they identify themselves, connect the activity to the person, their funnel stage and matched payment. i wanted all of it in one place.",'Redesigned story-scale journey visual; conceptual waveform is not measured retention data. UTM source applies to tagged clicks, watch depth to the embedded Wistia funnel-page player. Identity joins after identification; cash uses first tagged source and confirmed matched payments net of refunds. No claim of tracking individual YouTube/Instagram watchers, arbitrary external webinar players, every conversion or untagged traffic.')

''' + s[end:]
s = s.replace('because i want you to keep doing<br>the thing you\'re good at.', 'because i want you to keep doing<br>the thing you\'re good at.')
s = s.replace("p(\"we work through the business with you.<br>pulsify is where it all comes together.\",47)", "p(\"we build the business with you.<br>pulsify connects what you post<br>to what happens after.\",47)")
s = s.replace('we work through the business with you. pulsify is where it all comes together.', 'we build the business with you. pulsify connects what you post to what happens after.')
# Sort review and copy in actual slide order after the source-level reorder.
s = s.replace("(P/'slides.json').write_text", "S.sort(key=lambda scene: scene['number'])\n(P/'slides.json').write_text")
s = s.replace('Nine-frame redesign. Tighter photography.', 'Nine-frame redesign, updated with the slide05 tracking rewrite. Tighter photography.')
s = s.replace('Existing locked copy preserved.', 'Updated with the founder’s slide05 tracking direction and connected payoff. Existing locked copy preserved.')
f.write_text(s, encoding='utf-8')
print('Preserved preceding review and rewrote slides05–09.')

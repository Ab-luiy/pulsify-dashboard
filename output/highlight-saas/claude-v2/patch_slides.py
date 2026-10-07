import re, os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slides.py')
s = open(p, encoding='utf-8').read()


def swap(name, new):
    global s
    s = re.sub(r'def %s\(\):.*?(?=\n\n\n# -{10,}|\n\n\nSLIDES)' % name, new.rstrip('\n'), s, count=1, flags=re.S)


swap('s02', '''def s02():
    img = prep_photo(50, 'p02.png', blur=14)
    rings = (f'<svg width="400" height="230" viewBox="0 0 400 230"><circle cx="140" cy="115" r="100" fill="none" stroke="{SILVER}" stroke-width="9"/>'
             f'<circle cx="260" cy="115" r="100" fill="none" stroke="{SILVER}" stroke-width="9"/></svg>')
    body = scene(img, .5, .3, .5)
    body += at(280, p("you're already good at what you do.", 92, 700, lh=1.03, ls=-3.4)
               + p("trading. tiktok shop. whatever it is.", 50, 400, MUTE, mt=34)
               + p("and you know a mentorship can make you more than the thing itself.", 50, mt=26)
               + p("but info is a whole business on its own.", 50, 700, mt=26))
    body += at(1090, p("so now you're learning", 62, ls=-1.8)
               + f'<div style="margin:16px 0 14px -4px">{block("two businesses", 138)}</div>'
               + f'<div style="display:flex;align-items:center;justify-content:space-between">{p("at once.", 62, ls=-1.8)}{rings}</div>')
    return body
''')

swap('s04', '''def s04():
    img = prep_photo(31, 'p04.png')
    items = ["you want to post, but you don't know what to say", "you know what to say, but nobody's watching",
             "people are watching, but you don't know where to send them", "calls are booked, but you can't tell who's closing and who isn't"]
    rows = ''.join(f'<div style="display:flex;gap:30px;align-items:flex-start;padding:28px 0;border-top:1px solid rgba(255,255,255,.18)">{xmark(RED)}'
                   f'<div style="font-size:48px;line-height:1.2;letter-spacing:-1px;width:800px">{t}</div></div>' for t in items)
    body = scene(img, .1, .35, .72)
    body += at(660, p("it breaks somewhere:", 104, 700, lh=1, ls=-4.2))
    body += at(840, rows)
    return body
''')

swap('s05', '''def s05():
    img = prep_photo(22, 'p05.png')
    specs = [("a couple of people dm you.", 936, 46), ("you lose half of them in the chat.", 792, 42), ("the ones who book don't close.", 660, 40)]
    y = [470, 640, 810]; ph = 108
    pills = ''; walls = ''
    for i, (t, w, fs) in enumerate(specs):
        left = 72 + (936 - w) // 2
        pills += (f'<div class="abs" style="left:{left}px;top:{y[i]}px;width:{w}px;height:{ph}px;background:{SILVER};color:{GRAPH};border-radius:54px;display:flex;align-items:center;'
                  f'justify-content:center;font-size:{fs}px;font-weight:700;letter-spacing:-.9px;white-space:nowrap;box-shadow:0 14px 40px rgba(0,0,0,.45)">{t}</div>')
        if i < 2:
            w2 = specs[i + 1][1]; l2 = 72 + (936 - w2) // 2
            walls += (f'<line x1="{left+22}" y1="{y[i]+ph-6}" x2="{l2+22}" y2="{y[i+1]+6}" stroke="{RED}" stroke-width="6" stroke-linecap="round"/>'
                      f'<line x1="{left+w-22}" y1="{y[i]+ph-6}" x2="{l2+w2-22}" y2="{y[i+1]+6}" stroke="{RED}" stroke-width="6" stroke-linecap="round"/>')
    body = scene(img, .58, .25, .58)
    body += at(290, p("you post something.", 92, 700, lh=1.02, ls=-3.4))
    body += f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{walls}</svg>' + pills
    body += at(1010, p("and you have no idea " + ul("which post") + " brought any of them in.", 54, 700, lh=1.2, ls=-1.3))
    return body
''')

swap('s06', '''def s06():
    img = prep_photo(33, 'p06.png')
    tabs = ''.join(f'<div style="width:96px;height:40px;border-radius:10px;border:3px solid rgba(239,238,233,{.9 if i==0 else .42});flex:none"></div>' for i in range(9))
    body = scene(img, .35, .45, .72)
    body += at(262, f'<div style="display:flex;gap:8px">{tabs}</div>', width=940)
    body += at(780, p("so you try harder.", 112, 700, lh=1, ls=-4.4))
    body += at(960, p("more posts. more tools.", 52, ls=-1.3)
               + p("another chatgpt tab at " + block("2am", 56, pad='0 18px 12px', radius=14), 52, ls=-1.3, mt=14)
               + p("you start copying what the big names do.", 52, ls=-1.3, mt=36)
               + p("and you end up promoting their format instead of building your own.", 52, ls=-1.3, mt=26)
               + p("meanwhile the thing that actually pays you gets " + ul("less of your time."), 52, 700, ls=-1.3, mt=46))
    return body
''')

swap('s11', '''def s11():
    img = prep_photo_extended(9, 'p11.png', 380)
    rows = (f'<div style="display:flex;align-items:center;gap:22px">{check(EMERALD)}<div style="font-size:50px;font-weight:700;letter-spacing:-1.4px">you see who\\'s closing.</div></div>'
            f'<div style="display:flex;align-items:center;gap:22px;margin-top:20px">{xmark(RED)}<div style="font-size:50px;font-weight:700;letter-spacing:-1.4px">who\\'s not.</div></div>')
    body = scene(img, .35, .08, .6)
    body += at(262, p("then the sales side.", 96, 700, lh=1, ls=-3.6))
    body += at(1130, rows + p("who's hitting their calls. who's hitting your numbers.", 44, ls=-1, mt=34)
               + p("no more guessing what happened on a call.", 44, ls=-1, mt=20) + p("no scripts to write yourself.", 44, 700, ls=-1, mt=20))
    return body
''')

s = s.replace("box=(1500, 1000, 2625, 3000)", "box=(1650, 1250, 2648, 3024)")
open(p, 'w', encoding='utf-8').write(s)
print('ok', 'prep_photo_extended(9' in s, '1650, 1250' in s)

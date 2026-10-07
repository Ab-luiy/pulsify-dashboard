import os, re
here = os.path.dirname(os.path.abspath(__file__))
sp = os.path.join(here, 'slides_r2.py')
s = open(sp, encoding='utf-8').read()


def swap(name, new):
    global s
    pat = r'def %s\(\):.*?(?=\n\n\n# -{10,})' % name
    assert re.search(pat, s, flags=re.S), name
    s = re.sub(pat, lambda m: new.rstrip('\n'), s, count=1, flags=re.S)


swap('s06', '''def s06():
    img = prep_photo_full(37, 'p06.png')
    tools = [('chatgpt', 40, 250, -6), ('notion', 330, 215, 4), ('reels', 600, 262, -3), ('youtube', 80, 345, 5), ('docs', 410, 330, -5),
             ('dms', 690, 360, 6), ('sheet', 40, 440, -4), ('calendly', 300, 450, 3), ('carousel', 590, 460, -6)]
    chips = ''
    for i, (t, x, y, r) in enumerate(tools):
        fill = SILVER if i % 3 == 0 else 'rgba(14,15,17,.78)'
        col = GRAPH if i % 3 == 0 else INK
        chips += (f'<div class="abs" style="left:{x}px;top:{y}px;padding:14px 34px 18px;border-radius:999px;background:{fill};color:{col};'
                  f'border:2px solid rgba(239,238,233,.55);font-size:46px;font-weight:700;letter-spacing:-1px;transform:rotate({r}deg);box-shadow:0 14px 34px rgba(0,0,0,.5)">{t}</div>')
    body = scene(img, .45, .64, .84) + chips
    body += at(560, f'<div class="label" style="font-size:26px">9 tabs open. none of them talk to each other.</div>')
    body += at(800, p("so you try harder.", 112, 700, lh=1, ls=-4.4))
    body += at(980, p("more posts. more tools.", 52, ls=-1.3)
               + p("another chatgpt tab at " + block("2am", 56, pad='0 18px 12px', radius=14), 52, ls=-1.3, mt=14)
               + p("you start copying what the big names do.", 52, ls=-1.3, mt=36)
               + p("and you end up promoting their format instead of building your own.", 52, ls=-1.3, mt=26)
               + p("meanwhile the thing that actually pays you gets " + ul("less of your time."), 52, 700, ls=-1.3, mt=46))
    return body
''')

swap('s07', '''def s07():
    img = prep_photo_full(26, 'p07.png')
    X0, X1, Y0, Y1 = 40, 920, 40, 420                      # plot area inside a 960x520 svg
    grid = ''.join(f'<line x1="{X0}" y1="{y}" x2="{X1}" y2="{y}" stroke="rgba(255,255,255,.14)" stroke-width="2"/>' for y in (40, 160, 280, 400))
    months = ''.join(f'<text x="{X0 + i*176}" y="470" font-family="Helvetica,Arial" font-size="26" fill="{MUTE}" text-anchor="middle">month {i+1}</text>' for i in range(6))
    info_up = 'M40 400 C 170 392, 250 300, 330 200 S 470 70, 520 62'
    info_down = 'M520 62 C 580 56, 620 150, 680 250 S 800 380, 920 402'
    svg = (f'<svg width="960" height="500" viewBox="0 0 960 500">{grid}'
           f'<path d="M520 62 C 580 56, 620 150, 680 250 S 800 380, 920 402 L 920 400 L 520 400 Z" fill="rgba(229,50,45,.20)"/>'
           f'<line x1="{X0}" y1="236" x2="{X1}" y2="236" stroke="{SILVER}" stroke-width="12" stroke-linecap="round"/>'
           f'<path d="{info_up}" fill="none" stroke="{EMERALD}" stroke-width="12" stroke-linecap="round"/>'
           f'<path d="{info_down}" fill="none" stroke="{RED}" stroke-width="12" stroke-linecap="round" stroke-dasharray="2 22"/>'
           f'<circle cx="520" cy="62" r="20" fill="{EMERALD}"/><circle cx="520" cy="62" r="34" fill="none" stroke="{EMERALD}" stroke-width="4" opacity=".5"/>'
           f'<circle cx="920" cy="402" r="16" fill="{RED}"/>{months}</svg>')
    tags = (f'<div class="abs" style="left:78px;top:276px">{block("main business", 36, pad="6px 22px 16px", radius=999)}</div>'
            f'<div class="abs" style="left:610px;top:70px;font-size:34px;font-weight:700;color:{EMERALD};letter-spacing:-.6px">info side<br>peaks</div>'
            f'<div class="abs" style="left:660px;top:376px;font-size:34px;font-weight:700;color:{RED};letter-spacing:-.6px">and quietly dies</div>')
    body = scene(img, .78, .6, .7)
    body += at(262, p("that's where most people " + ul("plateau."), 84, 700, lh=1.06, ls=-3)
               + p("then they pick the main business, because that's what keeps food on the table.", 46, ls=-1, mt=34)
               + p("and the info side dies quietly.", 46, ls=-1, mt=20)
               + p("none of that is your fault.", 46, 700, ls=-1, mt=20))
    body += at(900, svg, left=60, width=960) + f'<div class="abs" style="left:60px;top:900px;width:960px;height:500px">{tags}</div>'
    return body
''')

swap('s08', '''def s08():
    img = prep_photo_full(47, 'p08.png')
    top = ''.join(f'<div style="width:120px;height:120px;border-radius:50%;background:{SILVER};color:{GRAPH};display:grid;place-items:center;font-size:62px;font-weight:700;'
                  f'letter-spacing:-2px;box-shadow:0 12px 34px rgba(0,0,0,.5)">{i+1}</div>' for i in range(4))
    new = ''.join(f'<div style="width:{sz}px;height:{sz}px;border-radius:50%;background:{EMERALD};color:{GRAPH};display:grid;place-items:center;font-size:{int(sz*.28)}px;font-weight:700;'
                  f'opacity:{op};margin-top:{mt}px">new</div>' for sz, op, mt in [(70, .55, 18), (84, .75, 4), (98, .9, 22), (112, 1, 0)])
    arrow = (f'<svg width="120" height="150" viewBox="0 0 120 150"><path d="M20 140 C 30 70, 70 40, 92 14" fill="none" stroke="{EMERALD}" stroke-width="9" stroke-linecap="round"/>'
             f'<path d="M62 8 L 100 8 L 98 46" fill="none" stroke="{EMERALD}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    rows = (f'<div class="label" style="margin-top:34px">the top of every niche: 3 or 4 names</div>'
            f'<div style="display:flex;gap:26px;margin-top:16px">{top}</div>'
            f'<div style="display:flex;align-items:flex-end;gap:22px;margin-top:22px">{arrow}<div style="display:flex;align-items:flex-end;gap:20px;padding-bottom:8px">{new}</div></div>'
            f'<div class="label" style="margin-top:10px;color:{EMERALD}">new faces, every single month</div>')
    body = scene(img, .86, .7, .15)
    body += at(262, p("here's what most people miss.", 64, 700, lh=1.04, ls=-2.4) + rows
               + p("but new people break in every single month.", 42, ls=-1, mt=34)
               + p("not because they're bigger. because they bring something new.", 42, ls=-1, mt=14)
               + p("people always want a new face with a new idea.", 42, ls=-1, mt=14)
               + f'<div style="margin-top:30px;font-size:62px;line-height:1.08;font-weight:700;letter-spacing:-2.4px">"you don\\'t need to be first. you need to {block("sound like you.", 62, pad="0 16px 10px", radius=14)}"</div>')
    return body
''')

s = s.replace(" &nbsp;&middot;&nbsp; 9 paid x $7,000", "")
open(sp, 'w', encoding='utf-8').write(s)
print('ok', '9 paid x' not in s)

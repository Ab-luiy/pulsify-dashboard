import os, re
here = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(here, 'refstyle.py')
s = open(p, encoding='utf-8').read()


def swap(name, new):
    global s
    pat = r'def %s\(\):.*?(?=\n\n\n# -{10,}|\n\n\nD = )' % name
    assert re.search(pat, s, flags=re.S), name
    s = re.sub(pat, lambda m: new.rstrip('\n'), s, count=1, flags=re.S)


swap('s06d', '''def s06d():
    img = prep_photo_full(37, 'p06.png')
    random.seed(5)
    names = ['chatgpt', 'notion', 'reels', 'docs', 'youtube', 'dms', 'sheet', 'calendly', 'carousel', 'gmail', 'canva', 'drive', 'tiktok', 'script', 'todo', 'ideas']
    tags = ''
    k = 0
    for row in range(6):
        for col in range(6):
            x = 40 + col * 168 + random.uniform(-26, 26) + (row % 2) * 40
            y = 215 + row * 82 + random.uniform(-16, 16)
            rot = random.uniform(-24, 24)
            silver = (row + col) % 3 == 0
            bg = SILVER if silver else ('rgba(30,31,34,.94)' if (row + col) % 3 == 1 else 'rgba(92,94,100,.94)')
            fg = GRAPH if silver else INK
            tags += (f'<div class="abs" style="left:{x:.0f}px;top:{y:.0f}px;padding:8px 24px 13px;border-radius:12px;background:{bg};color:{fg};'
                     f'border:1px solid rgba(255,255,255,.28);font-size:36px;font-weight:700;letter-spacing:-.7px;transform:rotate({rot:.0f}deg);box-shadow:0 8px 20px rgba(0,0,0,.5)">{names[k % len(names)]}</div>')
            k += 1
    body = scene(img, .45, .64, .84) + tags
    body += at(720, f'<div class="label" style="font-size:26px">36 tools. none of them talk to each other.</div>')
    body += V.text6(810)
    return body
''')

swap('s07d', '''def s07d():
    img = prep_photo_full(26, 'p07.png')
    rows = [('month 1', 'launched the info side', EMERALD), ('month 3', 'posting every day', EMERALD),
            ('month 4', 'the main business gets busy', '#e6b04d'), ('month 6', 'info side: quiet', RED)]
    px = 930
    out = ''
    path_pts = []
    for i, (m, lab, col) in enumerate(rows):
        y = 840 + i * 170
        cx_dot, cy_dot = px - i * 26, y + 64
        path_pts.append((cx_dot, cy_dot))
        out += (f'<div class="abs" style="left:50px;top:{y}px;width:760px;height:128px;border-radius:30px;background:rgba(18,19,22,.84);border:1px solid rgba(255,255,255,.2);'
                f'display:flex;align-items:center;gap:26px;padding:0 32px;box-shadow:0 16px 40px rgba(0,0,0,.5)">'
                f'<div style="font-size:60px;font-weight:700;letter-spacing:-2.4px;color:{col};flex:none;white-space:nowrap">{m}</div>'
                f'<div style="font-size:36px;line-height:1.1;letter-spacing:-.7px">{lab}</div></div>')
    svg = f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
    for i, (cx, cy) in enumerate(path_pts):
        col = rows[i][2]
        svg += f'<line x1="810" y1="{cy}" x2="{cx - 30}" y2="{cy}" stroke="rgba(255,255,255,.6)" stroke-width="3"/>'
        svg += f'<circle cx="{cx}" cy="{cy}" r="20" fill="{col}"/><circle cx="{cx}" cy="{cy}" r="32" fill="none" stroke="{col}" stroke-width="3" opacity=".55"/>'
        if i:
            px0, py0 = path_pts[i - 1]
            svg += f'<line x1="{px0}" y1="{py0 + 34}" x2="{cx}" y2="{cy - 34}" stroke="{col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 16"/>'
    svg += '</svg>'
    body = scene(img, .84, .8, .84) + V.band(740, 800) + out + svg + V.text7(262)
    return body
''')

swap('s08d', '''def s08d():
    img = prep_photo_full(47, 'p08.png')
    T = 560
    pyr = (f'<svg class="abs" style="left:0;top:{T}px" width="{W}" height="540" viewBox="0 0 {W} 540">'
           f'<polygon points="540,10 695,190 385,190" fill="rgba(239,238,233,.94)"/>'
           f'<polygon points="371,206 709,206 980,520 100,520" fill="rgba(95,214,164,.8)"/>'
           f'<text x="540" y="160" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="44" fill="{GRAPH}">3 or 4</text>'
           f'<text x="540" y="398" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="78" fill="{GRAPH}">new faces</text>'
           f'<text x="540" y="462" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" font-size="46" fill="{GRAPH}">every month</text></svg>')
    lab = lambda t, y, col: (f'<div class="abs" style="left:50px;top:{y}px;padding:2px 22px 12px;border:5px solid {col};border-radius:10px;font-size:60px;font-weight:700;letter-spacing:-1px;color:{col};background:rgba(11,12,13,.55)">{t}</div>')
    labels = lab('TOP', T + 70, SILVER) + lab('NEW', T + 300, EMERALD)
    connectors = (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
                  f'<line x1="232" y1="{T + 126}" x2="400" y2="{T + 126}" stroke="{SILVER}" stroke-width="5"/><line x1="232" y1="{T + 356}" x2="300" y2="{T + 356}" stroke="{EMERALD}" stroke-width="5"/></svg>')
    body = scene(img, .86, .7, .15)
    body += at(262, p("here's what most people miss.", 64, 700, lh=1.04, ls=-2.4) + p("the top of every niche is 3 or 4 names.", 42, ls=-1, mt=24))
    body += pyr + labels + connectors
    body += at(1130, V.text8(0, 0))
    return body
''')
open(p, 'w', encoding='utf-8').write(s)
print('ok')

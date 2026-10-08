"""Builds slides_r9.py from slides_r8.py with the round-9 edits (logo layer off, slide 5/11/12/14 changes)."""
s = open('slides_r8.py', encoding='utf-8').read()
t = s
t = t.replace("return body[:i] + f'<img class=\"abs\" src=\"file:///{MARKU}\" style=\"left:620px;top:1330px;width:600px;opacity:.085\">' + body[i:]", "return body")

# slide 11: italic regular bullets
a = t.index("    body += at(1450, bz(\"who's hitting their calls?\"")
b = t.index("    return logo_layer(body)", a)
new11 = '''    bi11 = lambda x: f'<div style="display:flex;gap:16px;align-items:center;margin-top:12px"><div style="width:14px;height:14px;border-radius:50%;background:{RED};flex:none"></div><div style="font-size:50px;font-weight:400;font-style:italic;letter-spacing:-1.2px;{SH}">{x}</div></div>'
    body += at(1440, bi11("who's hitting their calls?") + bi11("who's hitting your numbers?") + bz("no more guessing what happened on a call. no scripts to write yourself.", 34, 22, lh=1.2, extra='font-weight:400'), width=940)
'''
t = t[:a] + new11 + t[b:]

# slide 12: thick solid red underline, regular italic bullets
t = t.replace('<div style="font-size:40px;font-weight:400;letter-spacing:-1px;{SH}">everything is tracked to the brim:</div>',
              '<div style="display:inline-block;position:relative;font-size:42px;font-weight:400;letter-spacing:-1px;{SH}">everything is tracked to the brim:<span style="position:absolute;left:0;right:0;bottom:-10px;height:9px;background:{RED};border-radius:4px"></span></div>')
t = t.replace("font-size:48px;font-weight:700;font-style:italic", "font-size:48px;font-weight:400;font-style:italic")

# slide 14: merged copy
a = t.index("    body += at(930, bz(\"right now it's only")
b = t.index("    return body", a)
t = t[:a] + '''    body += at(930, bz("it's only for the people i work with, and it's getting sharper every week.", 62, lh=1.06)
               + bz("i'm not stopping until this is a " + rul("seven-figure company."), 56, 30), width=940)
''' + t[b:]

# slide 5: full-name aliases, blurred posts with a big question mark, format labels
a = t.index("    people = [('mike.trades'")
b = t.index("    body = bgdiv(img) + '<div class=\"abs\" style=\"inset:0;background:rgba(11,12,13,.42)\"></div>'", a)
new5 = '''    people = [('Marcus Reyes', 'replied', 'rgba(255,255,255,.2)', '#fff', '#4b5160'), ('Tyler Brandt', 'seen, no reply', 'rgba(229,50,45,.3)', '#ff8e89', '#6a3a3a'),
              ('Daniel Okafor', 'booked', '#fff', GRAPH, '#3d4d44'), ('Ethan Cole', 'no close', 'rgba(229,50,45,.3)', '#ff8e89', '#4b4b5c')]
    rows = ''
    for al, st, bg, fg, avc in people:
        rows += (f'<div style="display:flex;align-items:center;gap:18px;padding:12px 0"><div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,{avc},#15161b);border:1.5px solid rgba(255,255,255,.5);display:grid;place-items:center;font-size:26px;font-weight:700;flex:none">{al[0]}</div>'
                 f'<div style="flex:1"><div style="font-size:30px;font-weight:700;letter-spacing:-.6px">{al}</div><div style="height:10px;width:70%;background:rgba(255,255,255,.25);border-radius:5px;margin-top:8px"></div></div>'
                 f'<div style="padding:5px 18px 9px;border-radius:999px;background:{bg};color:{fg};font-size:24px;font-weight:700;white-space:nowrap">{st}</div></div>')
    labels = ['youtube long form', 'instagram carousel', 'instagram story sequence', 'reels']
    posts = ''
    for i, (pid, lb) in enumerate(zip((20, 31, 37, 41), labels)):
        pth = prep_photo(pid, f'r9_p{i}.png', focus=(.5, .5))
        posts += (f'<div style="width:232px"><div style="width:232px;height:300px;border-radius:26px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,.45);box-shadow:0 18px 40px rgba(0,0,0,.5)">'
                  f'<div style="position:absolute;inset:-30px;background:url(file:///{pth}) center/cover;filter:blur(18px) brightness(.8)"></div>'
                  f'<div style="position:absolute;inset:0;background:radial-gradient(closest-side,rgba(229,50,45,.35),transparent 85%)"></div>'
                  f'<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:190px;font-weight:700;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.5)">?</div></div>'
                  f'<div style="text-align:center;font-size:26px;font-weight:700;letter-spacing:-.5px;line-height:1.1;margin-top:12px;{SH}">{lb}</div></div>')
'''
t = t[:a] + new5 + t[b:]
t = t.replace("    posts = ''.join(R7.post_card(pid, i, 232, 340) for i, pid in enumerate((20, 31, 37, 41)))\n", "")
t = t.replace("body += at(1110, f'<div style=\"display:flex;gap:16px;justify-content:center\">{posts}</div>', left=30, width=1020)",
              "body += at(1100, f'<div style=\"display:flex;gap:16px;justify-content:center\">{posts}</div>', left=30, width=1020)")
t = t.replace("body += at(1490, bz(\"and no idea \"", "body += at(1530, bz(\"and no idea \"")
t = t.replace("render('r8_'", "render('r9_'").replace("'r8_", "'r9_")
open('slides_r9.py', 'w', encoding='utf-8').write(t)
print('ok')

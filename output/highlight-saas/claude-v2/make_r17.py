"""Slide 5: gradient initials as the avatars (no face photos). Patches slides_r10.py in place and re-renders slide 5."""
t = open('slides_r10.py', encoding='utf-8').read()
a = t.index("    rows = ''\n    for al, st, bg, fg, avc in people:")
b = t.index("    labels = [")
new = '''    grads = {'Marcus Reyes': ('#ff4a43', '#8f1511', '#fff'), 'Tyler Brandt': ('#5fd6a4', '#1f7a56', '#0b0c0d'),
             'Daniel Okafor': ('#ffffff', '#8a8d99', '#0b0c0d'), 'Ethan Cole': ('#c9201b', '#1a0707', '#fff')}
    rows = ''
    for al, st, bg, fg, avc in people:
        g1, g2, ink = grads[al]
        ini = ''.join(w[0] for w in al.split())
        rows += (f'<div style="display:flex;align-items:center;gap:18px;padding:12px 0"><div style="width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg,{g1},{g2});display:grid;place-items:center;font-size:25px;font-weight:700;letter-spacing:-.5px;color:{ink};flex:none;box-shadow:0 6px 16px rgba(0,0,0,.35)">{ini}</div>'
                 f'<div style="flex:1"><div style="font-size:30px;font-weight:700;letter-spacing:-.6px">{al}</div><div style="height:10px;width:70%;background:rgba(255,255,255,.25);border-radius:5px;margin-top:8px"></div></div>'
                 f'<div style="padding:5px 18px 9px;border-radius:999px;background:{bg};color:{fg};font-size:24px;font-weight:700;white-space:nowrap">{st}</div></div>')
'''
t = t[:a] + new + t[b:]
t = t.replace("render('r10_'", "render('r17_'").replace("'r10_", "'r17_")
open('slides_r17.py', 'w', encoding='utf-8').write(t)
print('ok')

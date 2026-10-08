"""Slide 5: the founder's four supplied reaction photos as the DM avatars (alias names kept). Patches slides_r17.py -> slides_r18.py"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)).replace('\\', '/')
t = open('slides_r17.py', encoding='utf-8').read()
a = t.index("        g1, g2, ink = grads[al]")
b = t.index("                 f'<div style=\"flex:1\"><div style=\"font-size:30px;font-weight:700;letter-spacing:-.6px\">{al}</div>")
new = '''        pic = {'Marcus Reyes': ('av_6.png', '53% 38%', 'cover'), 'Tyler Brandt': ('av_5.png', '56% 30%', '190%'),
               'Daniel Okafor': ('av_7.png', '48% 18%', 'cover'), 'Ethan Cole': ('av_8.png', '50% 42%', 'cover')}[al]
        rows += (f'<div style="display:flex;align-items:center;gap:18px;padding:12px 0"><div style="width:68px;height:68px;border-radius:50%;background:#222 url(file:///__HERE__/img/{pic[0]}) {pic[1]}/{pic[2]} no-repeat;'
                 f'border:2px solid rgba(255,255,255,.7);flex:none;box-shadow:0 6px 16px rgba(0,0,0,.4)"></div>'
'''.replace('__HERE__', HERE)
t = t[:a] + new + t[b:]
t = t.replace("render('r17_'", "render('r18_'").replace("'r17_", "'r18_")
open('slides_r18.py', 'w', encoding='utf-8').write(t)
print('ok')

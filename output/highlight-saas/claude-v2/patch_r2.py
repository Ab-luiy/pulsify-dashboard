import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slides_r2.py')
s = open(p, encoding='utf-8').read()

# slide 3: bigger list, fills the frame
s = s.replace("circ = (f'<svg width=\"56\" height=\"56\" viewBox=\"0 0 56 56\" style=\"flex:none\">", "circ = (f'<svg width=\"72\" height=\"72\" viewBox=\"0 0 56 56\" style=\"flex:none\">")
s = s.replace("block(st, 62, pad='0 24px 14px', radius=18) if last else f'<span style=\"font-size:64px;font-weight:700;letter-spacing:-2px;line-height:1\">{st}</span>'",
              "block(st, 80, pad='0 28px 16px', radius=20) if last else f'<span style=\"font-size:84px;font-weight:700;letter-spacing:-3px;line-height:1\">{st}</span>'")
s = s.replace("gap:30px;align-items:center;padding:20px 0;border-top:1px solid rgba(255,255,255,.18)", "gap:34px;align-items:center;padding:30px 0;border-top:1px solid rgba(255,255,255,.18)")
s = s.replace("    body += at(1250, p(\"most people have never run it.\", 42", "    body += at(1400, p(\"most people have never run it.\", 42")
s = s.replace("    body += at(540, rows)", "    body += at(520, rows)")

# slide 8: move the photo down so the walking figure sits below the text
s = s.replace("img = prep_photo(47, 'p08.png')", "img = prep_photo_extended(47, 'p08.png', 560)")
s = s.replace("body = scene(img, .86, .72, .1)", "body = scene(img, .5, .3, .15)")

# slide 14: text above the head, photo moved down
s = s.replace("img = prep_photo(6, 'p14.png')\n    body = scene(img, .1, .2, .7)\n    body += at(1130,", "img = prep_photo_extended(6, 'p14.png', 360)\n    body = scene(img, .45, .1, .35)\n    body += at(262,")
open(p, 'w', encoding='utf-8').write(s)
print('84px' in s, 'prep_photo_extended(47' in s, 'prep_photo_extended(6' in s)

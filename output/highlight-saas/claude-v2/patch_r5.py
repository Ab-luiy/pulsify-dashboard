import os
here = os.path.dirname(os.path.abspath(__file__))
sp = os.path.join(here, 'slides_r2.py')
s = open(sp, encoding='utf-8').read()
n = 0


def rep(a, b):
    global s, n
    if a in s:
        s = s.replace(a, b, 1); n += 1
    else:
        print('MISSING:', a[:90])


# slide 6: bigger chips spread across the full width
rep("tools = [('chatgpt', 40, 250, -6), ('notion', 330, 215, 4), ('reels', 600, 262, -3), ('youtube', 80, 345, 5), ('docs', 410, 330, -5),\n             ('dms', 690, 360, 6), ('sheet', 40, 440, -4), ('calendly', 300, 450, 3), ('carousel', 590, 460, -6)]",
    "tools = [('chatgpt', 50, 235, -6), ('notion', 400, 210, 4), ('reels', 700, 260, -3), ('youtube', 90, 375, 5), ('docs', 470, 365, -5),\n             ('dms', 740, 405, 6), ('sheet', 40, 520, -4), ('calendly', 300, 535, 3), ('carousel', 640, 545, -6)]")
rep("padding:14px 34px 18px;border-radius:999px;background:{fill};color:{col};'\n                  f'border:2px solid rgba(239,238,233,.55);font-size:46px;",
    "padding:16px 40px 22px;border-radius:999px;background:{fill};color:{col};'\n                  f'border:2px solid rgba(239,238,233,.55);font-size:58px;")
rep("body += at(560, f'<div class=\"label\" style=\"font-size:26px\">9 tabs open.", "body += at(690, f'<div class=\"label\" style=\"font-size:26px\">9 tabs open.")

# slide 7: month labels inside the svg, labels moved off the lines, calmer photo
rep("x=\"{X0 + i*176}\" y=\"470\"", "x=\"{X0 + 20 + i*168}\" y=\"470\"")
rep("left:610px;top:70px;font-size:34px;font-weight:700;color:{EMERALD};letter-spacing:-.6px\">info side<br>peaks</div>",
    "left:150px;top:20px;width:300px;text-align:right;font-size:36px;font-weight:700;color:{EMERALD};letter-spacing:-.6px\">info side<br>peaks here</div>")
rep("left:660px;top:376px;font-size:34px;font-weight:700;color:{RED};letter-spacing:-.6px\">and quietly dies</div>",
    "left:380px;top:318px;font-size:36px;font-weight:700;color:{INK};letter-spacing:-.6px\">and quietly dies</div>")
rep("body = scene(img, .78, .6, .7)\n    body += at(262, p(\"that's where most people \"", "body = scene(img, .84, .8, .84)\n    body += at(262, p(\"that's where most people \"")

# slide 8: bigger, readable "new" circles and a cleaner arrow
rep("[(70, .55, 18), (84, .75, 4), (98, .9, 22), (112, 1, 0)]", "[(92, .6, 16), (106, .78, 4), (120, .92, 20), (136, 1, 0)]")
rep("font-size:{int(sz*.28)}px", "font-size:{int(sz*.3)}px")
rep("arrow = (f'<svg width=\"120\" height=\"150\" viewBox=\"0 0 120 150\"><path d=\"M20 140 C 30 70, 70 40, 92 14\"",
    "arrow = (f'<svg width=\"140\" height=\"170\" viewBox=\"0 0 120 150\"><path d=\"M20 140 C 30 70, 70 40, 92 14\"")
open(sp, 'w', encoding='utf-8').write(s)
print('applied', n)

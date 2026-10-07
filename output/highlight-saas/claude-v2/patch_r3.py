import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slides_r2.py')
s = open(p, encoding='utf-8').read()
n = 0


def rep(a, b):
    global s, n
    if a in s:
        s = s.replace(a, b, 1); n += 1
    else:
        print('MISSING:', a[:70])


rep("gap:34px;align-items:center;padding:30px 0;", "gap:34px;align-items:center;padding:24px 0;")                       # 3 spacing
rep("body = scene(img, .45, .45, .72) + wins", "body = scene(img, .45, .64, .84) + wins")                           # 6 calmer lower half
rep('<text x="640" y="210"', '<text x="676" y="196"')                                                              # 7 main business label above its line
rep('<text x="24" y="318"', '<text x="548" y="92"')                                                                # 7 info side label beside the peak
rep("body = scene(img, .5, .3, .15)", "body = scene(img, .55, .55, .2)")                                           # 8 scrim under the quote
rep("body = scene(img, .4, .1, .3)\n    body += at(262, p(\"then the sales side.\"", "body = scene(img, .66, .22, .3)\n    body += at(262, p(\"then the sales side.\"")  # 11
rep("prep_photo_extended(12, 'p13.png', 400)", "prep_photo_extended(12, 'p13.png', 470)")                          # 13 more room above the head
rep("body = scene(img, .45, .1, .35)\n    body += at(262,", "body = scene(img, .8, .42, .35)\n    body += at(262,")      # 14 contrast on the bright wall
open(p, 'w', encoding='utf-8').write(s)
print('applied', n)

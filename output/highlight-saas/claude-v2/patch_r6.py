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


rep("left:150px;top:20px;width:300px;text-align:right;", "left:30px;top:20px;width:300px;text-align:right;")
rep("<div class=\"abs\" style=\"left:78px;top:276px\">{block(\"main business\", 36, pad=\"6px 22px 16px\", radius=999)}</div>",
    "<div class=\"abs\" style=\"left:40px;top:172px\">{block(\"main business\", 32, pad=\"4px 20px 14px\", radius=999)}</div>")
rep("    body += at(900, svg, left=60, width=960)", "    body += '<div class=\"abs\" style=\"left:0;top:850px;width:1080px;height:640px;background:linear-gradient(180deg,rgba(11,12,13,0) 0%,rgba(11,12,13,.88) 14%,rgba(11,12,13,.88) 86%,rgba(11,12,13,0) 100%)\"></div>'\n    body += at(900, svg, left=60, width=960)")
open(sp, 'w', encoding='utf-8').write(s)
print('applied', n)

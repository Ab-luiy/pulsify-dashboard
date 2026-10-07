import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slides.py')
s = open(p, encoding='utf-8').read()
# slide 5: soft dark band behind the closing line
s = s.replace("    body += at(1010, p(\"and you have no idea \"",
              "    body += '<div class=\"abs\" style=\"left:0;top:900px;width:1080px;height:420px;background:linear-gradient(180deg,rgba(11,12,13,0) 0%,rgba(11,12,13,.78) 30%,rgba(11,12,13,.78) 70%,rgba(11,12,13,0) 100%)\"></div>'\n    body += at(1010, p(\"and you have no idea \"", 1)
# slide 8: reframe so the glowing sign is out of the text area
s = s.replace("focus=(0.85, 0.12), zoom=1.45", "focus=(0.02, 0.62), zoom=1.45")
open(p, 'w', encoding='utf-8').write(s)
print('top:900px' in s, 'focus=(0.02, 0.62)' in s)

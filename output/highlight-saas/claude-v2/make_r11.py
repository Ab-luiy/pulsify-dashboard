"""Round 11: slide 12 headline on one line (right-aligned), original bullets restored, red gradient pills on the stat labels."""
t = open('slides_r10.py', encoding='utf-8').read()

# restore the original dot bullets
t = t.replace("    bl = lambda t: f'<div style=\"margin-top:10px\">{rbox(t, 40, \"2px 20px 12px\", 12)}</div>'\n",
              "    bl = lambda t: f'<div style=\"display:flex;gap:18px;align-items:center;margin-top:8px\"><div style=\"width:16px;height:16px;border-radius:50%;background:{RED};flex:none\"></div>{bz(t, 44)}</div>'\n")
t = t.replace('+ bl("watched") + bl("clicked") + bl("booked") + bl("paid")', '+ bl("who watched") + bl("how far they got") + bl("who clicked") + bl("who booked") + bl("who paid")')

# headline on one line, right-aligned
old_start = t.index("    body += at(236, f'<div style=\"font-size:84px;line-height:1.04;font-weight:700;letter-spacing:-3.2px;{SH}\">every post is<br>")
old_end = t.index("\n", old_start)
line = t[old_start:old_end]
new = ("    body += at(236, f'<div style=\"text-align:right;white-space:nowrap;font-size:80px;line-height:1.04;font-weight:700;letter-spacing:-3px;{SH}\">every post is {rbox(\"tracked.\", 80, \"0 22px 14px\", 16)}</div>'"
       " + bl(\"who watched\") + bl(\"how far they got\") + bl(\"who clicked\") + bl(\"who booked\") + bl(\"who paid\"), width=940)")
t = t[:old_start] + new + t[old_end:]

# red gradient pills behind the stat labels
t = t.replace("<div style=\"font-size:23px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.75;margin-top:6px\">{l}</div></div>'",
              "<div style=\"margin-top:10px\">{rbox(l, 22, \"1px 14px 8px\", 10)}</div></div>'")
t = t.replace("render('r10_'", "render('r11_'").replace("'r10_", "'r11_")
open('slides_r11.py', 'w', encoding='utf-8').write(t)
print('ok')

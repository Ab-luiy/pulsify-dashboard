"""Round 10 edits on top of slides_r9.py -> slides_r10.py: slide 13 copy + underline, slide 14 removed,
slide 12 four red-gradient bullets + white paid stat, slide 5 caps labels."""
t = open('slides_r9.py', encoding='utf-8').read()

# slide 5 labels in caps
t = t.replace("labels = ['youtube long form', 'instagram carousel', 'instagram story sequence', 'reels']", "labels = ['YOUTUBE LONG FORM', 'CAROUSELS', 'STORY SEQUENCES', 'REELS']")
t = t.replace("font-size:26px;font-weight:700;letter-spacing:-.5px;line-height:1.1;margin-top:12px;{SH}\">{lb}", "font-size:25px;font-weight:700;letter-spacing:.02em;line-height:1.1;margin-top:12px;{SH}\">{lb}")

# slide 12: four red-gradient pills, paid stat white block
old = t[t.index("    bl = lambda t: f'<div style=\"display:flex;gap:18px;align-items:center;margin-top:8px\"><div style=\"width:16px"):t.index("    bi = lambda t:")]
t = t.replace(old, "    bl = lambda t: f'<div style=\"margin-top:10px\">{rbox(t, 40, \"2px 20px 12px\", 12)}</div>'\n")
t = t.replace('+ bl("who watched") + bl("how far they got") + bl("who clicked") + bl("who booked") + bl("who paid")', '+ bl("watched") + bl("clicked") + bl("booked") + bl("paid")')
t = t.replace("(('41.2k', 'watched', '#fff'), ('3.8k', 'clicked', '#fff'), ('212', 'booked', '#fff'), ('$64k', 'paid', RED2))",
              "(('41.2k', 'watched', '#fff'), ('3.8k', 'clicked', '#fff'), ('212', 'booked', '#fff'), ('$64k', 'paid', GRAPH))")
t = t.replace("<div style=\"flex:1\"><div style=\"font-size:66px;font-weight:700;letter-spacing:-2.5px;line-height:1;color:{c}\">{v}</div>",
              "<div style=\"flex:1\"><div style=\"display:inline-block;font-size:66px;font-weight:700;letter-spacing:-2.5px;line-height:1;color:{c};{'background:#fff;padding:2px 14px 8px;border-radius:14px;' if c == GRAPH else ''}\">{v}</div>")

# slide 13 copy; slide 14 removed
a = t.index("def s13():")
b = t.index("SL = {")
new13 = '''def s13_body9():
    return at(262, bz("none of this was built overnight.", 90, lh=1.02)
              + f'<div style="margin-top:38px;font-size:56px;font-weight:700;letter-spacing:-1.8px;line-height:1.1;{SH}">{ulb("every framework was tested first.", 56)}</div>'
              + bz("it's a one-place stop that does the heavy lifting.", 44, 40, extra='font-weight:400')
              + f'<div style="margin-top:14px;font-size:50px;font-weight:700;letter-spacing:-1.6px;{SH}">{ulb("you keep doing what you\\'re good at.", 50)}</div>', width=940)


def s13():
    return bgdiv(prep_photo(18, 'r10_13.png', focus=(.5, .5))) + top(900, .62) + wash2() + s13_body9()


'''
t = t[:a] + new13 + t[b:]
t = t.replace("'13': s13, '14': s14}", "'13': s13}")
t = t.replace("render('r9_'", "render('r10_'").replace("'r9_", "'r10_")
open('slides_r10.py', 'w', encoding='utf-8').write(t)
print('ok')

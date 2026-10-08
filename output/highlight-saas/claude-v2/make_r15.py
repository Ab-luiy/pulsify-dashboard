"""Round 15: combine the straight timeline (D) with the numbers (G) for the slide 12 bullets. Renders r15{h,i,j,k}_12.png."""
base = open('slides_r12.py', encoding='utf-8').read()
old_start = base.index("    bl = lambda t:")
old_end = base.index("    bi = lambda t:")
helpers = '''
def _split(t):
    w = t.split(' ')
    return ' '.join(w[:-1]), w[-1]


def _txt(hk, size=48):
    return (f'<div style="font-size:{size}px;font-weight:700;letter-spacing:-1.4px;line-height:1;{SH}">' + (f'<span style="opacity:.5;font-weight:400">{hk[0]} </span>' if hk[0] else '') + hk[1] + '</div>')

'''
row = '''    _n = [0]
    def bl(t):
        _n[0] += 1
        hk = _split(t)
        return (f'<div class="tl" style="position:relative;height:58px;margin-top:14px;display:flex;gap:22px;align-items:center">MARK{{_n[0]}}END' + _txt(hk) + '</div>')
'''
marks = {
    # H: outlined numbered circles on a straight line
    'h': ("""<div style="width:46px;height:46px;border-radius:50%;border:3px solid #ff4a43;display:grid;place-items:center;font-size:24px;font-weight:700;flex:none;position:relative;z-index:2;background:rgba(11,12,13,.6)">{_n[0]}</div>""",
          '.tl:not(:last-child)::after{content:"";position:absolute;left:21px;top:52px;width:4px;height:20px;background:#ff4a43;border-radius:2px}'),
    # I: filled red-gradient numbered circles on a straight line
    'i': ("""<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#ff4a43,#a3150f);display:grid;place-items:center;font-size:24px;font-weight:700;flex:none;position:relative;z-index:2;box-shadow:0 6px 18px rgba(201,32,27,.5)">{_n[0]}</div>""",
          '.tl:not(:last-child)::after{content:"";position:absolute;left:21px;top:52px;width:4px;height:20px;background:rgba(255,255,255,.5);border-radius:2px}'),
    # J: thin rail with small red 01..05 numbers
    'j': ("""<div style="font-size:24px;font-weight:700;letter-spacing:.06em;color:#ff4a43;width:46px;flex:none;position:relative;z-index:2">0{_n[0]}</div>""",
          '.tl::before{content:"";position:absolute;left:-18px;top:-7px;bottom:-7px;width:4px;background:#ff4a43;border-radius:2px}.tl:first-child::before{top:8px}.tl:last-child::before{bottom:8px}'),
    # K: red rounded squares with numbers, dashed link
    'k': ("""<div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#ff4a43,#a3150f);display:grid;place-items:center;font-size:24px;font-weight:700;flex:none;position:relative;z-index:2">{_n[0]}</div>""",
          '.tl:not(:last-child)::after{content:"";position:absolute;left:21px;top:52px;width:0;height:20px;border-left:4px dotted #ff4a43}'),
}
for k, (mk, css) in marks.items():
    rep = row.replace('MARK{{_n[0]}}END', mk)
    t = base[:old_start] + rep + base[old_end:]
    t = t.replace("def s02():", helpers + "\nCSS_TL = '<style>" + css + "</style>'\n\n\ndef s02():", 1)
    t = t.replace("    body = bgdiv(img)\n    body += '<div class=\"abs\" style=\"inset:0;background:radial-gradient(1000px 800px at 100% 40%", "    body = CSS_TL + bgdiv(img)\n    body += '<div class=\"abs\" style=\"inset:0;background:radial-gradient(1000px 800px at 100% 40%", 1)
    t = t.replace("render('r12_'", f"render('r15{k}_'")
    open(f'slides_r15{k}.py', 'w', encoding='utf-8').write(t)
print('ok')

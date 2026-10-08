"""Round 14: four more takes on option C (dimmed lead-in, bright key word) for the slide 12 bullets. Renders r14{d,e,f,g}_12.png."""
base = open('slides_r12.py', encoding='utf-8').read()
old_start = base.index("    bl = lambda t:")
old_end = base.index("    bi = lambda t:")
helpers = '''
def _split(t):
    w = t.split(' ')
    return ' '.join(w[:-1]), w[-1]

'''
variants = {
    # D: C plus a thin red timeline joining the dots (a journey)
    'd': '''    bl = lambda t: (lambda hk: f'<div class="tl" style="position:relative;display:flex;gap:18px;align-items:center;margin-top:12px"><div style="width:16px;height:16px;border-radius:50%;background:{RED};flex:none;position:relative;z-index:2"></div>'
                    f'<div style="font-size:48px;font-weight:700;letter-spacing:-1.4px;{SH}">' + (f'<span style="opacity:.5;font-weight:400">{hk[0]} </span>' if hk[0] else '') + hk[1] + '</div></div>')(_split(t))
''',
    # E: key word italic bold, lead-in dim regular
    'e': '''    bl = lambda t: (lambda hk: f'<div style="display:flex;gap:18px;align-items:center;margin-top:10px"><div style="width:16px;height:16px;border-radius:50%;background:{RED};flex:none"></div>'
                    f'<div style="font-size:50px;letter-spacing:-1.4px;{SH}">' + (f'<span style="opacity:.5;font-weight:400">{hk[0]} </span>' if hk[0] else '') + f'<span style="font-weight:700;font-style:italic">{hk[1]}</span></div></div>')(_split(t))
''',
    # F: big key word, small dim caps lead-in above it
    'f': '''    bl = lambda t: (lambda hk: f'<div style="display:flex;gap:18px;align-items:center;margin-top:6px"><div style="width:16px;height:16px;border-radius:50%;background:{RED};flex:none"></div>'
                    f'<div>' + (f'<div style="font-size:21px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.55;margin-bottom:-2px">{hk[0]}</div>' if hk[0] else '<div style="height:6px"></div>') + f'<div style="font-size:58px;font-weight:700;letter-spacing:-2px;line-height:1;{SH}">{hk[1]}</div></div></div>')(_split(t))
''',
    # G: red numbers 01-05 instead of dots, dim lead-in, bright key
    'g': '''    _n = [0]
    def bl(t):
        _n[0] += 1
        hk = _split(t)
        return (f'<div style="display:flex;gap:18px;align-items:baseline;margin-top:10px"><div style="font-size:26px;font-weight:700;letter-spacing:.06em;color:#ff4a43;width:44px;flex:none">0{_n[0]}</div>'
                f'<div style="font-size:48px;font-weight:700;letter-spacing:-1.4px;{SH}">' + (f'<span style="opacity:.5;font-weight:400">{hk[0]} </span>' if hk[0] else '') + hk[1] + '</div></div>')
''',
}
for k, rep in variants.items():
    t = base[:old_start] + rep + base[old_end:]
    t = t.replace("def s02():", helpers + "\ndef s02():", 1)
    if k == 'd':
        t = t.replace("def s02():", "TL_CSS = '<style>.tl:not(:last-child)::after{content:\"\";position:absolute;left:6px;top:40px;width:4px;height:58px;background:rgba(229,50,45,.85);border-radius:2px}</style>'\n\n\ndef s02():", 1)
        t = t.replace("    body = bgdiv(img)\n    body += '<div class=\"abs\" style=\"inset:0;background:radial-gradient(1000px 800px at 100% 40%", "    body = TL_CSS + bgdiv(img)\n    body += '<div class=\"abs\" style=\"inset:0;background:radial-gradient(1000px 800px at 100% 40%", 1)
    t = t.replace("render('r12_'", f"render('r14{k}_'")
    open(f'slides_r14{k}.py', 'w', encoding='utf-8').write(t)
print('ok')

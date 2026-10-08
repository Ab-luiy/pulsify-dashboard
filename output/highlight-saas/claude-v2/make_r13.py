"""Round 13: three alternatives to the red underlines on the slide 12 bullets. Renders r13a/b/c_12.png."""
import re, subprocess, sys
base = open('slides_r12.py', encoding='utf-8').read()
old = "{bz(rul(t), 44)}</div>'\n    bi ="
assert old in base
variants = {
    # A: plain, no marks
    'a': "{bz(t, 44)}</div>'\n    bi =",
    # B: only the verb carries a short red gradient box ("who [watched]")
    'b': "{VB(t)}</div>'\n    bi =",
    # C: dim the lead-in words, bright keyword, no lines
    'c': "{VC(t)}</div>'\n    bi =",
}
helpers = '''
def VB(t):
    w = t.split(' ')
    head, key = ' '.join(w[:-1]), w[-1]
    return bz((head + ' ' if head else '') + rbox(key, 40, '0 16px 10px', 12), 44)


def VC(t):
    w = t.split(' ')
    head, key = ' '.join(w[:-1]), w[-1]
    return bz((f'<span style="opacity:.55;font-weight:400">{head} </span>' if head else '') + key, 48)

'''
for k, rep in variants.items():
    t = base.replace(old, rep)
    t = t.replace("def s02():", helpers + "\ndef s02():", 1)
    t = t.replace("render('r12_'", f"render('r13{k}_'")
    open(f'slides_r13{k}.py', 'w', encoding='utf-8').write(t)
print('ok')

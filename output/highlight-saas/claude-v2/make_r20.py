"""Slide 5, option D with different name treatments: first names, handles, source labels, blurred names."""
base = open('slides_r19d.py', encoding='utf-8').read()
OLD = ['Marcus Reyes', 'Tyler Brandt', 'Daniel Okafor', 'Ethan Cole']
NAME_DIV = '<div style="font-size:30px;font-weight:700;letter-spacing:-.6px">{al}</div>'
assert NAME_DIV in base
sets = {
    'e': ['Marcus', 'Tyler', 'Daniel', 'Ethan'],
    'f': ['@marcus.trades', '@tyler_flips', '@dani.okafor', '@ethan.ecom'],
    'g': ['youtube lead', 'carousel lead', 'story lead', 'reel lead'],
    'h': OLD,
}
for k, names in sets.items():
    t = base
    for o, n in zip(OLD, names):
        t = t.replace(o, n)
    if k == 'h':
        t = t.replace(NAME_DIV, NAME_DIV.replace('letter-spacing:-.6px', 'letter-spacing:-.6px;filter:blur(6px)'))
    t = t.replace("render('r19d_'", f"render('r20{k}_'")
    open(f'slides_r20{k}.py', 'w', encoding='utf-8').write(t)
print('ok')

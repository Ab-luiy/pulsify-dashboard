"""Slide 5 name mock-ups: four ways to name the four DM rows (photos kept, LeBron avatar zoomed out a little)."""
import subprocess, sys
base = open('slides_r18.py', encoding='utf-8').read()
base = base.replace("'50% 4%', '170%'", "'50% 8%', '135%'")
OLD = ['Marcus Reyes', 'Tyler Brandt', 'Daniel Okafor', 'Ethan Cole']
SUBBAR = "<div style=\"height:10px;width:70%;background:rgba(255,255,255,.25);border-radius:5px;margin-top:8px\"></div>"
assert SUBBAR in base
sets = {
    'a': (OLD, None),   # current full names, skeleton line
    'b': (['@marcus.trades', '@tyler_flips', '@dani.okafor', '@ethan.ecom'], None),
    'c': (['Marcus R.', 'Tyler B.', 'Daniel O.', 'Ethan C.'], ['trader, 4 years in', 'tiktok shop seller', 'ecom + dropshipping', 'amazon fba']),
    'd': (['Marcus Reyes', 'Tyler Brandt', 'Daniel Okafor', 'Ethan Cole'], ['"bro this is exactly what i need"', 'seen 2 days ago', 'booked for thursday 3pm', 'ghosted after the call']),
}
for k, (names, subs) in sets.items():
    t = base
    for o, n in zip(OLD, names):
        t = t.replace(o, n)
    if subs:
        smap = {n: s for n, s in zip(names, subs)}
        t = t.replace(SUBBAR, '<div style="font-size:24px;opacity:.72;margin-top:6px;letter-spacing:-.3px">{SMAP[al]}</div>')
        t = t.replace("def s05():", "SMAP = " + repr(smap) + "\n\n\ndef s05():", 1)
    t = t.replace("render('r18_'", f"render('r19{k}_'")
    open(f'slides_r19{k}.py', 'w', encoding='utf-8').write(t)
print('ok')

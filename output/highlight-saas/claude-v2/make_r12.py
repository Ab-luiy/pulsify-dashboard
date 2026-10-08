"""Round 12: slide 12 headline left-aligned, all stat numbers white blocks, brim line bold, red underlines on the five bullets."""
t = open('slides_r11.py', encoding='utf-8').read()
t = t.replace('text-align:right;white-space:nowrap;font-size:80px', 'text-align:left;white-space:nowrap;font-size:80px')
t = t.replace("{bz(t, 44)}</div>'\n    bi =", "{bz(rul(t), 44)}</div>'\n    bi =")
t = t.replace("('41.2k', 'watched', '#fff'), ('3.8k', 'clicked', '#fff'), ('212', 'booked', '#fff')", "('41.2k', 'watched', GRAPH), ('3.8k', 'clicked', GRAPH), ('212', 'booked', GRAPH)")
t = t.replace("font-size:42px;font-weight:400;letter-spacing:-1px;{SH}\">everything is tracked to the brim:", "font-size:42px;font-weight:700;letter-spacing:-1.2px;{SH}\">everything is tracked to the brim:")
t = t.replace("render('r11_'", "render('r12_'").replace("'r11_", "'r12_")
open('slides_r12.py', 'w', encoding='utf-8').write(t)
print(t.count('rul(t), 44'), t.count('GRAPH), (\'3.8k\''))

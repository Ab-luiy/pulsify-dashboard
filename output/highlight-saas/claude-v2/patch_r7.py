import os
here = os.path.dirname(os.path.abspath(__file__))


def patch(fn, pairs):
    p = os.path.join(here, fn)
    s = open(p, encoding='utf-8').read()
    n = 0
    for a, b in pairs:
        if a in s:
            s = s.replace(a, b, 1); n += 1
        else:
            print(fn, 'MISSING:', a[:80])
    open(p, 'w', encoding='utf-8').write(s)
    print(fn, 'applied', n)


patch('variants.py', [
    # 06b: all 12 tabs fit
    ("        w = 168 - i * 6\n", "        w = 96\n"),
    ("margin-right:-10px;display:flex;align-items:center;gap:10px;padding:0 16px;overflow:hidden;'\n                 f'font-size:26px;font-weight:700;white-space:nowrap\">",
     "margin-right:-12px;display:flex;align-items:center;gap:8px;padding:0 12px;overflow:hidden;'\n                 f'font-size:20px;font-weight:700;white-space:nowrap;text-overflow:ellipsis\">"),
    ("<i style=\"width:18px;height:18px;border-radius:50%;background:{[EMERALD, RED, \"#e6b04d\", \"#7eaeea\"][i % 4]};display:block;flex:none\"></i>{nm}</div>')",
     "<i style=\"width:16px;height:16px;border-radius:50%;background:{[EMERALD, RED, \"#e6b04d\", \"#7eaeea\"][i % 4]};display:block;flex:none\"></i>{nm[:5]}</div>')"),
    # 07: move everything down so the lower third is used
    ("    body = scene(img, .84, .8, .84) + band(900, 600) + legend + bars + flag + text7(262)",
     "    body = scene(img, .84, .8, .84) + band(1000, 600) + f'<div class=\"abs\" style=\"inset:0;transform:translateY(120px)\">{legend}{bars}{flag}</div>' + text7(330)"),
    ("    body = scene(img, .84, .8, .84) + band(900, 600) + batt + labels + text7(262)",
     "    body = scene(img, .84, .8, .84) + band(1000, 600) + f'<div class=\"abs\" style=\"inset:0;transform:translateY(120px)\">{batt}{labels}</div>' + text7(330)"),
    # 07c: labels match the battery width
    ("left:60px;top:1310px;width:960px;display:flex;justify-content:space-between;font-size:28px;color:{MUTE}\"><span>month 1</span><span>month 3</span><span>month 6</span>",
     "left:60px;top:1310px;width:820px;display:flex;justify-content:space-between;font-size:28px;color:{MUTE}\"><span>month 1</span><span>month 6</span>"),
    # 08c: bigger orbit
    ("svg = (f'<svg width=\"960\" height=\"380\" viewBox=\"0 0 960 380\">", "svg = (f'<svg width=\"1000\" height=\"430\" viewBox=\"150 -20 660 283\">"),
])

patch('slides_r2.py', [
    ("    body += at(262, p(\"that's where most people \" + ul(\"plateau.\"), 84, 700, lh=1.06, ls=-3)\n               + p(\"then they pick the main business, because that's what keeps food on the table.\", 46, ls=-1, mt=34)",
     "    body += at(330, p(\"that's where most people \" + ul(\"plateau.\"), 84, 700, lh=1.06, ls=-3)\n               + p(\"then they pick the main business, because that's what keeps food on the table.\", 46, ls=-1, mt=34)"),
    ("left:0;top:850px;width:1080px;height:640px;background:linear-gradient(180deg,rgba(11,12,13,0) 0%,rgba(11,12,13,.88) 14%",
     "left:0;top:970px;width:1080px;height:640px;background:linear-gradient(180deg,rgba(11,12,13,0) 0%,rgba(11,12,13,.88) 14%"),
    ("    body += at(900, svg, left=60, width=960) + f'<div class=\"abs\" style=\"left:60px;top:900px;width:960px;height:500px\">{tags}</div>'",
     "    body += at(1020, svg, left=60, width=960) + f'<div class=\"abs\" style=\"left:60px;top:1020px;width:960px;height:500px\">{tags}</div>'"),
])

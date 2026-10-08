"""Slides 6, 7, 8 in the G1 'Good carousel design #1' system (wiki/content-engine/reference-replication-profile.md, recipe feature-three-artifacts).
Measured from G1-2 at 3274px: panel fill rgb(12,13,15) ~opaque, 1px light border + faint halo, radius ~13px@1080, dense small UI text with
blurred redactions, huge light lowercase gradient title (peach 243,181,170 -> pink), medium regular line, big labels with one bold word,
thin muted curved connectors, photo kept natural with a top-only fade. No mirrored fill, no blanket blur.
Copy: locked copy only; panel text restates the slide's own lines as the viewer's checklist/notes (no new claims, no numbers)."""
import sys
from engine import *

FONT = "Helvetica,Arial,sans-serif"
LIGHT = "'Helvetica Light',Helvetica,Arial,sans-serif"
PEACH, PINK = '#f3b5aa', '#e3a1b6'
CONNECT = '#6b5a72'


def photo_cover(pid, out, fx=0.5, fy=0.5):
    """Cover the 9:16 frame keeping the full photo height where possible (crop sides only); natural exposure."""
    im = ImageOps.exif_transpose(Image.open(find_photo(pid))).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = int((im.width - W) * fx); y = int((im.height - H) * fy)
    p = os.path.join(HERE, 'img', out)
    safe_save(dither(im.crop((x, y, x + W, y + H))), p)
    return p.replace('\\', '/')


def base(img, fade_to=900, strength=.9):
    return (f'<div class="bg" style="background-image:url(\'file:///{img}\')"></div>'
            f'<div class="abs" style="left:0;top:0;width:1080px;height:{fade_to}px;background:linear-gradient(180deg,rgba(4,3,2,{strength}) 0%,rgba(4,3,2,{strength*.75}) 45%,rgba(4,3,2,0) 100%)"></div>')


def title(text, size=176):
    return (f'<div style="font-family:{LIGHT};font-weight:300;font-size:{size}px;line-height:.92;letter-spacing:{-size*.035:.1f}px;'
            f'background:linear-gradient(90deg,{PEACH},{PINK});-webkit-background-clip:text;background-clip:text;color:transparent;'
            f'padding-bottom:{int(size*.12)}px">{text}</div>')


def under(t):
    return (f'<span style="position:relative;display:inline-block">{t}<span style="position:absolute;left:4%;right:2%;bottom:-6px;height:5px;'
            f'border-radius:3px;background:linear-gradient(90deg,{PEACH},{PINK})"></span></span>')


def subline(html, size=56):
    return f'<div style="font-family:{FONT};font-weight:400;font-size:{size}px;line-height:1.08;letter-spacing:-1.4px;color:#fff">{html}</div>'


def redact(w):
    return f'<span style="display:inline-block;width:{w}px;height:18px;border-radius:9px;background:rgba(235,235,235,.85);filter:blur(5px);vertical-align:-3px;margin:0 4px"></span>'


def panel(left, top, width, head, sub, bullets, check=False):
    rows = ''
    for b in bullets:
        mark = (f'<span style="flex:none;width:20px;height:20px;border:1.6px solid rgba(255,255,255,.55);border-radius:5px;margin-top:4px;'
                f'{"background:rgba(255,255,255,.12)" if b.startswith("~") else ""}"></span>' if check else
                '<span style="flex:none;width:7px;height:7px;border-radius:50%;background:#e8e8e8;margin:11px 4px 0 2px"></span>')
        txt = b[1:] if b.startswith('~') else b
        style = 'text-decoration:line-through;color:rgba(232,232,232,.55)' if b.startswith('~') else ''
        rows += f'<div style="display:flex;gap:16px;margin-top:10px"><span style="display:contents">{mark}</span><span style="{style}">{txt}</span></div>'
    return (f'<div class="abs" style="left:{left}px;top:{top}px;width:{width}px;background:rgba(12,13,15,.97);border:1.5px solid rgba(255,255,255,.17);'
            f'border-radius:14px;padding:20px 28px 22px;box-shadow:0 0 0 1px rgba(255,255,255,.03),0 0 22px rgba(255,255,255,.07),0 18px 40px rgba(0,0,0,.5);'
            f'font-family:{FONT};font-size:23px;line-height:1.38;color:#e8e8e8">'
            f'<div style="font-weight:700;color:#f2f2f2">{head}</div>'
            f'{f"<div style=\'color:#c9c9c9\'>{sub}</div>" if sub else ""}{rows}</div>')


def label(left, top, html, size=46, align='left', width=None):
    w = f'width:{width}px;' if width else ''
    return (f'<div class="abs" style="left:{left}px;top:{top}px;{w}text-align:{align};font-family:{FONT};font-weight:400;font-size:{size}px;'
            f'line-height:1.05;letter-spacing:-1.2px;color:#fff;text-shadow:0 0 18px rgba(0,0,0,.85),0 2px 6px rgba(0,0,0,.7)">{html}</div>')


def curve(d):
    return f'<path d="{d}" fill="none" stroke="{CONNECT}" stroke-width="4" stroke-linecap="round"/>'


def svg(paths):
    return f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{paths}</svg>'


# ---------------------------------------------------------------- 06
def g06():
    img = photo_cover(37, 'g06.png', fx=.5)
    body = base(img, 1050, .92)
    body += at(250, subline("so you", 56) + title("try harder.", 170)
               + subline("more posts. more tools.", 48) + subline("another chatgpt tab at " + under("2am."), 48), width=960)
    body += panel(470, 790, 560, f"Tonight &middot; 2:07 AM", "", ["post another reel", "try the new tool", "rewrite the hook again", "~sleep"], check=True)
    body += label(470, 1090, "more <b>posts</b>, more <b>tools</b>", 44)
    body += panel(50, 1230, 600, f"Saved from {redact(130)} and {redact(110)}", "",
                  ["their hook, their format", "their thumbnail style", "their offer, almost word for word"])
    body += label(50, 1475, "copying the <b>big names</b>", 44)
    body += label(40, 1590, "meanwhile the thing that actually pays you<br>gets <b>less of your time.</b>", 42, align='right', width=990)
    body += svg(curve("M460 1000 C 400 1080, 380 1150, 420 1222") + curve("M655 1380 C 760 1420, 820 1480, 840 1560"))
    return body


# ---------------------------------------------------------------- 07
def g07():
    img = photo_cover(26, 'g07.png', fx=.5)
    body = base(img, 1100, .9)
    body += at(250, subline("that's where most people", 52) + title("plateau.", 196)
               + subline("then they pick the main business, because that's what keeps food on the table.", 44), width=960)
    body += panel(60, 830, 560, "This week", "",
                  ["main business: client work", "main business: calls", "~info side: post the video", "~info side: post the video (moved again)"], check=True)
    body += label(60, 1140, "the <b>food on the table</b>", 44)
    body += panel(470, 1250, 560, "Info side", "last post: weeks ago", ["drafts: still in notes", "idea list: untouched"])
    body += label(470, 1460, "it <b>dies quietly</b>", 44)
    body += label(60, 1560, "none of that is <b>your fault.</b>", 50)
    body += svg(curve("M622 960 C 700 1040, 720 1150, 690 1240") + curve("M460 1300 C 380 1360, 330 1450, 300 1540"))
    return body


# ---------------------------------------------------------------- 08
def g08():
    img = photo_cover(47, 'g08.png', fx=.5)
    body = base(img, 1100, .9)
    body += at(250, subline("here's what most people miss.", 48) + title("new faces", 178)
               + subline("break in every single month.", 48), width=960)
    names = ''.join(f'<div style="display:flex;align-items:center;gap:14px;margin-top:9px"><span style="width:22px;color:#9a9a9a">{i}</span>{redact(w)}</div>'
                    for i, w in [(1, 210), (2, 180), (3, 230), (4, 160)])
    body += (f'<div class="abs" style="left:50px;top:770px;width:470px;background:rgba(12,13,15,.97);border:1.5px solid rgba(255,255,255,.17);border-radius:14px;'
             f'padding:20px 28px 24px;box-shadow:0 0 22px rgba(255,255,255,.07),0 18px 40px rgba(0,0,0,.5);font-family:{FONT};font-size:23px;color:#e8e8e8">'
             f'<div style="font-weight:700;color:#f2f2f2">Top of the niche</div>{names}</div>')
    body += label(50, 1050, "<b>3 or 4</b> names", 46)
    body += panel(560, 1000, 470, "New this month", "", ["not bigger", "bringing <b>something new</b>"])
    body += label(560, 1240, "a new face, <b>a new idea</b>", 46)
    body += at(1420, subline("\"you don't need to be first.", 60) + subline("you need to " + under("sound like you.") + "\"", 60), width=980)
    body += svg(curve("M520 900 C 600 920, 640 960, 650 995"))
    return body


D = {'g06': g06, 'g07': g07, 'g08': g08}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(D)):
        render(n, page(D[n]()))
    w, h = 540, 960
    sh = Image.new('RGB', (3 * (w + 12) + 12, h + 24), (22, 22, 22))
    for i, n in enumerate(['g06', 'g07', 'g08']):
        fp = os.path.join(HERE, n + '.png')
        if os.path.exists(fp):
            sh.paste(Image.open(fp).convert('RGB').resize((w, h), Image.LANCZOS), (12 + i * (w + 12), 12))
    sh.save(os.path.join(HERE, 'sheet-g.jpg'), quality=92)
    print('ok')

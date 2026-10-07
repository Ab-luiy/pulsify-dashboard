"""Exact layout copies with our locked copy.
06r = Brez 4  (all-bold white stack, red underline, red X list, black box with one red word, caps closer underlined)
07r = Nik seq3 slide 7 (light sans para with bold keys, serif line, thin red rectangle around bullets)
Scale: references are 828 wide; x1.304 to 1080."""
import sys
from engine import *

SANS = "Helvetica,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',serif"
S = 1080 / 828


def px(v):
    return round(v * S)


def red_ul(t, sw=7):
    return (f'<span style="position:relative;display:inline-block">{t}'
            f'<span style="position:absolute;left:0;right:-6px;bottom:-{px(9)}px;height:{px(7)}px;background:{RED};border-radius:4px"></span></span>')


def xrow(t):
    return (f'<div style="display:flex;align-items:center;gap:{px(8)}px;line-height:1.08">'
            f'<span style="color:{RED};font-weight:700;font-size:{px(44)}px">&#10005;</span><span>{t}</span></div>')


def s06r():
    img = prep_photo_full(37, 'p06.png')
    shade = '<div class="abs" style="left:0;top:0;width:1080px;height:1500px;background:linear-gradient(180deg,rgba(11,12,13,.7),rgba(11,12,13,.55) 70%,rgba(11,12,13,0))"></div>'
    t = f'font-family:{SANS};font-weight:700;color:#fff;letter-spacing:{-px(1.4)}px;text-shadow:0 2px 14px rgba(0,0,0,.45)'
    body = scene(img, 0, 0, 0) + shade
    body += (f'<div class="abs" style="left:{px(78)}px;top:{px(258)}px;width:{px(700)}px;{t};font-size:{px(38)}px">'
             f'<div style="line-height:1.15">so you {red_ul("try harder.")}</div>'
             f'<div style="margin-top:{px(46)}px">{xrow("more posts")}{xrow("more tools")}{xrow("another chatgpt tab at 2am")}</div>'
             f'<div style="margin-top:{px(46)}px;line-height:1.15">you start copying what the big names do.</div>'
             f'<div style="margin-top:{px(40)}px"><span style="background:rgba(11,12,13,.92);padding:{px(4)}px {px(10)}px {px(8)}px;border-radius:{px(5)}px;line-height:1.6;'
             f'-webkit-box-decoration-break:clone;box-decoration-break:clone">and you end up promoting <span style="color:{RED}">their</span> format instead of building your own.</span></div>'
             f'<div style="margin-top:{px(44)}px;line-height:1.14">MEANWHILE THE THING THAT ACTUALLY PAYS YOU GETS</div>'
             f'<div style="line-height:1.14">{red_ul("LESS OF YOUR TIME.")}</div></div>')
    return body


def s07r():
    img = prep_photo_full(26, 'p07.png')
    shade = '<div class="abs" style="left:0;top:0;width:1080px;height:1100px;background:linear-gradient(180deg,rgba(11,12,13,.8),rgba(11,12,13,.6) 75%,rgba(11,12,13,0))"></div>'
    base = f'font-family:{SANS};color:#fff;font-size:{px(31)}px;line-height:1.36;letter-spacing:-.3px;text-shadow:0 2px 12px rgba(0,0,0,.5)'
    bullet = lambda h: (f'<div style="display:flex;gap:{px(10)}px"><span style="flex:none">&bull;</span><span>{h}</span></div>')
    body = scene(img, 0, 0, 0) + shade
    body += (f'<div class="abs" style="left:{px(47)}px;top:{px(266)}px;width:{px(720)}px;{base}">'
             f'that\'s where most people <b>plateau.</b></div>')
    body += (f'<div class="abs" style="left:{px(47)}px;top:{px(350)}px;width:{px(700)}px;font-family:{SERIF};color:#fff;font-size:{px(29)}px;line-height:1.3;text-shadow:0 2px 12px rgba(0,0,0,.5)">'
             f'none of that is your fault.</div>')
    body += (f'<div class="abs" style="left:{px(60)}px;top:{px(452)}px;width:{px(710)}px;border:{px(2.2)}px solid {RED};padding:{px(12)}px {px(14)}px {px(12)}px {px(12)}px;{base}">'
             + bullet("then they pick the <b>main business</b>, because that's what keeps <b>food on the table.</b>")
             + bullet("and the info side <b>dies quietly.</b>") + '</div>')
    return body


D = {'06r': s06r, '07r': s07r}
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(D)):
        render(n, page(D[n]()))
    refs = [os.path.join(ROOT, 'raw-sources', 'inspiration', 'story-sequences', 'brez-scales story sequence', '4.PNG'),
            os.path.join(ROOT, 'raw-sources', 'inspiration', 'story-sequences', 'niksetting', 'story-sequence-3', '7.PNG')]
    w, h = 540, 960
    sh = Image.new('RGB', (2 * (w + 12) + 12, 2 * (h + 12) + 12), (22, 22, 22))
    for r, (ref, mine) in enumerate(zip(refs, ['06r', '07r'])):
        im = Image.open(ref).convert('RGB')
        im = im.crop((0, round(im.height * .053), im.width, round(im.height * .875)))
        sh.paste(ImageOps.fit(im, (w, h), Image.LANCZOS), (12, 12 + r * (h + 12)))
        sh.paste(Image.open(os.path.join(HERE, mine + '.png')).convert('RGB').resize((w, h), Image.LANCZOS), (24 + w, 12 + r * (h + 12)))
    sh.save(os.path.join(HERE, 'copyref.jpg'), quality=92)
    print('ok')

"""Slide types. Each takes (slide dict, brand) and returns body HTML. Content is data; the look comes from the brand.

Tiers: simple = pills, text_dense, type_stack. standard = + problem_list, step_cards. designed = + stat_card, chat_card, inbox_card, closing with logo.
Copy markup: *emphasis* [box word] {gradient label}. Icons are keys into glyphs/ (real brand marks only).
"""
import html, re
from engine import fmt, strip_marks, col, glyph_path, font


def _size(lines, lo=80, hi=150, avail=936):
    longest = max(len(strip_marks(l)) for l in lines)
    return int(max(lo, min(hi, avail / (longest * 0.53))))


def _stack(lines, b, top, size=None, left=72, width=936, center=False):
    size = size or _size(lines)
    gap = int(size * 1.04)
    out = ''
    for i, l in enumerate(lines):
        al = f'left:0;width:1080px;text-align:center' if center else f'left:{left}px'
        out += f'<div class="abs h" style="{al};top:{top + i * gap}px;font-size:{size}px">{fmt(l, b)}</div>'
    return out, top + len(lines) * gap


def _chips(icons, b, top):
    if not icons:
        return ''
    n = len(icons); gap = 36; w = 116
    x0 = int((1080 - (n * w + (n - 1) * gap)) / 2)
    out = ''
    for i, k in enumerate(icons):
        rot = (-5 + i * (10 / max(1, n - 1))) if n > 1 else 0
        out += (f'<div class="abs tile" style="left:{x0 + i * (w + gap)}px;top:{top}px;transform:rotate({rot:.1f}deg)">'
                f'<img src="file:///{glyph_path(b, k)}"></div>')
    return out


def _logo(b, s, idx):
    lg = b['logo']
    if not lg.get('path') or lg.get('placement') == 'none':
        return ''
    if lg['placement'] == 'first' and idx != 0:
        return ''
    p = lg['path'] if os.path.isabs(lg['path']) else os.path.join(b['_dir'], lg['path'])
    return f'<img class="abs" src="file:///{os.path.abspath(p)}" style="left:72px;top:70px;height:64px">'


import os


def type_stack(s, b, idx):
    lines = s['lines']
    top = {'top': 150, 'center': 520, 'bottom': 1040}[s.get('pos', 'top')]
    body, end = _stack(lines, b, top, s.get('size'), center=s.get('center', False))
    if s.get('sub'):
        body += (f'<div class="abs" style="left:72px;top:{end + 24}px;width:936px;font-size:46px;line-height:1.22;'
                 f'letter-spacing:-.02em;color:{col(b, "mute")}">{fmt(s["sub"], b)}</div>')
        end += 140
    body += _chips(s.get('icons'), b, end + 60)
    return body + _logo(b, s, idx)


def pills(s, b, idx):
    """Simple tier: short lines as pills on the photo (the Niksetting register). One thought per pill."""
    top = {'top': 200, 'center': 620, 'bottom': 1080}[s.get('pos', 'center')]
    out, y = '', top
    size = s.get("size", 66)
    for l in s['lines']:
        out += (f'<div class="abs" style="left:72px;top:{y}px;"><span class="pill" style="font-size:{size}px;'
                f'background:{col(b, "bg")}ee;color:{col(b, "ink")};line-height:1.1;border:2px solid rgba(255,255,255,.1)">{fmt(l, b)}</span></div>')
        y += int(size * 1.7)
    return out + _logo(b, s, idx)


def text_dense(s, b, idx):
    """Simple tier long line: one paragraph, auto-fitted. Lowers the font size to fit the box instead of adding slides."""
    kicker = ''
    top = s.get('top', 260)
    if s.get('kicker'):
        kicker = (f'<div class="abs h" style="left:72px;top:{top - 110}px;font-size:72px">{fmt(s["kicker"], b)}</div>')
    hh = s.get('height', 1100)
    body = (f'<div class="abs fitbox" data-max="{s.get("max", 78)}" data-min="{s.get("min", 36)}" '
            f'style="left:72px;top:{top}px;width:936px;height:{hh}px">'
            f'<div class="fit" style="font-size:{s.get("max", 78)}px;line-height:1.2;font-weight:{b["type"]["weight"]};'
            f'letter-spacing:-.025em">{fmt(s["text"], b)}</div></div>')
    return kicker + body + _logo(b, s, idx)


def problem_list(s, b, idx):
    body, end = _stack(s['lines'], b, 150, s.get('size'))
    y = end + 50
    for it in s['items']:
        body += (f'<div class="abs" style="left:72px;top:{y}px;width:936px;display:flex;gap:26px;align-items:center">'
                 f'<svg width="56" height="56" viewBox="0 0 56 56"><path d="M8 8 L48 48 M48 8 L8 48" stroke="{col(b, "accent")}" '
                 f'stroke-width="9" stroke-linecap="round"/></svg>'
                 f'<div style="font-size:60px;font-weight:700;letter-spacing:-.035em">{fmt(it, b)}</div></div>')
        y += 110
    if s.get('footer'):
        body += (f'<div class="abs h" style="left:72px;top:{y + 40}px;font-size:76px">{fmt(s["footer"], b)}</div>')
    return body + _logo(b, s, idx)


def step_cards(s, b, idx):
    body, end = _stack(s['lines'], b, 130, s.get('size', 110))
    y = end + 40
    for c in s['cards']:
        icons = ''
        for k in c.get('icons', []):
            icons += f'<div class="tile" style="width:104px;height:104px;border-radius:26px"><img src="file:///{glyph_path(b, k)}" style="width:56px;height:56px"></div>'
        body += (f'<div class="abs card" style="left:72px;top:{y}px;width:936px;height:210px;padding:0 44px;display:flex;align-items:center;gap:24px">'
                 f'<div style="flex:1"><div style="font-size:58px;font-weight:700;letter-spacing:-.035em;white-space:nowrap">{fmt(c["label"], b)}</div>'
                 f'<div style="font-size:36px;color:{col(b, "mute")};margin-top:8px">{html.escape(c.get("sub", ""))}</div></div>{icons}</div>')
        y += 240
    return body + _logo(b, s, idx)


def stat_card(s, b, idx):
    body, end = _stack(s['lines'], b, 130, s.get('size', 120))
    rows = ''
    for r in s['rows']:
        color = col(b, r.get('color', 'silver'))
        rows += (f'<div style="display:flex;align-items:center;gap:22px;margin-top:58px">'
                 f'<div style="width:250px;font-size:46px;font-weight:700;letter-spacing:-.02em">{html.escape(r["label"])}</div>'
                 f'<div style="flex:1;height:46px;border-radius:23px;background:rgba(255,255,255,.1);overflow:hidden">'
                 f'<div style="height:100%;width:{int(r["value"] * 100)}%;border-radius:23px;background:{color}"></div></div>'
                 f'<div style="width:120px;text-align:right;font-size:48px;font-weight:700">{html.escape(r.get("text", str(int(r["value"] * 100)) + "%"))}</div></div>')
    body += (f'<div class="abs card" style="left:72px;top:{end + 50}px;width:936px;padding:48px 52px 60px">'
             f'<div style="font-size:32px;letter-spacing:.14em;text-transform:uppercase;color:{col(b, "mute")};font-weight:700">{html.escape(s.get("card_title", ""))}</div>{rows}</div>')
    return body + _logo(b, s, idx)


def chat_card(s, b, idx):
    body, end = _stack(s['lines'], b, 130, s.get('size', 120))
    reply = ''
    if s.get('reply'):
        reply = (f'<div style="font-size:50px;line-height:1.25;letter-spacing:-.02em;margin-top:34px;color:{col(b, "mute")}">{html.escape(s["reply"])}</div>')
    body += (f'<div class="abs card" style="left:72px;top:{end + 50}px;width:936px;padding:56px 56px">'
             f'<div style="font-size:62px;font-weight:700;letter-spacing:-.03em;line-height:1.2">{html.escape(s["greeting"])}</div>'
             f'<div style="margin-top:28px;border-radius:30px;padding:34px 40px;background:rgba(255,255,255,.07);font-size:54px;line-height:1.25;letter-spacing:-.02em">{html.escape(s["prompt"])}</div>{reply}</div>')
    return body + _logo(b, s, idx)


def inbox_card(s, b, idx):
    body, end = _stack(s['lines'], b, 130, s.get('size', 120))
    rows = ''
    states = {'good': col(b, 'good'), 'warn': col(b, 'silver'), 'bad': col(b, 'accent')}
    for r in s['rows']:
        ini = ''.join(w[0] for w in r['name'].split()[:2]).upper()
        rows += (f'<div style="display:flex;align-items:center;gap:20px;padding:24px 0">'
                 f'<div style="width:92px;height:92px;border-radius:50%;background:linear-gradient(135deg,{col(b, "accent")},{col(b, "accent_lo") if "accent_lo" in b["colors"] else col(b, "accent")});display:grid;place-items:center;font-size:34px;font-weight:700;color:#fff">{ini}</div>'
                 f'<div style="flex:1"><div style="font-size:46px;font-weight:700;letter-spacing:-.03em">{html.escape(r["name"])}</div>'
                 f'<div style="font-size:32px;color:{col(b, "mute")};margin-top:6px">{html.escape(r["msg"])}</div></div>'
                 f'<div style="padding:7px 24px 12px;border-radius:999px;background:{states[r.get("state", "warn")]};color:{col(b, "bg")};font-size:32px;font-weight:700">{html.escape(r["status"])}</div></div>')
    body += f'<div class="abs card" style="left:72px;top:{end + 50}px;width:936px;padding:34px 48px">{rows}</div>'
    return body + _logo(b, s, idx)


TYPES = {'type_stack': type_stack, 'closing': type_stack, 'pills': pills, 'text_dense': text_dense,
         'problem_list': problem_list, 'step_cards': step_cards, 'stat_card': stat_card,
         'chat_card': chat_card, 'inbox_card': inbox_card}

"""Spike for pulsify-saas #53: render story-engine HTML through Cloudflare Browser Run (REST screenshot).

Uses the wrangler OAuth token (scope: browser write) read from wrangler's config; the token is never printed or stored here.
python cf_render.py <in.html> <out.png> [--font Inter=path/to/font.woff2 ...]
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

ACCOUNT = '437f6dfbb738a4267395bd5da251494a'
CFG = os.path.expandvars(r'%APPDATA%\xdg.config\.wrangler\config\default.toml')


def token():
    t = open(CFG, encoding='utf-8').read()
    return re.search(r'oauth_token\s*=\s*"([^"]+)"', t).group(1)


def inline_files(html):
    """Replace file:///... urls (photos, glyphs) with data URIs so the cloud browser needs no local access."""
    def sub(m):
        p = m.group(1).replace('%20', ' ')
        ext = p.rsplit('.', 1)[-1].lower()
        mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml', 'woff2': 'font/woff2'}[ext]
        return 'data:' + mime + ';base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    return re.sub(r'file:///([^\'")\s]+)', sub, html)


def render(html, out, fonts=None, width=1080, height=1920):
    css = ''
    for fam, path in (fonts or {}).items():
        b = base64.b64encode(open(path, 'rb').read()).decode()
        css += f'@font-face{{font-family:"{fam}";src:url(data:font/woff2;base64,{b}) format("woff2");font-weight:100 900}}'
    if css:
        html = html.replace('<style>', '<style>' + css, 1)
    body = json.dumps({'html': inline_files(html), 'viewport': {'width': width, 'height': height},
                       'gotoOptions': {'waitUntil': 'networkidle0'}}).encode()
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/browser-run/screenshot', data=body,
                                 headers={'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json'})
    t0 = time.time()
    retries = 0
    while True:
        try:
            data = urllib.request.urlopen(req, timeout=90).read()
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and retries < 8:
                wait = float(e.headers.get('Retry-After') or 6)
                retries += 1
                print(f'429, waiting {wait:.0f}s (retry {retries})', flush=True)
                time.sleep(wait + 1)
                continue
            raise SystemExit(f'HTTP {e.code}: {e.read()[:400]!r}')
    open(out, 'wb').write(data)
    return time.time() - t0, len(body), len(data)


if __name__ == '__main__':
    fonts = {}
    args = [a for a in sys.argv[1:]]
    while '--font' in args:
        i = args.index('--font'); k, v = args[i + 1].split('=', 1); fonts[k] = v; del args[i:i + 2]
    secs, sent, got = render(open(args[0], encoding='utf-8').read(), args[1], fonts)
    print(f'ok {secs:.1f}s request {sent/1e6:.2f} MB response {got/1e6:.2f} MB -> {args[1]}')

# Stamp every local script/stylesheet reference in the shell pages with the
# current commit, so a deploy is picked up immediately regardless of cache TTLs.
# Run before `wrangler pages deploy`. Idempotent: replaces any existing ?v= stamp.
import re, subprocess, io, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=root).stdout.strip() or "dev"
pages = ["portal/login/index.html", "onboard/index.html"]
pat = re.compile(r'((?:src|href)=")(/(?:shared|admin|portal|onboard|js|css)/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?(")')
for rel in pages:
    p = os.path.join(root, rel)
    if not os.path.exists(p): continue
    s = io.open(p, encoding="utf-8").read()
    n, count = pat.subn(lambda m: f'{m.group(1)}{m.group(2)}?v={sha}{m.group(3)}', s)
    io.open(p, "w", encoding="utf-8", newline="\n").write(n)
    print(f"{rel}: {count} refs stamped v={sha}")

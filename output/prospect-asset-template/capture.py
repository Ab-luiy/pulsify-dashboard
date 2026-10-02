"""Render a built asset page to sliced PNGs so every screen can be looked at before it ships.

    py capture.py ../bergtrades-asset-v2 shots 1280
    py capture.py ../bergtrades-asset-v2 shots 500      (narrowest headless Chrome will lay out; ~500)

Writes a throwaway _capture.html (reveal animation forced on, nothing in index.html changes), screenshots
it with headless Chrome, then slices the tall image into chunks small enough to read.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OVERRIDE = """<style id="capture-override">
  [data-reveal] > .slide-inner, [data-reveal] [data-stage], [data-reveal] .pop { opacity:1 !important; filter:none !important; scale:1 !important; translate:none !important; transform:none !important; }
  .nav-wrap, .progress-line { display:none !important; }
</style></head>"""


def main():
    page = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
    height = int(sys.argv[4]) if len(sys.argv) > 4 else 16000
    out.mkdir(parents=True, exist_ok=True)

    html = (page / "index.html").read_text(encoding="utf-8")
    html = html.replace("<html ", '<html data-proof-freeze ', 1).replace("</head>", OVERRIDE, 1)
    cap = page / "_capture.html"
    cap.write_text(html, encoding="utf-8")
    shot = out / f"full-{width}.png"
    prof = tempfile.mkdtemp(prefix="chrome-shot-")
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        "--allow-file-access-from-files", f"--user-data-dir={prof}", "--virtual-time-budget=40000",
        f"--window-size={width},{height}", f"--screenshot={shot}", cap.as_uri(),
    ], check=True, capture_output=True)
    cap.unlink()

    im = Image.open(shot)
    # headless Chrome keeps the full requested height, so trim the empty tail below the last pixel row
    bg = im.getpixel((2, im.height - 2))
    last = im.height
    px = im.convert("RGB")
    while last > 10 and all(px.getpixel((x, last - 1)) == bg for x in range(0, im.width, max(1, im.width // 24))):
        last -= 1
    im = im.crop((0, 0, im.width, min(im.height, last + 4)))
    im.save(shot)
    step = 1500 if width >= 900 else 1800
    n = 0
    for top in range(0, im.height, step):
        n += 1
        im.crop((0, top, im.width, min(top + step, im.height))).save(out / f"s{width}-{n:02d}.png")
    print(f"{shot.name}: {im.width}x{im.height}, {n} slices in {out}")


if __name__ == "__main__":
    main()

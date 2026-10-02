"""Fill the Pulsify prospect asset template from a JSON file.

    py fill.py data/berg.json ../bergtrades-asset-v2 --assets ../bergtrades-page
    py fill.py data/blank.json blank

Reads template/index.html.j2 + styles.css + script.js + fonts, renders index.html, and copies every
`assets/...` file the page references from --assets into the output folder. A missing asset is reported
and the page still builds (the slot shows a labelled placeholder only when the JSON path is empty).
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, Undefined

HERE = Path(__file__).resolve().parent
TEMPLATE_DIR = HERE / "template"


class Quiet(Undefined):
    """Missing optional blocks render as empty, so a slide with no data is simply skipped."""

    def __getattr__(self, name):
        if name.startswith("__"):
            raise AttributeError(name)
        return self

    def __getitem__(self, name):
        return self

    def __call__(self, *a, **k):
        return self

    def __str__(self):
        return ""

    def __iter__(self):
        return iter(())

    def __bool__(self):
        return False

    def __len__(self):
        return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("out")
    ap.add_argument("--assets", help="folder that contains the assets/ files the JSON points at")
    args = ap.parse_args()

    data = json.loads(Path(args.data).read_text(encoding="utf-8"))
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), undefined=Quiet, autoescape=False,
                      trim_blocks=False, lstrip_blocks=False)
    html = env.get_template("index.html.j2").render(**data)
    (out / "index.html").write_text(html, encoding="utf-8")

    for name in ("styles.css", "script.js"):
        shutil.copy2(TEMPLATE_DIR / name, out / name)
    shutil.copytree(TEMPLATE_DIR / "assets", out / "assets", dirs_exist_ok=True)

    refs = sorted(set(re.findall(r'assets/[^"\')\s<>]+', html)))
    refs = [r for r in refs if not r.startswith("assets/fonts/")]
    missing, copied = [], 0
    if refs and not args.assets:
        print("page references assets but --assets was not given:", *refs, sep="\n  ")
        sys.exit(1)
    for ref in refs:
        src = Path(args.assets) / ref
        if not src.exists():
            missing.append(ref)
            continue
        dst = out / ref
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        copied += 1

    print(f"built {out / 'index.html'}  ({len(html):,} bytes, {copied} assets copied)")
    if missing:
        print("MISSING assets:", *missing, sep="\n  ")
        sys.exit(2)


if __name__ == "__main__":
    main()

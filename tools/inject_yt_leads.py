#!/usr/bin/env python3
"""
inject_yt_leads.py — bake yt_leads.json + yt_leads_meta.json into index.html.

The dashboard reads its lead list from inline <script id="ytLeadsData"> and
<script id="ytLeadsMeta"> tags (single-file deployment, no fetch). This script
overwrites those tags' contents with the latest scraped JSON.

Usage:
    python tools/inject_yt_leads.py
    python tools/inject_yt_leads.py --leads yt_leads.json --html index.html

Idempotent — safe to run repeatedly. Exit code 0 if injection succeeded, 1 if
the script tags weren't found (which means the dashboard structure changed and
someone needs to fix this script).
"""

import argparse
import json
import re
import sys
from pathlib import Path


SCRIPT_PATTERN = (
    r'(<script id="{id}" type="application/json">)(.*?)(</script>)'
)


def replace_script_content(html: str, script_id: str, new_content: str) -> tuple:
    """Returns (new_html, matched_bool)."""
    pat = re.compile(SCRIPT_PATTERN.format(id=re.escape(script_id)), re.DOTALL)
    matched = [False]

    def sub(m):
        matched[0] = True
        return m.group(1) + new_content + m.group(3)

    new_html = pat.sub(sub, html)
    return new_html, matched[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--leads", default="yt_leads.json")
    parser.add_argument("--meta", default="yt_leads_meta.json")
    parser.add_argument("--html", default="index.html")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    leads_path = repo_root / args.leads
    meta_path = repo_root / args.meta
    html_path = repo_root / args.html

    for p in (leads_path, html_path):
        if not p.exists():
            print(f"ERROR: missing {p}", file=sys.stderr)
            sys.exit(1)

    leads_text = leads_path.read_text(encoding="utf-8").strip()
    # Round-trip parse to validate it's clean JSON before baking
    try:
        leads_data = json.loads(leads_text)
        if not isinstance(leads_data, list):
            raise ValueError("expected JSON array")
    except Exception as e:
        print(f"ERROR: leads JSON invalid — {e}", file=sys.stderr)
        sys.exit(1)

    if meta_path.exists():
        meta_text = meta_path.read_text(encoding="utf-8").strip()
    else:
        meta_text = json.dumps({"scrapedAt": "unknown", "count": len(leads_data)})

    html = html_path.read_text(encoding="utf-8")
    original_size = len(html)

    html, m1 = replace_script_content(html, "ytLeadsData", leads_text)
    if not m1:
        print('ERROR: <script id="ytLeadsData"> tag not found in HTML', file=sys.stderr)
        sys.exit(1)

    html, m2 = replace_script_content(html, "ytLeadsMeta", meta_text)
    if not m2:
        print('WARN: <script id="ytLeadsMeta"> not found — skipping meta', file=sys.stderr)

    html_path.write_text(html, encoding="utf-8")
    # Windows-safe: avoid non-ASCII in stdout (cp1252 console)
    msg = "OK -- injected {n} leads into {name} ({a} -> {b} bytes)".format(
        n=len(leads_data), name=html_path.name, a=original_size, b=len(html)
    )
    sys.stdout.write(msg + "\n")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
inject_yt_leads.py - normalize yt_leads.json and bake it into index.html.

The dashboard reads its leads from inline ytLeadsData/ytLeadsMeta script tags.
yt_leads.json is the canonical store: injection is strictly JSON -> HTML and
never reads old baked HTML data back into the source.
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lead_exclusions import is_excluded, load_exclusions
from lead_scoring import enrich_leads


SCRIPT_PATTERN = (
    r'(<script id="{id}" type="application/json">)(.*?)(</script>)'
)


def replace_script_content(html: str, script_id: str, new_content: str) -> tuple:
    """Return (new_html, matched_bool)."""
    pattern = re.compile(
        SCRIPT_PATTERN.format(id=re.escape(script_id)), re.DOTALL
    )
    matched = [False]

    def sub(match):
        matched[0] = True
        return match.group(1) + new_content + match.group(3)

    return pattern.sub(sub, html), matched[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--leads", default="yt_leads.json")
    parser.add_argument("--meta", default="yt_leads_meta.json")
    parser.add_argument("--html", default="index.html")
    parser.add_argument("--exclusions", default="tools/exclusions.json")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    leads_path = repo_root / args.leads
    meta_path = repo_root / args.meta
    html_path = repo_root / args.html
    exclusions_path = repo_root / args.exclusions

    for path in (leads_path, html_path, exclusions_path):
        if not path.exists():
            print(f"ERROR: missing {path}", file=sys.stderr)
            sys.exit(1)

    try:
        leads_data = json.loads(leads_path.read_text(encoding="utf-8"))
        if not isinstance(leads_data, list):
            raise ValueError("expected JSON array")
    except Exception as exc:
        print(f"ERROR: leads JSON invalid - {exc}", file=sys.stderr)
        sys.exit(1)

    meta_data = {}
    scrape_date = None
    if meta_path.exists():
        try:
            meta_data = json.loads(meta_path.read_text(encoding="utf-8"))
            scrape_date = meta_data.get("scrapedAt")
        except Exception:
            meta_data = {}

    exclusions = load_exclusions(exclusions_path)
    for lead in leads_data:
        if is_excluded(lead.get("cu", ""), exclusions):
            lead["excluded"] = True
        else:
            lead.pop("excluded", None)

    # Normalize every source record before persisting or baking it. The exact
    # same serialized records are written to JSON and HTML.
    enrich_leads(leads_data, scrape_date)
    leads_data.sort(key=lambda lead: -(lead.get("s", 0) or 0))
    leads_text = json.dumps(
        leads_data, ensure_ascii=False, separators=(",", ":")
    )
    leads_path.write_text(leads_text, encoding="utf-8")

    meta_data["count"] = len(leads_data)
    meta_text = json.dumps(meta_data, indent=2)
    meta_path.write_text(meta_text + "\n", encoding="utf-8")

    html = html_path.read_text(encoding="utf-8")
    original_size = len(html)
    html, found_leads = replace_script_content(
        html, "ytLeadsData", leads_text
    )
    if not found_leads:
        print(
            'ERROR: <script id="ytLeadsData"> tag not found in HTML',
            file=sys.stderr,
        )
        sys.exit(1)

    html, found_meta = replace_script_content(
        html, "ytLeadsMeta", meta_text
    )
    if not found_meta:
        print(
            'WARN: <script id="ytLeadsMeta"> not found - skipping meta',
            file=sys.stderr,
        )

    html_path.write_text(html, encoding="utf-8")
    print(
        "OK -- injected {count} leads into {name} ({before} -> {after} bytes)"
        .format(
            count=len(leads_data),
            name=html_path.name,
            before=original_size,
            after=len(html),
        )
    )


if __name__ == "__main__":
    main()

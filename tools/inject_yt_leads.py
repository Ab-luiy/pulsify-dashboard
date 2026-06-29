#!/usr/bin/env python3
"""
inject_yt_leads.py — bake yt_leads.json + yt_leads_meta.json into index.html.

The dashboard reads its lead list from inline <script id="ytLeadsData"> and
<script id="ytLeadsMeta"> tags (single-file deployment, no fetch). By default
this script MERGES the latest scraped JSON into whatever is already baked in
(keyed by channel URL, fresh records win on conflict) so a weekly scrape that
returns a different batch never silently drops leads the operator is actively
working. Pass --replace for a deliberate clean rebuild that overwrites.

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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lead_scoring import enrich_leads


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


def extract_existing_leads(html: str, script_id: str) -> list:
    """Parse the leads currently baked into the HTML; [] if absent/invalid."""
    pat = re.compile(SCRIPT_PATTERN.format(id=re.escape(script_id)), re.DOTALL)
    m = pat.search(html)
    if not m:
        return []
    try:
        data = json.loads(m.group(2))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--leads", default="yt_leads.json")
    parser.add_argument("--meta", default="yt_leads_meta.json")
    parser.add_argument("--html", default="index.html")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="clean rebuild: overwrite the lead list instead of merging "
        "(this DROPS any lead not present in the new scrape)",
    )
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

    scrape_date = None
    if meta_path.exists():
        meta_text = meta_path.read_text(encoding="utf-8").strip()
        try:
            scrape_date = json.loads(meta_text).get("scrapedAt")
        except Exception:
            scrape_date = None
    else:
        meta_text = json.dumps({"scrapedAt": "unknown", "count": len(leads_data)})

    # Enrich at build time so the dashboard bakes clean handles + real scores.
    # Adds per lead: cleaned ig, email, niche, score (0-100), tier (A/B/C), wound.
    # Without this the UI shows raw subscriber counts as "score" and email
    # domains (e.g. @gmail.com) as IG handles. Fixed in the data layer so the
    # 298KB single-file UI never has to change.
    enrich_leads(leads_data, scrape_date)

    html = html_path.read_text(encoding="utf-8")
    original_size = len(html)

    # MERGE (default): never silently drop leads that fell out of the latest
    # scrape. A weekly scrape returns a fresh batch; leads it doesn't re-surface
    # would otherwise vanish from the CRM — and with them anything the operator
    # was actively building. So union the fresh scrape with whatever is already
    # baked in, keyed by channel URL, fresh records winning on conflict. Prior
    # leads keep the enrichment they were baked with. Use --replace to override.
    if not args.replace:
        existing = extract_existing_leads(html, "ytLeadsData")
        if existing:
            scraped_cus = {l.get("cu", "") for l in leads_data if l.get("cu")}
            kept = [l for l in existing if l.get("cu") and l.get("cu") not in scraped_cus]
            leads_data = leads_data + kept
            leads_data.sort(key=lambda d: -d.get("s", 0))
            print(
                "merge: {s} scraped + {k} prior-only kept -> {t} total".format(
                    s=len(scraped_cus), k=len(kept), t=len(leads_data)
                ),
                file=sys.stderr,
            )

    leads_text = json.dumps(leads_data, ensure_ascii=False, separators=(",", ":"))

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

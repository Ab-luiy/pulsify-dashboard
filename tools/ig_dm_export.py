#!/usr/bin/env python3
"""Find the Instagram DM threads that went quiet, from Meta's official export.

The Instagram Graph API never exposes delivered-vs-seen receipts, and this repo's
Composio connection is analytics-only, so "which DMs are still sitting on delivered"
cannot be pulled from any API. The closest truthful signal is *we sent last and they
never came back*, and Meta's own data export carries every thread needed to compute it.

Getting the export (do this first, Meta takes hours to days):
    Instagram -> Settings -> Accounts Centre -> Your information and permissions
    -> Download your information -> select Messages -> Format JSON -> request.

Then point this at the zip or the unpacked folder:

    python3 tools/ig_dm_export.py ~/Downloads/instagram-export.zip
    python3 tools/ig_dm_export.py ~/Downloads/instagram-export/ --days 7 --never-replied
    python3 tools/ig_dm_export.py export.zip --format csv > quiet-threads.csv

The default output is the paste format the dashboard's "Import DM threads" box wants:

    handle | Name | niche | last-sent YYYY-MM-DD

Nothing is sent and nothing is written to the CRM — this only reads the export and
prints. Enrolling the leads stays a deliberate click in the dashboard.
"""

import argparse
import datetime as dt
import io
import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lead_scoring import niche_of  # noqa: E402

# Instagram writes UTF-8 bytes but escapes them as latin-1 code points, so
# "Björn" arrives as "BjÃ¶rn" unless the round-trip is undone.
def demojibake(s):
    if not isinstance(s, str):
        return s
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


THREAD_ID_RE = re.compile(r"_\d{5,}$")
HANDLE_OK_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")


def handle_from_path(thread_dir):
    """Export folders are named "<username>_<threadid>" — recover the username."""
    slug = THREAD_ID_RE.sub("", thread_dir)
    return slug if HANDLE_OK_RE.match(slug) else ""


def iter_message_files(root):
    """Yield (thread_dir_name, parsed_json) for every message file in the export.

    Accepts a zip or an unpacked directory, and tolerates the several layouts Meta
    has shipped (messages/inbox, your_instagram_activity/messages/inbox, e2ee_cutover).
    """
    if root.is_file() and root.suffix.lower() == ".zip":
        with zipfile.ZipFile(root) as z:
            for name in z.namelist():
                parts = name.split("/")
                if not parts[-1].startswith("message_") or not name.endswith(".json"):
                    continue
                if "inbox" not in parts and "e2ee_cutover" not in parts:
                    continue
                try:
                    yield parts[-2], json.load(io.TextIOWrapper(z.open(name), encoding="utf-8"))
                except (json.JSONDecodeError, KeyError):
                    continue
        return

    for path in sorted(root.rglob("message_*.json")):
        parts = path.parts
        if "inbox" not in parts and "e2ee_cutover" not in parts:
            continue
        try:
            yield path.parent.name, json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue


def load_threads(root):
    """Merge every message_N.json belonging to the same thread into one record."""
    threads = {}
    for thread_dir, blob in iter_message_files(root):
        t = threads.setdefault(thread_dir, {"dir": thread_dir, "title": "", "participants": set(), "messages": []})
        if blob.get("title") and not t["title"]:
            t["title"] = demojibake(blob["title"])
        for p in blob.get("participants") or []:
            if p.get("name"):
                t["participants"].add(demojibake(p["name"]))
        for m in blob.get("messages") or []:
            if not m.get("sender_name") or not m.get("timestamp_ms"):
                continue
            t["messages"].append({
                "sender": demojibake(m["sender_name"]),
                "ts": int(m["timestamp_ms"]),
                "text": demojibake(m.get("content") or ""),
            })
    for t in threads.values():
        t["messages"].sort(key=lambda m: m["ts"])
    return list(threads.values())


def detect_me(threads):
    """The account owner is the one sender present in nearly every thread."""
    seen = Counter()
    for t in threads:
        for name in {m["sender"] for m in t["messages"]}:
            seen[name] += 1
    return seen.most_common(1)[0][0] if seen else ""


def analyse(threads, me, include_groups):
    now = dt.datetime.now(dt.timezone.utc)
    out = []
    for t in threads:
        msgs = t["messages"]
        if not msgs:
            continue
        others = sorted(t["participants"] - {me}) or sorted({m["sender"] for m in msgs} - {me})
        if not others:
            continue                                  # note-to-self or owner-only thread
        if len(others) > 1 and not include_groups:
            continue

        last = msgs[-1]
        ours = [m for m in msgs if m["sender"] == me]
        theirs = [m for m in msgs if m["sender"] != me]
        if not ours:
            continue                                  # inbound-only, nothing was ever sent
        last_out = ours[-1]
        age_days = (now - dt.datetime.fromtimestamp(last_out["ts"] / 1000, dt.timezone.utc)).days
        # Their side of the conversation, sampled for a niche guess.
        corpus = " ".join(m["text"] for m in theirs[-8:]) or " ".join(m["text"] for m in ours[-4:])

        out.append({
            "handle": handle_from_path(t["dir"]),
            "name": t["title"] or others[0],
            "niche": niche_of(corpus)[0],
            "last_sent": dt.datetime.fromtimestamp(last_out["ts"] / 1000, dt.timezone.utc).date().isoformat(),
            "age_days": age_days,
            "we_sent_last": last["sender"] == me,
            "never_replied": not theirs,
            "sent_count": len(ours),
            "their_count": len(theirs),
            "group": len(others) > 1,
        })
    return out


NICHE_LABELS = {"trading": "Trading", "ecom": "Ecom", "tiktok shop": "TikTok Shop",
                "fba": "FBA", "operator": "Operator", "other": "—"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", type=Path, help="the export .zip, or the unpacked folder")
    ap.add_argument("--me", default="", help="your display name in the export (auto-detected otherwise)")
    ap.add_argument("--days", type=int, default=3, help="minimum days of silence since your last message (default 3)")
    ap.add_argument("--max-days", type=int, default=365, help="ignore threads older than this (default 365)")
    ap.add_argument("--never-replied", action="store_true", help="only threads where they never replied at all")
    ap.add_argument("--groups", action="store_true", help="include group threads (default: 1:1 only)")
    ap.add_argument("--format", choices=["import", "csv", "json"], default="import")
    ap.add_argument("--limit", type=int, default=0, help="cap the number of rows printed")
    args = ap.parse_args()

    if not args.export.exists():
        sys.exit(f"Not found: {args.export}")

    threads = load_threads(args.export)
    if not threads:
        sys.exit("No message threads found. Point this at the export zip, or the folder holding "
                 "messages/inbox/, and make sure you requested the JSON format (not HTML).")

    me = args.me or detect_me(threads)
    rows = analyse(threads, me, args.groups)
    quiet = [r for r in rows
             if r["we_sent_last"]
             and args.days <= r["age_days"] <= args.max_days
             and (r["never_replied"] or not args.never_replied)]
    quiet.sort(key=lambda r: r["age_days"])
    if args.limit:
        quiet = quiet[:args.limit]

    print(f"# {len(threads)} thread(s) in export · you = {me!r} · "
          f"{len(quiet)} quiet for {args.days}+ days", file=sys.stderr)
    if not quiet:
        print("# nothing matched — loosen --days or drop --never-replied", file=sys.stderr)
        return

    if args.format == "json":
        json.dump(quiet, sys.stdout, indent=2)
        print()
    elif args.format == "csv":
        print("handle,name,niche,last_sent,age_days,sent_count,their_count,never_replied")
        for r in quiet:
            cells = [r["handle"], r["name"], r["niche"], r["last_sent"], r["age_days"],
                     r["sent_count"], r["their_count"], r["never_replied"]]
            print(",".join('"' + str(c).replace('"', '""') + '"' for c in cells))
    else:
        for r in quiet:
            print(f"{r['handle'] or r['name']} | {r['name']} | "
                  f"{NICHE_LABELS.get(r['niche'], '—')} | {r['last_sent']}")


if __name__ == "__main__":
    main()

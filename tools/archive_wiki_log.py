"""Keep wiki/log.md small: move log entries older than N days (default 30) to
wiki/log-archive/YYYY-MM.md, verbatim. Nothing is deleted.

Usage (vault root):  python tools/archive_wiki_log.py [--days 30] [--dry-run]
Entries are matched by their header date, so the file's ordering does not matter.
"""
import argparse
import datetime as dt
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "wiki" / "log.md"
ARCH = ROOT / "wiki" / "log-archive"
ENTRY = re.compile(r"^## \[(\d{4}-\d{2}-\d{2})\]")
POINTER = "Older entries (before the last 30 days) live in `wiki/log-archive/YYYY-MM.md`, moved verbatim. Roll with `python tools/archive_wiki_log.py`."


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    cutoff = (dt.date.today() - dt.timedelta(days=a.days)).isoformat()
    lines = LOG.read_text(encoding="utf-8").split("\n")
    starts = [i for i, l in enumerate(lines) if ENTRY.match(l)]
    head = lines[: starts[0]]
    ents = []
    for n, s in enumerate(starts):
        e = starts[n + 1] if n + 1 < len(starts) else len(lines)
        ents.append((ENTRY.match(lines[s]).group(1), lines[s:e]))
    keep = [e for d, e in ents if d >= cutoff]
    old = [(d, e) for d, e in ents if d < cutoff]
    print(f"cutoff {cutoff}: keep {len(keep)}, archive {len(old)}")
    if a.dry_run:
        return
    ARCH.mkdir(exist_ok=True)
    by = {}
    for d, e in old:
        by.setdefault(d[:7], []).extend(e)
    for m, body in sorted(by.items()):
        f = ARCH / f"{m}.md"
        pre = [] if f.exists() else [f"# Wiki log archive {m}", "", "Moved verbatim from wiki/log.md.", ""]
        with f.open("a", encoding="utf-8", newline="") as fh:
            fh.write("\n".join(pre + body).rstrip("\n") + "\n\n")
    if POINTER not in "\n".join(head):
        head = [l for l in head]
        while head and head[-1] == "":
            head.pop()
        head += ["", POINTER, "", "---", ""]
    new = head[:]
    for e in keep:
        new += e
    LOG.write_text("\n".join(new).rstrip("\n") + "\n", encoding="utf-8", newline="")
    print(f"wiki/log.md now {LOG.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

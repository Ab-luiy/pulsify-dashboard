"""Keep AGENT_CHAT.md small: archive old log entries and finished Lock Board rows.

Live file keeps: rules, cross-call protocol, ACTIVE or recent Lock Board rows, and
log entries from the last N days (default 7). Everything older moves, verbatim and in
order, to archive/agent-chat/YYYY-MM.md (log entries, by entry month) and
archive/agent-chat/lock-board-history.md (finished lock rows).

Usage (vault root):  python tools/archive_agent_chat.py [--days 7] [--dry-run]
Run it weekly. Nothing is deleted: git history plus the archive files hold it all.
"""
import argparse
import datetime as dt
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHAT = ROOT / "AGENT_CHAT.md"
ARCHIVE = ROOT / "archive" / "agent-chat"
ENTRY = re.compile(r"^##+ \[(\d{4}-\d{2}-\d{2})")
ISO = re.compile(r"\d{4}-\d{2}-\d{2}")
TABLE_HEAD = "| File / area | Owner | Status | Note |\n|---|---|---|---|"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    cutoff = (dt.date.today() - dt.timedelta(days=args.days)).isoformat()

    raw = CHAT.read_bytes().decode("utf-8")
    nl = "\n"  # the file has mixed CRLF/LF from two agents; normalize to LF
    lines = re.split(r"\r?\n", raw)

    lock_i = lines.index("## Lock Board")
    log_i = lines.index("## Log")
    sep = max(i for i in range(lock_i, log_i) if lines[i].strip() == "---")

    # Lock Board: keep ACTIVE rows and rows dated on/after the cutoff.
    keep_rows, old_rows = [], []
    for l in lines[lock_i + 1 : sep]:
        s = l.strip()
        if not s or s.startswith("| File / area") or s.startswith("|---") or s.startswith("Active claims only"):
            continue
        dates = ISO.findall(l)
        if "ACTIVE" in l or (dates and max(dates) >= cutoff):
            keep_rows.append(l)
        else:
            old_rows.append(l)

    # Log: split into header + entries, archive entries older than the cutoff.
    starts = [i for i in range(log_i + 1, len(lines)) if ENTRY.match(lines[i])]
    head = lines[log_i : starts[0]] if starts else lines[log_i:]
    entries = []
    for n, s in enumerate(starts):
        e = starts[n + 1] if n + 1 < len(starts) else len(lines)
        entries.append((ENTRY.match(lines[s]).group(1), lines[s:e]))
    keep_ent = [e for d, e in entries if d >= cutoff]
    old_ent = [(d, e) for d, e in entries if d < cutoff]

    print(f"cutoff {cutoff}: keep {len(keep_ent)} entries / {len(keep_rows)} lock rows; "
          f"archive {len(old_ent)} entries / {len(old_rows)} lock rows")
    if args.dry_run:
        return

    ARCHIVE.mkdir(parents=True, exist_ok=True)
    by_month = {}
    for d, e in old_ent:
        by_month.setdefault(d[:7], []).extend(e)
    for month, body in sorted(by_month.items()):
        f = ARCHIVE / f"{month}.md"
        head_txt = [] if f.exists() else [f"# AGENT_CHAT log archive {month}", "", "Moved verbatim from AGENT_CHAT.md. Read only when you need history.", ""]
        with f.open("a", encoding="utf-8", newline="") as fh:
            fh.write(nl.join(head_txt + body).rstrip(nl) + nl + nl)
    if old_rows:
        f = ARCHIVE / "lock-board-history.md"
        head_txt = [] if f.exists() else ["# Lock Board history", "", "Finished lock rows moved verbatim from AGENT_CHAT.md.", "", TABLE_HEAD]
        with f.open("a", encoding="utf-8", newline="") as fh:
            fh.write(nl.join(head_txt + old_rows) + nl)

    new = lines[: lock_i + 1]
    new += ["", TABLE_HEAD] + keep_rows + ["", "Older finished rows: archive/agent-chat/lock-board-history.md", ""]
    new += lines[sep:log_i]
    new += head
    for e in keep_ent:
        new += e
    out = nl.join(new).rstrip(nl) + nl
    CHAT.write_bytes(out.encode("utf-8"))
    print(f"AGENT_CHAT.md now {len(out.encode('utf-8')) // 1024} KB")


if __name__ == "__main__":
    main()

"""Print the live IG inbox (Zernio webhook -> D1 pulsify-portal) as markdown.

Every DM lands in D1 within seconds via the Zernio webhook, including message
requests the Composio/Graph pull misses. Run this before saying anything about
outreach state.

Usage: py -X utf8 tools/ig_inbox_snapshot.py [days=45] > inbox-live.md
"""
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Any folder with a wrangler.toml bound to pulsify-portal works.
WRANGLER_CWD = Path(__file__).resolve().parent.parent
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 45

# Personal threads, kept out of the action lists.
NOT_PROSPECTS = {"abdvl163", "luiy.ab", "daybrade", "passmesomedupe", "mattt.fx",
                 "scalelike.zk", "sufyanhashmi_", "lukealexxander"}


def d1(sql):
    cmd = f'npx wrangler d1 execute pulsify-portal --remote --json --command "{sql}"'
    res = subprocess.run(cmd, cwd=WRANGLER_CWD, capture_output=True, text=True,
                         encoding="utf-8", shell=True)
    start = res.stdout.find("[")
    data = json.loads(res.stdout[start:]) if start >= 0 else None
    if not isinstance(data, list) or not data[0].get("success"):
        raise SystemExit(f"D1 query failed: {res.stdout[:500]} {res.stderr[:500]}")
    return data[0]["results"]


def one_line(text, n=160):
    return (text or "[media]").replace("\n", " / ").replace("|", "/")[:n]


def main():
    since = f"strftime('%Y-%m-%dT%H:%M:%fZ', datetime('now','-{DAYS} days'))"
    convs = d1(
        "SELECT id, participant_username u, participant_name nm, last_message_at at, last_direction dir "
        f"FROM ig_conversations WHERE last_message_at >= {since} ORDER BY last_message_at DESC"
    )
    msgs = d1(
        "SELECT conversation_id c, direction d, sent_at at, text t FROM ig_messages "
        f"WHERE sent_at >= {since} ORDER BY sent_at"
    )
    by_conv = {}
    for m in msgs:
        by_conv.setdefault(m["c"], []).append(m)

    now = datetime.now(timezone.utc)
    waiting, ours, other = [], [], []
    for c in convs:
        handle = c["u"] or c["nm"] or c["id"]
        thread = by_conv.get(c["id"], [])
        last_in = next((m for m in reversed(thread) if m["d"] == "inbound"), None)
        last_out = next((m for m in reversed(thread) if m["d"] == "outbound"), None)
        age = (now - datetime.fromisoformat(c["at"].replace("Z", "+00:00"))).days
        row = (handle, c["at"][:16].replace("T", " "), age, last_in, last_out)
        if handle in NOT_PROSPECTS:
            other.append(row)
        elif c["dir"] == "inbound":
            waiting.append(row)
        else:
            ours.append(row)

    L = [
        "# IG inbox, live",
        "",
        f"Generated {now:%Y-%m-%d %H:%M} UTC from D1 (Zernio webhook). Last {DAYS} days.",
        "",
        f"## Waiting on us ({len(waiting)})",
        "",
        "| Handle | Last message (UTC) | Days | Their last message |",
        "|---|---|---|---|",
    ]
    L += [f"| {h} | {at} | {a} | {one_line(i and i['t'])} |" for h, at, a, i, o in waiting]
    L += ["", f"## We spoke last ({len(ours)})", "",
          "| Handle | Last message (UTC) | Days | Our last message | Their last message |",
          "|---|---|---|---|---|"]
    L += [f"| {h} | {at} | {a} | {one_line(o and o['t'], 100)} | {one_line(i['t'], 100) if i else 'never replied'} |"
          for h, at, a, i, o in ours]
    L += ["", f"## Personal ({len(other)})", "", ", ".join(f"`{h}`" for h, *_ in other) or "none", ""]
    print("\n".join(L))


if __name__ == "__main__":
    main()

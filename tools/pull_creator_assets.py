"""Pull a creator's YouTube evidence for a prospect asset build.

Scrapes the channel page for video IDs, then downloads every thumbnail at the
highest resolution available into the prospect's Desktop folder. Instagram is
not attempted: it blocks this and that is a settled dead end, so IG covers are
founder-supplied.

    python tools/pull_creator_assets.py @real.tb.tradez tb-tradez

Args:
    handle   the channel handle, with or without the leading @
    slug     folder name under "Desktop\\Prospect Assets\\" (defaults to handle)

Writes:
    Desktop/Prospect Assets/{slug}/yt-{videoId}.jpg
    Desktop/Prospect Assets/{slug}/_channel.txt   subs, video count, ids

Run this before diagnosing. Seeing the thumbnails at full size has twice
surfaced the strongest finding in the document, things a screenshot hides.
"""

import json
import os
import re
import sys
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
DESKTOP = os.path.join(os.path.expanduser("~"), "Desktop", "Prospect Assets")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    handle = sys.argv[1].lstrip("@")
    slug = sys.argv[2] if len(sys.argv) > 2 else handle.replace(".", "-")
    out_dir = os.path.join(DESKTOP, slug)
    os.makedirs(out_dir, exist_ok=True)

    html = fetch(f"https://www.youtube.com/@{handle}/videos").decode("utf-8", "replace")

    ids, seen = [], set()
    for m in re.finditer(r'"videoId":"([A-Za-z0-9_-]{11})"', html):
        if m.group(1) not in seen:
            seen.add(m.group(1))
            ids.append(m.group(1))

    subs = re.search(r'"([\d.,KM]+ subscribers)"', html)
    count = re.search(r'"([\d,]+ videos?)"', html)

    print(f"channel: @{handle}")
    print(f"  {subs.group(1) if subs else 'subscribers unknown'}")
    print(f"  {count.group(1) if count else 'video count unknown'}")
    print(f"  {len(ids)} video ids found")

    saved = []
    for vid in ids:
        dest = os.path.join(out_dir, f"yt-{vid}.jpg")
        for quality in ("maxresdefault", "hqdefault"):
            try:
                data = fetch(f"https://i.ytimg.com/vi/{vid}/{quality}.jpg")
                with open(dest, "wb") as f:
                    f.write(data)
                saved.append((vid, quality, len(data)))
                print(f"  saved yt-{vid}.jpg  ({quality}, {len(data):,} bytes)")
                break
            except Exception:
                continue
        else:
            print(f"  FAILED {vid}")

    with open(os.path.join(out_dir, "_channel.txt"), "w", encoding="utf-8") as f:
        f.write(f"@{handle}\n")
        f.write(f"{subs.group(1) if subs else 'subscribers unknown'}\n")
        f.write(f"{count.group(1) if count else 'video count unknown'}\n\n")
        for vid, quality, size in saved:
            f.write(f"{vid}\t{quality}\t{size}\n")

    print(f"\n-> {out_dir}")
    print("Titles and view counts do not survive the scrape. Read them off the "
          "channel or ask the founder, and never guess them.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

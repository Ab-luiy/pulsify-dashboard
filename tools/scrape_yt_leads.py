#!/usr/bin/env python3
"""
scrape_yt_leads.py — Pulsify YouTube lead scraper.

Pulls scored creators with 'made $X / case study / how I make' hook videos in
Pulsify's target niches (e-com, dropshipping, TikTok Shop, Amazon FBA, day
trading, prop firms), filters by channel size + video length + activity, and
writes a JSON the dashboard consumes.

Schema written matches dashboard expectations (yt_leads.json):
    [{s, n, cu, ig, vt, vu, pd, lt, ol, tv, tw, sq}, ...]
where:
    s  = score (int)        n  = channel name
    cu = channel url        ig = instagram handle (or "")
    vt = video title        vu = video url
    pd = video publish date tv = video view count
    tw = channel total view count (proxy for reach)
    sq = search query that surfaced this lead

Usage:
    python tools/scrape_yt_leads.py                 # full run, default queries
    python tools/scrape_yt_leads.py --max-per-query 10  # quick smoke test
    python tools/scrape_yt_leads.py --dry-run       # show queries, no API calls

Env:
    YT_API_KEY must be set (from .env or shell).

Cost estimate (default config): ~1500 quota units / run. Daily quota = 10000.
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import urllib.request
import urllib.parse
import urllib.error

# ----------------------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------------------

# Niches × queries — designed against ICP brief from operator:
#   IN: ecom / dropshipping / TikTok Shop / Amazon FBA / day trading / prop firms
#   Sub-niche-with-a-twist creators (e.g. "Mo selling his ecom angle")
#   Channel size: 1K-50K subs (sweet spot)
#   Hook patterns: income proof, first-result, case study, behind-the-scenes
QUERIES = {
    "ecom": [
        '"dropshipping" "0 to 10k"',
        '"dropshipping" "i tried"',
        '"dropshipping" "case study"',
        '"dropshipping" "made $"',
        '"shopify" "first sale"',
        '"shopify" "case study"',
        '"tiktok shop" "first $"',
        '"tiktok shop" "made $"',
        '"ecommerce" "0 to 10k"',
        '"ecommerce" "case study"',
        '"ecom" "behind the scenes"',
    ],
    "fba": [
        '"amazon fba" "first sale"',
        '"amazon fba" "case study"',
        '"amazon fba" "made $"',
        '"amazon fba" "0 to 10k"',
        '"amazon fba" "my first"',
    ],
    "trading": [
        '"prop firm" "my first" payout',
        '"prop firm" "passed"',
        '"day trader" "case study"',
        '"day trading" "made $"',
        '"forex" "first $"',
        '"forex" "case study"',
        '"funded trader" "payout"',
        '"live trade" "profit"',
        '"student results" trading',
        '"day in the life" trader',
    ],
    "operator": [
        '"building my agency"',
        '"day in the life" entrepreneur',
        '"behind the scenes" "agency"',
        '"how I make $" "month"',
    ],
}

# ICP filters
MIN_SUBS = 1_000          # below this = too tiny to have an offer
MAX_SUBS = 500_000        # above this = mega channel, has a team
MIN_VIDEO_SECONDS = 60    # strip shorts
LOOKBACK_DAYS = 14        # weekly run: focus on uploads since last Monday + buffer
MAX_RESULTS_PER_QUERY = 50  # YT search max page size
TARGET_LEADS_OUT = 1000   # effectively uncapped — let MIN_SCORE control quantity
MIN_SCORE = 5000          # quality floor — better fewer good leads than padded junk
INTER_QUERY_SLEEP_S = 0.7 # avoid per-minute search-quota rate limit

# Heuristics for sub-niche twist scoring (operator's "Mo selling his angle" pattern)
TWIST_KEYWORDS = re.compile(
    r"\b(my method|my way|the truth|my system|why I|how I|behind|secret|"
    r"strategy|blueprint|playbook|formula|breakdown|walkthrough)\b",
    re.IGNORECASE,
)

# IG handle extraction from channel description
IG_PATTERNS = [
    re.compile(r"instagram\.com/([A-Za-z0-9_.]{2,30})", re.IGNORECASE),
    re.compile(r"(?:^|\s)@([A-Za-z0-9_.]{3,30})\s*(?:on\s+(?:ig|instagram)|ig|insta)", re.IGNORECASE),
]

YT_BASE = "https://www.googleapis.com/youtube/v3"


# ----------------------------------------------------------------------------
# UTIL
# ----------------------------------------------------------------------------

def load_env(repo_root: Path):
    """Lightweight .env loader (no external dep)."""
    env_path = repo_root / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def api_get(path: str, params: dict, api_key: str, retries: int = 3) -> dict:
    """GET against YT Data API v3 with light retry."""
    params = {**params, "key": api_key}
    url = f"{YT_BASE}/{path}?{urllib.parse.urlencode(params)}"
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Pulsify-LeadScraper/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:300]
            last_err = f"HTTP {e.code}: {body}"
            if e.code == 403 and "quota" in body.lower():
                raise RuntimeError(f"YT API quota exceeded — {body}") from e
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(1.5 * (attempt + 1))
                continue
            raise RuntimeError(last_err) from e
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = str(e)
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"YT API failed after {retries} retries: {last_err}")


def parse_iso_duration(s: str) -> int:
    """PT4M13S -> 253 seconds. Returns 0 if unparseable."""
    if not s or not s.startswith("PT"):
        return 0
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s)
    if not m:
        return 0
    h, mn, sec = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mn * 60 + sec


def extract_ig(text: str) -> str:
    if not text:
        return ""
    for pat in IG_PATTERNS:
        m = pat.search(text)
        if m:
            handle = m.group(1).strip(".").lower()
            # Filter obvious false positives
            if handle in {"reel", "reels", "p", "tv", "stories", "explore"}:
                continue
            if 3 <= len(handle) <= 30:
                return "@" + handle
    return ""


# ----------------------------------------------------------------------------
# SCRAPER STEPS
# ----------------------------------------------------------------------------

def search_videos(query: str, api_key: str, max_results: int, lookback_days: int) -> list:
    """search.list — returns list of video IDs + initial snippet."""
    published_after = (
        datetime.now(timezone.utc) - timedelta(days=lookback_days)
    ).isoformat(timespec="seconds").replace("+00:00", "Z")
    out = []
    page_token = None
    fetched = 0
    while fetched < max_results:
        page_size = min(50, max_results - fetched)
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "videoDuration": "medium",  # 4-20 min — long-form, excludes shorts
            "order": "relevance",
            "relevanceLanguage": "en",
            "publishedAfter": published_after,
            "maxResults": page_size,
        }
        if page_token:
            params["pageToken"] = page_token
        data = api_get("search", params, api_key)
        items = data.get("items", [])
        out.extend(items)
        fetched += len(items)
        page_token = data.get("nextPageToken")
        if not page_token or not items:
            break
    return out


def enrich_videos(video_ids: list, api_key: str) -> dict:
    """videos.list batched 50/req. Returns dict {videoId: full record}."""
    out = {}
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i:i + 50]
        data = api_get(
            "videos",
            {"part": "contentDetails,statistics,snippet", "id": ",".join(chunk)},
            api_key,
        )
        for it in data.get("items", []):
            out[it["id"]] = it
    return out


def enrich_channels(channel_ids: list, api_key: str) -> dict:
    """channels.list batched 50/req. Returns dict {channelId: full record}."""
    out = {}
    unique = list(dict.fromkeys(channel_ids))
    for i in range(0, len(unique), 50):
        chunk = unique[i:i + 50]
        data = api_get(
            "channels",
            {"part": "snippet,statistics,brandingSettings", "id": ",".join(chunk)},
            api_key,
        )
        for it in data.get("items", []):
            out[it["id"]] = it
    return out


def score_lead(video: dict, channel: dict, query: str, niche: str) -> int:
    """Composite score. Higher = better lead."""
    title = video.get("snippet", {}).get("title", "")
    desc = video.get("snippet", {}).get("description", "")
    views = int(video.get("statistics", {}).get("viewCount", 0) or 0)
    subs = int(channel.get("statistics", {}).get("subscriberCount", 0) or 0)
    pub = video.get("snippet", {}).get("publishedAt", "")

    score = 0
    # Recency bonus: 0-3000 (newer = higher)
    try:
        pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        days_old = max(0, (datetime.now(timezone.utc) - pub_dt).days)
        score += max(0, 3000 - days_old * 30)
    except Exception:
        pass
    # View-to-sub ratio (viral-ish content): up to 5000
    if subs > 0:
        ratio = views / subs
        score += int(min(5000, ratio * 1000))
    # Sweet-spot subscriber count: 5K-30K is ideal
    if 5_000 <= subs <= 30_000:
        score += 4000
    elif 1_000 <= subs <= 50_000:
        score += 2500
    elif subs > 100_000:
        score -= 1500
    # Twist-keyword bonus (operator angle)
    if TWIST_KEYWORDS.search(title) or TWIST_KEYWORDS.search(desc[:500]):
        score += 1500
    # Income-proof bonus (number + $ in title)
    if re.search(r"\$[\d,]+|\d+k|\d+ k", title, re.IGNORECASE):
        score += 1500
    # Niche-relevance bonus
    score += {"trading": 600, "ecom": 600, "fba": 800, "operator": 200}.get(niche, 0)
    return max(0, score)


def collect_leads(api_key: str, max_per_query: int, lookback_days: int, niches: list) -> list:
    """Main pipeline. Returns deduped, scored, filtered list of lead dicts."""
    all_videos = []  # (query, niche, video_snippet)
    print(f"[1/4] Searching {sum(len(v) for k,v in QUERIES.items() if k in niches)} queries…", file=sys.stderr)
    for niche, qs in QUERIES.items():
        if niche not in niches:
            continue
        for q in qs:
            try:
                items = search_videos(q, api_key, max_per_query, lookback_days)
                print(f"  - [{niche}] {q!r} -> {len(items)} results", file=sys.stderr)
                for it in items:
                    all_videos.append((q, niche, it))
            except Exception as e:
                print(f"  ! query {q!r} failed: {e}", file=sys.stderr)
            time.sleep(INTER_QUERY_SLEEP_S)  # rate-limit safety

    if not all_videos:
        return []

    # Dedupe by videoId, prefer first occurrence (preserves first niche/query)
    seen_v = set()
    unique = []
    for q, n, it in all_videos:
        vid = it.get("id", {}).get("videoId")
        if not vid or vid in seen_v:
            continue
        seen_v.add(vid)
        unique.append((q, n, vid, it))

    video_ids = [u[2] for u in unique]
    print(f"[2/4] Enriching {len(video_ids)} unique videos…", file=sys.stderr)
    vmap = enrich_videos(video_ids, api_key)

    channel_ids = [
        vmap[vid]["snippet"]["channelId"]
        for _, _, vid, _ in unique
        if vid in vmap
    ]
    print(f"[3/4] Enriching {len(set(channel_ids))} unique channels…", file=sys.stderr)
    cmap = enrich_channels(channel_ids, api_key)

    # Build leads, apply filters, score
    print("[4/4] Filtering + scoring…", file=sys.stderr)
    leads_by_channel = {}  # channelId -> best lead
    dropped = {"no_video_data": 0, "shorts": 0, "no_channel_data": 0,
               "subs_too_low": 0, "subs_too_high": 0}

    for query, niche, vid, _ in unique:
        v = vmap.get(vid)
        if not v:
            dropped["no_video_data"] += 1
            continue
        duration = parse_iso_duration(v.get("contentDetails", {}).get("duration", ""))
        if duration < MIN_VIDEO_SECONDS:
            dropped["shorts"] += 1
            continue
        ch_id = v["snippet"]["channelId"]
        c = cmap.get(ch_id)
        if not c:
            dropped["no_channel_data"] += 1
            continue
        subs = int(c.get("statistics", {}).get("subscriberCount", 0) or 0)
        if subs < MIN_SUBS:
            dropped["subs_too_low"] += 1
            continue
        if subs > MAX_SUBS:
            dropped["subs_too_high"] += 1
            continue

        score = score_lead(v, c, query, niche)

        ch_snip = c.get("snippet", {})
        ch_custom = ch_snip.get("customUrl", "") or ""
        ch_url = (
            f"https://www.youtube.com/{ch_custom}"
            if ch_custom.startswith("@")
            else f"https://www.youtube.com/channel/{ch_id}"
        )
        # IG from channel description / branding
        ig = extract_ig(ch_snip.get("description", "")) or extract_ig(
            c.get("brandingSettings", {}).get("channel", {}).get("description", "")
        )
        lead = {
            "s": score,
            "n": ch_snip.get("title", "Unknown"),
            "cu": ch_url,
            "ig": ig,
            "vt": v["snippet"].get("title", ""),
            "vu": f"https://www.youtube.com/watch?v={vid}",
            "pd": (v["snippet"].get("publishedAt", "") or "")[:10],
            "lt": "",
            "ol": "",
            "tv": int(v.get("statistics", {}).get("viewCount", 0) or 0),
            "tw": int(c.get("statistics", {}).get("viewCount", 0) or 0),
            "sq": query,
            "_subs": subs,        # internal — stripped before write
            "_niche": niche,      # internal — stripped before write
        }
        # Keep the highest-scoring video per channel
        prev = leads_by_channel.get(ch_id)
        if not prev or lead["s"] > prev["s"]:
            leads_by_channel[ch_id] = lead

    # Apply quality floor — better to ship 40 great leads than 300 mediocre ones
    pre_quality = len(leads_by_channel)
    qualified = {k: v for k, v in leads_by_channel.items() if v["s"] >= MIN_SCORE}
    dropped_low_score = pre_quality - len(qualified)

    print(
        f"  dropped: shorts={dropped['shorts']}  "
        f"subs<{MIN_SUBS}={dropped['subs_too_low']}  "
        f"subs>{MAX_SUBS}={dropped['subs_too_high']}  "
        f"score<{MIN_SCORE}={dropped_low_score}  "
        f"no-video-data={dropped['no_video_data']}  "
        f"no-channel-data={dropped['no_channel_data']}",
        file=sys.stderr,
    )

    leads = sorted(qualified.values(), key=lambda l: l["s"], reverse=True)
    # TARGET_LEADS_OUT is a sanity cap, not a target — real cap is MIN_SCORE
    return leads[:TARGET_LEADS_OUT]


# ----------------------------------------------------------------------------
# ENTRYPOINT
# ----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-per-query", type=int, default=MAX_RESULTS_PER_QUERY)
    parser.add_argument("--lookback-days", type=int, default=LOOKBACK_DAYS)
    parser.add_argument(
        "--niches",
        default="ecom,fba,trading,operator",
        help="Comma-separated subset of: ecom,fba,trading,operator",
    )
    parser.add_argument("--out", default="yt_leads.json")
    parser.add_argument("--meta-out", default="yt_leads_meta.json")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print queries that would run, no API calls.")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    load_env(repo_root)
    api_key = os.environ.get("YT_API_KEY")

    niches = [n.strip() for n in args.niches.split(",") if n.strip()]

    if args.dry_run:
        print("DRY RUN — queries that would execute:")
        for n in niches:
            print(f"  [{n}]")
            for q in QUERIES.get(n, []):
                print(f"    · {q}")
        total_q = sum(len(QUERIES.get(n, [])) for n in niches)
        print(f"\nTotal queries: {total_q}")
        print(f"Est. quota: ~{total_q * 100 + 30} units (search=100 ea, batched enrich ~30)")
        return

    if not api_key:
        print("ERROR: YT_API_KEY not set (.env or shell)", file=sys.stderr)
        sys.exit(1)

    leads = collect_leads(api_key, args.max_per_query, args.lookback_days, niches)

    # Strip internal fields before writing
    public_leads = [
        {k: v for k, v in l.items() if not k.startswith("_")} for l in leads
    ]

    out_path = repo_root / args.out
    out_path.write_text(
        json.dumps(public_leads, ensure_ascii=False, separators=(", ", ": ")),
        encoding="utf-8",
    )
    meta = {
        "scrapedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "scrapedAtFull": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(public_leads),
        "niches": niches,
        "queriesRun": sum(len(QUERIES.get(n, [])) for n in niches),
        "filters": {
            "min_subs": MIN_SUBS, "max_subs": MAX_SUBS,
            "min_video_seconds": MIN_VIDEO_SECONDS,
            "lookback_days": args.lookback_days,
        },
    }
    (repo_root / args.meta_out).write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )

    # Summary to stdout (so CI logs are readable)
    print(f"\nWrote {len(public_leads)} leads -> {out_path}")
    by_niche = {}
    for l in leads:
        by_niche[l["_niche"]] = by_niche.get(l["_niche"], 0) + 1
    print("Niche mix:", ", ".join(f"{k}={v}" for k, v in sorted(by_niche.items())))
    if leads:
        print(f"Top 3:")
        for l in leads[:3]:
            print(f"  · [{l['s']}] {l['n']} ({l['_subs']} subs) — {l['vt'][:70]}")


if __name__ == "__main__":
    main()

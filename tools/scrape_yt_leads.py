#!/usr/bin/env python3
"""
scrape_yt_leads.py — Pulsify YouTube lead scraper.

Pulls scored money-skill practitioners/creators who visibly do the craft and
publish legitimate educational videos about the problems they solve.
Filters by channel size + video length + activity, demotes get-rich-quick /
income-bait / non-Western channels, and writes a JSON the dashboard consumes.

Schema written matches dashboard expectations (yt_leads.json):
    [{s, n, cu, ig, vt, vu, pd, lt, ol, tv, tw, sq, subs}, ...]
where:
    s  = score (int)        n  = channel name
    cu = channel url        ig = instagram handle (or "")
    vt = video title        vu = video url
    pd = video publish date tv = video view count
    tw = channel total view count (proxy for reach)
    sq = search query that surfaced this lead
    subs = real channel subscriber count

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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lead_exclusions import is_excluded, load_exclusions

# ----------------------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------------------

# Niches × queries — ICP: immersed creators who visibly do the money skill.
# Pain language leads, followed by milestone/craft/strategy, with one
# offer-intent catch-all per niche. Search breadth finds the practitioner;
# scoring and human review qualify the lead.
#   OUT (penalized in scoring): B2B operators / SMMA / agency owners, closers,
#       appointment setters, YouTube/IG growth & content-creation coaches.
#   Channel size: 500-50K is the practical sweet spot; 300 is the hard floor.
QUERIES = {
    "trading": [
        # PAIN
        "trading psychology",
        "how to stop revenge trading",
        "how to stop overtrading",
        "trading discipline",
        "how to be a consistent trader",
        "why you keep losing money trading",
        "why 90% of traders fail",
        "how to find your trading edge",
        "taking profit too early trading",
        "stop loss hunting explained",
        "smart money concepts trading",
        "how to pass a prop firm challenge",
        "why i keep failing prop firm challenge",
        # milestone / craft / strategy / offer-intent
        "making 10k a month trading",
        "how to read trend lines",
        "my day trading strategy",
        "forex mentorship",
    ],
    "ecom": [
        # PAIN
        "why my dropshipping store isnt selling",
        "getting traffic but no sales shopify",
        "low conversion rate shopify",
        "facebook ads not converting dropshipping",
        "tiktok ads not profitable dropshipping",
        "why my dropshipping ads not working",
        "how to scale dropshipping ads",
        "dropshipping ads stopped working",
        "cant find a winning product",
        "how to find winning products that sell",
        "dropshipping product testing not working",
        "tiktok shop views but no sales",
        "tiktok shop no orders",
        "how to get affiliates tiktok shop",
        "how to increase tiktok shop sales",
        # milestone / strategy / offer-intent
        "making 10k a month dropshipping",
        "my dropshipping strategy",
        "tiktok shop affiliate strategy",
        "dropshipping mentorship",
    ],
    "fba": [
        # PAIN
        "why my amazon product isnt selling",
        "amazon product not ranking",
        "how to rank amazon products",
        "amazon ppc not converting",
        "how to lower acos amazon",
        "amazon fba margins too low",
        "amazon fba too competitive",
        "amazon product launch failed",
        "amazon listing suppressed",
        "how to get reviews on amazon fba",
        # milestone / craft / strategy / offer-intent
        "making 10k a month amazon fba",
        "amazon fba product research",
        "my amazon fba strategy",
        "amazon fba mentorship",
    ],
}

# COMPARISON ONLY - superseded coach/course rotation. Never used by the live
# scraper; retained so query-quality changes can be reviewed against baseline.
LEGACY_COACH_QUERIES = {
    "trading": [
        '"day trading" for beginners', '"how to start day trading"',
        '"day trading" course', '"learn to trade" stocks',
        '"forex" for beginners', '"forex trading" course',
        '"options trading" for beginners', '"trading academy"',
        '"my students" trading',
    ],
    "ecom": [
        '"dropshipping" for beginners', '"how to start dropshipping"',
        '"dropshipping" course', '"shopify" for beginners',
        '"how to start shopify"', '"tiktok shop" for beginners',
        '"ecommerce" for beginners', '"learn ecommerce"',
    ],
    "fba": [
        '"amazon fba" for beginners', '"how to start amazon fba"',
        '"amazon fba" course', '"amazon fba" step by step',
        '"amazon fba" tutorial',
    ],
}

# ICP filters
MIN_SUBS = 300            # smaller channels that nail the ICP titles are still good leads
MAX_SUBS = 500_000        # above this = mega channel, has a team
MIN_VIDEO_SECONDS = 60    # strip shorts
LOOKBACK_DAYS = 90        # wider net — established coaches post less often
MAX_RESULTS_PER_QUERY = 50  # YT search max page size
TARGET_LEADS_OUT = 1000   # effectively uncapped — let MIN_SCORE control quantity
MIN_SCORE = 7000          # quality floor — better fewer good leads than padded junk
INTER_QUERY_SLEEP_S = 0.7 # avoid per-minute search-quota rate limit

# Coach/educator packaging we WANT — teaching the money skill to consumers.
QUALITY_KEYWORDS = re.compile(
    r"\b(for beginners|how to start|how i (?:started|learned)|step[- ]?by[- ]?step|"
    r"course|academy|masterclass|mentorship|free (?:training|course)|my students|"
    r"i teach|learn to|tutorial|full guide|complete guide|beginners? guide|"
    r"day trading|forex|options trading|dropshipping|shopify|tiktok shop|"
    r"amazon fba|ecommerce|e-commerce)\b",
    re.IGNORECASE,
)
# Raw "I'm doing the craft" packaging — the OBLIVIOUS creator who just posts
# their strategy / results / income proof with no polished course-speak. These
# are PRIME leads (max room to enhance), so we nudge them ON PAR with the
# polished crowd instead of letting title polish decide ranking.
CRAFT_PROOF = re.compile(
    r"(\$[\d,]+|\b\d+\s?k\b|my (?:strategy|method|system|setup|results?|store|journey)"
    r"|how i (?:made|make|built|grew|started|hit|passed)|live (?:trading|trade)"
    r"|winning product|product research|first sale|funded account"
    r"|passed (?:the )?(?:prop|challenge)|case study|day in the life)",
    re.IGNORECASE,
)
# Egregious scam tells + junk. Income figures are NORMAL here, so we do NOT
# penalize "$" / "$10k/month".
SCAM_MARKERS = re.compile(
    r"(not clickbait|get rich quick|guaranteed|overnight|free money|easy money|"
    r"no work|while you sleep|secret loophole|i.?ll pay you|glitch|"
    r"official music|music video|official video|lyrics)",
    re.IGNORECASE,
)
# Off-ICP roles the operator explicitly excluded — B2B operators / agency /
# SMMA, closers, appointment setters, YouTube/IG-growth & content coaches.
OFF_ICP = re.compile(
    r"\b(smma|agency|agencies|appointment setter|appt setter|closer|closing"
    r"|high ticket sales|lead gen|grow (?:your|my|on) (?:youtube|instagram|ig)"
    r"|go viral|content creator|content creation|personal brand|how to edit"
    r"|video editing|thumbnail)\b",
    re.IGNORECASE,
)
# Non-English / non-Western-market hints (we want English-speaking, Western
# creators). Accent-tolerant; includes romanized Hindi/Urdu/Pashto/Bengali and
# explicit market mentions (India/Pakistan/etc.) since those dodge the English
# language filter and are off-ICP per the operator.
FOREIGN_HINT = re.compile(
    r"\b(como|cómo|para|você|voce|ganhar|ganhe|dinheiro|negócio|negocio|dinero|"
    r"gratis|gr[aá]tis|f[aá]cil|come[cç]ar|melhor|aprenda|hoje|fa[cç]a|"
    r"resultados|gagner|mois|argent|euros?|gana|"
    r"wie|ich|und|geld|verdienen|machen|"
    r"kaise|kare|kamaye|kamai|paise|paisa|rupees|rupaye|lakh|crore|hindi|urdu|"
    r"pashto|bangla|bengali|in india|in pakistan|in bangladesh|in nigeria|"
    r"in the philippines|tagalog)\b",
    re.IGNORECASE,
)
WESTERN_COUNTRIES = {"US", "GB", "CA", "AU", "NZ", "IE"}

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
        # Do not set videoDuration="medium": that caps search at 20 minutes.
        # Shorts are removed after contentDetails enrichment.
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
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
    country = channel.get("snippet", {}).get("country", "") or ""

    score = 2000  # baseline so penalties can sink weak leads below MIN_SCORE
    # Recency bonus: 0-2500 (newer = higher)
    try:
        pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        days_old = max(0, (datetime.now(timezone.utc) - pub_dt).days)
        score += max(0, 2500 - days_old * 25)
    except Exception:
        pass
    # Sweet-spot subscriber count: a coach/creator with an offer, no big team
    if 2_000 <= subs <= 50_000:
        score += 3500
    elif 500 <= subs <= 120_000:
        score += 2000
    elif subs > 200_000:
        score -= 2000
    # Mild engagement signal (not the point for coaches): 0-1500
    if subs > 0:
        score += int(min(1500, (views / subs) * 600))
    # Title packaging is a SOFT nudge, not a gate — durable signals (niche fit,
    # size, recency, Western) drive ranking. Polished course-speak and raw
    # craft/income-proof titles get an equal small lift, so the oblivious
    # "just posting my strategy" creator isn't buried under the packaged one.
    if QUALITY_KEYWORDS.search(title) or QUALITY_KEYWORDS.search(desc[:400]):
        score += 600
    if CRAFT_PROOF.search(title):
        score += 600
    # Demote egregious scam tells / music+junk (NOT income figures — normal here)
    if SCAM_MARKERS.search(title):
        score -= 4000
    # Hard-demote off-ICP roles (operators/agency/closers/appt-setters/content)
    if OFF_ICP.search(title) or OFF_ICP.search(desc[:400]):
        score -= 5000
    # Reward English-speaking / Western market, demote clearly non-Western
    if country in WESTERN_COUNTRIES:
        score += 1000
    elif country:
        score -= 4000
    if FOREIGN_HINT.search(title):
        score -= 4000
    # Small niche-fit nudge
    score += {"trading": 500, "ecom": 500, "fba": 500}.get(niche, 0)
    return max(0, score)


def collect_leads(
    api_key: str,
    max_per_query: int,
    lookback_days: int,
    niches: list,
    exclusions: dict,
) -> list:
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
               "subs_too_low": 0, "subs_too_high": 0, "excluded": 0}

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
        if is_excluded(ch_url, exclusions):
            dropped["excluded"] += 1
            continue
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
            "subs": subs,
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
        f"no-channel-data={dropped['no_channel_data']}  "
        f"excluded={dropped['excluded']}",
        file=sys.stderr,
    )

    leads = sorted(qualified.values(), key=lambda l: l["s"], reverse=True)
    # TARGET_LEADS_OUT is a sanity cap, not a target — real cap is MIN_SCORE
    return leads[:TARGET_LEADS_OUT]


def load_existing(path: Path) -> list:
    """Read prior yt_leads.json so re-runs accumulate instead of clobbering."""
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def merge_leads(existing: list, fresh: list) -> list:
    """Union existing + fresh, dedup by channel (cu|n).

    Never lose a previously-found (and possibly hand-vetted) creator just
    because a later run's lookback window missed their latest upload. Keep the
    higher-scoring video, but always refresh its real subscriber count from the
    current scrape.
    """
    by_key = {}
    for l in existing:
        key = l.get("cu") or l.get("n")
        if not key:
            continue
        by_key[key] = l
    for lead in fresh:
        key = lead.get("cu") or lead.get("n")
        if not key:
            continue
        previous = by_key.get(key)
        if not previous or (
            (lead.get("s", 0) or 0) > (previous.get("s", 0) or 0)
        ):
            by_key[key] = lead
        elif lead.get("subs") is not None:
            merged = dict(previous)
            merged["subs"] = lead["subs"]
            by_key[key] = merged
    return sorted(by_key.values(), key=lambda l: l.get("s", 0) or 0, reverse=True)


# ----------------------------------------------------------------------------
# ENTRYPOINT
# ----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-per-query", type=int, default=MAX_RESULTS_PER_QUERY)
    parser.add_argument("--lookback-days", type=int, default=LOOKBACK_DAYS)
    parser.add_argument(
        "--niches",
        default="trading,ecom,fba",
        help="Comma-separated subset of: trading,ecom,fba",
    )
    parser.add_argument("--out", default="yt_leads.json")
    parser.add_argument("--meta-out", default="yt_leads_meta.json")
    parser.add_argument("--exclusions", default="tools/exclusions.json")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print queries that would run, no API calls.")
    parser.add_argument("--overwrite", action="store_true",
                        help="Replace yt_leads.json instead of merging with existing.")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    load_env(repo_root)
    api_key = os.environ.get("YT_API_KEY")

    niches = [n.strip() for n in args.niches.split(",") if n.strip()]
    exclusions = load_exclusions(repo_root / args.exclusions)

    if args.dry_run:
        print("DRY RUN — queries that would execute:")
        for n in niches:
            print(f"  [{n}]")
            for q in QUERIES.get(n, []):
                print(f"    · {q}")
        total_q = sum(len(QUERIES.get(n, [])) for n in niches)
        print(f"\nTotal queries: {total_q}")
        print("Video duration: 60s+ after enrichment (long-form included)")
        print(
            "Exclusions active: "
            + ", ".join(
                item.get("label", "unnamed")
                for item in exclusions["channels"]
            )
        )
        print(f"Est. quota: ~{total_q * 100 + 30} units (search=100 ea, batched enrich ~30)")
        return

    if not api_key:
        print("ERROR: YT_API_KEY not set (.env or shell)", file=sys.stderr)
        sys.exit(1)

    leads = collect_leads(
        api_key, args.max_per_query, args.lookback_days, niches, exclusions
    )

    # Strip internal fields before writing
    public_leads = [
        {k: v for k, v in l.items() if not k.startswith("_")} for l in leads
    ]

    # Merge with prior run unless --overwrite, so curated leads accumulate.
    out_path = repo_root / args.out
    if args.overwrite:
        written = public_leads
    else:
        written = merge_leads(load_existing(out_path), public_leads)
    out_path.write_text(
        json.dumps(written, ensure_ascii=False, separators=(", ", ": ")),
        encoding="utf-8",
    )
    meta = {
        "scrapedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "scrapedAtFull": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(written),
        "newThisRun": len(public_leads),
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
    mode = "overwrote" if args.overwrite else "merged"
    print(f"\n{mode}: {len(public_leads)} new this run -> {len(written)} total in {out_path}")
    by_niche = {}
    for l in leads:
        by_niche[l["_niche"]] = by_niche.get(l["_niche"], 0) + 1
    print("Niche mix:", ", ".join(f"{k}={v}" for k, v in sorted(by_niche.items())))
    if leads:
        print(f"Top 3:")
        for l in leads[:3]:
            print(f"  · [{l['s']}] {l['n']} ({l['subs']} subs) — {l['vt'][:70]}")


if __name__ == "__main__":
    main()

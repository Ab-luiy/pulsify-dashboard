#!/usr/bin/env python3
"""Discover public contact channels for leads in yt_leads.json.

The tool is intentionally manual. It fetches YouTube channel pages, follows
supported link-in-bio pages one hop, and checks the first creator-owned site.
Successful responses and a provenance report are cached under tools/_cache so
interrupted or repeated runs are cheap.
"""

import argparse
import datetime as dt
import hashlib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE = ROOT / "tools" / "_cache"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
EMAIL_RE = re.compile(
    r"(?<![A-Z0-9._%+-])([A-Z0-9._%+-]{1,64}@[A-Z0-9.-]+\.[A-Z]{2,24})",
    re.IGNORECASE,
)
ASSET_EXTENSIONS = (
    ".css", ".js", ".mjs", ".json", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".svg", ".ico", ".woff", ".woff2", ".ttf", ".map", ".xml", ".mp4", ".webm",
)
AGGREGATOR_HOSTS = {
    "linktr.ee", "beacons.ai", "stan.store", "linkin.bio", "solo.to",
    "bio.link", "hoo.be", "komi.io",
}
SOCIAL_PLATFORM_HOSTS = {
    "facebook.com", "fb.com", "tiktok.com", "linkedin.com", "twitch.tv",
    "threads.net", "snapchat.com", "pinterest.com", "reddit.com", "telegram.me",
    "t.me", "patreon.com", "ko-fi.com", "buymeacoffee.com", "gumroad.com",
    "substack.com", "spotify.com", "open.spotify.com", "podcasts.apple.com",
    "amazon.com", "whop.com", "skool.com", "calendly.com", "notion.site",
    "notion.so", "forms.gle", "typeform.com", "tally.so", "bsky.app",
    "bit.ly", "tinyurl.com", "link.short.gy", "amzn.to", "lin.ee", "mee6.xyz",
    "shopify.com", "pxf.io", "thanks.is", "bybit.com", "blackbull.com",
    "tradezella.com", "fxreplay.com", "fluxcharts.com", "gatesfx.com",
    "myuserhub.com", "swissborg.com", "storebuild.ai",
    "whatsapp.com", "creator-spring.com",
    "kqzyfj.com", "jdoqocy.com", "tkqlhce.com", "anrdoezrs.net",
    "alpha-futures.com",
    "fourthwall.com", "fundednext.com", "raffall.com",
    "hopp.bio", "beehiiv.com", "buildyourstore.ai",
    "shopltk.com", "linktw.in", "apextraderfunding.com",
    "wa.me", "redbubble.com", "soundon.global", "itunes.apple.com",
    "alltra.app", "linke.to", "pin.it", "w.app", "superprofile.bio",
    "whatnot.com", "onelink.me", "ninjatrader.com", "eo.page",
    "tickettailor.com", "skinsmonkey.com", "guiden.ai",
    "direct.me", "tradesyncer.com", "wondershare.com", "axiom.trade",
    "etsy.com", "vidiq.com", "pionex.com", "repurpose.io",
    "x.gd", "the5ers.com",
    "launchpass.com", "bandcamp.com",
    "medium.com", "flywingrc.shop",
    "ebay.com", "csfloat.com", "propfirmmatch.com", "webull.com",
    "teachable.com", "youtube.com", "youtu.be",
}
INTERNAL_YOUTUBE_HOSTS = {
    "youtube.com", "youtu.be", "ytimg.com", "googlevideo.com", "google.com",
    "googleusercontent.com", "gstatic.com", "ggpht.com", "schema.org",
}
CONTACT_FIELDS = ("ig", "email", "x", "discord", "website")


def host_matches(host, domains):
    host = (host or "").lower().split(":", 1)[0].removeprefix("www.")
    return any(host == domain or host.endswith("." + domain) for domain in domains)


def is_instagram_url(url):
    try:
        return host_matches(urllib.parse.urlsplit(url).hostname, {"instagram.com"})
    except Exception:
        return False


def is_aggregator_url(url):
    try:
        return host_matches(urllib.parse.urlsplit(url).hostname, AGGREGATOR_HOSTS)
    except Exception:
        return False


def cache_key(url):
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


class InstagramRedirectBlocked(urllib.error.URLError):
    pass


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Refuse redirects onto Instagram before any request is issued."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urllib.parse.urljoin(req.full_url, newurl)
        if is_instagram_url(target):
            raise InstagramRedirectBlocked(
                f"refusing redirect to Instagram: {target}"
            )
        return super().redirect_request(req, fp, code, msg, headers, newurl)


@dataclass
class FetchedPage:
    requested_url: str
    final_url: str
    text: str
    cache_file: str
    from_cache: bool


class Fetcher:
    def __init__(
        self,
        cache_dir,
        delay=1.0,
        timeout=15.0,
        retry_failures=False,
    ):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.delay = delay
        self.timeout = timeout
        self.retry_failures = retry_failures
        self.last_request = {}
        self.opener = urllib.request.build_opener(SafeRedirectHandler())
        self.stats = defaultdict(int)
        self.failures = []

    def fetch(self, url):
        if is_instagram_url(url):
            self.stats["instagram_skipped"] += 1
            print(f"SKIP instagram {url}", flush=True)
            return None

        key = cache_key(url)
        body_path = self.cache_dir / f"{key}.html"
        meta_path = self.cache_dir / f"{key}.json"
        error_path = self.cache_dir / f"{key}.error.json"
        if body_path.exists():
            try:
                meta = (
                    json.loads(meta_path.read_text(encoding="utf-8"))
                    if meta_path.exists() else {}
                )
                self.stats["cache_hits"] += 1
                print(f"CACHE {url}", flush=True)
                return FetchedPage(
                    url,
                    meta.get("final_url", url),
                    body_path.read_text(encoding="utf-8"),
                    body_path.name,
                    True,
                )
            except Exception as exc:
                print(f"WARN bad cache {url}: {exc}", file=sys.stderr, flush=True)
        if error_path.exists() and not self.retry_failures:
            try:
                cached_error = json.loads(error_path.read_text(encoding="utf-8"))
                self.stats["cached_failures"] += 1
                self.failures.append(cached_error)
                print(f"CACHE-FAIL {url}", flush=True)
                return None
            except Exception:
                pass

        try:
            host = (urllib.parse.urlsplit(url).hostname or "").lower()
            elapsed = time.monotonic() - self.last_request.get(host, -1e9)
            if elapsed < self.delay:
                time.sleep(self.delay - elapsed)
            self.last_request[host] = time.monotonic()

            request_url = urllib.parse.quote(
                url,
                safe=":/?&=%#@+;,",
            )
            request = urllib.request.Request(
                request_url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            )
            print(f"FETCH {url}", flush=True)
            with self.opener.open(request, timeout=self.timeout) as response:
                final_url = response.geturl()
                if is_instagram_url(final_url):
                    raise InstagramRedirectBlocked(
                        f"refusing Instagram response: {final_url}"
                    )
                raw = response.read(8 * 1024 * 1024 + 1)
                if len(raw) > 8 * 1024 * 1024:
                    raise ValueError("response exceeds 8 MiB")
                charset = response.headers.get_content_charset() or "utf-8"
                text = raw.decode(charset, errors="replace")
                meta = {
                    "requested_url": url,
                    "final_url": final_url,
                    "status": response.status,
                    "content_type": response.headers.get_content_type(),
                    "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                    "cache_file": body_path.name,
                }
            body_path.write_text(text, encoding="utf-8")
            meta_path.write_text(
                json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            error_path.unlink(missing_ok=True)
            self.stats["network_fetches"] += 1
            return FetchedPage(url, final_url, text, body_path.name, False)
        except Exception as exc:
            self.stats["failures"] += 1
            failure = {"url": url, "error": f"{type(exc).__name__}: {exc}"}
            self.failures.append(failure)
            try:
                error_path.write_text(
                    json.dumps(
                        {
                            **failure,
                            "failed_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                        },
                        ensure_ascii=False,
                        indent=2,
                    ) + "\n",
                    encoding="utf-8",
                )
            except Exception:
                pass
            print(f"WARN fetch failed {url}: {failure['error']}", file=sys.stderr, flush=True)
            return None


class VisibleHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hrefs = []
        self.text = []
        self.ignored_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "svg", "noscript", "template"}:
            self.ignored_depth += 1
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.hrefs.append(href)

    def handle_endtag(self, tag):
        if tag in {"script", "style", "svg", "noscript", "template"}:
            self.ignored_depth = max(0, self.ignored_depth - 1)

    def handle_data(self, data):
        if not self.ignored_depth and data.strip():
            self.text.append(data.strip())


def ordered_unique(values):
    result = []
    seen = set()
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def unwrap_youtube_redirect(url):
    parsed = urllib.parse.urlsplit(url)
    if host_matches(parsed.hostname, {"youtube.com"}) and parsed.path == "/redirect":
        query = urllib.parse.parse_qs(parsed.query)
        for key in ("q", "url"):
            if query.get(key):
                return query[key][0]
    return url


def normalize_url(raw, base_url=""):
    if not isinstance(raw, str):
        return ""
    try:
        value = html.unescape(raw.strip()).replace("\\/", "/")
        if value.startswith("//"):
            value = "https:" + value
        elif value.startswith("/") and base_url:
            value = urllib.parse.urljoin(base_url, value)
        if not value.lower().startswith(("http://", "https://")):
            return ""
        value = unwrap_youtube_redirect(value)
        parsed = urllib.parse.urlsplit(value)
        if not parsed.hostname:
            return ""
        return urllib.parse.urlunsplit(
            (parsed.scheme.lower(), parsed.netloc.lower(), parsed.path or "/", parsed.query, "")
        )
    except Exception:
        return ""


def external_youtube_url(raw, base_url):
    url = normalize_url(raw, base_url)
    if not url:
        return ""
    parsed = urllib.parse.urlsplit(url)
    host = parsed.hostname
    if host_matches(host, INTERNAL_YOUTUBE_HOSTS):
        return ""
    if parsed.path.lower().endswith(ASSET_EXTENSIONS):
        return ""
    return url


def strings_under_description(value, in_description=False):
    output = []
    if isinstance(value, dict):
        for key, child in value.items():
            tagged = in_description or "description" in str(key).lower()
            output.extend(strings_under_description(child, tagged))
    elif isinstance(value, list):
        for child in value:
            output.extend(strings_under_description(child, in_description))
    elif in_description and isinstance(value, str):
        output.append(value)
    return output


def all_strings(value):
    if isinstance(value, dict):
        for child in value.values():
            yield from all_strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from all_strings(child)
    elif isinstance(value, str):
        yield value


def values_for_key(value, wanted):
    """Yield values stored under a specific key anywhere in a JSON tree."""
    if isinstance(value, dict):
        for key, child in value.items():
            if key == wanted:
                yield child
            yield from values_for_key(child, wanted)
    elif isinstance(value, list):
        for child in value:
            yield from values_for_key(child, wanted)


def parse_initial_data(page_text):
    decoder = json.JSONDecoder()
    starts = []
    patterns = (
        r"(?:var\s+)?ytInitialData\s*=\s*",
        r'window\[\s*["\']ytInitialData["\']\s*\]\s*=\s*',
    )
    for pattern in patterns:
        starts.extend(match.end() for match in re.finditer(pattern, page_text))
    for start in sorted(starts):
        try:
            value, _ = decoder.raw_decode(page_text, start)
            if isinstance(value, dict):
                return value
        except (json.JSONDecodeError, ValueError):
            continue
    return None


def emails_from_text(text):
    return ordered_unique(
        match.group(1).strip(".,;:()[]{}<>").lower()
        for match in EMAIL_RE.finditer(text or "")
    )


def useful_email(email):
    local, _, domain = email.lower().partition("@")
    if not local or "." not in domain:
        return False
    if domain in {"example.com", "email.com", "domain.com"}:
        return False
    if any(word in local for word in ("noreply", "no-reply", "donotreply")):
        return False
    if any(email.endswith(ext) for ext in ASSET_EXTENSIONS):
        return False
    return True


def choose_email(candidates):
    clean = ordered_unique(email.lower() for email in candidates if useful_email(email))
    if not clean:
        return ""
    business_words = (
        "business", "contact", "hello", "info", "team", "partnership",
        "collab", "inquir", "work", "support",
    )
    for email in clean:
        if any(word in email.split("@", 1)[0] for word in business_words):
            return email
    return clean[0]


def instagram_handle(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        if not host_matches(parsed.hostname, {"instagram.com"}):
            return ""
        parts = [part for part in parsed.path.split("/") if part]
        if parts and parts[0] == "_u" and len(parts) > 1:
            parts.pop(0)
        if not parts or parts[0].lower() in {
            "p", "reel", "reels", "stories", "explore", "accounts", "about",
        }:
            return ""
        handle = parts[0].lstrip("@")
        valid = (
            re.fullmatch(r"[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?", handle)
            and ".." not in handle
        )
        return handle if valid else ""
    except Exception:
        return ""


def x_handle(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        if not host_matches(parsed.hostname, {"twitter.com", "x.com"}):
            return ""
        parts = [part for part in parsed.path.split("/") if part]
        if not parts or parts[0].lower() in {
            "home", "share", "intent", "search", "explore", "i", "settings",
        }:
            return ""
        handle = parts[0].lstrip("@")
        return handle if re.fullmatch(r"[A-Za-z0-9_]{1,15}", handle) else ""
    except Exception:
        return ""


def discord_invite(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        host = (parsed.hostname or "").lower().removeprefix("www.")
        parts = [part for part in parsed.path.split("/") if part]
        if host == "discord.gg" and parts:
            return f"https://discord.gg/{parts[0]}"
        if host_matches(host, {"discord.com"}) and len(parts) >= 2 and parts[0] == "invite":
            return f"https://discord.com/invite/{parts[1]}"
    except Exception:
        pass
    return ""


def is_owned_website(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        host = parsed.hostname
        if not host or is_instagram_url(url) or is_aggregator_url(url):
            return False
        if host_matches(
            host,
            SOCIAL_PLATFORM_HOSTS | {"twitter.com", "x.com", "discord.com", "discord.gg"},
        ):
            return False
        affiliate_keys = {
            "ref", "referral", "aff", "affid", "affiliate", "fpr",
            "coupon", "coupon_code", "offerid", "a_aid", "affluencerid",
            "linkid",
        }
        if affiliate_keys.intersection(
            key.lower() for key in urllib.parse.parse_qs(parsed.query)
        ):
            return False
        path_parts = [part.lower() for part in parsed.path.split("/") if part]
        if path_parts and path_parts[0] in {"ref", "r", "partner", "invite"}:
            return False
        return not parsed.path.lower().endswith(ASSET_EXTENSIONS)
    except Exception:
        return False


def website_home(url):
    parsed = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, "/", "", ""))


def candidate_links_from_html(page):
    parser = VisibleHTMLParser()
    try:
        parser.feed(page.text)
    except Exception:
        pass
    hrefs = []
    mailtos = []
    for raw in parser.hrefs:
        if raw.lower().startswith("mailto:"):
            address = raw[7:].split("?", 1)[0]
            mailtos.extend(emails_from_text(urllib.parse.unquote(address)))
            continue
        url = normalize_url(raw, page.final_url)
        if url:
            hrefs.append(url)

    visible_emails = emails_from_text(" ".join(parser.text))
    return ordered_unique(hrefs), ordered_unique(mailtos + visible_emails)


def useful_embedded_link(url, page_url):
    try:
        parsed = urllib.parse.urlsplit(url)
        page_host = urllib.parse.urlsplit(page_url).hostname
        if host_matches(parsed.hostname, {page_host or ""}):
            return False
        if parsed.path.lower().endswith(ASSET_EXTENSIONS):
            return False
        if host_matches(
            parsed.hostname,
            {"cloudfront.net", "cloudflare.com", "sentry.io", "googleapis.com",
             "w3.org", "schema.org", "jsdelivr.net"},
        ):
            return False
        return bool(
            instagram_handle(url) or x_handle(url) or discord_invite(url)
            or is_owned_website(url)
        )
    except Exception:
        return False


class LeadDiscovery:
    def __init__(self, lead):
        self.lead = lead
        self.values = defaultdict(list)
        self.links = []
        self.records = []
        self.record_keys = set()
        self.youtube_pages = []

    def add(self, field, value, source, page):
        if not value:
            return
        if value not in self.values[field]:
            self.values[field].append(value)
        key = (field, value, source, page.cache_file)
        if key in self.record_keys:
            return
        self.record_keys.add(key)
        self.records.append(
            {
                "field": field,
                "value": value,
                "source": source,
                "page_url": page.requested_url,
                "cache_file": page.cache_file,
            }
        )

    def add_link(self, url, source, page):
        if url and url not in self.links:
            self.links.append(url)
        key = ("links", url, source, page.cache_file)
        if not url or key in self.record_keys:
            return
        self.record_keys.add(key)
        if url:
            self.records.append(
                {
                    "field": "links",
                    "value": url,
                    "source": source,
                    "page_url": page.requested_url,
                    "cache_file": page.cache_file,
                }
            )


def classify_link(url, source, page, found):
    found.add_link(url, source, page)
    ig = instagram_handle(url)
    if ig:
        found.add("ig", ig, source, page)
        return
    x = x_handle(url)
    if x:
        found.add("x", x, source, page)
        return
    discord = discord_invite(url)
    if discord:
        found.add("discord", discord, source, page)
        return
    if is_owned_website(url):
        found.add("website", website_home(url), source, page)


def channel_page_urls(channel_url):
    root = channel_url.rstrip("/")
    if root.endswith("/about"):
        root = root[:-6].rstrip("/")
    return [root, root + "/about"]


def discover_channel(lead, fetcher):
    found = LeadDiscovery(lead)
    external = []
    aggregators = []
    for url in channel_page_urls(lead.get("cu", "")):
        page = fetcher.fetch(url)
        if not page:
            continue
        initial = parse_initial_data(page.text)
        diagnostic = {
            "url": url,
            "cache_file": page.cache_file,
            "initial_data": bool(initial),
            "consent": "consent.youtube.com" in page.text.lower()
            or "before you continue to youtube" in page.text.lower(),
            "size": len(page.text),
        }
        found.youtube_pages.append(diagnostic)
        if not initial:
            continue
        # Only channelExternalLinkViewModel nodes represent the creator's
        # published channel links. Walking every URL in ytInitialData also
        # finds thumbnails, playback hosts, and schema metadata.
        page_links = []
        for model in values_for_key(initial, "channelExternalLinkViewModel"):
            for value in all_strings(model):
                candidate = external_youtube_url(value, page.final_url)
                if candidate:
                    page_links.append(candidate)
        for candidate in ordered_unique(page_links):
            external.append(candidate)
            classify_link(candidate, "channel_links", page, found)
            if is_aggregator_url(candidate):
                aggregators.append(candidate)
        description_parts = []
        for model in values_for_key(initial, "aboutChannelViewModel"):
            description_parts.extend(strings_under_description(model))
        for model in values_for_key(initial, "channelMetadataRenderer"):
            description = model.get("description") if isinstance(model, dict) else None
            if isinstance(description, str):
                description_parts.append(description)
        descriptions = " ".join(description_parts)
        for email in emails_from_text(descriptions):
            found.add("email", email, "description_email", page)

    for aggregator_url in ordered_unique(aggregators):
        page = fetcher.fetch(aggregator_url)
        if not page:
            continue
        links, emails = candidate_links_from_html(page)
        for email in emails:
            found.add("email", email, "aggregator", page)
        for candidate in links:
            if useful_embedded_link(candidate, page.final_url):
                classify_link(candidate, "aggregator", page, found)

    website_candidates = ordered_unique(found.values.get("website", []))
    if website_candidates:
        home_url = website_home(website_candidates[0])
        homepage = fetcher.fetch(home_url)
        pages = []
        if homepage:
            pages.append(homepage)
            links, _ = candidate_links_from_html(homepage)
            same_host = urllib.parse.urlsplit(homepage.final_url).hostname
            internal_pages = []
            for candidate in links:
                parsed = urllib.parse.urlsplit(candidate)
                if not host_matches(parsed.hostname, {same_host or ""}):
                    continue
                path = parsed.path.lower().rstrip("/")
                if re.search(r"/(contact|contact-us|get-in-touch)$", path):
                    internal_pages.insert(0, candidate)
                elif re.search(r"/(about|about-us)$", path):
                    internal_pages.append(candidate)
            if internal_pages:
                secondary = fetcher.fetch(ordered_unique(internal_pages)[0])
                if secondary:
                    pages.append(secondary)
        for page in pages:
            links, emails = candidate_links_from_html(page)
            for email in emails:
                found.add("email", email, "website", page)
            for candidate in links:
                if instagram_handle(candidate) or x_handle(candidate):
                    classify_link(candidate, "website", page, found)
    return found


def contact_snapshot(lead):
    return {field: lead.get(field, "") for field in CONTACT_FIELDS}


def has_contact(snapshot):
    return any(bool(snapshot.get(field)) for field in CONTACT_FIELDS)


def merge_discovery(lead, found):
    for field in ("ig", "x", "discord", "website"):
        if not lead.get(field) and found.values.get(field):
            lead[field] = found.values[field][0]
    if not lead.get("email"):
        selected = choose_email(found.values.get("email", []))
        if selected:
            lead["email"] = selected
    existing_links = lead.get("links")
    if not isinstance(existing_links, list):
        existing_links = []
    contact_links = [
        url for url in found.links
        if instagram_handle(url) or x_handle(url) or discord_invite(url)
        or is_owned_website(url)
    ]
    lead["links"] = ordered_unique(existing_links + contact_links + found.links)[:10]


def deterministic_selection(leads, limit):
    if limit is None or limit >= len(leads):
        limit = len(leads)
    groups = defaultdict(list)
    for lead in leads:
        groups[lead.get("tier") or "?"].append(lead)
    for group in groups.values():
        group.sort(
            key=lambda lead: hashlib.sha256(
                lead.get("cu", "").encode("utf-8")
            ).hexdigest()
        )
    tiers = [tier for tier in ("A", "B", "C") if groups.get(tier)]
    tiers.extend(sorted(set(groups) - set(tiers)))
    selected = []
    index = 0
    while len(selected) < limit:
        added = False
        for tier in tiers:
            if index < len(groups[tier]) and len(selected) < limit:
                selected.append(groups[tier][index])
                added = True
        if not added:
            break
        index += 1
    return selected


def ensure_schema(leads):
    for lead in leads:
        lead.setdefault("email", "")
        lead.setdefault("ig", "")
        lead.setdefault("x", "")
        lead.setdefault("discord", "")
        lead.setdefault("website", "")
        if not isinstance(lead.get("links"), list):
            lead["links"] = []


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--leads", default="yt_leads.json")
    parser.add_argument("--cache-dir", default="tools/_cache")
    parser.add_argument("--report", default="tools/_cache/enrichment-report.json")
    parser.add_argument("--limit", type=int)
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="skip this many leads in the deterministic tier-stratified order",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--retry-failures",
        action="store_true",
        help="retry URLs whose previous failures are cached",
    )
    parser.add_argument("--delay", type=float, default=1.0)
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    if args.offset < 0:
        parser.error("--offset must be at least 0")

    leads_path = ROOT / args.leads
    cache_dir = ROOT / args.cache_dir
    report_path = ROOT / args.report
    try:
        leads = json.loads(leads_path.read_text(encoding="utf-8"))
        if not isinstance(leads, list):
            raise ValueError("expected a JSON array")
    except Exception as exc:
        raise SystemExit(f"ERROR invalid leads file: {exc}")

    ensure_schema(leads)
    ordered = deterministic_selection(leads, None)
    stop = args.offset + args.limit if args.limit is not None else len(ordered)
    selected = ordered[args.offset:stop]
    fetcher = Fetcher(
        cache_dir,
        delay=max(0.0, args.delay),
        timeout=15.0,
        retry_failures=args.retry_failures,
    )
    results = []
    source_hit_leads = defaultdict(int)
    for source in ("channel_links", "aggregator", "website", "description_email"):
        source_hit_leads[source] = 0
    gained_total = 0

    print(
        f"Selected {len(selected)} of {len(leads)} leads at offset {args.offset} "
        f"(tiers: {dict((tier, sum(x.get('tier') == tier for x in selected)) for tier in ('A','B','C'))})",
        flush=True,
    )
    for number, lead in enumerate(selected, 1):
        before = contact_snapshot(lead)
        print(
            f"[{number}/{len(selected)}] {lead.get('n','')} {lead.get('cu','')}",
            flush=True,
        )
        try:
            found = discover_channel(lead, fetcher)
            merge_discovery(lead, found)
        except Exception as exc:
            print(
                f"WARN lead failed {lead.get('cu','')}: {type(exc).__name__}: {exc}",
                file=sys.stderr,
                flush=True,
            )
            found = LeadDiscovery(lead)
        after = contact_snapshot(lead)
        gained_fields = [
            field for field in CONTACT_FIELDS if not before.get(field) and after.get(field)
        ]
        if gained_fields:
            gained_total += 1
        gained_sources = set()
        for record in found.records:
            if (
                record["field"] in gained_fields
                and record["value"] == after.get(record["field"])
            ):
                gained_sources.add(record["source"])
        for source in gained_sources:
            source_hit_leads[source] += 1
        results.append(
            {
                "cu": lead.get("cu", ""),
                "name": lead.get("n", ""),
                "tier": lead.get("tier", ""),
                "before": before,
                "after": after,
                "gained_fields": gained_fields,
                "gained_sources": sorted(gained_sources),
                "youtube_pages": found.youtube_pages,
                "discoveries": found.records,
            }
        )

    if not args.dry_run:
        leads_path.write_text(
            json.dumps(leads, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    report = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "dry_run": args.dry_run,
        "selected": len(selected),
        "total_leads": len(leads),
        "gained_contact_leads": gained_total,
        "hit_rate": gained_total / len(selected) if selected else 0,
        "source_hit_leads": dict(sorted(source_hit_leads.items())),
        "fetch": dict(sorted(fetcher.stats.items())),
        "fetch_failures": fetcher.failures,
        "results": results,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        "SUMMARY "
        + json.dumps(
            {
                "selected": len(selected),
                "gained_contact_leads": gained_total,
                "hit_rate": round(report["hit_rate"], 4),
                "source_hit_leads": report["source_hit_leads"],
                "fetch": report["fetch"],
                "dry_run": args.dry_run,
            },
            sort_keys=True,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Shared editable channel exclusions for scrape and injection."""

import json
from pathlib import Path
from urllib.parse import urlparse


DEFAULT_PATH = Path(__file__).resolve().parent / "exclusions.json"


def normalize_handle(value):
    value = (value or "").strip().lower().rstrip("/")
    if not value:
        return ""
    if "youtube.com" in value:
        path = urlparse(value if "://" in value else "https://" + value).path
        value = path.strip("/")
        if value.startswith("@"):
            value = value.split("/")[0]
    return value.lstrip("@")


def load_exclusions(path=DEFAULT_PATH):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    channels = data.get("channels", [])
    handles = set()
    urls = set()
    for item in channels:
        for handle in item.get("handles", []):
            normalized = normalize_handle(handle)
            if normalized:
                handles.add(normalized)
        for url in item.get("urls", []):
            normalized_url = (url or "").strip().lower().rstrip("/")
            if normalized_url:
                urls.add(normalized_url)
            normalized_handle = normalize_handle(url)
            if normalized_handle:
                handles.add(normalized_handle)
    return {"channels": channels, "handles": handles, "urls": urls}


def is_excluded(channel_url, exclusions):
    normalized_url = (channel_url or "").strip().lower().rstrip("/")
    return (
        normalized_url in exclusions["urls"]
        or normalize_handle(normalized_url) in exclusions["handles"]
    )

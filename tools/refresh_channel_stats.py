"""Refresh AB Luiy's public YouTube channel and latest-video stats."""
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dashboard-data-v2.json"
API = "https://www.googleapis.com/youtube/v3"
KEY = os.environ.get("YT_API_KEY", "").strip()
HANDLE = "abluiy"


def get(path, **params):
    params["key"] = KEY
    url = f"{API}/{path}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


if not KEY:
    raise SystemExit("YT_API_KEY is required")

channels = get("channels", part="snippet,statistics,contentDetails", forHandle=HANDLE)
if not channels.get("items"):
    raise SystemExit(f"YouTube channel @{HANDLE} not found")
channel = channels["items"][0]
uploads = channel["contentDetails"]["relatedPlaylists"]["uploads"]
playlist = get("playlistItems", part="snippet,contentDetails", playlistId=uploads, maxResults=1)
item = playlist["items"][0]
video_id = item["contentDetails"]["videoId"]
video = get("videos", part="snippet,statistics,contentDetails", id=video_id)["items"][0]

data = json.loads(DATA.read_text(encoding="utf-8"))
data["youtube"] = {
    "channel": {
        "name": channel["snippet"]["title"],
        "handle": "@ABLuiy",
        "url": "https://www.youtube.com/@abluiy",
        "subscribers": int(channel["statistics"].get("subscriberCount", 0)),
        "videos": int(channel["statistics"].get("videoCount", 0)),
        "views": int(channel["statistics"].get("viewCount", 0)),
        "source": "youtube-data-api",
    },
    "latestVideo": {
        "id": video_id,
        "title": video["snippet"]["title"],
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "thumbnail": f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg",
        "durationIso": video["contentDetails"].get("duration", ""),
        "views": int(video["statistics"].get("viewCount", 0)),
        "likes": int(video["statistics"].get("likeCount", 0)),
        "comments": int(video["statistics"].get("commentCount", 0)),
        "publishedAt": video["snippet"]["publishedAt"],
        "publishedLabel": "latest upload",
        "source": "youtube-data-api",
    },
    "analytics": {
        "connected": False,
        "retentionAvailable": False,
        "watchTimeAvailable": False,
        "ctrAvailable": False,
        "note": "YouTube Analytics OAuth is required for retention, watch time, and CTR.",
    },
    "updatedAt": datetime.now(timezone.utc).isoformat(),
}
data["lastUpdated"] = data["youtube"]["updatedAt"]
DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Updated @{HANDLE}: {video['snippet']['title']}")

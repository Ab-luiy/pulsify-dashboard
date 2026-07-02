"""Both AI plans' quota meters in one command. Used by the cross-call gate in AGENT_CHAT.md.

Usage: python tools/quota.py

CLAUDE reads the subscription usage endpoint with the CLI's OAuth token
(~/.claude/.credentials.json - the CLI refreshes it whenever claude runs).
CODEX reads the newest rate-limit snapshot Codex writes into its own
session logs (~/.codex/sessions/.../rollout-*.jsonl) on every run.

Gate thresholds (AGENT_CHAT.md): skip or downgrade a cross-call when the
session/5h window is past 70% or the weekly window is past 85%.
"""
import glob
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

SESSION_GATE = 70
WEEKLY_GATE = 85


def flag(pct, gate):
    if pct is None:
        return ""
    return "  <-- OVER GATE ({}%)".format(gate) if pct > gate else ""


def claude_meter():
    try:
        creds = json.load(open(os.path.expanduser("~/.claude/.credentials.json")))["claudeAiOauth"]
        req = urllib.request.Request(
            "https://api.anthropic.com/api/oauth/usage",
            headers={
                "Authorization": "Bearer " + creds["accessToken"],
                "anthropic-beta": "oauth-2025-04-20",
            },
        )
        d = json.loads(urllib.request.urlopen(req, timeout=15).read())
        lines = ["CLAUDE (plan: {})".format(creds.get("subscriptionType", "?"))]
        for lim in d.get("limits", []):
            scope = (lim.get("scope") or {}).get("model") or {}
            label = lim["kind"] + (" [{}]".format(scope["display_name"]) if scope.get("display_name") else "")
            gate = SESSION_GATE if lim.get("group") == "session" else WEEKLY_GATE
            lines.append(
                "  {:<24} {:>3}%  resets {}Z{}".format(
                    label, lim["percent"], str(lim.get("resets_at", ""))[:16], flag(lim["percent"], gate)
                )
            )
        return "\n".join(lines)
    except Exception as e:
        return (
            "CLAUDE: unreadable ({}: {}) - token likely expired; run any `claude -p \"hi\"` "
            "once (or open the app) to refresh it, then rerun".format(type(e).__name__, e)
        )


def _find_key(obj, key):
    if isinstance(obj, dict):
        if key in obj and obj[key] is not None:
            return obj[key]
        for v in obj.values():
            r = _find_key(v, key)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = _find_key(v, key)
            if r is not None:
                return r
    return None


def codex_meter():
    try:
        files = glob.glob(os.path.expanduser("~/.codex/sessions/*/*/*/rollout-*.jsonl"))
        if not files:
            return "CODEX: no session logs found"
        snap, src_mtime = None, None
        # newest file first; fall back to older files until a snapshot is found
        for path in sorted(files, key=os.path.getmtime, reverse=True)[:10]:
            with open(path, encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if '"rate_limits"' not in line:
                        continue
                    try:
                        found = _find_key(json.loads(line), "rate_limits")
                    except ValueError:
                        continue
                    if found:
                        snap = found  # keep last one in the file (most recent)
            if snap:
                src_mtime = os.path.getmtime(path)
                break
        if not snap:
            return "CODEX: no rate-limit snapshot in recent session logs"
        lines = ["CODEX (plan: {})".format(snap.get("plan_type", "?"))]
        for key, label, gate in (("primary", "session/5h", SESSION_GATE), ("secondary", "weekly", WEEKLY_GATE)):
            w = snap.get(key) or {}
            pct = w.get("used_percent")
            resets = w.get("resets_at")
            reset_s = datetime.fromtimestamp(resets, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M") + "Z" if resets else "?"
            lines.append("  {:<24} {:>3.0f}%  resets {}{}".format(label, pct or 0, reset_s, flag(pct, gate)))
        age_min = (datetime.now().timestamp() - src_mtime) / 60
        lines.append("  (snapshot age: {:.0f} min - refreshes on every codex run)".format(age_min))
        return "\n".join(lines)
    except Exception as e:
        return "CODEX: unreadable ({}: {})".format(type(e).__name__, e)


if __name__ == "__main__":
    print(claude_meter())
    print()
    print(codex_meter())

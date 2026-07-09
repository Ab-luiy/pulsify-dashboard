#!/usr/bin/env python3
"""Read/write the shared CRM state (same store the dashboard syncs to).

The operator dashboard syncs its per-lead state (pipeline status, Lead Studio
fields, transcripts, creator profiles, generated assets, removals) to
pulsify-funnels' D1 via /api/crm-sync. This CLI hits the same endpoint so
local agents work with the live CRM instead of a browser-only copy.

Auth: set FUNNELS_ADMIN_KEY in the environment or in a .env file next to this
repo's root (FUNNELS_ADMIN_KEY=...). Never hardcode the key.

Usage:
  python tools/crm_sync.py dump                    # full state JSON to stdout
  python tools/crm_sync.py leads                   # lead names with a synced record
  python tools/crm_sync.py get "Frank Wieler"      # one lead's full record
  python tools/crm_sync.py set "Frank Wieler" notes "text..."   # set one field
  python tools/crm_sync.py set-json "Frank Wieler" '{"status":"sent"}'
"""

import json
import os
import sys
import time
import urllib.request

BASE = os.environ.get("CRM_SYNC_URL", "https://pulsify-funnels.pages.dev/api/crm-sync")


def admin_key():
    key = os.environ.get("FUNNELS_ADMIN_KEY", "").strip()
    if not key:
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        if os.path.exists(env_path):
            for line in open(env_path, encoding="utf-8"):
                if line.strip().startswith("FUNNELS_ADMIN_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit("FUNNELS_ADMIN_KEY not set (env var or .env in repo root).")
    return key


def call(method="GET", body=None):
    req = urllib.request.Request(
        BASE,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"x-admin-key": admin_key(), "content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        out = json.load(r)
    if not out.get("ok"):
        sys.exit("Server error: " + json.dumps(out))
    return out


def fetch_state():
    return call()["state"]


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else "dump"

    if cmd == "dump":
        print(json.dumps(fetch_state(), indent=2))
    elif cmd == "leads":
        state = fetch_state()
        removed = {n for n, e in state["removed"].items() if e and not e.get("restored")}
        for name in sorted(set(state["overrides"]) | set(state["added"])):
            entry = state["overrides"].get(name, {})
            flag = " [REMOVED]" if name in removed else ""
            print(f"{name} | status={entry.get('status', '-')}{flag}")
    elif cmd == "get" and len(args) >= 2:
        state = fetch_state()
        print(json.dumps(state["overrides"].get(args[1]) or {}, indent=2))
    elif cmd in ("set", "set-json") and len(args) >= 3:
        name = args[1]
        patch = {args[2]: args[3] if len(args) > 3 else ""} if cmd == "set" else json.loads(args[2])
        current = fetch_state()["overrides"].get(name) or {}
        current.update(patch)
        current["_ts"] = int(time.time() * 1000)
        out = call("POST", {"since": 0, "overrides": {name: current}})
        merged = out["state"]["overrides"].get(name, {})
        print(json.dumps({k: merged.get(k) for k in patch}, indent=2))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()

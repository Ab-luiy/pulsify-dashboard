"""Connector and sync health, read from live D1 (sync_runs + snapshots).

Run at the start of any session that touches the app, and daily on a schedule:

    python tools/connector_health.py            # prints the report, exit 1 when something is wrong
    python tools/connector_health.py --json     # same, as JSON

Each sync job has an expected cadence. A job is flagged when its last success is
older than its limit, or when it has failed since its last success. Read-only:
it never triggers a job or touches a connection.
"""
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEPLOY = ROOT / "output" / "standard-preview"

# job -> (what it feeds, hours a success may be old before it is flagged)
JOBS = {
    "instagram": ("Instagram tab: followers, reels, posts, stories, audience (daily 05:00 UTC)", 26),
    "instagram-inbox": ("IG DMs inbox (every 5 min)", 1),
    "zernio-inbox": ("IG DMs via Zernio (every 5 min)", 1),
    "youtube": ("YouTube tab: subscribers, views, latest video (every 6 h)", 13),
    "client-videos": ("Clients' YouTube videos (every 30 min)", 2),
    "client-instagram": ("Client Instagram scheduler (every 30 min; each account refreshed about every 20 h)", 2),
    "payment-rematch": ("Payments matched to leads (every 30 min)", 2),
    "lead-models": ("Lead scores (every 10 min)", 2),
    "search-index": ("App search (every 15 min)", 2),
    "webhook-outbox": ("Outgoing webhooks (every minute)", 1),
    "leads": ("Weekly YouTube lead scrape", 8 * 24),
}


def d1(sql):
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "pulsify-portal", "--remote", "--json", "--config", str(DEPLOY / "wrangler.toml"), "--command", sql],
        # Wrangler loads the vault's gitignored credential environment from this cwd.
        # Running inside the deploy folder can select a different, unauthorized identity.
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8", shell=sys.platform == "win32",
    )
    start = out.stdout.find("[")
    if out.returncode or start < 0:
        raise SystemExit(f"D1 query failed: {(out.stderr or out.stdout)[-400:]}")
    return json.loads(out.stdout[start:])[0]["results"]


def hours_since(iso, now):
    if not iso:
        return None
    return (now - datetime.fromisoformat(iso.replace("Z", "+00:00"))).total_seconds() / 3600


def main():
    now = datetime.now(timezone.utc)
    rows = d1(
        "SELECT r.job, "
        "(SELECT MAX(started_at) FROM sync_runs s WHERE s.job=r.job AND s.status='success') AS last_ok, "
        "(SELECT COUNT(*) FROM sync_runs e WHERE e.job=r.job AND e.status='error' AND e.started_at > "
        "  COALESCE((SELECT MAX(started_at) FROM sync_runs s WHERE s.job=r.job AND s.status='success'),'')) AS fails, "
        "(SELECT substr(error,1,220) FROM sync_runs e WHERE e.job=r.job AND e.status='error' ORDER BY id DESC LIMIT 1) AS last_error, "
        "(SELECT MAX(started_at) FROM sync_runs e WHERE e.job=r.job AND e.status='error') AS last_error_at "
        "FROM (SELECT DISTINCT job FROM sync_runs) r"
    )
    seen = {row["job"]: row for row in rows}
    report = []
    for job, (feeds, limit) in JOBS.items():
        row = seen.get(job, {})
        age = hours_since(row.get("last_ok"), now)
        fails = int(row.get("fails") or 0)
        problem = None
        if age is None:
            problem = "never succeeded"
        elif fails:
            problem = f"failed {fails}x since last success"
        elif age > limit:
            problem = f"no success for {age:.0f} h (limit {limit} h)"
        report.append({
            "job": job, "feeds": feeds, "ok": problem is None, "problem": problem,
            "last_success_hours_ago": None if age is None else round(age, 1),
            "last_error": row.get("last_error") if problem else None,
        })
    bad = [r for r in report if not r["ok"]]
    if "--json" in sys.argv:
        print(json.dumps({"checked_at": now.isoformat(), "problems": len(bad), "jobs": report}, indent=2))
    else:
        print(f"Connector health, {now:%Y-%m-%d %H:%M} UTC: {'all OK' if not bad else f'{len(bad)} problem(s)'}")
        for r in report:
            mark = "OK  " if r["ok"] else "FAIL"
            when = "never" if r["last_success_hours_ago"] is None else f"{r['last_success_hours_ago']} h ago"
            print(f"  {mark} {r['job']:<16} last success {when:<12} {r['feeds']}")
            if not r["ok"]:
                print(f"       {r['problem']}: {r['last_error'] or ''}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()

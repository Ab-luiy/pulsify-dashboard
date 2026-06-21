---
name: dashboard-verification-workflow
description: How to verify dashboard UI changes — preview_screenshot times out on the heavy CRM DOM; use preview_eval DOM assertions instead
metadata: 
  node_type: memory
  type: project
  originSessionId: c99899cd-58ca-4e6a-b55c-539651e45857
---

Verifying changes to the canonical dashboard (`.claude/worktrees/awesome-bassi-d88340/index.html`): `preview_screenshot` times out (30s) on the CRM tab's ~400-card kanban DOM, even with zero console errors. Working verification path (used 2026-06-09): serve the canonical worktree via a `launch.json` in the session worktree (`python -m http.server 8765 --directory <canonical worktree>`), then assert via `preview_eval` — element counts, filter results, table column counts — plus `preview_console_logs` for errors. The "Dashboard live refresh failed: HTTP 404" warnings are the pre-existing static-serve fallback, not a bug.

`preview_start` gotcha (2026-06-13): the preview server spawns with a trimmed PATH — `npx`/`node` ENOENT even when installed. Fix: point `launch.json` `runtimeExecutable` at the full `C:\Program Files\nodejs\node.exe` and run a tiny dependency-free static server (`.claude/static-server.cjs <dir> <port>`). Also reuse this for a real `dashboard-data-v2.json`: the dashboard fetches it via `refreshLiveData()` and deep-merges into `D`, so serving it over HTTP is how live data (e.g. the `instagram` block) reaches the tab. Related: [[canonical-dashboard-worktree]], [[dashboard-quality-bar]], [[project_composio_ig_bridge]].

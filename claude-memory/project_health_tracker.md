# Health tracker — calorie/macro logging workflow

## Where it lives
- A **Health** tab in the dashboard (`index.html`, the deployed file → `pulsify-dashboard.pages.dev/#health`).
- Built it: vision band (Now→Target weight/bodyfat, no-deadline pace line), today's macro ring + P/C/F/Fiber bars, meal log form, today's entries, 7-day **bar** chart, targets editor, "where I'm taking it" list.
- Data persists in **browser localStorage only** (key `pulsifyHealth.v1`) — NOT in any file. Per-browser, per-origin. No server/sync.

## How I log (the agreed workflow)
- **User dictates meals (or sends a food photo); I log it myself** by driving the user's connected Chrome ("Browser 1") via Claude-in-Chrome: select_browser → navigate to the live `#health` → `find`/`form_input` the log fields (hFood/hKcal/hProt/hCarb/hFat/hFib + meal select) → click "Log meal". Targets fields: tCal/tProt/tCarb/tFat/tFib + body tWnow/tWgoal/tBFnow/tBFgoal/tGoalDate → "Save targets".
- **Photos:** estimate portions → compute kcal/macros honest USDA-based (don't lowball; under-counting sabotages a cut) → log → state assumptions so user can correct.
- Keep the dashboard tab open in Browser 1; reconnect if dropped (no data lost).
- Screenshots of this page time out (heavy page) — verify via `find`/`read_page`, not screenshots.

## User's stats & cut params (as of 2026-06-07)
- Male, 23, **~110 kg, 175 cm**, high body fat (~30% est) concentrated waist/glutes/thighs. Good muscle mass. Goal: **80 kg / ~12% bf, abs**.
- **Eats OMAD** (one meal a day). Daily gym + 40min incline cardio (incline 9–15, 3–5 km/h) — already dialed, don't add cardio.
- Maintenance ≈ **3,000–3,200 kcal**. User set target **1,800 kcal** (170P / 165C / 50F / 30 fiber). That's aggressive (~45% deficit) — flagged honestly; nudge up to ~2,200 if strength/energy tanks. **No deadline/countdown** (user removed it; pace ~0.8–1.2 kg/wk).
- Reference cooked macros per 100g: white rice 130kcal/2.7P/28.7C/0.3F; chicken breast (skinless) 165kcal/31P/3.6F.

## Deploy
- Edit only canonical worktree `index.html`; deploy = commit + `git push origin HEAD:main` → Cloudflare Pages auto-build (~1–2 min). `project/dashboard-v4.html` had an early duplicate of this work, left uncommitted.

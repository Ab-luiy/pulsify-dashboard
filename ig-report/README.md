# IG Report — Reels Hook Score

Pulls your last 14 days of Instagram **Reels + private insights** (reach, views,
avg watch time, saves, shares) via **Composio's hosted Tool Router**, scores each
reel with a relative **Hook Score**, and writes a self-contained `report.html`.

## One-time setup

1. **Composio API key** → [platform.composio.dev](https://platform.composio.dev) → Settings → API Keys.
   Put it in `.env`:
   ```
   COMPOSIO_API_KEY=your_key_here
   ```
2. **Instagram must be Business or Creator** (Personal accounts have no insights).
   IG app → Profile → ☰ → Account type and tools → Switch to professional account → Creator.
3. Install deps (already done if you cloned with `node_modules`):
   ```
   npm install
   ```

## Run

```
npm start            # connect (first run prints an auth link) → pull → build report.html
npm start connect    # only run the Instagram authorization step
npm start discover   # dump the Instagram tool schemas (debugging)
```

On the **first run** an Instagram authorization link is printed in the terminal.
Open it, approve access, and the script continues automatically (it waits up to
5 minutes). The connection is reused on later runs.

Open `report.html` in any browser when it finishes. Re-run anytime to refresh.

## How the Hook Score works

Relative to *your own* reels in the window — not an absolute grade. Blend of:
retention / avg watch time (40%), save rate (25%), share rate (20%), engagement
rate (15%), each min-max normalized across the set. Each reel also gets a plain-
English diagnosis (e.g. "Strong hook, IG didn't push it"). Logic lives in
`render.ts`; data fetching in `agent.ts`.

## Notes

- Uses the Composio TypeScript SDK directly (`session.execute`) rather than an LLM
  in the loop — deterministic, reproducible, and only needs the Composio key.
- `DEBUG=1 npm start` prints raw API responses.

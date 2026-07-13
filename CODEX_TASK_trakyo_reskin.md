# CODEX TASK — Trakyo reskin of the client-facing surfaces

Founder-approved (2026-07-12): reskin the client dashboard, login, and admin to the "Trakyo" design language so the product looks native, seamless, and one-brand. VISUAL ONLY — do not change any logic, endpoints, data flow, auth, or behavior. Every P1-P3 flow must work identically after. Claude reviews + deploys; you do NOT deploy, touch remote D1, or commit.

## The design source of truth

`raw-sources/inspiration/design/pulsify-trakyo-DIRECTION.html` (repo root, NOT in the deploy dir). Read it fully. It is the target look. Extract its design system and apply it. Key tokens (from that file):
- Accent = money green `--accent:#0ea968` with gradient partner `#34d399` (REPLACE the current generic indigo `#6871f4` everywhere). Secondary `--indigo:#5b6cff`. Signals: `--amber:#f59e0b`, `--rose:#f43f5e`, `--sky:#0ea5e9`.
- Light: `--bg:#f5f6f8`, `--panel:#ffffff`, `--panel-2:#fbfbfd`, `--line:#e9ebef`, `--ink:#0d0f14`, `--ink-2:#3d4350`, `--muted:#8b909c`.
- Dark: `--bg:#0a0b0f`, `--panel:#121419`, `--panel-2:#15171d`, `--line:#20242c`, `--ink:#f3f5f8`, `--ink-2:#c2c7d0`, `--muted:#7c828e`.
- Shadows: the 3-tier `--shadow-sm/md/lg` from the file (soft, negative-spread). Radius `--radius:16px` / `--radius-sm:11px`.
- Type: Inter for UI; **JetBrains Mono with `font-variant-numeric:tabular-nums`** for ALL numbers/data (revenue, follower counts, metrics, dollars-per-follower, slide views). Add the JetBrains Mono Google Font link. Use the `.mono` pattern from the file.
- Component feel to match: KPI cards (`.kpi` with label `.kpi-k`, big value `.kpi-v`, delta `.kpi-d` up green / down rose, source dot `.kpi-src`), layered `.card`/`.card-pad`/`.card-head`, the collapsible `.rail` sidebar with `.nav-group-h`/`.nav-item`, `.badge`/`.chip` pills, gradient primary buttons (accent->#34d399), the `.stagger` entrance animation, refined empty states.

## Build a shared stylesheet

Create `output/standard-preview/shared/pulsify-ui.css` holding the Trakyo tokens (light + dark via `body.dark` or `:root[data-theme]`) + the base component classes (cards, kpi, rail/nav, buttons, badges, chips, inputs, tables, shadows, mono). All three surfaces link it. This is the anti-drift fix — one source of tokens.

## Reskin these three surfaces onto it

1. **`output/standard-preview/portal/index.html`** (client dashboard) — remap its existing classes to the Trakyo system: `.metric`->KPI-card treatment, `.rail`/`.tab-btn`->Trakyo rail+`.nav-item`, `.button-row button`->gradient primary + outline, status/diagnostic pills->`.badge` styling, the sequence bars keep their logic but restyle to the accent gradient. Numbers in JetBrains Mono. Keep every id, data-attribute, and script binding intact.
2. **`output/standard-preview/portal/login/index.html`** — reskin the split-screen to Trakyo tokens (accent green, layered shadow card, mono where numbers appear). Keep the flow.
3. **`output/standard-preview/admin.html` + `output/standard-preview/admin/console.js` + `admin/console.css`** — bring onto the shared tokens so the operator surface matches. Preserve all admin functionality (client provisioning, dashboard-login block, studio review, integrations, metrics entry).

## Specific polish (from the audit)

- Diagnostic badge: allow long strings ("body failed before the ask") to sit cleanly — no awkward wrap; use `.badge` styling, ellipsize or wrap gracefully.
- Add a real brand moment in the rail header (the Trakyo `.brand-mark` + `.brand-text` treatment, money-green mark) instead of a bare text wordmark.
- Empty states: use the Trakyo `.empty` card styling, keep the honest copy.
- Keep dark-mode toggle + localStorage persistence working across all surfaces; ensure both themes look right.
- Preserve responsive behavior (the existing breakpoints); verify no horizontal overflow at 390px.

## Hard constraints

- Visual only. No changes to: auth (PBKDF2/sessions), any `/api/*` function, D1, the generator prompt contract, the metrics math, or any script logic. Diff should be HTML/CSS + the new shared css + minimal class renames.
- No new npm dependencies. Fonts via Google Fonts `<link>` only.
- Copy stays as-is (sentence case, no emojis/exclamations).
- `node --check` any touched JS. Confirm the three pages still render (open locally / grep the rendered structure). No deploy, no remote D1, no commit.

## Report

Append to AGENT_CHAT.md: files touched, the shared-css approach, confirmation that logic is untouched (list any script edits and why), and anything that didn't map cleanly. Clear your lock line.

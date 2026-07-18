# CODEX_TASK_link_directory.md

Founder request 2026-07-18: every destination in the pinned Slack "PULSIFY LINK DIRECTORY" must be reachable by click from the main operator page. One navigable hub, no more hunting through Slack pins. Claude specs, Codex builds and owns the visuals per the standing design lock.

## Placement (decided, do not relocate)

Inside `/admin` on pulsify-funnels (`output/standard-preview/admin.html` + `admin/console.js` + `admin/console.css`). ADMIN_KEY-gated like every other admin surface. Do NOT put this directory or any of these links on a public/unauthenticated page: it exposes internal tools, the Cloudflare dashboard, and the private repo.

Two surfaces, one data source:

1. A new **Links** route in the admin nav (same routing pattern as Command center / Email / etc.): the full directory, grouped, scannable, click-to-open (new tab) with a copy-link affordance per entry.
2. A compact **quick-links strip or block on the Command center** (the default route) surfacing the highest-traffic destinations: client portal, portal login, onboarding form, SDR dashboard, design preview. Keep it small; the full list lives on the Links route.

## The directory content

Static entries (hardcode these, they change rarely):

**Client access**
- Client portal: https://pulsify-funnels.pages.dev/portal
- Client login: https://pulsify-funnels.pages.dev/portal/login
- Onboarding form: https://pulsify-funnels.pages.dev/onboard (note under it: unique client token required)

**Internal tools**
- Operator admin: https://pulsify-funnels.pages.dev/admin (note: command center, follow-up queue, Studio review, email)
- SDR dashboard: https://pulsify-dashboard.pages.dev (note: leads and CRM)
- Design preview: https://pulsify-funnels.pages.dev/portal-preview

**Legacy + infrastructure**
- Legacy Frank mock: https://frank-wieler.pages.dev
- Cloudflare dashboard: https://dash.cloudflare.com/437f6dfbb738a4267395bd5da251494a
- Brain repo (private): https://github.com/Ab-luiy/pulsify-brain

**Prospect pages — DYNAMIC, not hardcoded.** Render this group from the existing client/page data the admin already loads (client_config / the acquisition-pages data used by the Pages library route). Each live prospect page listed as `{display name} -> https://pulsify-funnels.pages.dev/{slug}`. Currently that means frank-wieler, deevestments, grt-trading, kyle-kirshner, but the point is new pages appear automatically and deactivated ones drop out or show an inactive tag. Reuse whatever fetch the admin already performs; add no new endpoint unless genuinely necessary, and if one is needed it is ADMIN_KEY-gated read-only.

## Visual bar

You own the skin; match the existing admin console exactly (same tokens, spacing, card/pill language as the command center and pages library). Founder's explicit instruction: do not mess up the visuals. No new palette, no new fonts, no layout experiments. Grouped sections with the four headers above, each row = name + short note + open action + copy action. Responsive down to 390px like the rest of the console. Dark-theme tokens if present in the existing sheet.

## Ground rules

- Lock Board claim before editing; STARTED/DONE in AGENT_CHAT.md; Slack mirror best-effort.
- Local verification then deploy: `node --check` touched JS, all `.mjs` suites under `output/standard-preview/tests/` pass, static ID uniqueness and CSS balance checks, no em-dashes/en-dashes, no reward copy, no secrets.
- Deploy with Wrangler `--branch main`; smoke: /admin 200 with Links markup, an unauthenticated admin API still 401, /portal 302 gate, /frank-wieler 200.
- Update `wiki/log.md` (one `client-update` entry) and, if the funnel-portal-pipeline synthesis page documents admin routes, add the Links route there too.
- Archive this file into `done-tasks/` when finished.

## Acceptance

1. Every link in the directory above is clickable from /admin; prospect group is data-driven.
2. Command center shows the compact quick-links block.
3. Nothing in the directory is reachable without ADMIN_KEY.
4. All suites pass, deployed, smoked, visuals indistinguishable in style from the existing console.

---
name: project_og_preview_path_urls
description: "OG preview cards + clean path lead URLs live on pulsify-funnels (2026-07-09); Frank's sendable link is /frank-wieler; also: brain autosync push BROKEN, origin diverged"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2d8b8f35-6451-42fa-8d53-67efd83adee9
---

2026-07-09, shipped live to pulsify-funnels.pages.dev (Codex built per `CODEX_TASK_og_preview_and_paths.md`, I reviewed/seeded/deployed/verified):

- **Clean per-lead URLs:** `pulsify-funnels.pages.dev/{lead-slug}` (e.g. `/frank-wieler`) via new `functions/[slug].js` — reserved-path pass-through, unknown slug never renders another client's page. `?client=` still works. New leads: create the client_config row with id = full-name slug and the path URL just works. Scales to 100+ on the one free project, no domain.
- **Link-paste preview cards:** OG/Twitter tags on all template twins. og:title = per-lead PAGE_TITLE (name-aware default `{Client Name} — Private Application` when unset), og:image = ONE shared 1200x630 card (`/assets/og-card.png`, I generated it headless from the canonical design with neutral copy — founder chose shared-design-image over per-lead image). All origins computed per-request — a future neutral-host project rename (founder undecided, leaning non-branded) needs zero code change.
- **Frank's send link: `pulsify-funnels.pages.dev/frank-wieler`** — row seeded as full copy of `frank` (embeds/proof/kit too, not portal token). Preview card shows the page design + "Frank Wieler - Subscription dropshipping mentorship".
- Review catch worth remembering: Codex's documented D1 SQL referenced a nonexistent `client_name` column — always PRAGMA-check client_config (14 cols) before running seeds. Wrangler D1 /query can throw a transient 7403; retry.
- Headless screenshot gotcha (Windows): chrome `--headless=new --window-size=W,H` loses ~90px of viewport height to window decorations — capture taller and crop (I did 1200x720 -> top 1200x630 via System.Drawing). `aspect-ratio` CSS didn't apply either; force explicit heights. Needs `--no-sandbox` + scratch `--user-data-dir` to run at all from the sandboxed shell.

**BROKEN + OPEN: the brain autosync push has been failing since ~2026-07-06.** Local vault main and `Ab-luiy/pulsify-brain` origin/main have fully diverged: origin is MISSING the whole `output/` tree and `AGENT_CHAT.md`, has GitHub-side "Refresh stats" commits local lacks; local has weeks of unpushed checkpoints + a stale May-25 "test" commit that conflicts on rebase. I aborted rebase AND cherry-pick rather than guess which side wins ([[feedback_never_guess]]). My commit a31d5b8 (this build) is on LOCAL main only; deployed==local source. The online backup ([[project_brain_online_backup]]) is STALE until the founder decides the reconciliation. Raise this when backup/restore or "push to origin" comes up.

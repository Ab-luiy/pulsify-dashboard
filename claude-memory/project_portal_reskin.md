---
name: project_portal_reskin
description: "Operator dashboard = Pulse command-system skin; client portal = Atelier. Pulse is live on pulsify-dashboard as of 2026-07-02."
metadata: 
  node_type: memory
  type: project
  originSessionId: d6966459-9f75-459a-b63a-53a89db26f4d
---

**CURRENT operator design (2026-07-02): PULSE is live.** Codex shipped the full
reskin to canonical `origin/main` of `Ab-luiy/pulsify-dashboard` in commit `c288913`.
Pulse replaces Trakyo as the default while leaving the older themes available in the
switcher. It uses a near-black grid canvas, floating dark control rail, Clash Display
and Satoshi typography, coral/lavender/indigo signal gradients, high-contrast glass
cards, stronger data hierarchy, and a horizontal mobile navigation rail.

This was also the dashboard truth-state pass. The live product no longer renders
fabricated payment transactions, paid/scheduled/failed/refunded rows, closer names,
won-deal attribution, cashflow history, cash-source splits, or booked calls. Payments,
payouts, cashflow, calendar, and unconnected metric series hold at zero with explicit
empty states until a verified source reports activity. Real CRM, lead, Instagram, and
operator-state data stays intact. Payment data must carry `payments.live === true`
before the ledger will render it, preventing the old demonstration object from leaking
back into production.

Verification: live URL returned the Pulse bundle, desktop and 390px mobile had no
horizontal overflow, Overview/CRM/Metrics/Payments/Payouts/Cash flow rendered, payment
counter was zero, metrics were true zero-series, and the browser console had no errors.
Canonical source rule remains `origin/main`; the old `awesome-bassi` worktree is stale.

**SUPERSEDED for the operator dashboard (2026-06-23): the LIVE operator design is now MIRAGE, not Obsidian.** User picked Mirage from a SECOND, "bolder" design board (`Desktop/pulsify-design-directions-bolder.html`, directions 04 Aurora / 05 Prism / 06 Voltage / 07 **Mirage**). Mirage = "sunset on glass": dark plum base (`--bg #0c0712`), coral→magenta accent gradient (`#fb7185`→`#d946ef`, solid `--accent #f472b6`), **Sora** display font (replaced Instrument Serif) with gradient-clip headlines (`.serif`), drifting animated radial bg (`mirageDrift`), teal up `#5eead4` / soft-red dn, amber alerts `#fcd34d`. Applied token-driven on the real 419KB `awesome-bassi/index.html` (rewrote `:root` + body bg + global font/color literal swaps) and DEPLOYED to main 2026-06-23 (see [[project_deploy_pipeline]]). Old design kept as `index-classic.html` for swap-back. The Obsidian/brass description below is now the BACKUP look, not live.

As of 2026-06-22 the dashboard moved off the all-crimson theme to a two-portal design system, hybrid by surface:

- Operator dashboard (`index.html`) = **Lane A "Obsidian & Brass"** — near-black + brass/champagne `#c9a55c` (`--accent`), with `--on-accent: #1c1407` dark ink for text sitting on brass fills (badges, active toggles, done-checks, checkmark, control buttons). Crimson is DEMOTED to alert-only (`--alert: #ef5350`, plus existing `--danger`), no longer the UI theme. The old neon-lime (`#d4ff3a`) and lime tints (`rgba(212,255,58,…)`) in the YT/asset-builder section + chart/stage palettes were folded into brass-gold `#d9b66a`. Reskin is token-driven (token block identical across versions) + global literal swaps + ~5 white-on-brass contrast fixes. IMPORTANT: first mistakenly applied to a STALE 300KB copy in worktree `wonderful-curran-8c48be`; on 2026-06-22 user flagged that the LIVE dashboard is the 419KB version in `awesome-bassi-d88340` (8 tabs incl Health + Instagram, deploys to pulsify-dashboard.pages.dev) — reskin was REDONE on that current version. Also retuned Health-tab macro/calorie bars (protein bar detached from --accent to --danger; hBarGrad crimson→terracotta).
- Client portal (`client.html`, NET-NEW file) = **"Atelier"** (warm editorial luxe) — bone `#f4efe4`, ink `#1c1813`, COGNAC accent `#9a6a3a` (`--brass`; text accent `--brass-deep`=`#8a5d30`), Fraunces serif display + Inter UI + JetBrains Mono data. NOTE: Fraunces serif was RE-ADDED 2026-06-22 because user picked the Atelier direction from the design board — this REVERSES the earlier "font must be minimalistic" request; flagged to user, trivial to swap display back to Inter if they prefer. Tabs (as of 2026-06-23): My Funnel, Content, Pipeline, **Arsenal**, Calls. Demo client = "Meridian / Jordan Rivera", placeholder trading-creator data. **Arsenal** = AI creator toolkit (the repurposed old "Vault"): a prompt console (describe → generate; demo result is hand-written, real gen wires to an AI later) + 8 generators (content ideas, hook writer, short-form script, IG story sequence, caption+CTA, carousel builder, repurpose long→short, email writer). **Calls** = video/recordings library. A Proof/testimonials tab was built then DROPPED 2026-06-23 (user: "proof is unnecessary"). These map to Nick's "T Gallore Lab" Discord (Leads channels→funnel/pipeline, content/asset channels→Arsenal+Content, recordings→Calls) — the portal = one clean cover over the Discord.
- FINAL DIRECTION CHOICE (2026-06-22): user asked for a full from-0 redesign with MULTIPLE directions for both portals → built a 3-direction agency board (`design-directions.html`, on Desktop as `pulsify-design-directions.html`): **Atelier** (warm editorial), **Obsidian** (dark brass), **Signal** (modern indigo SaaS, Space Grotesk). User chose **Obsidian for operator** (= the brass reskin, effectively already done) + **Atelier for client**.
- Concept files (scratch, safe to delete): `reskin-concept.html` (early 2-lane chooser) + `design-directions.html` (the 3-direction board).

**Why:** user asked to redesign two portals (founder + clients) "with Claude design"; chose direct in-repo reskin, visual-only, hybrid lanes (A operator / B client).
**How to apply:** keep operator dark/brass + client ivory; reserve crimson/red for genuine ALERTS only; any new client-portal content must stay prescriptive (show the client their gaps + the fix). Finished files copied to Desktop for easy review: `C:\Users\Abdullah\Desktop\pulsify-operator-dashboard.html` (Obsidian, reskinned current 419KB) + `pulsify-client-portal.html` (Atelier client) + `pulsify-design-directions.html` (the 3-direction board). NOT yet integrated into `awesome-bassi-d88340` or deployed — deploy = copy both into awesome-bassi → merge to `main` → Cloudflare. The [[project_canonical_dashboard_worktree]] note (awesome-bassi is the only usable/live worktree) is CONFIRMED correct — `wonderful-curran-8c48be` was a stale throwaway. [[project_dashboard_product_vision]] [[project_deploy_pipeline]] [[project_canonical_dashboard_worktree]]

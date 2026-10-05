---
type: playbook
tags: [ads, funnel, scaling, product]
sources: [[concepts/profile-funnel]], [[playbooks/client-scaling]], [[content-engine/sequence-breakdowns/niksetting-new-here]]
created: 2026-10-05
updated: 2026-10-05
---

# Ads section: plan and Codex build brief (2026-10-05)

Founder request 2026-10-05: add an Ads section to the app, for clients and for the founder, shown as "coming soon" first. Owner: CODEX builds, Claude planned. Tickets on Ab-luiy/pulsify-saas (see bottom). This page is self-contained; also read pulsify-saas/CLAUDE.md and docs/DESIGN.md.

## Why this matters for Pulsify

Content brings the lead, the offer qualifies them, the funnel closes them. Ads are the scale step of the funnel pillar. Vault doctrine ([[concepts/profile-funnel]]): ads point at the profile, not a landing page ("profile ads"); the qualified follower base then converts through content and story sequences over 30-60 days. [[playbooks/client-scaling]] places ads after the organic ceiling and a price/offer fix, not before. So the section must show whether ad spend turns into booked and collected cash, stage by stage, which is the thing the rest of the portal already tracks for organic.

## What is known and what is open

Known from the vault: the funnel chain that an ads view should report on, as shown in the Niksetting waterfall: spend, profile visits, ad followers, qualified ad followers, conversations from ads, calls booked, calls completed, show-ups, cash collected. The portal already has leads, lead-calls, lead-outcomes, funnel and cash-by-video; reuse them.

Open (founder has not decided; defaults below, change on request): which platforms (default Meta, Instagram profile ads, first), who runs the ads (default: Pulsify runs them for clients, clients only view), budgets and guarantees (none assumed, nothing promised in the UI).

External dependency, stated plainly: a live Meta connection needs a Meta developer app, a Business Manager with ad-account access, an access token with ads_read, and for other people's ad accounts, app review. That cannot be finished by code alone. Phase 3 is therefore blocked until the founder authorises and we create the Meta app; Phases 1 and 2 need no keys.

## Phases

AD1, Coming soon surface (build now, ship first):
- Operator console and client portal each get an "Ads" nav item, placed after Funnel. Page states "Coming soon", says in one plain paragraph what it will do (see what each ad dollar turns into: followers, conversations, booked calls, collected cash), shows a static locked preview of the stage chain with clearly labelled sample values (use the existing SAMPLE badge pattern, no fake numbers presented as real), and nothing else. No waitlist form, no promises of dates or results.
- Follow docs/DESIGN.md and the app wording rules: never the word "health", sentence case, no emoji, no exclamation marks. Client version is read-only; operator version carries a small "Planned" note linking to the AD2 ticket.
- Acceptance: both routes render in light and dark at 1536 and 390 widths, nav item has a proper icon from the shared set, axe gate passes, full suite green.

AD2, Manual ads tracker (build after AD1, no API keys):
- Operator enters per client, per week: spend, profile visits, ad followers, qualified followers. Conversations, booked, completed, show-ups and collected come from existing lead/call/outcome data where the lead source is tagged "ads"; add the source tag if missing.
- Show the chain with cost per step (cost per follower, per qualified follower, per booked call, per collected dollar), week over week, and a plain next-move line for the client ("qualified follower cost rose, review the audience").
- Client sees their own account read-only. No claims of attribution beyond what the tags support; label estimates as estimates.
- Acceptance: a demo-example workspace can be filled in by hand and renders correctly; empty states are honest; backend tests added.

AD3, Meta connection (blocked, founder authorisation plus Meta app review):
- Pull spend, reach, clicks and results from the Meta Marketing API into the same tracker, replacing manual entry. Use the existing integrations hub pattern; tokens stay server-side. Do not start until the ticket is unblocked.

## Rules for the builder
- Extend existing portal-performance, funnel and portal-leads code; do not create a parallel data model.
- No invented data in the client UI. Demo data only in the demo-example workspace.
- One ticket at a time, comment on start, close with "Fixes #n", release only from a clean pushed main.

## Open questions for the founder
1. Meta only at first, or also TikTok and YouTube ads?
2. Do clients ever launch ads themselves in the app, or is it view-only while Pulsify runs them?
3. Should the founder's own Pulsify ads live in the same section (default yes, as the operator's own workspace)?

## AD1 release, 2026-10-05

AD1 is live at /app/ads and /app/portal/ads, from pulsify-saas main 8f1f219, Pages c893b3f0. The shared preview displays all nine stages as labelled illustrative samples, with no account-data model, ad controls, waitlist, date or result promise. Operators see the Planned link to ticket #46; clients do not. Ads follows Funnel in the client menu. Operator Funnel stays grouped under Clients, with the standalone Ads entry immediately after that funnel entry in the navigation source.

Both role views passed light/dark, 1536/390 rendering and axe checks. Final full check passed lint, TypeScript, production build and 767 browser tests (486 intentional skips). A recurring existing lead-toast test was repaired without changing product behavior. Live signed-out document and payload gates passed; authenticated live browser inspection was unavailable because Chrome was disconnected. Evidence is in output/qa/2026-10-ads-ad1 and [[log]].

AD2 remains queued; AD3 remains blocked. No backend, database, Meta account or token changes were made for AD1.

---
type: playbook
tags: [funnel, sales, outreach]
sources: [[wiki/synthesis/outreach-to-client-pipeline-roadmap]], [[wiki/synthesis/funnel-portal-pipeline]], [[wiki/synthesis/landing-page-standard]]
created: 2026-07-01
updated: 2026-07-01
---

# Prospect signed: the onboarding checklist

What happens, step by step, when a prospect who received an outreach landing page signs as a client. This is the Phase 3 workflow from [[outreach-to-client-pipeline-roadmap]] — the "upgrade in place" moment where a cold-outreach page becomes live client infrastructure. Nobody has signed through this pipeline yet, so treat the first run as a test of this checklist and correct it afterward.

## Why this matters for Pulsify

The whole point of the architecture is that signing a client requires no rebuild. The page they already received, the data pipe behind it, and the portal shell all exist — onboarding is flipping switches and filling in real values, not building anything. If a step here requires writing new code, that's a bug in the system, not a step in the process.

## The checklist

1. **Create the client folder.** `clients/{name}/` with the fixed structure: `overview.md`, `content-pipeline.md`, `calls/`, `progress.md`, `decisions.md`. Move or copy the prospect research from `raw-sources/client-raw/{name}/` into context — the creator profile that built their outreach page is now the seed for `overview.md`.

2. **Decide the page's fate.** Two options, decided with the client on the onboarding call:
   - Keep the outreach page as their real funnel page (usual case — it was built to be honest and real from day one).
   - Do a copy refresh in `/settings` now that offer specifics exist (price, curriculum, guarantees were deliberately never invented for the outreach version — see the anti-invention rule in [[landing-page-standard]]).

3. **Turn on the integrations** in `/settings` for their client id. Every field was deliberately optional at outreach time; now fill in the real values:
   - Wistia media id — their real VSL, recorded and hosted in Wistia.
   - Typeform URL plus webhook secret — webhooks need a paid Typeform plan; Tally is the free alternative if that's a blocker.
   - Kit tag id plus API key — this is what starts their email sequence on application.
   No code changes are involved. Saving the settings row is the entire upgrade.

4. **Send the buyer-psychology questionnaire.** The post-close onboarding form (why they bought, what almost stopped them, which video converted them) — see the onboarding-form workflow in memory. The answers go into `clients/{name}/overview.md` and feed content angles.

5. **Mint their portal link.** In `/settings`, generate the client link (`/client?client=<id>&t=<token>`). The token is shown once — copy it immediately and send it to the client. Rotating later kills the old link, which is also the off-boarding mechanism.

6. **Seed the portal's delivery data.** In `/portal`, add their first content items (scripts in production), call notes from the onboarding call, and any assets already delivered. An empty portal on day one reads as "nothing is happening" — put the onboarding call notes in before sending the link.

7. **Log it.** New decisions into `clients/{name}/decisions.md`, a `client-update` entry in `wiki/log.md`, and starting KPIs (followers, current revenue, close rate if known) into `clients/{name}/progress.md` so there's a baseline to show progress against.

## Open questions / gaps

- Untested end to end — no prospect has signed through this pipeline yet. First real signing should be run against this list and the list corrected where reality disagrees.
- Revenue/pipeline data in the client portal is still pending (lives in the operator dashboard system, no shared schema yet) — set that expectation with the client rather than promising the Pipeline tab.

## Connections

- [[outreach-to-client-pipeline-roadmap]] — this is Phase 3 of that roadmap.
- [[landing-page-standard]] — the page structure and copy rules that stay in force after signing.
- [[funnel-portal-pipeline]] — the data pipe the integrations plug into.

## Source trail

- `AGENT_CHAT.md` log 2026-07-01 (integration fields optional-by-default decision; portal token contract).
- CLAUDE.md client work conventions (folder structure, onboarding trigger).

---
type: synthesis
tags: [content, funnel, scaling]
sources: [[synthesis/client-dashboard-redesign-spec-2026-07-12]], [[synthesis/portal-content-studio-spec]], [[synthesis/pulsify-portal-master-architecture]], [[playbooks/ig-followup-sequence]]
created: 2026-09-25
updated: 2026-09-25
---

# Growth section: audit and plan (draft for the founder session)

The founder called the Growth section "not done or ready in any shape or form" and the thing that has to be right before the program ships (pulsify-saas ticket #18). This page is the audit of what the client sees today and a proposed rebuild, written to be argued with in the planning session. Nothing here gets built until the founder picks.

## Why this matters for Pulsify

Growth is where the client does the content work the whole offer rests on: content, then offer, then funnel. If the client opens Growth and sees a menu, they leave and ask us what to post. If they see what to make this week and how last week's pieces did, the portal does the coaching between calls. That second version is the $10K product the vault has been describing since July.

## What is there today (client portal, audited 2026-09-25 from screenshots of every page)

- **Instagram** opens with three cards (Story sequences, Reels, Your story projects) and two more (Story performance, Leads and DMs). Story sequences is a grid of nine jobs, each with a structure and a three-step builder. Reels is three more cards plus an idea inbox and an angle library. The only line that says what to do next, "This week's read" (winning type, the leaking slide, a Generate button), sits at the bottom of the page.
- **YouTube** is seven tabs: create long form, title formulas, a bundled thumbnail archive, a designer, saved designs and projects.
- **Copywriter** is six more cards: story sequence, reel script, YouTube script, email, DM summary, rewrite.
- **Performance** is where results live, all typed in by hand: average completion, cadence (1 of 7, with 3 as the floor and 5 to 7 the target), DMs from stories, best type, retention, history and weekly snapshots.
- **Leads** is the funnel pipeline (applications, bookings, payments) plus a manual lead register.

## Why it is not shippable

1. **It is a toolbox, not a loop.** Every page opens on a grid of cards. The client has to already know what to make. The vault's own spec says the product is one weekly loop, diagnose then create then track then retest then replicate, and warns "build the loop, not the panels" ([[synthesis/client-dashboard-redesign-spec-2026-07-12]]). Today the loop exists only in pieces spread over four pages.
2. **The same job lives in two or three places.** A reel script can be started from Reels and from Copywriter. A story sequence from Instagram and from Copywriter. A YouTube script from YouTube and from Copywriter. Performance and Leads are sidebar items and also Instagram tabs.
3. **What to do next is buried.** The diagnosis and the cadence gap exist, but at the bottom of Instagram and inside Performance, never at the top of Growth.
4. **Results are separate from the work.** A sequence is made in one place and measured in another, so "make more like this" and "retest the hook" have nowhere natural to live.
5. **Ideas can be lost.** The reel idea inbox keeps ideas in the browser tab only; closing the tab deletes them.
6. **Personal only as far as the brain goes.** Both AI endpoints already read the client brain server-side (functions/api/copywriter.js and studio-generate.js load it), but every form still opens empty and the brain itself is the part the founder called unfriendly (ticket #16). A thin brain means generic drafts.

## Proposed rebuild: Growth as the weekly loop

Four pages instead of five tool areas:

- **This week.** The first thing the client sees. Cadence against target for each format (sequences 3 floor, 5 to 7 target, per [[synthesis/portal-content-studio-spec]]), the diagnosis in three computed lines (what is winning, where it leaks, what to do), and two or three "make this next" buttons that open Create with the brief filled in.
- **Create.** One studio for every format: story sequence, reel, YouTube video, carousel, email or DM. Pick the format and the job, the brief is pre-filled from the client brain, the draft is made, the draft goes to review. Copywriter folds into this; its formats become options here.
- **Library.** Everything made, in one list with a status pipeline (idea, draft, in review, scheduled, live, retesting). The idea inbox lives here and is saved to the workspace.
- **Results.** Each piece's numbers next to the piece, the retest button on anything that leaks, and "winning frames" (structures that earned their place) with "make another like this".

Leads is a sales tool, so the proposal moves it next to Payments.

Until client integrations unpark (first paid client, ticket #15), results stay manual entry with a fast form. The spec already planned for that: Instagram story per-slide views have no API at our tier.

## Decisions for the founder

1. **Scope.** This page reads "Growth" as the client portal's Growth group (Instagram, YouTube, Copywriter, Performance, Leads). The operator console also has a Growth group. Confirm which.
2. **Structure.** The weekly loop (This week, Create, Library, Results) or keep per-platform pages and fix them one by one.
3. **Who runs the AI.**
   > ⚠️ Contradiction: [[synthesis/portal-content-studio-spec]] (2026-07-12) plans generation inside the portal on our side, while [[synthesis/pulsify-portal-master-architecture]] (2026-07-13) says the work section hands the client a context package to run on their own AI, "not our generator running on our keys". Resolution: founder call. Today the code does the first: the Copywriter runs on our Cloudflare Workers AI with 30 requests per workspace per day, and the sequence generator uses our Gemini or Anthropic key when one is set.
4. **Formats in v1.** Recommendation: story sequences, reels and YouTube packaging first; carousels once the carousel framework page exists (the spec's own gate); email and DM later.
5. **Review gate.** The spec defaults to operator review before "ready to post". Keep it on?

## Connections

- [[synthesis/client-dashboard-redesign-spec-2026-07-12]]: the loop and the Studio zones this proposal follows.
- [[synthesis/portal-content-studio-spec]]: cadence targets, the metrics inventory, manual entry v1, the review gate.
- [[synthesis/pulsify-portal-master-architecture]]: the work section and the client brain that makes briefs personal.
- [[playbooks/ig-followup-sequence]]: the operator inbox's next-action rules draw on it; Growth's diagnosis should read the same way.

## Open questions / gaps

- No client has used any Growth page yet, so this audit is from screens and code, not usage data. The first paid client's first two weeks are the real test.
- The cadence targets and the drop-off doctrine come from the Niksetting and SooWei extractions; per the source rules, apply them as documented, no invented thresholds.

## Source trail

Screenshots of every client Growth route captured 2026-09-25 from the pulsify-saas test fixtures (test-results/screens/portal-instagram-*, portal-youtube-*, portal-copy-*, portal-performance-*). Code facts: src/features/portal-instagram/reels-screen.tsx (idea inbox in sessionStorage), src/features/portal/nav.ts (Growth group). Specs: the three synthesis pages above.

---
type: synthesis
tags: [content, funnel, scaling]
sources: [[synthesis/client-dashboard-redesign-spec-2026-07-12]], [[synthesis/portal-content-studio-spec]], [[synthesis/pulsify-portal-master-architecture]], [[playbooks/ig-followup-sequence]]
created: 2026-09-25
updated: 2026-09-26
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

## Founder answers (2026-09-25)

From the founder's voice reply the same day. These override the recommendations above where they differ.

- **Scope.** The client portal Growth section. It is the service delivery, the fulfillment, and it is the top priority. It is a long project he wants to work on as its own focused stream.
- **Structure.** Undecided between the four-page loop and fixing pages one by one. The method he did set: take one thing, lock it in, then enhance it again and again.
- **Leads.** Belong with sales and the CRM, because leads are about making money. Not settled whether that is next to Payments; the grouping is "sales".
- **The AI.** The 30 requests per day cap is a bottleneck: a client should be able to keep prompting against our data. Output has to be generated from our backend, our data and our files. It has to teach itself and learn, with memory, so he eventually never touches it. He does not want to build our own AI model. "Shooting for the sky": he wants to know what is possible.
- **Formats first.** Story sequences, reels and YouTube. YouTube is packaging: title and thumbnail, with far more examples and angles than the portal has today.
  > ⚠️ Superseded 2026-09-26: reels are out and YouTube means the whole video, not only packaging. See "Founder correction (2026-09-26)" below.
- **Thumbnails.** His 24 "Founder board" versions were duplicates and are removed from the archive (done, pulsify-saas cc51f53). 21 creator references remain.
- **Review gate.** On. He reviews drafts before anything is marked ready to post.

## Planning session decisions (2026-09-25)

- **Structure is not the first job.** Asked whether the four-page layout was cosmetic or a delivery improvement, the founder agreed it is mostly cosmetic on its own. What improves delivery is underneath the pages: draft quality, a computed "make this next" answer, and approvals and results feeding back into the next draft. The structure question is parked until one format works end to end.
- **First thing to lock in: story sequence draft quality.** The bar is drafts the founder approves as they are instead of rewriting. Chosen because the review gate (draft, review, approve or reject with a required note) already exists for sequences in `functions/api/studio-sequences.js`, so the learning signal has somewhere to come from.
- **Baseline found: the portal writes no sequences today.** Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is set in the pulsify-funnels production secrets, so Generate returns the empty manual template plus a copy-paste prompt. The prompt is a rule list that names the story-sequence-generator skill but never includes it, the framework, the Niksetting breakdown or the voice guide; no example sequence is ever shown.
- **Model: Opus 5.5 once a client pays.** A local side-by-side on one brief (same prompt with the skill, framework, worked example and voice guide added) had Opus 5.5 hold one reframe, label peak and revenue figures honestly and flag its own unconfirmed facts; Sonnet 5 split the reframe, garbled source quotes and used a "not X, you're Y" line. Opus still made two factual slips the review gate must catch. Published rates: Opus 5.5 $4 in / $20 out per million tokens, Sonnet 5 $2 / $10; estimated about 12 cents a draft on Opus. The test brief used a lead who must not be used as a sample again; the drafts were never saved.
- **Until then: bring your own AI with a paste-back.** No API spend until a client pays upfront. The portal assembles the full package (method, example sequences, voice rules, client brain), the client runs it in their own ChatGPT or Claude, pastes the answer back, and it enters the founder's review queue like any draft, so approvals and rejections still feed the learning loop. Built so switching Generate to Opus 5.5 on our key is one setting. Rejected: Cloudflare Workers AI and Gemini (quality), Pulsify writing drafts in-house (the app exists to delegate; the service is done-with-you).
- **Approvals become examples.** Every draft the founder approves is kept as a good example; the next package for that client shows their approved sequences and tells the AI to write like them.
- **Rejection reasons become rules.** Default: that client only; the operator can apply one to every client, narrow it back or remove it on the Reviews screen (founder left this to Claude, 2026-09-25).
- **Deployed 2026-09-27** (Pages 46d8b892). Still open: how posted results rank the examples.

## Founder correction (2026-09-26)

- **Reels are out.** "We're not working on reels." No reels work in Growth unless he reopens it.
- **The formats are** YouTube videos and their packaging, story sequences, and carousels. Carousels are the "least leveragable" of the set but stay in it, because "it's all the elements built together."
- **The most important thing to dial in is creating a YouTube video**, the whole video, not only the title and thumbnail. He started making a real one with Claude the same day; each step that gets locked in on that video becomes the method the portal hands clients, the same take-one-thing-and-lock-it-in approach he set on 2026-09-25.
- The story sequence build chosen as the first lock-in on 2026-09-25 was already under way in its own session. He did not say to stop it.

## Carousel plan (founder direction 2026-09-27, build after the YouTube video)

The current carousel output looks automated and the founder rejected it. Carousels get built on the client's own photos instead of templates:

1. The client picks a topic.
2. The portal asks for a specific photo set, for example nine: two scenery shots, a few of the client (desk, call, walking, close-up) and a few of their work or results.
3. The client uploads them into the portal's media library.
4. The AI writes each slide in stages (hook, intro, buildup, value, CTA) and assigns each photo to the slide whose copy it fits.
5. The finished carousel goes to the Reviews queue like story sequences, and approvals and rejection reasons teach it the same way.

Two constraints from the founder. The slide structure and photo pattern come from reading the Niksetting carousels already captured in [[content-engine/carousel-breakdowns/README]] (and any others he adds), applied as documented. And the flow has to work for clients without a photographer or great photos: phone photos must be enough, so the photo ask stays simple and the design carries plain pictures. Order: YouTube video first, then this.

## The portal is a guided operator (founder decision 2026-09-28)

Asked whether the portal should track data, generate assets or create content, and whether the method should live as SOP docs or in the app, the founder chose the guided operator: every SOP becomes steps inside the app, each step asks the questions an operator would ask, the AI suggests options built from the client's brain and our method, the client picks, and the founder reviews before anything ships. Push-button automation looks generic; SOP docs alone are a course. It must look premium and card-based, and it runs on what onboarding collects (voice notes, offer, delivery, students and their results): "we take all that information to ask them back what they want to create on."

First build: the YouTube flow, starting with ideation. His ideation questions, one at a time: what have you solved; a common mistake in your niche; what you struggled with and fixed; what took longest to figure out; can it be broken down on a Miro board (is it mindset-heavy, do you need to show proof of work and how); does it break a limiting belief; is it wide or niche; the video you wish someone had made. Then "here are your ideation results", sorted into pain point, limiting belief and breakdown, then title and thumbnail, build, shoot sheet and review. Remaking a winning concept on a new problem in a new format is part of it. Formats: Miro board, face to camera, both, student call, group coaching call, in-person student video.

> ⚠️ Contradiction: the founder said there are no bottom-of-funnel videos (the bottom is the landing page and VSL). [[concepts/content-funnel-tof-mof-bof]] lists bottom-of-funnel videos (client interviews, mini-VSLs). Resolution: founder call, flagged to him 2026-09-28; the ideation screen tags ideas TOF or MOF only until he rules.

### The guided new-video flow as built (2026-09-28, not deployed)

Three steps in the client portal, each asking what an operator would ask, each running on the client brain and granted proof, each with the BYO-AI copy-paste fallback until the Anthropic key and the same Opus 5.5 switch after:

1. **Ideation** (/portal/youtube/new): his ten questions as cards with onboarding answers as tap-to-use hints; ideas in pain point, limiting belief and breakdown, tagged funnel stage, format, mindset and proof to show. Method: micro niche YouTube, funnel stages, packaging rules.
2. **Title and thumbnail** (/portal/youtube/title): what the video proves, which of the four layouts; five title and thumbnail pairs; live checks from the vault (under 60 characters, no question marks, no exclamation marks, thumbnail adds what the title doesn't say, yellow-bar headline on board thumbnails only, quiet text elsewhere, every number showable on screen). Where the titles skill and [[content-engine/thumbnail-layout-patterns]] disagree on thumbnail text, the layout page wins, as that page itself says.
3. **Build the video** (/portal/youtube/build): why they should believe you, what they walk away with, what viewers do next; three openings (the promise, why you, reason to stay) and one outline in problem, struggle, discovery, result with board, screen, camera or student cues and the section that pays off the opening's loop; checks for warm-up openers, length, missing beats, unresolved loops and a hard pitch on a top-of-funnel video.

**The review gate for YouTube (built 2026-09-29, not deployed).** The build step ends with "Send to my team for review" or "Save as a draft". A sent package is snapshotted server-side (content_reviews, migration 0044) and lands on the founder's Reviews page beside story sequences. Approved packages become examples in all three YouTube steps; a send-back reason becomes a rule. Rules are shared across formats, on the reading that a correction like "never call revenue profit" holds for every piece of that client's content. Video projects show In review, Approved or Changes requested, and the reason appears on the title and build steps.

Not built yet: a shoot sheet and the editing standard (a vault gap).

## What "teaches itself" can mean without building our own AI

A proposal for the planning session, not a decision. Nothing here needs a model of our own or retraining one. The model stays a hosted one; what learns is the data around it.

1. **Knowledge it reads every time.** The vault's frameworks and extractions (story sequences, the title and thumbnail patterns, the reel formats) plus the client's brain, searched per request so each draft is built from the relevant pieces. The platform already has a meaning-based search over DMs and client brains (Cloudflare Vectorize, behind the Outreach tracker's "Search what they said"), so the building block exists.
2. **Memory per client.** Every brief, draft, edit, approval, rejection and posted result is kept.
3. **The review gate is the teacher.** What the founder approves becomes an example the next draft is shown. What he rejects, with a one-line reason, becomes a rule the next draft follows.
4. **Results close the loop.** Pieces that performed (completion, DMs, views) rise to the top of the examples; pieces that leaked drop. Until client integrations unpark (ticket #15), results come from manual entry.
5. **A checker before the founder sees anything.** A second pass grades each draft against the framework and the voice rules, the way the prospect-doc checker does, and rewrites what fails.
6. **Usage priced as a budget.** Replace the flat per-day request cap with a monthly allowance per client sized to the offer. Model choice and cost are to be priced in the session, from the provider's published rates.

Honest limits: it only gets better as fast as examples and results arrive, so the first client's first weeks are thin; it cannot read Instagram story results on its own until data flows in.

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

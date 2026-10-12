---
type: synthesis
tags: [frontend, portal, operator, audit, onboarding, security]
sources: pulsify-saas main 9afb032 (98 routes, 66k lines), 99 screen captures with test data (dark, desktop), live D1 sync_runs, founder message 2026-10-12
created: 2026-10-12
---

# Frontend audit, 2026-10-12

How it was done: every client and operator screen captured with the test data, the route list and nav read from code, and the live sync jobs checked. Captures show the first screen of each page only, so anything below the fold was read from code.

## 1. Fixed today (connectors)

| What | Problem | State |
|---|---|---|
| Instagram tab | Since Sept 17 only followers, reach and the post list refreshed. New posts had no numbers on screen, and reels with hook scores, stories, totals, cadence and audience were frozen. Stories not captured since Aug 24. | Fixed and live. All blocks refreshed 08:10 UTC. Stories start filling at the next 05:00 UTC run. |
| YouTube tab | Failed 51 runs since Sept 29: the channel shows no public videos, and the job crashed on that. Subscribers and views froze too. | Fixed and deployed. Next run 12:15 UTC. |
| Lead scores | Failed every 10 minutes since Oct 8 (database query limit). | Fixed and live. |
| Weekly YouTube lead scrape | Never succeeded on the worker (90 requests, the cap is 50). | Fixed and deployed. Next run Sunday. |
| Watch | `tools/connector_health.py` plus a daily 09:40 check that notifies you only when something breaks. | Live. |

## 2. What a client needs to get their first video, story, carousel and reel done

Right now a client can plan all four, but can't finish any of them inside the app without doing the hard part somewhere else.

| Piece | What happens today | What blocks a first finished piece |
|---|---|---|
| YouTube video | 10 ideation questions, then title and thumbnail, then a build plan | Writing is a "copy this prompt into your own ChatGPT" step. No script or outline comes out ready to record. The thumbnail designer pastes words on top of someone else's thumbnail (see 6). There's no "I recorded it, here's the link" step that moves it to published. |
| Story sequence | Pick 1 of 9 types, a 3-step brief, the editor, copy the prompt to their AI and paste the answer back, then the studio, then export PNGs | About 7 screens and 2 apps before a slide exists. The 9 types ask the client to know our method's vocabulary. |
| Carousel | Pick Methodology, Taxonomy or Philosophy, then 5 steps | The three shape names mean nothing to a trader. The preview is an empty "Your hook" card until they write everything themselves. |
| Reel | Angles, then a capture checklist | Fine as a plan. Nothing tracks whether it got filmed or posted. |

The shared root cause is that nothing in the app writes for the client. Every generator hands them a prompt instead (the founder decision of 2026-10-03: clients bring their own AI key, copy-paste until they pay). That is the single biggest reason they won't produce anything. See section 10.

What a client actually needs, in order:
1. One button per format: "Make me a story / carousel / video plan". It asks 2 or 3 plain questions (what happened, who it's for, what you want them to do), then shows a finished draft in our design.
2. Edit in place, with their own words and photos.
3. Send for review. You approve or leave notes.
4. A "posted" step with the link, so it counts on Home and in stats.

## 3. Remove now (your instructions)

- **Story sequence type cards.** Remove all 9 (Value-driven, Credibility, Q&A, Day in the life, Breakdown, Lifestyle, CTA, Start here, Story launch), plus each type's arc page ("6 beats. One clear job", "Illustrative opening", the templates accordion). Replace them with one input: "What do you want to post about?" The app picks the structure behind the scenes and names it only in the editor, if at all.
- **Bulky description text.** 51 page subtitles, some over 200 characters, plus instruction paragraphs inside screens (the story editor's "Your storyboard is saved. To have AI write it, click Copy AI prompt..." block is the worst). Rule: a page title gets no subtitle unless it says something the title can't. Help text moves into the field placeholder or a small "?" tooltip. Empty states get one line.
- **Big empty icon cards.** On YouTube Overview and Instagram Overview, the large cards with an icon at the top and a line of text at the bottom take half the screen and repeat the tabs right above them. Remove them; the tabs already go there.

## 4. Duplicates

| Duplicate | Where | Proposal |
|---|---|---|
| Two operator home pages | Home (`/`) and Business overview (`/dashboard`) | One Home: your money, clients needing attention, today's actions. Business overview's tabs (Plan, Income, Payouts, Cash flow, Calendar) become a Money page. |
| Payments in three places | Payments page, the Payments tab in Business overview, and the Payments section of Integrations | Connecting Stripe/Whop lives in Integrations only. Matching and history live on Money. |
| Five contact lists | Leads, Outreach queue, Inbox, Outreach tracker, CRM | Two: Inbox (conversations, with queue and follow-ups as filters) and Pipeline (the CRM board, with tracker stats in its header). |
| Client info entered in three places | Client setup (a long form), Client brain, and the client's onboarding | Onboarding is the only place clients enter info. Client brain is where you read and correct it. Client setup keeps only the technical connections (Wistia, Typeform, Kit, domain). |
| Client funnel stats twice | Operator Client funnels and the client's Performance | One component, shown in your client view (section 5) and in theirs. |
| Client content twice | Operator Client work (a form to add content rows by hand) and the client's own content pipeline | One pipeline the client fills by making things and you can see. Hand entry stays only as a fallback. |
| Projects lists three times | Content > Story projects / Video projects, and "All my projects" on Instagram and on YouTube | One Projects list under Content, filterable by format. |
| Title formulas twice | YouTube Overview and the 7-fig packaging Formulas page | Keep them in packaging only. |
| Metrics pages twice | `/portal/performance/{weekly,history,retention}` and `/portal/instagram/metrics/{weekly,history,retention}` render the same screen | One set of routes; the other redirects. |
| Pipeline summaries three times | Home "Content pipeline", Instagram Overview "Studio pipeline", the Content calendar | One pipeline (section 7). Home shows a 3-line summary of it. |

## 5. Your view of a client

Today "Open workspace" opens the client's portal as if you were the client, so you click into Story sequences and walk their flows. Proposal: a **Client view** page for operators, read-only by default:

- **Header:** name, status (On track / Watch / At risk), plan week, last active, a "View as client" button kept for support.
- **Numbers:** followers and subscribers with trend, cash collected, booked calls, funnel score, plus their content counts for the week (planned, made, posted).
- **Activity feed:** what they did (made a story, sent a carousel for review, logged a payment, finished onboarding step 4), newest first.
- **Waiting on you:** reviews, unanswered questions, onboarding gaps.
- **Their work:** every piece with status and a thumbnail, click to read; approve or comment right there.
- **Their brain:** onboarding answers, editable.

What moves from your side to theirs (they should see their own progress):
- Funnel numbers (Client funnels) become their Performance, already partly there.
- The content pipeline: your Client work content rows become the pipeline they own.
- Weekly reports and call notes they can read (pre-call briefs and Fathom summaries already exist on your side).
- Their outreach and sales numbers, if they use the Sales Co-pilot.

## 6. Carousels and the thumbnail designer

**Carousels.** The three shapes are internal method words. Replace them with "What's the carousel for?" and plain options: "Teach a process", "List the mistakes", "Share a result", "Change a belief". Then generate all slides in one go into the existing designed slide builder, so the preview shows real slides instead of "Your hook". The 5-step wizard collapses to: answer, see slides, edit, send.

**Thumbnail designer.** It takes a reference thumbnail from the gallery (another creator's image, with its own text burned in) and lays the client's words on top, so you get text on top of text. Rebuild it around the client's own photo:
1. They upload a face photo (or pick one from their brand library).
2. The cutout is made automatically.
3. They pick one of 4 to 6 proven layouts (face left with big words right, before/after split, a result screenshot with the face, an object with an arrow).
4. The title from the previous step becomes 2 to 4 thumbnail words, with an edit box.
5. A feed-size preview sits next to real YouTube results.

References stay in the gallery as inspiration only. Until the rebuild, hide the designer and keep the gallery plus "My thumbnails" uploads.

## 7. A content pipeline in the client portal

Home shows a 3-column summary (In production, Scheduled, Published), but there's no place to work the pipeline. Proposal: Content becomes the pipeline board, with columns **Idea, Writing, Ready to film/design, In review, Scheduled, Posted**. Every story, carousel, reel and video they start lands on it automatically. They drag cards forward; review and approval move cards for them; adding the post link marks it Posted, and that feeds stats. The calendar becomes a second view of the same items. Your Client view (section 5) shows the same board, read-only.

## 8. Onboarding redesign (proposal)

Today: 17 questions in 7 rainbow-coloured parts, one per screen, plain text inputs, "Let's build your brain." It works, but it feels like a form, and the client sees nothing from their answers until the end.

Proposal:
1. **Three parts, not seven:** You and your offer; Your audience and proof; Your accounts. One progress bar, one accent colour.
2. **Talk first.** The first screen is a 3-minute voice note ("Tell us what you sell, who buys it, and one result you're proud of"). We transcribe it and pre-fill the questions it answered, so they only confirm and fill the gaps. The voice step already exists; it moves to the front.
3. **Fewer screens.** Group related questions on one card (name, handles and link in bio together). Target 8 screens.
4. **Show the payoff while they answer.** A side panel builds their profile card as they type: name, niche, offer line, top proof. At the end they get 3 video ideas and one story-sequence idea from their answers, a first win in the first session.
5. **Proof that looks like proof.** Screenshot uploads as a grid with a caption each, and testimonial links shown as video cards.
6. **Accounts last, one click each** (handles only, as now).
7. **The end screen is their plan:** the Week 1 to-dos and a "Make your first story" button, not "Open my workspace".

## 9. Bugs and glitches found

1. A carousel opens in an editor titled "Story editor".
2. ~~Items in review stay editable~~: checked in code, they are locked (draft and rejected only). The screenshot was misread.
3. ~~Grey latest-video box~~: that was the test data's missing thumbnail; the screen already has an empty state.
4. Instagram tab "Posts" count is the posts pulled in 90 days, not the account total, but it's labelled "All media on the account".
5. Six sync jobs have runs stuck as "running" that never finished (lead-models 172, zernio-inbox 314, search-index 109, webhook-outbox 90, client-videos 3, payment-rematch 1 since Oct 1). Their next runs succeed, so data still flows, but the cause is not investigated yet and the job log is misleading.
6. Hot-lead alerts and the visitors feed still break for people with more than 5 browsers until the next site deploy (the fix is committed).
7. Codex confirmed YouTube manual prompts showed internal source names to clients (#60). The fix is committed, not deployed.

## 10. Powering up the generators

The generators are good at structure but never produce the final thing for the client, because writing is switched off for clients (they paste a prompt into their own AI). To make the software produce what we want:

1. **Generate on our side.** Turn on server-side writing for paying clients, using our key, with the method staying on the server. Cost is small per piece (an earlier Gemini price check: 3.8 Flash has a free tier; paid is $0.75 in / $3.75 out per million tokens until Dec 31). This also closes the biggest IP leak (section 11), because the prompt never leaves the server.
2. **One AI path** for every generator (ticket #52 is already specced).
3. **Feed it their real data:** the onboarding brain, their proof, their best posts by hook score and saves (now refreshed daily), and what you approved or rejected in reviews (#50 is already specced).
4. **Design is part of the output:** stories go straight into the studio's designed tier, carousels into the slide builder, and thumbnails into the rebuilt designer, so the client sees a finished piece first and edits second.
5. **A quality gate before the client sees it:** no invented numbers, no named sources, house style rules, and every figure checked against their proof.

## 11. Protecting the codebase

Where things stand:
- The real logic (backend, prompts, method, data) runs on Cloudflare and is never sent to the browser. A client can't download it.
- No source maps are published, so the browser code is minified only.
- App code downloads only for signed-in users. But the client portal and the operator console are one app, so a signed-in client downloads the code for your whole operator console too (about 6 MB, minified).
- **The biggest leak is by design:** "Copy AI prompt" hands the client the full prompt, method included, to paste into ChatGPT or Claude. Anyone can collect those prompts. Codex also found named sources inside them (#60).

Proposals, in order of value:
1. Server-side generation (section 10, point 1), then remove "Copy AI prompt" for clients. This closes the method leak.
2. Two separate builds: the client portal stops shipping operator screens. Smaller download, and nothing about your console is exposed.
3. Rate limits and caps per client on the generators, so nobody can script the API to scrape outputs.
4. Watermark exports (invisible per-client ID in PNGs) so leaked material can be traced.
5. A terms-of-use clause: no copying, reverse-engineering or reselling the software or its outputs' templates.

Honest limit: anything shown in a browser can be copied by someone determined (screens, layouts, the text on screen). What can be protected is the method, the prompts and the data, and moving generation server-side does that.

## 12. Clean-up list

- 35 stale Claude worktrees in `Pulsify-Archive\worktrees`, 3 old pulsify-saas worktrees, and leftover branches (eager-noether, youthful-carson, archive/codex-overview-draft), plus Codex PR #22, open since Sept 24.
- The old pulsify-dashboard repo still receives "Refresh IG analytics / YT leads" auto-commits up to Oct 5; the live data now comes from the sync worker. Retire those jobs.
- Old snapshot kinds the app no longer reads (inbox-sync-state from the Composio era).
- The legacy `/portal/tracker` and `/portal/voice` routes, if section 4 merges them.
- Route aliases kept for old bookmarks: keep the redirects, delete the duplicate pages.

## 13. Plan

| Phase | What | Size |
|---|---|---|
| 1 | Section 3 removals, the duplicate merges in section 4 that are pure deletes or redirects, and the bugs in section 9 | 1 to 2 days |
| 2 | Client view for operators (5) and the content pipeline board (7) | 3 to 4 days |
| 3 | Server-side generation, one AI path, and the first finished story/carousel/video plan from 2 or 3 questions (2, 10) | 4 to 5 days |
| 4 | Onboarding redesign (8), carousel rework and thumbnail designer rebuild (6) | 4 to 5 days |
| 5 | Protection: split builds, rate limits, watermark, terms (11) | 2 days |

Each phase ships behind your review: screenshots first, then release.

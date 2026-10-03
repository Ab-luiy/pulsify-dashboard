---
name: project_mvp_first_client
description: "2026-10-02 MVP decision - sell the done-for-you service first, portal is the client's window; dry-run findings on the outreach-to-paid-client chain and the fix list"
metadata:
  node_type: memory
  type: project
  originSessionId: 8cdf0eab-2371-4d57-9a93-643476c0c576
  modified: 2026-10-02T08:54:47.317Z
---

Founder 2026-10-02: wants the product at MVP so he can start reaching out to leads. Decision (he said "your pick"): **sell the done-for-you service (offer v1, wiki/playbooks/pulsify-offer-v1.md) with the portal as the window the client sees the work through**, not the software alone.

**Dry-run findings 2026-10-02 (code + live read-only checks; I cannot sign in as a client):**
- Sign-to-live code exists and is tested (functions/_shared/provisioning.js: DocuSign, confirmed payment, or operator "Provision now"; welcome email via Resend, checklist seeded) but has NEVER run live: client_provisioning has 0 rows; workspaces are 5 archived, 1 demo, 1 prospect.
- Resend domain pulsify-ai.com verified, hello@pulsify-ai.com sender, key set; welcome email never sent live.
- DocuSign is sandbox-only; not blocking, a hand-signed contract plus Provision now works.
- pulsify_wallets has 0 rows: founder has not added crypto wallet addresses under Income, so no payment instructions yet.
- Offer guarantee ("$100k in 90 days or free") is marked under review (offer-v2-risk-reversal); founder must pick before pitching.
- Homepage is still the old bare page (title "Build your 7-figure audience", only an H1); the homepage draft (#38) is saved, not live.
- Day-1 checklist (functions/_shared/checklist.js) ends in a story sequence, not the YouTube video flow, which is now the #1 priority.
- Not built: Sales Co-pilot (pre-call briefs, proposal templates), comment triage. For client one these are by hand.

**How to apply:** fix list order = what blocks a first sale. Ask before building; do the live end-to-end run only with an inbox he names (it sends a real email).

**Update 2026-10-02 (later):** founder said payments are OUT of scope, he logs and updates them by hand (wallet address is no longer a blocker I chase). He asked for an A-Z MVP plan that finds duplicates and checks the drivers, not UI. Plan saved at wiki/synthesis/mvp-plan-2026-10-02.md. Audit facts: Plans/To-dos/Team are hand-fed and empty on provision; client Content has no automatic writer; Copywriter still on Cloudflare Llama with 30/day cap; five+ duplicate LLM callers; delivery-automation already has pre-call briefs, Fathom import, weekly report drafts (my earlier 'not built' was wrong for the operator side).

**State 2026-10-03:** Phase 1 (checklist into YouTube flow, seeded Plans/To-dos/Team, review gate feeds Content) LIVE Pages 04741545. Phase 2 (Copywriter and carousels on the one AI switch, prompt hand-out for the client's own AI, no caps) LIVE. Copywriter redesigned as a chat (plain questions, worked examples, starters) LIVE Pages a34ebb48. Phase 3 cleanup (legacy console and portal removed, ~33k lines) is on branch claude/mvp-phase3-cleanup in Brain and pulsify-saas, NOT merged or deployed, waiting for his go. Live read-only click-through of test client mvp-test-client done, no console errors. Founder rule seen again: prompts to the client's own AI first, own agent later. Open product calls (duplicates) in wiki/synthesis/mvp-qa-2026-10-03.md. Test client still active until he has looked.

**State 2026-10-03 (later):** Phase 3 cleanup LIVE (Pages c5f26e08). Founder then asked: fix the five duplicates, make the Copywriter a real AI chat, connect Gemini as the free route now, output as good as Opus from Pulsify data only, creator names and sources NEVER shown to clients (hard limit), per-client saved chats plus memory plus learning. Built on branch claude/copy-chat-gemini in Brain and pulsify-saas, NOT deployed: one provider switch (ANTHROPIC key -> Opus, else GEMINI_API_KEY -> Gemini, else prompt for the client's own AI) behind every Growth generator; /api/copy-chat (streaming SSE, saved chats, memory, ratings teach by example and rule, migration 0053); copy-brain.js system prompt (method text neutralized by source-scrub.js, hard limits, worked examples in copy-exemplars.js). Duplicates fixed in the same branch. BLOCKER: GEMINI_API_KEY needs the founder's Google sign-in (browser pane is not signed in, Chrome extension not connected, no gcloud): ask for ONE paste only, then `wrangler pages secret put GEMINI_API_KEY`, apply migration 0053 remotely BEFORE deploying, verify with ListModels and pick the best free model. Caveat to tell him: free-tier Gemini may use prompts to improve Google products, so client data goes to a paid-tier key if he cares.

**Decision 2026-10-03: clients bring their OWN AI key (founder: "this is best").** Pulsify pays nothing for client writing; platform Gemini key (free) is only for allow-listed demo/test workspaces (env AI_PLATFORM_CLIENTS), never real client data. Built on branch claude/copy-chat-gemini (Brain + pulsify-saas), not deployed: Integrations "AI writing" card, key sealed per client, resolveAi per request. Founder also asked for Gemini pricing: read from ai.google.dev pricing page (updated 2026-10-01): 3.8 Flash free tier yes, paid $0.75/$3.75 per 1M tokens until 2026-12-31 then $1.50/$7.50; 3.1 Pro Preview paid only $2/$12; 2.5 Pro free yes $1.25/$10. Code defaults still 2.5 Pro then 2.5 Flash: bake off against 3.8 Flash once any key exists. Release order when he says deploy: wrangler d1 migrations apply 0053 remote, set AI_PLATFORM_CLIENTS if a platform Gemini key is added, deploy both repos, verify. Memory index pointer already exists for this project note.

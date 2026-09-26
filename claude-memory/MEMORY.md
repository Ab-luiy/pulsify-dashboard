# Memory index

## Doctrine / how to work

- [Source-based expert review before delivery](feedback_source_based_expert_review.md) - founder-required 2026-09-12: route each relevant draft to documented named-source criteria, revise before output; Jeremy leads funnels, Niksetting/SooWei content/profile; no invented viewpoints for unsupported names

- [Keys and APIs are mine](feedback_keys_and_apis_are_mine.md) - HARD 2026-09-19: never ask the founder to handle keys, secrets or API setup; create, install (wrangler, piped) and connect them myself; engineer around the one block (typing his credential into a field) with OAuth flows and relays
- [Never guess](feedback_never_guess.md) - HARD universal rule: never guess a URL, path, name, value or fact; ask the founder or verify from a real source
- [Codex builds, Claude thinks/specs/reviews](feedback_codex_builds_claude_specs.md) - OVERRIDDEN 2026-09-23: Claude executes code A-Z for now; old split was Claude owns strategy, research, planning, specs, copy judgment, review; Codex owns coding, tests, automations, site builds, deploys
- [Speed is the motto](feedback_speed_is_the_motto.md) - default to the fastest shippable move; don't ask permission when the path is obvious; markdown over apps, ship now refine later
- [TLDR in bold](feedback_tldr_bold.md) - end every structured reply with a bold TLDR of what I need from him or my recommendation
- [Plain speech, no slop](feedback_plain_speech.md) - talk like a person, not a strategy deck; no vault jargon (wound, pillar, register, doctrine, TOF/MOF) in chat, no stacked headers and tables; lead with the point; he spent months asking me what I meant
- [Tone: humble VA, not peer](feedback_tone_humble_va.md) - deliver opinions humbly; he is the operator, I am the executing VA
- [Framework fidelity; evidence before opinion](feedback_flag_gaps_no_heavy_claims.md) - HARD 2026-09-12: apply documented Niksetting/SooWei frameworks and founder rules; no unsupported strategic exceptions or leniency; cite the rule, flag gaps, distinguish source claims from measured data
- [Humanizer copy standard](feedback_humanizer_copy.md) - all copy avoids AI tells: no "not X, it's Y", no em-dash overuse, no bold-first bullets, no rule-of-three padding, no curly quotes or arrow glyphs
- [Claude writes copy](feedback_claude_writes_copy.md) - all client-facing copy is Claude-written in-session; Gemini key is fallback only
- [Fable-grade quality directive](feedback_fable_grade_quality.md) - everything shipped matches Fable 5 quality whatever model executes; seven-gate standard in AGENT_CHAT.md
- [Dashboard quality bar](feedback_dashboard_quality_bar.md) - dashboard/CRM work is million-dollar-grade, beats Airtable; premium, decluttered; slow beats cringe-but-fast
- [Price objection = smokescreen](feedback_price_objection_smokescreen.md) - 2026-07-28 HARD doctrine: price objections are smokescreens, upfront fee non-negotiable; hold vault positions even when he already committed the other way
- [Agent cross-call protocol](project_agent_cross_call_protocol.md) - Claude<->Codex headless cross-calls live; quotas via `python tools/quota.py`, gate session>70% / weekly>85%. NOTE: the vault memory sync once clobbered this index; the topic files survive, rebuild lines from them

## Prospect assets / outreach

- [Value asset = built work](feedback_value_asset_is_built_work.md) - the 6 governing rules for prospect docs: built work not diagnosis, framework not audit, ease in Bader-style then halve it, never open on pain stats they already know, replace broken assets don't reword them, flows like an email. Pipeline: wiki/playbooks/prospect-asset-sop.md
- [Prospect asset SOP + tools](project_prospect_asset_sop.md) - 5-phase pipeline; tools/pull_creator_assets.py pulls YT thumbnails at max res (this step found the best insight in 2 of 3 builds), tools/check_prospect_doc.py enforces voice + the 1500-word ceiling, headless Chrome renders landing-page previews. 3 assets built, ZERO reply data
- [Horizon note (follower reframe)](feedback_horizon_note_follower_reframe.md) - 2026-08-02: every prospect asset closes naming that the 500-5k follower count is NOT the constraint, the foundation is, compounding takes time; no timeline promise, no pitch, no strings. Five doc-standard upgrades proposed but unratified
- [Asset library + suggestion register](feedback_asset_library_and_suggestion_register.md) - log EVERY prospect asset into wiki/playbooks/prospect-asset-library.md and propose from that menu; docs are suggestions ("you could") never instructions; diagnose which PILLAR is broken first (content -> offer -> funnel)
- [Prospect asset folders](project_prospect_asset_folders.md) - assets live on the Desktop at "Desktop\Prospect Assets\{ig-handle}\", NOT the vault; script + docx + pdf + page pngs together; docx installs to scratchpad with NODE_PATH; folder is outside the autosync backup
- [Inbound vs outbound footing](feedback_inbound_outbound_footing.md) - inbound = they sought you, so qualify and gate on price; outbound = we interrupted, no footing, sell only the appointment and never the price. "high 4 figure investment" line is a no-go right now
- [Cold DM formula](feedback_cold_dm_formula.md) - the locked casual-peer gift-first DM (opener, one specific reference, soft gap, the gift, ownership + soft CTA); lowercase, 30-45 words; wiki/content-engine/cold-dm-formula.md
- [Batch outreach workflow](project_batch_outreach_workflow.md) - he vets and picks leads himself, then pastes a batch block (LEAD/BRIEF/PROBLEM/ASSET) and I generate all assets in one pass
- [Outreach extraction workflow](project_outreach_extraction_workflow.md) - cheap LLM compresses transcripts into a quote-rich CREATOR BRIEF (verbatim quotes mandatory), I ask which asset then build it; prompt is live on the dashboard as `buildAnalyzePrompt()`
- [Outreach data: light, actionable-only](feedback_outreach_crm.md) - fast scrape not heavy per-thread; strip peers, noise and clients
- [Outreach pipeline executed](project_outreach_pipeline_execution.md) - provisioning flow, Lead Studio bridge, /campaigns, portal tab backends, failure logging all LIVE; deploy gotcha = always --branch main

## Content doctrine

- [Niche content = the craft](feedback_content_targets_b2c_coaches.md) - niche content is the money-making craft itself (trading setups, winning products); NEVER meta-content about content or funnels, never operator/B2B language; figures illustrative except Nick
- [Lead queries = immersed PAIN](feedback_lead_queries_common_terms.md) - scrape queries lead with practitioner pain in real title language (revenge trading, ads not converting); never money-curious beginner terms or offer jargon
- [YT lead criteria](project_yt_lead_criteria.md) - ICP is CREATORS who DO the craft with a reputation, not coaches; OUT = operators, SMMA, closers, setters, content coaches; Western/English only; must run inject_yt_leads.py after scraping
- [VSL distinction](feedback_vsl_distinction.md) - founder funnel is not the client Funnel Stack; VSL removed only from his personal funnel, still installed for clients
- [IG profile aesthetic is parked](feedback_ig_profile_parked.md) - don't propose bio, highlight, grid or photo overhauls; active IG work is content and growth
- [Funnel hacks intent](project_funnel_hacks_intent.md) - wiki/funnel-hacks/ captures are for YouTube content, not blueprints; first creator Iman Gadzhi
- [Short-form IG project](project_shortform_ig.md) - next big build, short-form growth plus cold-to-buyer fully automated; NOT started, client acquisition comes first
- [Instagram project](project_instagram_project.md) - handoff at wiki/synthesis/instagram-project-fable-handoff.md (read first). Done: 34 extractions, 9 pillars, 2 skills. Live: dashboard P1-P3. Decided, don't relitigate: 7 dials, proof currency = student results never lifestyle. Left: validation loop on his own IG
- [Supabase = push channel only; Zernio = IG inbox](project_supabase_realtime.md) - 2026-09-19: no migration, Realtime broadcast with the publishable key only, opaque payloads; Zernio replaced Composio for DMs (read receipts, history merge); gotchas inside
- [IG DM bridge (Composio)](project_ig_dm_bridge.md) - the whole IG inbox is pullable read-only via Composio, no browser; `npx tsx dm-audit.ts` in the ig-report worktree; watch the two id/fields gotchas
- [IG follow-up sequence](project_ig_followup_sequence.md) - permission-asking follow-ups get 0 replies, one-word questions get answered; also kills two wrong vault claims (the "42% July rate" and the "validated" cold-dm formula)
- [Instagram parity priority](project_instagram_parity_priority.md) - IG lead scraping parked (anti-bot), he sources IG manually; YouTube is the active lead engine

## Clients / deals

- [FITFO / Carlos DEAD](project_fitfo_carlos_deal.md) - ghosted on the contract, never signed, NOT a client and never usable as social proof
- [Nick / @niicksfx is THE case study](project_nick_case_study.md) - $10-20k to $50k/mo with a confirmed video testimonial, plus the YouTube packaging before/after (53 -> 446 views) pulled off his live channel; the founder's recalled numbers don't match, always use the real ones
- [Frank was only a test lead](project_frank_creator_profile.md) - 2026-09-25: not a client or test figure, removed from pages/DB/code; never use him as a sample again; his student result is his proof, not ours; old sites deleted; removed-page 7-day cache gotcha inside
- [Onboarding form (Typeform)](project_onboarding_form.md) - post-close buyer-psychology questionnaire (why-buy / almost-didn't / which video converted); TRIGGER = he names a signed client and I run the full onboarding; INCOMPLETE
- [Standard onboarding form (#16)](project_standard_onboarding_form.md) - LIVE 2026-09-25: ONE standard form at /app/portal/onboarding writes straight into the brain; legacy /onboard redirects; Finish = proof.has_proof from the client; never send the full proof_items list from the form

## Funnels / landing pages / portal

- [Phase 0 accounts DONE + Phase 1 RELEASED 2026-09-17](project_phase0_accounts_done.md) - accounts in wiki/playbooks/account-registry.md; Phase 1 (Access login, one shell, launcher) live and Claude-verified; Phases 2 and 3 LIVE 2026-09-19 (revenue matching, webhooks, Push API, new login + brand); next is Phase 4 onboarding per wiki/synthesis/phase4-client-onboarding-codex-brief.md

- [Landing-page standard LOCKED](project_landing_page_standard.md) - the canonical template (templates/canonical + variant-02) is THE design for every landing page, fill-in only (brief -> 28 tokens -> /admin or /settings), never redesign; wiki/playbooks/landing-page-fill-in-playbook.md
- [Landing mock source rule](feedback_landing_mock_source.md) - landing pages and the whole standard are Codex-owned; Claude does not build or touch them
- [Funnel->portal pipeline](project_funnel_portal_pipeline.md) - landing page (Wistia VSL + Typeform) -> Cloudflare pipe (output/portal-pipe/) -> client dashboard + Kit email; scaffolded, NOT deployed; blockers are user-side accounts
- [OG previews + path URLs](project_og_preview_path_urls.md) - /{lead-slug} URLs and link-paste preview cards LIVE on pulsify-funnels; Frank's link removed 2026-09-25
- [Funnel view-tracking](project_funnel_view_tracking.md) - per-prospect watch drill-down (/admin -> View activity), off-page asset tracking via /a/{token} redirect links, IP/geo on events; live on pulsify-funnels
- [Operator console + wizard](project_operator_console.md) - /admin unifies all 4 admin pages plus the 8-step add-client wizard, both live
- [Admin key access](project_admin_key_access.md) - ROTATED 2026-09-17: key lives in gitignored .env as FUNNELS_ADMIN_KEY (vault root + dashboard checkouts) and in Cloudflare; read it from the file, never print it, never ask him; /api/crm-sync currently 401s any admin key until Codex redeploys/fixes
- [Growth = service delivery, TOP priority](project_growth_service_delivery.md) - 2026-09-25: client portal Growth is the fulfillment; self-learning AI on our data (no own model, no 30/day cap), review gate on; 2026-09-26 REELS OUT, #1 = creating a full YouTube video, then story sequences, carousels last; structure undecided; plan in wiki/synthesis/growth-section-plan-2026-09-25.md
- [Client integrations PARKED](project_client_integrations_parked.md) - 2026-09-24: client sign-in integrations (#15) wait until the first client signs AND pays; then Zernio per-client for IG/YouTube (~$12/mo per client), own OAuth for Kit/Calendly/Stripe
- [Integrations hub I1 live](project_integrations_hub_i1.md) - /integrations UI, D1 integrations/payments, Mark-paid onboarding trigger, webhooks, Discord alerts, all live; RULE: non-null getters delete !cfg gates; user-side = Kit key + Discord webhook
- [Two-portal reskin](project_portal_reskin.md) - live operator design is MIRAGE; client client.html Atelier design finished but never deployed
- [Flagship QA (Fable pass)](project_flagship_qa_2026_07_02.md) - wiki/synthesis/flagship-qa-2026-07-02.md; open: bare domain renders Frank, settings POST wipes absent fields; 7 standing rules incl. Kit-requires-webhook-secret
- [Domain pulsify-ai.com BOUGHT + attached](project_domain_purchase_pending.md) - 2026-09-17 on Cloudflare Registrar, custom domain on pulsify-funnels Pages; zone stays Free, Workers Paid skipped (cron+D1 not Queues)
- [Fable handoff brief](project_fable_handoff.md) - wiki/synthesis/fable-handoff-2026-07-04.md; core rule = new builds gate on "does this start a conversation this week"

## Dashboard / CRM / leads

- [Ticket board](project_ticket_board.md) - 2026-09-24: all SaaS work is GitHub Issues on Ab-luiy/pulsify-saas (#2-#21), owner labels, one ticket at a time; check `gh issue list` first
- [Next.js migration](project_nextjs_migration.md) - 2026-09-23: move the live SaaS to React + Next.js + TS gradually, Claude builds; baseline sizes and verified pricing inside

- [Lead Studio (CRM)](project_lead_studio.md) - enlarge a lead -> editable info plus asset gen plus Creator-profile flow plus per-lead asset history; /generate prefers Gemini, manual Copy-prompt fallback always free; asset-type expansion PARKED
- [CRM cross-browser sync](project_crm_cross_browser_sync.md) - lead edits sync via pulsify-funnels D1 /api/crm-sync (per-lead _ts merge); agents use tools/crm_sync.py with FUNNELS_ADMIN_KEY; he must paste ADMIN_KEY once per browser
- [CRM lead-loss fix](project_crm_lead_loss_fix.md) - a YT scrape once dropped 250/320 leads in overwrite mode; recovered to 489 and inject_yt_leads.py is now MERGE-by-default
- [SDR P0+P1 shipped](project_sdr_p0p1_shipped.md) - real-subs tiers (A13/B120/C355), yt_leads.json canonical (489), /generate and /transcript token-gated, pain queries active; RULE: denylists tag, never delete
- [Transcript auto-ingest](project_transcript_ingest.md) - Lead Studio pulls real YouTube transcripts via functions/transcript.js plus Supadata; NEEDS SUPADATA_API_KEY in Cloudflare; free caption scrape is blocked, don't retry
- [Typeform generator parked](project_typeform_parked.md) - application-form generator shipped but parked; don't refine unprompted
- [IG/X scorer prototype](project_ig_scorer_prototype.md) - live social_lead_scoring.py is inverted (ranks gurus A, drops doers); v2 proto fixes it to 0/13 but is not wired in; verify via tools/audit_social_scoring.py
- [IG free-scrape blocked](project_ig_free_scrape_blocked.md) - instaloader logs in but IG 403/429s data endpoints even authed; confirmed not an IP issue, don't retry; use Apify
- [Composio IG bridge](project_composio_ig_bridge.md) - IG connected via Composio; ig-report/ pull tool plus dashboard Instagram tab
- [Lead-scraper SaaS idea (parked)](project_lead_scraper_saas_idea.md) - productize the scraper plus ICP scorer; prototype works; parked 2026-06-21
- [HTA Dashboard is the client CRM pillar](project_hta_dashboard.md) - dashboard-v3.html is the proof for a client-facing CRM product; clients must see their gaps
- [Dashboard product vision](project_dashboard_product_vision.md) - the dashboard is a productized $10K system sold to coaches; must be prescriptive (Action Engine: what's broken plus the fix)
- [Dashboard v2 spec](project_dashboard_v2_spec.md) - operator-dashboard roadmap: visual fixes, Whop-style sales and payments, payout calc, backend phase; full list in the file
- [Dashboard v3 backlog](project_dashboard_v3_backlog.md) - live-review round, long pending list (calendar, revenue granularity, payouts pie, theme audit); CONSTRAINT: don't reword business terms
- [Dashboard verification workflow](project_dashboard_verification.md) - preview_screenshot times out on CRM DOM; verify via preview_eval assertions
- [Canonical dashboard worktree](project_canonical_dashboard_worktree.md) - source of truth is origin/main of pulsify-dashboard; the awesome-bassi worktree is 20+ commits behind, never push it
- [Deploy pipeline](project_deploy_pipeline.md) - live site is Cloudflare Pages from origin/main; prod gets data-only auto-commits, so deploy by basing a commit on origin/main and fast-forwarding; swap-back backup is index-classic.html

## Infra / personal

- [Founder emails (3 near-identical Gmails)](user_founder_emails.md) - abod.louai = Cloudflare, abood.louai = Meta, abod.steam = IG contact; canonical table in wiki/playbooks/account-registry.md

- [Brain online backup](project_brain_online_backup.md) - the whole brain syncs both ways with private repo Ab-luiy/pulsify-brain: SessionStart pulls, Stop pushes, hourly task; new device = clone plus ./setup-autosync.ps1 plus recreate .env; see RESTORE.md
- [Cloudflare MCP + skills](project_cloudflare_mcp_setup.md) - LIVE 2026-08-13: 13 skills plus all 5 MCP servers connected; api/builds/observability are read-only, bindings has full access (D1 writes - treat as dangerous); OAuth needs a TTY so only he can run `claude mcp login`
- [Health tracker workflow](project_health_tracker.md) - Health tab logs calories and macros; he dictates meals or sends photos and I log via Chrome automation; cut 110 to 80kg, 1800 kcal, OMAD

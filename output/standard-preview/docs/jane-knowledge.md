# Jane's knowledge and conversation (#86, #87)

Jane uses the authenticated client's saved business context, the current chat and relevant passages from a versioned Pulsify service collection. This is runtime retrieval from a compiled collection; a deployed Worker cannot read the Brain checkout's filesystem.

## Sources and refresh

The allowlist and section policy live in `tools/build-copy-knowledge.mjs`. It covers 15 existing service guides: mechanism, offer creation, profile funnel, pre-call preparation, content pillars, voice, proof, funnel stages, micro-niche YouTube, packaging, thumbnails, stories, reels, messaging and carousels. The generated collection contains 62 passages, version `734eeaf95f6080d6`.

Each source has a stable ID and content hash. Internal source paths, attributed cases, other clients, commercial terms, emails and source URLs are excluded. This collection carries methods, not verified results or client proof. The existing source-scrubbing boundary is preserved. No operator inbox or cross-client search is used.

Run `node tools/build-copy-knowledge.mjs` after updating a listed source or the collection policy. `node tools/build-copy-knowledge.mjs --check` runs in the backend test suite and fails if generated knowledge is stale. Unlisted files do not become client-visible automatically.

Retrieval ranks the question against passage titles, tags and text, with aliases for ordinary wording such as people not turning up to calls. It includes up to ten passages / 12,000 characters with per-source diversity. Short follow-ups also use the preceding topic. This is lexical retrieval, not semantic embeddings or an autonomous web browser.

## Client boundary and coverage

`resolveClientAccess` chooses the client, never a request-body client ID. Every Brain, proof, chat, memory and feedback query remains scoped to that resolved client (shared method rules are the intentional exception). A chat ID is only a lookup within that client.

`buildJaneBrainContext` considers every saved section, including future section keys. It gives each nonempty field a place before allocating remaining space by relevance, within a 32,000-character budget. Long fields retain relevant later passages rather than only their beginning. There is no second hidden 16,000-character cut. Coverage counters distinguish available, used, excerpted, omitted and privately excluded fields.

Money and commitment contain private financial/deal information and the creator's own capacity. They can inform an authenticated private discussion, but remain excluded from requested public-draft inputs. Creator capacity is not a student's time requirement. This preserves the onboarding privacy purpose while allowing Jane to discuss the creator's planning constraints. Earlier messages remain reference data, so no model output should be treated as a privacy guarantee.

Denied proof is excluded from both proof stores. Granted proof and permission-unknown claims retain their permission meaning. An unavailable Brain read returns a retryable 503 before creating a chat or saving the user message, allowing the existing screen to restore the draft. A genuinely empty Brain is labelled empty. Memory failures cannot silently masquerade as complete context.

## Conversation

Jane can discuss, diagnose, brainstorm, answer questions and revise only the requested part. A selected format does not override the latest request. Explicit requests can change format in the same chat. Length defaults apply to requested drafts and yield to the requested length. Current corrections take priority over older preferences.

Recent turns remain intact within 24,000 characters. Relevant earlier user messages are recovered as verbatim excerpts, with omissions labelled. Old assistant guesses are not summarized into new client facts. This is bounded continuity, not unlimited memory of every past chat.

The existing humanizer and source scrubber run on replies. Plain-text formatting is normalized across stream boundaries so markdown markers do not appear literally in the current chat screen. Normal conversation streams at line/paragraph boundaries.

Fictional legacy scenario examples are no longer injected into Jane: the real evaluation showed the writer borrowing an example's assumed video-viewing history. Liked drafts from this client remain style references, with an explicit rule that they are not a source of business facts.

Requested drafts on the native Cloudflare writer get a second, bounded grounding pass before being sent or saved. The writer remains the existing resolved provider/model. When it is Workers AI, this check uses Cloudflare-hosted `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; connected-provider clients keep their existing generation path with the improved context and conversation, without new helper calls to their provider. No OpenAI or Anthropic API is introduced. The check compares only the client's facts and explicit user messages, not shared example claims or old assistant guesses. It requires a nonempty JSON reply; a failure exposes no unchecked draft. It is a model check, not a factual guarantee. Finished drafts take longer than discussion, which continues to stream normally. The existing platform daily allowance is taken once before persisting the request; check and memory calls do not count as additional user generations.

## Verification and release

The draft check also applies targeted deterministic guards for unsupported written feedback/annotations, video feedback, capacity/cohort claims and extra follow-up promises found during the bake-off. One corrective retry is allowed; if these gaps remain, no draft is sent or saved. These guards do not verify every possible claim. Review authentic output before publishing, especially factual or offer claims. The check's additional latency and model usage are real tradeoffs, not an unlimited-quality or unlimited-usage promise.

The changed legacy endpoint stays at `/api/copy-chat`; no migration, route rename, frontend payload change or provider credential is required. Optional grounding counters in stream metadata are compatible with the current loose frontend schema. The new UI in #82 is separate.

Tests cover actual model payloads on the Workers AI path, all onboarding sections, cross-client isolation, denied proof, long fields, older turns, changing formats, a failed Brain read and plain-text streaming. The collection check uses the actual vault sources rather than a copied fixture.

`tools/eval-jane.mjs` runs bounded synthetic scenarios through Cloudflare only. It never reads or writes a client's chats. Existing Wrangler authentication stays in memory. Six scenarios cover saved facts, discussion, a long email, a hook-only edit, fabricated proof and an old decision. Machine checks are probes; full answers must also be read. In particular, an answer can pass keyword checks while inventing a plausible service detail. Keep failed runs and describe observed limitations; do not turn a passing probe into a claim of perfect grounding.

The primary Brain checkout is diverged from remote main. #86 is integrated separately from fresh `brain/main` (`3ddd3a51`), preserving the latest onboarding sections, helper-call accounting, and app export `e323437`. Never deploy the stale primary export or merge its unrelated checkpoint history as part of this fix.

Evaluation output is stored at `tests/fixtures/jane-evaluation.json`, under the middleware-blocked tests prefix. The Pages preview served a JSON file under docs despite `.assetsignore`, so this report must never be placed there. Public preview and production probes must verify the old docs path and test-fixture path return 404.

## On-demand reading (#87)

Native Cloudflare Jane now chooses read-only tools before writing the next answer. A schema-constrained lookup planner uses Cloudflare-hosted Llama 3.3 70B; the final writer remains the resolved provider/model. The planner gets recent turns and selected existing context, can inspect returned results, then choose a second lookup round. This is a real server-side loop, not an instruction claiming access the model does not have.

Available tools:

- Search and read the approved 15-guide collection. This does not expose the vault filesystem or arbitrary documents.
- Search and read saved business fields, including relevant excerpts from long fields. Public-draft private-section exclusions and proof-permission filtering apply to these tools too.
- Search earlier user messages across this client's saved Jane chats, returning dated quotes. Assistant guesses never become history facts.
- Search and open this client's saved Jane replies, story sequences and carousels. Only writing content is returned: no stored prompts, parameters, operator review notes or credentials. Draft claims are not accepted as business evidence by the grounding checker.

Every SQL query binds the authenticated client and all search values. The model cannot select a client, table, SQL statement, URL or filesystem path. Reads in the loop require IDs actually returned by a preceding search. At most two planning rounds, three calls per round, six total attempts and 18,000 characters of extra results are allowed; each individual result is capped at 6,500 characters. Searches inspect a bounded set of matching rows and can miss old or poorly named material. There is no embedding service, browsing, arbitrary upload reader, automatic draft mutation or publishing tool. Proposed revisions are returned in chat.

The native loop sends optional `lookup` SSE events and includes `agent_version: tools-v1` plus lookup counts/status in metadata. The existing frontend safely ignores unknown events and keeps its current payload contract. Connected-provider and manual clients retain their existing paths without new external-provider helper calls. No frontend release or database migration is required.

A failed lookup is labelled as unavailable and Jane may proceed from the material already supplied, without claiming to have read missing records. A detected daily Cloudflare allocation limit stops the turn with an explicit reset-time message instead of another model request and a generic failure. The saved user message and own-AI fallback remain available. The platform daily allowance is still charged once per user request; helper inference still consumes actual Cloudflare neurons. The extra lookup rounds add latency and reduce the number of turns the shared free allocation can support.

Native memory extraction now accepts only complete, exact candidate sentences from the current user's explicit enduring preferences or business facts. It excludes questions, drafting requests and hypothetical text. Explicit corrections may retire directly related older notes, with IDs checked against this client's existing notes and lexical topic overlap required. Current corrections and newest notes take precedence. No assistant reply is supplied as memory evidence. The existing 30-note cap and explicit remember/delete controls remain; this is bounded, selective memory, not guaranteed recall of every detail.

Ordinary discussions are prompted to stay focused and ask one actual question. Retrieval distinguishes lack of bookings from no-shows: pre-call methods no longer load merely because a question mentions a call. Explicit pre-call, attendance, confirmation and nurture requests retain those methods.

## #87 evaluation and limits

`node --test --test-reporter=spec tests/*.test.mjs` exercises actual SQLite tool queries, client isolation, denied proof, excluded fields, multi-round reads, ID validation, invalid plans, bounded results, native correction memory and the real chat handler. The new shared agent module is TypeScript and passes a targeted TypeScript check; the existing endpoint remains on its current JS migration path. No shared provider file is changed.

`node tools/eval-jane-agent.mjs --out ABSOLUTE_REPORT_PATH` uses synthetic local SQLite data and the real Cloudflare inference service, without touching live client content. Earlier runs recovered CEDAR from another saved chat, opened a real saved story and revised its opening, and answered a discussion with one question. Full outputs were read: broad advice, invented process details, length drift and unnecessary lookups remained in some outputs despite passing simple keyword probes. Those observations led to narrower retrieval and stricter complete-sentence memory validation. These final refinements pass deterministic tests; the attempted final real-model rerun was blocked by the shared daily free allocation.

Llama 3.3 70B was also compared with the existing writer on one longer discussion; it followed the approximate length better but gave more generic advice. This is insufficient evidence to replace the writer. A GLM 4.7 Flash comparison could not finish because the allocation ran out. No paid plan, key or provider change was made. The real-model evidence is a small synthetic sample, not a quality guarantee. Preserve failures and review factual claims before publication.

Synthetic run outputs and review notes are stored in `tests/fixtures/jane-agent-evaluation.json`, never under public docs. Verify that both this fixture path and the new TypeScript/tool source paths return 404 on preview and production. Official implementation references: [Cloudflare JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) and [free-plan model access](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/).

## #88: context-v2, released with AI validation pending

This section supersedes the #87 capability limits where stated. The founder explicitly authorized deployment with the disclosed AI-allocation/CI restrictions; production now runs context-v2. Semantic indexing and fresh reply-quality verification remain pending. No model, provider, paid plan or frontend change is included.

- **Knowledge updates:** 17 explicitly selected guides, 65 passages, version `2b691b1794ff73f4`. Added the repurposing translation/reframe sections and intake source checklist. The GitHub workflow rebuilds this approved collection when wiki sources change on main; pull requests must include a current generated collection. It does not crawl the whole vault, include client files globally, index vectors or deploy. New collection versions become live only through the normal release.
- **Hybrid retrieval:** weighted rare-term matching plus reciprocal-rank fusion with BGE-base semantic matches from the existing Vectorize binding. Shared vectors live in a collection-version namespace. Returned IDs, namespace and version must all match; text is rehydrated from the current compiled source, never vector metadata. Pre-call intent filtering applies after fusion too. An unavailable embedding, missing index, stale match or timeout falls back to keyword retrieval with explicit status. This does not make client documents or history semantic: those remain bounded keyword searches.
- **Working brief:** rebuilt on each request from current saved business/audience, offer/delivery and voice/constraints, dated saved preferences, current request and recent explicit user decisions. Assistant guesses are excluded. Current corrections have priority, and conflicts must be acknowledged. Underlying records remain the durable source; this adds no generated-fact memory or automatic edits to business fields. The existing 30-note cap remains.
- **Approved examples:** relevance-ranked examples from the client's latest 30 thumbs-up replies, with the original request and optional reason they approved it. Reasons are stored separately, not as business facts. Unrating removes the reason; deleting a chat removes its reasons. At most two examples are passed to the writer, explicitly labelled style-only. Explicitly saved `approved-example` documents are also style-only and excluded from the factual checker.
- **Client documents:** authenticated save/list/delete actions and agent search/read tools for supplied text, transcripts and approved writing examples. Stable keys make repeat imports update existing documents. Source, timestamp and explicit public-use permission travel with the text. Private documents are excluded from public-draft retrieval. No PDF/audio parsing, filesystem crawling, URL fetching, cross-client learning or new upload UI is claimed. No actual client documents were imported during development.
- **Efficiency:** greetings and self-contained edits skip planning and embeddings; ordinary requests already supplied with current context skip the planner. Explicit earlier-chat, saved-material and search requests retain the bounded tool loop. Shared lexical statistics are compiled once per isolate. No client replies or private context are cached across clients. Allowance checks run before embeddings/planning. Public draft review is retained.

### Client document contract

All actions use the existing authenticated `POST /api/copy-chat`. The session selects the client; a body `client_id` cannot override it. `knowledge-save` requires `key` (1–80 lowercase letters/digits/underscore/hyphen), `title` (up to 160 characters), `source` (up to 300), `kind` (`reference`, `transcript`, `approved-example`), explicit boolean `public_use`, and `content` (10–50,000 characters). The encoded request must fit 65,000 characters. Each workspace is capped at 100 documents. `knowledge-list` returns metadata without content; `knowledge-delete` takes the stable key. A document remains user-supplied reference, not verified proof.

`tools/sync-jane-documents.mjs --manifest ABSOLUTE_JSON_PATH` validates the explicit file list and previews import sizes. Add `--apply` to save using the intended client's existing `JANE_SESSION_TOKEN`. Manifest shape:

```json
{"origin":"https://pulsify-ai.com","documents":[{"key":"launch-decisions","title":"Launch decisions","source":"Client-approved call notes","kind":"transcript","public_use":false,"file":"C:/approved/launch-notes.txt"}]}
```

This is a repeatable import, not an unattended file watcher. Each file update replaces that key; missing files do not delete stored documents. Run again after source changes. Partial failures stop the import and can be safely retried with the same keys. Document search ranks in D1 before loading at most eight candidates; it returns at most three 1,400-character excerpts. A read tool can retrieve a focused 5,000-character excerpt after search returns the key. Truncation and unavailable lookups are explicit.

### Quality evaluation and release gates

`tools/jane-quality-cases.mjs` has eight synthetic tasks based on the founder's reported problems: discussion, useful depth, partial revision, earlier decisions, current corrections, unavailable proof, flexible edits and access honesty. These are criteria, not invented human-approved answers. The checks catch length drift, wrong-bottleneck advice, known fabricated offers/results, missing actual lookups and question-count errors. Passing those checks always leaves `human_review: pending`; usefulness, naturalness and broad factual quality still need the full reply reviewed.

Run one real case at a time to protect quota:

```powershell
node tools/eval-jane-agent.mjs --quality --case conversation --out C:/QA/jane-conversation.json
node tools/eval-jane-quality.mjs --report C:/QA/previous-report.json --out C:/QA/regraded-report.json
```

Regrading the earlier #87 real report correctly flagged both the discussion and the overlong strategy that its old checks passed. Final local verification: 369/369 backend tests, targeted TypeScript check and Functions compilation. SQLite tests cover authenticated document isolation/update/delete, private-use filtering, attributed briefs, approval reasons, stale/cross-namespace vector rejection, quota-before-helpers and a greeting with exactly one writer call.

Live semantic indexing and fresh writing evaluation remain **blocked**. On October 26 at 10:27 UTC, Wrangler authentication was refreshed successfully, then Cloudflare again returned HTTP 429 with `daily free allocation of 10,000 neurons` for the first embedding batch. No new vectors, live documents, live conversations or migration were written, and no paid plan was enabled. Do not present semantic indexing or current model quality as verified.

Before release: (1) run the knowledge drift check and `node tools/sync-jane-search.mjs --apply`; verify current-namespace semantic queries, (2) run the eight quality cases and inspect complete outputs, (3) apply additive migration `0083_jane_documents.sql` after checking current main and D1 schema, (4) preview from the `output/standard-preview` working directory with Functions, verify authenticated metadata and 404s for tools/tests/migrations/source, (5) merge, push and deploy only clean main. Leave the existing app export unchanged. The vector sync uses existing Wrangler authentication and the existing 768-dimension `pulsify-search` index; old namespaces cannot be consumed by the new code. Rollback uses the previous Pages deployment; the additive tables can remain without changing #87.

References: [Vectorize namespaces and client API](https://developers.cloudflare.com/vectorize/reference/client-api/), [BGE model catalogue](https://developers.cloudflare.com/workers-ai/models/).

GitHub CI status (October 26): the knowledge job did not start because GitHub reported failed account payments or a spending-limit restriction. Local checks above passed; hosted CI and automatic source refresh are configured but cannot run under this account restriction. No billing setting was changed.


### October 26 production release

Founder said "do it" after the deployment path and exhausted inference quota were explained. Applied the two additive tables in migration 0083 after confirming neither existed. Preview `99cb2c51-4c27-4977-a389-d2137357bd7e` passed 16 checks. Merged PR #3, checked out clean pushed main `ab88a9a8`, confirmed identical backend to the preview, and deployed Pages production `5002fbb7-1691-4156-9d60-79189d51c7bf`. App export remains e323437; provider files are unchanged.

At 10:44 UTC production passed the same 16 checks: homepage 200, anonymous chat 401, internal source/tool/test/migration paths 404, authenticated context-v2 / knowledge 2b691b1794ff73f4, and disposable demo-only document create/update/delete. Demo chats (3) and memory notes (11) stayed unchanged. The synthetic document was removed in a finally block; both new tables had zero rows afterward. Audit sessions logged out. Evidence is outside the repo at C:/Users/Abdullah/Desktop/pulsify-saas-wt/jane-context-{preview-check,production-check,deployments-final}.json.

The first indexing batch was retried once for release and still returned Cloudflare 429. No semantic vectors were written and no successful fresh inference is claimed. Keyword retrieval is available; generation itself remains subject to the shared exhausted allocation. Hosted CI/automatic source refresh still cannot run under the GitHub account billing restriction. #88 stays open for indexing and real output evaluation; deployment alone does not complete those tasks. Rollback target is prior production 0c25d852-b9b2-4db8-a28c-8103b474bd31; leave the additive tables in place.


## #89 Gemini and usage panel (live 2026-10-26)

Jane-only adapter `functions/_shared/jane-provider.js` selects platform Gemini when all three server settings exist: `JANE_GEMINI_API_KEY` (secret), `JANE_GEMINI_MODEL` (exact model ID verified available on the project), `JANE_GEMINI_FREE_VERIFIED=true`. Set the verification flag only after AI Studio confirms the project is on the Free tier with no billing enabled and the selected model supports free usage. This is an operator attestation, not an API billing check. No paid fallback, automatic model fallback or quota retries. Existing client-owned AI connections retain priority. Other generators retain the shared provider resolver.

Live since 2026-10-26 (Pages production 4ec0778c): the key belongs to the AI Studio "Default Gemini Project" on the Free tier with billing off, stored as Cloudflare Pages production secrets (preview deployments have none and fall back to Workers AI). Free limits are per project and per model: gemini-3.8-flash allows only 20 requests a day, gemini-3.5-flash-lite and gemini-3.1-flash-lite 500 a day each. Google free-tier data may be used to improve its products (https://ai.google.dev/gemini-api/docs/pricing).

Gemini writer, structured planner, bounded review and explicit correction memory use the same configured model. Model metadata supplies input capacity. Streaming usageMetadata is cumulative per call: keep the last event, never sum chunks. Hidden thought text is excluded; thought token counts can be shown. Truncated/blocked/unfinished streams fail instead of saving a completed reply. Helpers remain bounded by the existing agent loop. Shared semantic embeddings still use Cloudflare and are not provisioned by this change; initial Gemini retrieval is keyword.

GET and SSE meta/stats expose only model identifiers, token counters, context coverage, app allowance and reset time. The expandable UI shows the latest reply in the current tab, not historical persisted usage. Memory calls after the reply are excluded and labelled. Missing usage and provider-wide quota are null, never fabricated zero/remaining percentages. App allowance resets UTC; Gemini daily project quota resets Pacific midnight. Quota varies by model/project (https://ai.google.dev/gemini-api/docs/rate-limits).

## #92 Free model fallback, model menu and learning queue

Model order: `JANE_GEMINI_MODEL` first, then the comma list `JANE_GEMINI_FALLBACK_MODELS` (production: gemini-3.1-flash-lite, gemini-3.8-flash). A model that answers 429 (limit) or 500/503 (busy), or does not answer, is skipped and tried last for 10 minutes (limit) or 1 minute (busy) in that isolate. Other errors stop. A reply never switches model after its first word. The client can pick Auto or one model in the composer menu (send `model`); an unknown value means Auto, and a picked model still falls back. Stats add `selected`, `models` (id, label, description) and `fallbacks` (model, stage, reason); every call records its model. All models stay on the one Free-tier project: Google's API terms forbid getting around limits with extra projects or keys.

Learning queue (`functions/_shared/jane-learnings.js`, table `jane_learnings`, migration 0084): after a direct or lookup reply, one background structured call (run beside memory extraction, 27 s cap) proposes up to 3 items: angle, objection, method_gap (shared, anonymised: names, emails, links, handles and figures removed) or client_fact (that client only). Objections and client facts must quote the client's own message; facts already in the Brain or memory and near-duplicates are skipped; at most 40 pending per client. Nothing is used while pending. Operators review at `/jane-learnings` (API `/api/jane-learnings`, operator only): approve (optionally edited; shared text is anonymised again) or reject. Approved shared lessons are matched by keyword to each request and added as "TEAM-APPROVED NOTES" (up to 4, counted as `learnings_used`); approved client facts are added to that client's memory. Rejecting an approved lesson removes it from prompts.

## Workspace lookups, wider frameworks, always-on planning (2026-10-26)

Founder: Jane should scan our frameworks, the client's information and everything in the backend, take any input, and connect the dots.

- New read-only tool `read_workspace` (functions/_shared/jane-workspace.ts) with fixed areas: `videos` (videoCashReport: views, vs channel normal, TOF/MOF/BOF stage, clicks, applications, calls, buyers, cash), `leads` (loadPipeline: counts by stage and heat, the eight hottest with source and next step), `calls` (loadCalls: 30-day show and close rates, upcoming, plus the last 20 outcomes with objections and notes), `plan` (content-plan preference), `projects` (workspace_records), `instagram` (sequence_log with completion), `proof` (proof_items with public permission). Authenticated client only; emails, phones and links never leave the module; a public draft drops money, names and proof not cleared for public use. The area id needs no prior search. Workspace results are added to the facts the public-draft check accepts.
- `janeRoute` now sends every message except greetings and simple edits through the lookup planner, which returns no calls when the supplied context is enough. One more model call per message.
- Knowledge: six more sources (vsl-framework, call-funnel-framework, bio-optimization-system, instagram-conversion-assets, webinar-framework, content-operating-rhythm): 23 sources, 83 passages. Paragraphs naming a source creator (Jeremy, Hormozi, Kobey, Cardinal, Grant Garcia, Jonas, Rorwick, Lapotko) are dropped at build time; this also removed one existing "Jeremy's exact words" passage that had been reaching clients.
- Real check (local copy of the demo workspace, real /api/copy-chat code, real gemini-3.5-flash-lite): greeting, best-earning videos, why leads do not book plus objections, this week's plan, a 6-slide story sequence (public-draft check passed), an open-ended "where do I start", and an off-topic naming question. Every reply used the demo's actual numbers or drafts; 12-39 s per reply on the free tier. The per-client daily allowance (AI_DAILY_CAP, default 8) stopped the run after five messages, as designed.
- The Gemini path uses keyword retrieval, so the new passages are live without re-indexing. The Workers AI semantic index (tools/sync-jane-search.mjs) was not re-synced.

## Jane's own daily allowance: 30 messages (2026-10-27)

- Founder 2026-10-27: 30 Jane messages a day per client. Jane on the free Gemini key now draws from her own `jane` usage counter (`JANE_DAILY_CAP`, default 30, overridable by the `JANE_DAILY_CAP` env var). The Workers AI writers keep the shared `ai` counter at `AI_DAILY_CAP` (default 8), because that free plan is much smaller.
- One count per message, taken in copy-chat.js before any helper runs. The lookup planner, claim check and memory helpers inside a reply are not counted. Jane falling back to Workers AI (no Gemini key) still counts against `ai`.
- The operator usage row reads the cap from the server (`allowance_cap`), so it shows "n of 30 left" with no app change.


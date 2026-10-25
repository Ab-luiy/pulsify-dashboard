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

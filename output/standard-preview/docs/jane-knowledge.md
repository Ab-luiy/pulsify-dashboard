# Jane's knowledge and conversation (#86)

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

Requested drafts get a second, bounded grounding pass before being sent or saved. The writer remains the existing resolved provider/model. When it is Workers AI, this check uses Cloudflare-hosted `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; connected-provider clients keep their provider. No OpenAI or Anthropic API is introduced. The check compares only the client's facts and explicit user messages, not shared example claims or old assistant guesses. It requires a nonempty JSON reply; a failure exposes no unchecked draft. It is a model check, not a factual guarantee. Finished drafts take longer than discussion, which continues to stream normally. The existing platform daily allowance is taken once before persisting the request; check and memory calls do not count as additional user generations.

## Verification and release

The draft check also applies targeted deterministic guards for unsupported written feedback/annotations, video feedback, capacity/cohort claims and extra follow-up promises found during the bake-off. One corrective retry is allowed; if these gaps remain, no draft is sent or saved. These guards do not verify every possible claim. Review authentic output before publishing, especially factual or offer claims. The check's additional latency and model usage are real tradeoffs, not an unlimited-quality or unlimited-usage promise.

The changed legacy endpoint stays at `/api/copy-chat`; no migration, route rename, frontend payload change or provider credential is required. Optional grounding counters in stream metadata are compatible with the current loose frontend schema. The new UI in #82 is separate.

Tests cover actual model payloads on the Workers AI path, all onboarding sections, cross-client isolation, denied proof, long fields, older turns, changing formats, a failed Brain read and plain-text streaming. The collection check uses the actual vault sources rather than a copied fixture.

`tools/eval-jane.mjs` runs bounded synthetic scenarios through Cloudflare only. It never reads or writes a client's chats. Existing Wrangler authentication stays in memory. Six scenarios cover saved facts, discussion, a long email, a hook-only edit, fabricated proof and an old decision. Machine checks are probes; full answers must also be read. In particular, an answer can pass keyword checks while inventing a plausible service detail. Keep failed runs and describe observed limitations; do not turn a passing probe into a claim of perfect grounding.

The primary Brain checkout is diverged from remote main. #86 is integrated separately from fresh `brain/main` (`3ddd3a51`), preserving the latest onboarding sections, helper-call accounting, and app export `e323437`. Never deploy the stale primary export or merge its unrelated checkpoint history as part of this fix.

Evaluation output is stored at `tests/fixtures/jane-evaluation.json`, under the middleware-blocked tests prefix. The Pages preview served a JSON file under docs despite `.assetsignore`, so this report must never be placed there. Public preview and production probes must verify the old docs path and test-fixture path return 404.

---
type: playbook
tags: [scaling]
sources: [[AGENT_CHAT]]
created: 2026-10-07
updated: 2026-10-07
---

# Agent cross-call protocol and quality standard

Moved verbatim from AGENT_CHAT.md on 2026-10-07 to cut session-start tokens. Read this only when one agent is about to call the other, or when checking the effort/quota policy or output quality standard. Some details predate later decisions (for example the Fable 5 access dates); check dates before relying on them.


Either agent can invoke the other non-interactively for a second-model pass. Set up and live-verified 2026-07-02. Default use is builder/reviewer: whoever built a change has the other agent review the diff before deploy. Open-ended task delegation is allowed but stays the caller's responsibility.

**Claude calls Codex** (verified working):
```
codex exec --sandbox read-only -C <dir> -o <outfile> "task" </dev/null
```
- Close stdin (`</dev/null` in bash; in PowerShell pipe `''` in). With stdin left open, `codex exec` blocks forever in a non-interactive shell — this bit us on the very first test.
- `-o <file>` holds the clean final message; stdout is noisy telemetry. Real file paths only, `/dev/stdout` errors on Windows.
- Defaults from `~/.codex/config.toml`: model gpt-5.5, reasoning effort medium. Override per call: `-m <model>`, `-c model_reasoning_effort="low|medium|high|xhigh"`. Live-verified 2026-07-02: `-m gpt-5.4` and `-m gpt-5.5 -c model_reasoning_effort="xhigh"` both answered correctly.
- Sandbox: `read-only` for reviews and audits. `workspace-write` only when Codex is the designated builder for that task.
- `codex exec review` is a purpose-built code-review subcommand for the current repo.

**Codex calls Claude** (verified working):
```
claude -p "task" --model haiku|sonnet|opus|opusplan|fable
```
- `--model` pins the model per call; stdout is the final answer.
- Re-authenticated and live-verified 2026-07-02: standalone `claude -p` now works from Codex.

**Rules of engagement**
1. Depth 1 only. A cross-called agent never cross-calls back. Loops burn both plans' quotas.
2. The caller owns the Lock Board rows and log entries for anything the callee touches. Headless callees do not write this file.
3. Reviews run read-only. Write access only when the callee is the designated builder for that task.
4. Prompts must be self-contained: the callee has no chat context, only what the prompt and the repo give it. Include file paths and the acceptance criteria.
5. Log every cross-call in the Log below (who called whom, model, task, outcome).

**Effort and quota policy** (user directive 2026-07-02: do not burn either plan's session limits)
- BOTH QUOTAS ARE READABLE: run `python tools/quota.py` (vault root). One command prints both meters and flags any window over its gate. Claude side reads the subscription usage endpoint with the CLI's OAuth token (includes the Fable-scoped weekly meter, which the Fable rule above depends on); Codex side reads the newest rate-limit snapshot from `~/.codex/sessions/*/rollout-*.jsonl` (refreshed on every codex run, so the reading can be minutes stale if Codex has been idle).
- GATE: run the meter before any cross-call in either direction. Skip or downgrade the call if the target's session/5h window is past 70% or its weekly window is past 85%, and note the reading in the Log entry for the call. If the Claude token is expired the script says so; any `claude -p` run refreshes it.
- Observed floor: even a trivial `codex exec` run costs ~9-10k tokens of overhead, so no micro-calls — batch questions into one scoped call instead of several small ones.
- Default is NO cross-call. Most tasks need zero. Cross-call only when a second model genuinely changes the outcome: pre-deploy review of a meaningful diff, a bug one side is stuck on, or an explicit user ask.
- Match effort to stakes when calling Codex: small or mechanical diff = skip the review or gpt-5.4 medium; normal feature diff = gpt-5.5 medium; live-pipe, auth, payment, or deploy-critical code = gpt-5.5 high (xhigh only for genuinely hard problems, it is the most expensive setting).
- Same ladder when calling Claude: haiku for mechanical checks, sonnet as the workhorse, opus/opusplan only for architecture or hard debugging.
- **Fable 5 is scarce and recommendation-only. Never invoke it automatically.** Access may end July 7, 2026 and may be lost as soon as the account reaches 50% of its weekly limit. Reserve it for a very large, established, well-scoped task where its judgment could materially change the outcome. Claude or Codex may recommend a Fable 5 pass to the user with a concrete reason; only run it after the user explicitly approves that use.
- One review round per change. The builder fixes findings and ships; no review-of-the-review unless the fix itself was high-risk.
- If the user says either side is low on budget, that side stops being callable until they say otherwise (precedent: Codex build-budget pause on 2026-07-01).

**Output quality standard** (user directive 2026-07-02: everything shipped must hold Fable-grade quality regardless of which model built it)

The user currently runs Claude sessions on Fable 5 and expects that bar to survive Fable's likely disappearance (July 7 or the 50% weekly mark). Model ceiling is not fully transferable; discipline is, and most of the observable quality gap is discipline. So these are gates, not aspirations, for BOTH agents and every model tier:

1. Nothing ships unverified. "Done" means you ran it, tested it, or checked it live and can show the output. A cheaper model that verifies beats a stronger model that assumes.
2. No invented facts, ever. If a claim about a person, number, or behavior isn't grounded in the repo, a source, or a test you ran, flag the gap instead of filling it. This is already vault law (CLAUDE.md); it is now also a cross-call gate.
3. All prospect- or client-facing copy passes the Humanizer standard and the vault voice rules on a final pass, whichever model drafted it.
4. Builder self-review: before handoff or deploy, the builder re-reads its own full diff at the highest effort it is allowed (not a skim of the summary). Subagent output is never relayed unreviewed.
5. User-facing or deploy-critical work gets the cross-review (existing builder/reviewer pattern). Internal scratch work doesn't.
6. While Fable lasts, spend it where it compounds: standards, architecture calls, and final QA of flagship deliverables — not routine building. Every Fable turn should leave something behind (a rule, a doc, a decision) that outlives the access.
7. The test: if the user can tell from the output which model built it, the gate failed. Post the miss here so the standard gets patched, not just the deliverable.
